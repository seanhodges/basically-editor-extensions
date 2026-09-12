// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The VS Code client for the Basically language server.
 *
 * Everything the user sees comes from the server: problems, completion, hover,
 * jump-to-definition, the outline, a variable's uses, and colour. This file
 * starts it on the first listing opened, keeps `basically.machine` flowing to
 * it, offers the three commands the protocol has no place for, says which
 * machine the listing being edited is checked against, and tells the editor
 * where the toolchain its own agent can use is.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import * as vscode from 'vscode';
import {
  LanguageClient,
  TransportKind,
  type Executable,
  type LanguageClientOptions,
  type ServerOptions,
} from 'vscode-languageclient/node';

import {
  endDebugSessionForRun,
  registerMachineDebug,
} from './machineDebugAdapter';
import { closeMachinePanel, MachinePanel } from './machinePanel';
import { MachineStatusItem } from './machineStatusItem';
import { registerMcpServer } from './mcpServer';
import { argsFor, envFor, launchFor, locateServer, type ServerLaunch } from './server';

const LANGUAGE_ID = 'basically';
const CONFIG_SECTION = 'basically';
const CLIENT_ID = 'basicallyLanguageServer';
const CLIENT_NAME = 'Basically';

const run = promisify(execFile);

let client: LanguageClient | undefined;
/** A start already under way, so that opening several listings starts one server. */
let starting: Promise<void> | undefined;
/**
 * One channel for both conversations.
 *
 * The language client would make its own; given this one, the notes about which
 * server and which runtime were chosen land in the same place whether they were
 * written while serving the language or while starting a machine.
 */
let channel: vscode.OutputChannel | undefined;

/** Where the server is and what will run it, from the settings as they stand. */
function currentLaunch(context: vscode.ExtensionContext): ServerLaunch {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const location = locateServer(
    config.get<string>('server.path', ''),
    context.extensionPath,
  );
  return launchFor(location, {
    configuredNodePath: config.get<string>('server.nodePath', ''),
    editorExecPath: process.execPath,
    editorNodeVersion: process.versions.node,
  });
}

function executableFor(launch: ServerLaunch): Executable {
  return {
    command: launch.command,
    args: argsFor(launch, 'lsp', '--stdio'),
    transport: TransportKind.stdio,
    options: { env: envFor(launch) },
  };
}

async function startClient(
  context: vscode.ExtensionContext,
): Promise<LanguageClient> {
  const launch = currentLaunch(context);
  const executable = executableFor(launch);
  const serverOptions: ServerOptions = { run: executable, debug: executable };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: LANGUAGE_ID },
      { scheme: 'untitled', language: LANGUAGE_ID },
    ],
    // Without this the server is never told the settings changed, and choosing
    // a different machine would not reach it until the next restart. The server
    // asks for `basically.machine` itself once it knows something moved.
    synchronize: { configurationSection: CONFIG_SECTION },
    outputChannel: channel,
    // For a client that cannot be asked for its configuration. VS Code can, so
    // this only settles the first moments before the first pull.
    initializationOptions: {
      machine:
        vscode.workspace
          .getConfiguration(CONFIG_SECTION)
          .get<string>('machine', '')
          .trim() || undefined,
    },
  };

  const started = new LanguageClient(
    CLIENT_ID,
    CLIENT_NAME,
    serverOptions,
    clientOptions,
  );
  for (const note of launch.notes) started.outputChannel.appendLine(note);
  await started.start();
  return started;
}

/**
 * The machines this server has, as it reports them. Asking the server rather
 * than carrying a list means the choices can never be a machine it does not
 * have, or miss one it gained.
 */
async function machinesFrom(launch: ServerLaunch): Promise<
  { id: string; name: string; description: string }[]
