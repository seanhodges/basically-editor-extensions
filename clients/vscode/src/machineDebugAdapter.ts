// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * How a debug session reaches the editor: the type it is started under, the
 * configuration filled in for a user who wrote none, and the adapter itself.
 *
 * The adapter is implemented here rather than as a program of its own and is
 * handed over inline, which is what lets it hold the machine the panel holds
 * instead of being given a copy of the conversation. Nothing is spawned for it
 * and nothing is added to what ships.
 *
 * What a session actually does is `machineDebug.ts`, which knows nothing about
 * the editor; this file is the wiring.
 */
import * as vscode from 'vscode';

import {
  DEBUG_TYPE,
  MachineDebugSession,
  planDebug,
  refusalFor,
  type DebugHost,
  type DebugProtocolMessage,
} from './machineDebug';
import { launchForDocument, MachinePanel } from './machinePanel';
import type { ProgramWatcher } from './variableWatchView';
import { OperationFailed, planRun } from './operations';

const LANGUAGE_ID = 'basically';
const CONFIG_SECTION = 'basically';

/** The configuration a session runs under, once the client has settled it. */
interface MachineDebugConfiguration extends vscode.DebugConfiguration {
  /** The listing to debug, as a URI the editor can open. */
  program?: string;
  /** Settled before the session starts, so the adapter asks nothing again. */
  machine?: string;
  machineName?: string;
}

/**
 * A path as the editor spells it, whichever way the configuration wrote it.
 *
 * A configuration the client filled in holds a URI, which keeps an unsaved
 * listing reachable; one a user wrote holds a path, because that is what
 * `${file}` gives them.
 */
function uriOf(program: string): vscode.Uri {
  return /^(file|untitled|vscode-[a-z-]+):/i.test(program)
    ? vscode.Uri.parse(program)
    : vscode.Uri.file(program);
}

/**
 * What to debug and on which machine, settled before a session starts.
 *
 * Asked here rather than after a failure, because the three reasons a listing
 * cannot be debugged have three different remedies and a user met with one
 * message for all of them would be sent to change a setting that was never the
 * problem.
 */
class MachineDebugConfigurations implements vscode.DebugConfigurationProvider {
  #extensionPath: string;
  #channel: vscode.OutputChannel;

  constructor(extensionPath: string, channel: vscode.OutputChannel) {
    this.#extensionPath = extensionPath;
    this.#channel = channel;
  }

  provideDebugConfigurations(): vscode.DebugConfiguration[] {
    return [
      {
        type: DEBUG_TYPE,
        request: 'launch',
        name: 'Debug this listing',
        program: '${file}',
      },
    ];
  }

  async resolveDebugConfiguration(
    _folder: vscode.WorkspaceFolder | undefined,
    configuration: MachineDebugConfiguration,
  ): Promise<vscode.DebugConfiguration | undefined> {
    // A user who has written a configuration is honoured; one who has not gets
    // the listing in front of them, so starting a session asks nothing of them.
    const filled: MachineDebugConfiguration = {
      ...configuration,
      type: configuration.type ?? DEBUG_TYPE,
      request: configuration.request ?? 'launch',
      name: configuration.name ?? 'Debug this listing',
    };

    const document = await this.#listing(filled);
    if (!document) return undefined;
    filled.program = document.uri.toString();

    const settled = await this.#settle(document);
    if (!settled) return undefined;
    filled.machine = settled.id;
    filled.machineName = settled.name;
    return filled;
  }

