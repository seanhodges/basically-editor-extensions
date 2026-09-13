// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Moving a program between the editor and the machine's own file: the listing
 * being edited written out as a file its machine loads, and a machine's file
 * read back into a listing.
 *
 * The editor's half: the dialogs, the conversation, and the writing. What is to
 * be done and what the user is told is `programTransfer.ts`, which knows no
 * editor; this asks the questions and puts the bytes where the answers say.
 *
 * It is the only thing in this client to write a file. Everything else sent to
 * the toolchain has been the text of a buffer and everything received has been
 * something to say or an address to point a frame at, so the boundary is here:
 * the toolchain writes nothing and hands back bytes, and where they go is
 * settled from what the user named in the editor's own dialogs.
 */
import path from 'node:path';

import * as vscode from 'vscode';

import {
  Operations,
  OperationFailed,
  type BuildOutcome,
  type BuildTarget,
  type ConvertAnswer,
  type Machine,
} from './operations';
import {
  blocksWritten,
  importReportFor,
  machinesToChooseFrom,
  planExport,
  refusalFor,
  reportFor,
  suggestedFileName,
  type ExportPlan,
  type ExportRefusal,
  type ImportReport,
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
      vscode.commands.registerCommand('basically.importProgram', () =>
        transfer.importProgram(),
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
      this.#failed(error, 'export this listing');
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
      this.#failed(error, 'export this listing');
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

  /**
   * Read a machine's own file back into a listing the user can edit.
   *
   * Which machine the file is for is the file's own to settle and is left to
   * the server, which reads the format and refuses — naming what could have
   * claimed it — where the format settles nothing. Nothing is opened over
   * anything: the listing arrives untitled, so where a program off somebody
   * else's tape belongs on this disk stays the user's decision.
   */
  async importProgram(): Promise<void> {
    // No file-type filter: which extensions belong to which machine is a fact
    // about machines, and a list of them held here would go stale the moment
    // the toolchain gained a format.
    const picked = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: 'Read',
      title: "Read a machine's file into a listing",
    });
    const file = picked?.[0];
    if (!file) return;
    const fileName = path.basename(file.fsPath);

    let base64: string;
    try {
      base64 = Buffer.from(await vscode.workspace.fs.readFile(file)).toString(
        'base64',
      );
    } catch (error) {
      void vscode.window.showErrorMessage(
        `Could not read ${fileName}: ${describe(error)}`,
      );
      return;
    }

    const config = vscode.workspace.getConfiguration(CONFIG_SECTION, file);
    let answer: ConvertAnswer;
    try {
      const operations = this.#conversation(config);
      answer = await operations.convert(base64, fileName);
      if (answer.kind === 'which-machine') {
        const { candidates } = answer;
        const offered = machinesToChooseFrom(
          await operations.machines(),
          candidates,
        );
        // What each machine reads, asked of the server for the machines it
        // named: a choice between two machines whose formats share an
        // extension is a choice about something only if it says what each one
        // reads. Where it named none, every machine is offered and the file's
        // format matched none of them, so the lists would say nothing.
        const formats =
          candidates.length === 0
            ? new Map<string, string>()
            : await formatsRead(operations, offered);
        const machine = await pickMachine(
          offered,
          formats,
          candidates.length > 0,
        );
        if (!machine) return;
        // The same bytes again with the machine named, which is what overrides
        // the file's own format — the only thing that does.
        answer = await operations.convert(base64, fileName, machine.id);
        if (answer.kind === 'which-machine') {
          void vscode.window.showWarningMessage(
            `The toolchain would not read ${fileName} as a ${machine.name} file.`,
          );
          return;
        }
      }
    } catch (error) {
      this.#failed(error, `read ${fileName}`);
      return;
    }

    const report = importReportFor(answer.outcome);
    // Opened before anything is said about it, because the listing is what was
    // asked for and everything else is about what came with it.
    const document = await vscode.workspace.openTextDocument({
      content: answer.outcome.source,
      // Set rather than inferred: an untitled document has no name to infer a
      // language from, and a listing not served as one is a listing with no
      // problems reported against it.
      language: LANGUAGE_ID,
    });
    await vscode.window.showTextDocument(document);

    this.#say(report.message, report.detail);
    await this.#keepBlocks(report);
  }

  /**
   * Offer somewhere to keep what was recovered beside the BASIC.
   *
   * Asked only where the file actually held blocks, and declining writes
   * nothing and is not a failure: the listing is already open, which is what
   * was asked for.
   */
  async #keepBlocks(report: ImportReport): Promise<void> {
    if (report.blocksAsk === null) return;
    const KEEP = 'Choose a folder';
    const answer = await vscode.window.showInformationMessage(
      report.blocksAsk,
      KEEP,
    );
    if (answer !== KEEP) return;
    const folder = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Keep here',
      title: 'Where should the recovered bytes be kept?',
    });
    const into = folder?.[0];
    if (!into) return;

    const written: string[] = [];
    try {
      for (const block of report.blocks) {
        const where = vscode.Uri.joinPath(into, block.fileName);
        await vscode.workspace.fs.writeFile(
          where,
          Buffer.from(block.base64, 'base64'),
        );
        written.push(where.fsPath);
      }
    } catch (error) {
      void vscode.window.showErrorMessage(
        `Could not write what was recovered: ${describe(error)}`,
      );
      return;
    }
    const said = blocksWritten(written);
    this.#say(said.message, said.detail);
  }

  /**
   * Put one outcome to the user, and the whole of it into the channel.
   *
   * A notification runs its lines together, so where there is more than one
   * line the channel is offered, which has them a line each — the rule an
   * export already follows for the paths it wrote and the problems it found.
   */
  #say(message: string, detail: string[]): void {
    for (const line of [message, ...detail]) this.#channel.appendLine(line);
    const SHOW = 'Show details';
    void vscode.window
      .showInformationMessage(
        [message, ...detail].join(' '),
        ...(detail.length > 1 ? [SHOW] : []),
      )
      .then((chosen) => {
        if (chosen === SHOW) this.#channel.show(true);
      });
  }

  #refuse(refusal: ExportRefusal): void {
    void vscode.window.showWarningMessage(
      `${refusal.heading} ${refusal.remedy}`,
    );
  }

  /** The conversation could not be held, or the toolchain refused the request. */
  #failed(error: unknown, attempted: string): void {
    if (error instanceof OperationFailed) {
      void vscode.window.showErrorMessage(
        `The toolchain could not ${attempted}: ${error.message}`,
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

/**
 * What each machine can be read from, as the server reports its formats.
 *
 * One question per machine, which is why it is only ever asked of the handful
 * a refusal named.
 */
async function formatsRead(
  operations: Operations,
  machines: Machine[],
): Promise<Map<string, string>> {
  const read = await Promise.all(
    machines.map(async (machine) => {
      const facts = await operations.info(machine.id);
      return [
        machine.id,
        facts.binaryImports.map((format) => format.extension).join(', '),
      ] as const;
    }),
  );
  return new Map(read);
}

/**
 * Which machine to read a file as, where its format did not settle one.
 *
 * A list of one is still asked about here, unlike the format picker, because
 * the user is being told something as well as being asked: the file did not
 * say what it was.
 */
async function pickMachine(
  machines: Machine[],
  formats: Map<string, string>,
  claimed: boolean,
): Promise<Machine | undefined> {
  const picked = await vscode.window.showQuickPick(
    machines.map((machine) => ({
      label: machine.name,
      description: formats.get(machine.id) ?? machine.description,
      machine,
    })),
    {
      placeHolder: claimed
        ? "More than one machine's format matches this file. Read it as which?"
        : "No machine's format matches this file. Read it as which machine?",
    },
  );
  return picked?.machine;
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