> {
  const { stdout } = await run(
    launch.command,
    argsFor(launch, 'machines', '--json'),
    {
      env: envFor(launch),
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  return JSON.parse(stdout) as {
    id: string;
    name: string;
    description: string;
  }[];
}

async function selectMachine(context: vscode.ExtensionContext): Promise<void> {
  let machines;
  try {
    machines = await machinesFrom(currentLaunch(context));
  } catch (error) {
    void vscode.window.showErrorMessage(
      `Could not ask the toolchain which machines it has: ${describe(error)}`,
    );
    return;
  }

  const clear: vscode.QuickPickItem = {
    label: 'Let each listing say',
    description: 'no machine set',
    detail:
      'Each listing is checked against the machine its own #MACHINE line names, or the one its text can be worked out to be.',
  };
  const picked = await vscode.window.showQuickPick(
    [
      clear,
      ...machines.map((machine) => ({
        label: machine.name,
        description: machine.id,
        detail: machine.description,
      })),
    ],
    { placeHolder: 'Check listings against which machine?' },
  );
  if (!picked) return;

  const target = vscode.workspace.workspaceFolders?.length
    ? vscode.ConfigurationTarget.Workspace
    : vscode.ConfigurationTarget.Global;
  await vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .update('machine', picked === clear ? '' : picked.description, target);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Run the listing being edited, and play its machine in the panel.
 *
 * Restarting the language server does not go through here and does not disturb
 * a machine: the panel holds its own conversation with the toolchain.
 */
async function runListing(context: vscode.ExtensionContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== LANGUAGE_ID) {
    void vscode.window.showInformationMessage(
      'Open the listing you want to run, then run this command again.',
    );
    return;
  }
  // A machine is played or debugged and never both, so the session goes first
  // and the user is told it did rather than finding it no longer stops
  // anywhere.
  if (await endDebugSessionForRun()) {
    void vscode.window.showInformationMessage(
      'The debug session has ended; this machine is now one you can type at.',
    );
  }
  const panel = MachinePanel.show(outputChannel());
  await panel.play(editor.document, context.extensionPath);
}

function outputChannel(): vscode.OutputChannel {
  return (channel ??= vscode.window.createOutputChannel(CLIENT_NAME));
}

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  context.subscriptions.push(
    outputChannel(),
    vscode.commands.registerCommand('basically.selectMachine', () =>
      selectMachine(context),
    ),
    vscode.commands.registerCommand('basically.runListing', () =>
      runListing(context),
    ),
    vscode.commands.registerCommand('basically.restartServer', async () => {
      await client?.stop();
      client = undefined;
      // Asked for outright, so it starts whether or not a listing is open: the
      // user correcting a setting wants to know at once whether it took.
      await activateClient(context);
    }),
  );
  // Registered before the server is started, and independent of whether it
  // starts: the listing whose machine could not be settled and the client that
  // never loaded look alike, and this is what tells them apart.
  MachineStatusItem.register(context, outputChannel());
  // Also independent of it: a debug session and the language server are two
  // conversations, and restarting one leaves the other alone.
  registerMachineDebug(context, outputChannel());
  // And independent again, because the editor may load this extension for the
  // agent alone, in a window holding no listing at all.
  registerMcpServer(context, outputChannel());
  context.subscriptions.push(serveWhenAListingIsOpen(context));
}

/**
 * Serve the language from the first listing onward, and not before.
 *
 * Offering the toolchain to the agent means the editor activates this extension
 * in windows that hold no BASIC, and a language server started for a user who
 * has opened none is a process they did not ask for.
 */
function serveWhenAListingIsOpen(
  context: vscode.ExtensionContext,
): vscode.Disposable {
  const listing = (document: vscode.TextDocument): boolean =>
    document.languageId === LANGUAGE_ID;
  if (vscode.workspace.textDocuments.some(listing)) void activateClient(context);
  return vscode.workspace.onDidOpenTextDocument((document) => {
    if (listing(document)) void activateClient(context);
  });
}

async function activateClient(context: vscode.ExtensionContext): Promise<void> {
  // Several listings can be opened at once, and each would otherwise start a
  // server of its own before the first had finished starting.
  if (client || starting) return starting;
  starting = (async () => {
    try {
      client = await startClient(context);
      context.subscriptions.push(client);
    } catch (error) {
      const launch = currentLaunch(context);
      void vscode.window.showErrorMessage(
        `Could not start the Basically language server (${launch.command}): ${describe(error)}. ` +
          'Install the toolchain with "npm install -g @ba.sical.ly/cli" and set basically.server.path, ' +
          'or set basically.server.nodePath to a Node.js 22 or newer.',
      );
    }
  })();
  try {
    await starting;
  } finally {
    starting = undefined;
  }
}

export async function deactivate(): Promise<void> {
  closeMachinePanel();
  await client?.stop();
  client = undefined;
}
