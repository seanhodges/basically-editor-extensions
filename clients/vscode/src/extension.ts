// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The VS Code client for the Basically language server.
 *
 * Everything the user sees comes from the server: problems, completion, hover,
 * jump-to-definition, the outline, a variable's uses, and colour. This file
 * starts it, keeps `basically.machine` flowing to it, and offers the two
 * commands the protocol has no place for.
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

import { argsFor, launchFor, locateServer, type ServerLaunch } from './server';

const LANGUAGE_ID = 'basically';
const CONFIG_SECTION = 'basically';
const CLIENT_ID = 'basicallyLanguageServer';
const CLIENT_NAME = 'Basically';

const run = promisify(execFile);

let client: LanguageClient | undefined;

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
    options: launch.runAsNode
      ? // The editor's own executable is Electron, which runs as Node only when
        // told to. Without this it would open a second window rather than serve.
        { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } }
      : undefined,
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
      env: launch.runAsNode
        ? { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
        : process.env,
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

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  context.subscriptions.push(
    vscode.commands.registerCommand('basically.selectMachine', () =>
      selectMachine(context),
    ),
    vscode.commands.registerCommand('basically.restartServer', async () => {
      await client?.stop();
      client = undefined;
      await activateClient(context);
    }),
  );
  await activateClient(context);
}

async function activateClient(context: vscode.ExtensionContext): Promise<void> {
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
}

export async function deactivate(): Promise<void> {
  await client?.stop();
  client = undefined;
}