  /** The listing the session is about: the one named, or the one on screen. */
  async #listing(
    configuration: MachineDebugConfiguration,
  ): Promise<vscode.TextDocument | undefined> {
    if (configuration.program !== undefined && configuration.program !== '') {
      try {
        return await vscode.workspace.openTextDocument(
          uriOf(configuration.program),
        );
      } catch (error) {
        void vscode.window.showErrorMessage(
          `Could not open ${configuration.program} to debug: ${describe(error)}`,
        );
        return undefined;
      }
    }
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== LANGUAGE_ID) {
      void vscode.window.showInformationMessage(
        'Open the listing you want to debug, then start debugging again.',
      );
      return undefined;
    }
    return editor.document;
  }

  /**
   * Which machine this listing runs on, and whether it can be stepped.
   *
   * Both are the server's answers, asked of the server that is actually
   * serving: the user may have pointed the client at a copy of their own, and
   * which machines can be stepped is the toolchain's to change.
   */
  async #settle(
    document: vscode.TextDocument,
  ): Promise<{ id: string; name: string } | undefined> {
    const panel = MachinePanel.show(this.#channel);
    const launch = launchForDocument(document, this.#extensionPath);
    const operations = panel.connection(launch);
    const configured = vscode.workspace
      .getConfiguration(CONFIG_SECTION, document.uri)
      .get<string>('machine', '');

    let plan;
    try {
      const source = document.getText();
      const declared = await operations.declaredMachine(source);
      const runnable = planRun(
        await operations.machines(),
        declared,
        configured,
      );
      plan = planDebug(
        runnable,
        runnable.kind === 'run'
          ? (await operations.info(runnable.machine.id)).canStep
          : false,
      );
    } catch (error) {
      void vscode.window.showErrorMessage(
        error instanceof OperationFailed
          ? `The toolchain could not say what this listing is for: ${error.message}`
          : `Could not talk to the toolchain (${launch.command}): ${describe(error)}. ` +
              'Install the toolchain with "npm install -g @ba.sical.ly/cli" and set ' +
              'basically.server.path, or set basically.server.nodePath to a Node.js 22 or newer.',
      );
      return undefined;
    }

    if (plan.kind === 'debug') {
      panel.titleFor(document, ' (debugging)');
      panel.starting(`Starting the ${plan.machine.name}…`);
      return { id: plan.machine.id, name: plan.machine.name };
    }

    // A machine that cannot be stepped is not a machine that cannot be used,
    // so what is left is offered rather than only refused.
    const refusal = refusalFor(plan);
    const runIt = 'Run it instead';
    const answer = await vscode.window.showWarningMessage(
      `${refusal.heading} ${refusal.remedy}`,
      ...(refusal.offerRun ? [runIt] : []),
    );
    if (answer === runIt) {
      await vscode.commands.executeCommand('basically.runListing');
    }
    return undefined;
  }
}

/**
 * The adapter, handed to the editor as an object rather than a process.
 *
 * Messages are answered one at a time: the conversation behind them holds one
 * machine, and a step and a continue overlapping on it would be two requests
 * for the same machine to move.
 */
class InlineMachineDebugAdapter implements vscode.DebugAdapter {
  #sent = new vscode.EventEmitter<vscode.DebugProtocolMessage>();
  #session: MachineDebugSession;
  #queue: Promise<void> = Promise.resolve();

  readonly onDidSendMessage = this.#sent.event;

  constructor(host: DebugHost) {
    this.#session = new MachineDebugSession(host, (message) =>
      this.#sent.fire(message),
    );
  }

  handleMessage(message: vscode.DebugProtocolMessage): void {
    this.#queue = this.#queue.then(() =>
      this.#session
        .handle(message as DebugProtocolMessage)
        // A message that could not be answered has already been answered as a
        // failure; nothing here may reject, or the queue stops.
        .catch(() => {}),
    );
  }

  dispose(): void {
    this.#sent.dispose();
  }
}

class MachineDebugAdapters implements vscode.DebugAdapterDescriptorFactory {
  #extensionPath: string;
  #channel: vscode.OutputChannel;
  #watcher: ProgramWatcher;

  constructor(
    extensionPath: string,
    channel: vscode.OutputChannel,
    watcher: ProgramWatcher,
  ) {
    this.#extensionPath = extensionPath;
    this.#channel = channel;
    this.#watcher = watcher;
  }

  async createDebugAdapterDescriptor(
    session: vscode.DebugSession,
  ): Promise<vscode.DebugAdapterDescriptor> {
    const configuration = session.configuration as MachineDebugConfiguration;
    const document = await vscode.workspace.openTextDocument(
      uriOf(configuration.program ?? ''),
    );
    const panel = MachinePanel.show(this.#channel);
    const launch = launchForDocument(document, this.#extensionPath);
    const machineName = configuration.machineName ?? configuration.machine ?? '';
    const host: DebugHost = {
      operations: panel.connection(launch),
      machine: { id: configuration.machine ?? '', name: machineName },
      // The listing on the screen, unsaved changes included: it is the one the
      // user means to debug, and the language server is already reading it
      // rather than the file.
      source: document.getText(),
      path: document.uri.fsPath,
      mirror: (address) => panel.mirror(address, machineName),
      moved: () => this.#watcher.moved(),
      released: async () => {
        panel.sessionEnded(machineName);
        this.#watcher.released();
      },
    };
    return new vscode.DebugAdapterInlineImplementation(
      new InlineMachineDebugAdapter(host),
    );
  }
}

/**
 * Register debugging with the editor.
 *
 * Independent of the language server, and of whether it started: they are two
 * conversations with two children of the same toolchain, and the only thing
 * they share is how the client found them. Restarting one leaves the other
 * alone.
 */
export function registerMachineDebug(
  context: vscode.ExtensionContext,
  channel: vscode.OutputChannel,
  watcher: ProgramWatcher,
): void {
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider(
      DEBUG_TYPE,
      new MachineDebugConfigurations(context.extensionPath, channel),
    ),
    vscode.debug.registerDebugAdapterDescriptorFactory(
      DEBUG_TYPE,
      new MachineDebugAdapters(context.extensionPath, channel, watcher),
    ),
  );
}

/**
 * End a debug session on this window's machine, for a listing about to be run.
 *
 * A listing is started one way or the other: playing is a machine on its own
 * clock that the user types at, and debugging is one that advances only as far
 * as the editor asked. Ending the session before the run means the user is told
 * which they got, rather than being left with a session that no longer stops
 * anywhere.
 */
export async function endDebugSessionForRun(): Promise<boolean> {
  const session = vscode.debug.activeDebugSession;
  if (!session || session.type !== DEBUG_TYPE) return false;
  await vscode.debug.stopDebugging(session);
  return true;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
