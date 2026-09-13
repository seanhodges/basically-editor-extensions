// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Exporting the listing being edited as a file its machine loads.
 *
 * The editor's half: the dialogs, the conversation, and the writing. What is to
 * be done and what the user is told is `programTransfer.ts`, which knows no
 * editor; this asks the questions and puts the bytes where the answers say.
 *
 * It is the first thing in this client to write a file. Everything else sent to
 * the toolchain has been the text of a buffer and everything received has been
 * something to say or an address to point a frame at, so the boundary is new:
 * the toolchain writes nothing and hands back bytes, and where they go is
 * settled here, from what the user named in the editor's own save dialog.
 */
import path from 'node:path';

import * as vscode from 'vscode';

import {
  Operations,
  OperationFailed,
  type BuildOutcome,
  type BuildTarget,
} from './operations';
import {
  planExport,
  refusalFor,
  reportFor,
  suggestedFileName,
  type ExportPlan,
  type ExportRefusal,
} from './programTransfer';
import { launchFor, locateServer } from './server';

const LANGUAGE_ID = 'basically';
const CONFIG_SECTION = 'basically';

export class ProgramTransfer {
  #channel: vscode.OutputChannel;
  #extensionPath: string;
  /**
   * One conversation, holding no machine.
   *
   * Not the panel's: that one holds the machine being played, and borrowing it
   * would tie an export to whether something is being played and let that
   * machine go when this was done with it. Building needs no machine at all, so
   * this starts its own on first use and keeps it, exactly as the status item
   * does — a process and nothing else.
   */
  #operations: Operations | undefined;

  private constructor(channel: vscode.OutputChannel, extensionPath: string) {
    this.#channel = channel;
    this.#extensionPath = extensionPath;
  }

  /** Offer the command, and let the conversation go when the editor does. */
  static register(
    context: vscode.ExtensionContext,
    channel: vscode.OutputChannel,
  ): ProgramTransfer {
    const transfer = new ProgramTransfer(channel, context.extensionPath);
    context.subscriptions.push(
      vscode.commands.registerCommand('basically.exportListing', () =>
        transfer.exportListing(),
      ),
      { dispose: () => transfer.#drop() },
      vscode.workspace.onDidChangeConfiguration((event) => {
        // Which server is asked and what runs it both move every answer this
        // gets, so a conversation started under the old settings is not one to
        // go on asking.
        if (event.affectsConfiguration(CONFIG_SECTION)) transfer.#drop();
      }),
    );
    return transfer;
  }

  /** Build the listing being edited into a file, and write it where told. */
  async exportListing(): Promise<void> {
    const document = vscode.window.activeTextEditor?.document;
    if (!document || document.languageId !== LANGUAGE_ID) {
      void vscode.window.showInformationMessage(
        'Open the listing you want to export, then run this command again.',
      );
      return;
    }
    // The editor's text, unsaved changes and all, so that what is exported is
    // what the user is looking at and what running the listing would run.
    const source = document.getText();
    const config = vscode.workspace.getConfiguration(
      CONFIG_SECTION,
      document.uri,
    );

    let plan: ExportPlan;
    let targets: BuildTarget[];
    try {
      const operations = this.#conversation(config);
      const declared = await operations.declaredMachine(source);
      plan = planExport(
        await operations.machines(),
        declared,
        config.get<string>('machine', ''),
      );
      if (plan.kind !== 'export') {
        this.#refuse(refusalFor(plan));
        return;
      }
      // Asked of the server rather than carried here, so a server that gains a
      // format offers it without this client being changed.
      targets = (await operations.info(plan.machine.id)).buildTargets;
    } catch (error) {
      this.#failed(error);
      return;
    }
    if (targets.length === 0) {
      this.#refuse(refusalFor({ kind: 'no-formats', machine: plan.machine }));
      return;
    }

    const target = await pickTarget(targets, plan.machine.name);
    if (!target) return;

    const chosen = await vscode.window.showSaveDialog({
      defaultUri: destinationFor(document, target),
      title: `Export for the ${plan.machine.name} as ${target.label}`,
      saveLabel: 'Export',
    });
    if (!chosen) return;

    let outcome: BuildOutcome;
    try {
      // The format is named as well as seeding the dialog, so that a user who
      // renamed the file there still gets the format they picked.
      outcome = await this.#conversation(config).build(
        plan.machine.id,
        source,
        path.basename(chosen.fsPath),
        target.id,
      );
    } catch (error) {
      this.#failed(error);
      return;
    }

    const report = reportFor(outcome, chosen.fsPath);
    try {
      for (const write of report.writes) {
        await vscode.workspace.fs.writeFile(
          vscode.Uri.file(write.path),
          Buffer.from(write.base64, 'base64'),
        );
      }
    } catch (error) {
      void vscode.window.showErrorMessage(
        `Could not write the exported file: ${describe(error)}`,
      );
      return;
    }

    for (const line of [report.message, ...report.detail]) {
      this.#channel.appendLine(line);
    }
    // Every path is named rather than only the first, because the files after
    // it were written without being asked about and a user told only where
    // they put the one they named would not know to look for the rest; and
    // every problem, because a user told nothing was exported has been told
    // nothing about their listing. A notification runs it all together, so
    // where there is more than one line the channel is offered, which has them
    // a line each.
    const SHOW = 'Show details';
    const items = report.detail.length > 1 ? [SHOW] : [];
    const said = [report.message, ...report.detail].join(' ');
    const reveal = (chosen: string | undefined): void => {
      if (chosen === SHOW) this.#channel.show(true);
    };
    if (report.writes.length === 0) {
      void vscode.window.showWarningMessage(said, ...items).then(reveal);
      return;
    }
    void vscode.window.showInformationMessage(said, ...items).then(reveal);
  }

