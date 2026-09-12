// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The status item saying which machine the listing being edited is checked
 * against.
 *
 * It is in the status bar because that is where the user's eye already goes
 * when the file in front of them changes, because it can say something when
 * there is nothing wrong — which the problems panel cannot — and because a user
 * who does not want it can hide it there the way they hide everything else.
 *
 * It holds no machine and runs nothing. It asks the toolchain a question and
 * shows the answer; what to say about each answer is `machineStatus.ts`, and
 * which machine a listing is for is `planRun`'s, by the precedence that already
 * governs every other part of this client.
 */
import * as vscode from 'vscode';

import {
  MachineWatch,
  type Listing,
  type MachineLabel,
} from './machineStatus';
import {
  Operations,
  OperationFailed,
  planRun,
  type Machine,
  type RunPlan,
} from './operations';
import { launchFor, locateServer } from './server';

const LANGUAGE_ID = 'basically';
const CONFIG_SECTION = 'basically';

export class MachineStatusItem {
  #item: vscode.StatusBarItem;
  #watch: MachineWatch;
  #channel: vscode.OutputChannel;
  #extensionPath: string;
  /**
   * One conversation, kept between questions rather than started for each.
   * It holds no machine, so keeping it costs a process and nothing else, and
   * starting one per question would cost a process each time the user moved
   * between two listings.
   */
  #operations: Operations | undefined;
  #machines: Machine[] | undefined;

  private constructor(channel: vscode.OutputChannel, extensionPath: string) {
    this.#channel = channel;
    this.#extensionPath = extensionPath;
    // Beside the language indicator, which is what this is a companion to.
    this.#item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    // What the status bar's own context menu calls it, which is how a user who
    // does not want it hides it.
    this.#item.name = 'Basically machine';
    // The action a user wants after reading any answer but the first; the
    // sentence saying what to set stays the server's problem on the listing.
    this.#item.command = 'basically.selectMachine';
    this.#watch = new MachineWatch(
      (listing) => this.#answer(listing),
      (label) => this.#render(label),
    );
  }

  /** Put the item in the bar and keep it current for as long as the editor runs. */
  static register(
    context: vscode.ExtensionContext,
    channel: vscode.OutputChannel,
  ): MachineStatusItem {
    const status = new MachineStatusItem(channel, context.extensionPath);
    context.subscriptions.push(
      status.#item,
      { dispose: () => void status.#operations?.dispose() },
      vscode.window.onDidChangeActiveTextEditor(() => status.refresh()),
      // Not as the user types: the answer can only change when the text does,
      // and a process per keystroke is not worth a fresher label.
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (document === vscode.window.activeTextEditor?.document) {
          status.refresh();
        }
      }),
      vscode.workspace.onDidCloseTextDocument((document) =>
        status.#watch.forget(document.uri.toString()),
      ),
      vscode.workspace.onDidChangeConfiguration((event) => {
        // Which machine is configured, which server is asked and what runs it
        // all move the answer, so nothing established under the old settings
        // is still worth showing.
        if (!event.affectsConfiguration(CONFIG_SECTION)) return;
        status.#watch.forgetAll();
        status.#drop();
        status.refresh();
      }),
    );
    status.refresh();
    return status;
  }

  /** Show what is known about the listing being edited, if one is. */
  refresh(): void {
    void this.#watch.watch(listingIn(vscode.window.activeTextEditor));
  }

  #render(label: MachineLabel | null): void {
    if (!label) {
      this.#item.hide();
      return;
    }
    this.#item.text = label.text;
    this.#item.tooltip = label.tooltip;
    this.#item.show();
  }

  /**
   * Which machine this listing is for, asked of the toolchain rather than read
   * out of the text: no `#MACHINE` line is parsed here and nothing is inferred
   * from the listing, so what is shown can never be a second opinion differing
   * from what the listing is actually checked against.
   */
  async #answer(listing: Listing): Promise<RunPlan> {
    const uri = vscode.Uri.parse(listing.uri);
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION, uri);
    const operations = this.#conversation(config);
    try {
      // The machines a server has do not change while it is running, so they
      // are asked for once per conversation and dropped along with it.
      const machines = (this.#machines ??= await operations.machines());
      const declared = await operations.declaredMachine(listing.text);
      return planRun(machines, declared, config.get<string>('machine', ''));
    } catch (error) {
      // A refusal is an answer from a conversation that is still good; anything
      // else means this one is not worth asking again.
      if (!(error instanceof OperationFailed)) this.#drop();
      throw error;
    }
  }

  #conversation(config: vscode.WorkspaceConfiguration): Operations {
    // Resolved for this question rather than remembered, so a settings change
    // reaches this conversation the way it reaches the panel's.
    return (this.#operations ??= Operations.start(
      launchFor(
        locateServer(config.get<string>('server.path', ''), this.#extensionPath),
        {
          configuredNodePath: config.get<string>('server.nodePath', ''),
          editorExecPath: process.execPath,
          editorNodeVersion: process.versions.node,
        },
      ),
      (line) => this.#channel.appendLine(line),
    ));
  }

  #drop(): void {
    const operations = this.#operations;
    this.#operations = undefined;
    this.#machines = undefined;
    void operations?.dispose();
  }
}

/** The listing an editor is showing, or null where it is showing something else. */
function listingIn(editor: vscode.TextEditor | undefined): Listing | null {
  if (!editor || editor.document.languageId !== LANGUAGE_ID) return null;
  return {
    uri: editor.document.uri.toString(),
    version: editor.document.version,
    text: editor.document.getText(),
  };
}