  #refuse(refusal: ExportRefusal): void {
    void vscode.window.showWarningMessage(
      `${refusal.heading} ${refusal.remedy}`,
    );
  }

  /** The conversation could not be held, or the toolchain refused the request. */
  #failed(error: unknown): void {
    if (error instanceof OperationFailed) {
      void vscode.window.showErrorMessage(
        `The toolchain could not export this listing: ${error.message}`,
      );
      return;
    }
    // Anything that is not a refusal means this conversation is not worth
    // asking again, the same rule the status item's follows.
    this.#drop();
    void vscode.window.showErrorMessage(
      `Could not talk to the toolchain: ${describe(error)}. ` +
        'Install the toolchain with "npm install -g @ba.sical.ly/cli" and set ' +
        'basically.server.path, or set basically.server.nodePath to a Node.js 22 or newer.',
    );
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
    void operations?.dispose();
  }
}

/**
 * Which format to build, under the server's own names.
 *
 * A machine with one format is not asked about: a list of one is a question
 * with no answer to give.
 */
async function pickTarget(
  targets: BuildTarget[],
  machineName: string,
): Promise<BuildTarget | undefined> {
  if (targets.length === 1) return targets[0];
  const picked = await vscode.window.showQuickPick(
    targets.map((target) => ({
      label: target.label,
      description:
        target.fileExtension === undefined ? '' : `.${target.fileExtension}`,
      target,
    })),
    { placeHolder: `Export this listing for the ${machineName} as what?` },
  );
  return picked?.target;
}

/** Where the save dialog opens, and under what name. */
function destinationFor(
  document: vscode.TextDocument,
  target: BuildTarget,
): vscode.Uri {
  const name = suggestedFileName(path.basename(document.uri.path), target);
  // An untitled listing has no folder of its own to sit beside, so the dialog
  // opens wherever the editor would have opened it.
  if (document.isUntitled) {
    const folder = vscode.workspace.workspaceFolders?.[0];
    return folder
      ? vscode.Uri.joinPath(folder.uri, name)
      : vscode.Uri.file(name);
  }
  return vscode.Uri.joinPath(document.uri, '..', name);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
