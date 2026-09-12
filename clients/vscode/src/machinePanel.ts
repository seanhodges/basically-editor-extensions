// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The panel a listing is played in, and watched in while it is debugged.
 *
 * A thin shell around a frame pointed at the address the toolchain gives back.
 * The client does not draw the machine, does not translate keys, and does not
 * read what crosses that frame: how the picture and the keys are carried is
 * private to the toolchain and may change, and the only thing it promises is an
 * address to put in a frame.
 *
 * The toolchain gives two such addresses and they are not interchangeable. One
 * drives the machine, which is what running a listing opens; the other mirrors
 * it, which is what a debug session opens, because a machine being driven by a
 * person runs on its own clock and a machine on its own clock is not one that
 * can be stopped on a line or measured. The two share this panel: one machine
 * to a window means one screen to look at, and a played machine and a debugged
 * one are never the same machine at the same time.
 */
import * as vscode from 'vscode';

import {
  Operations,
  OperationFailed,
  planRun,
  type Machine,
  type RunPlan,
} from './operations';
import { acceptRoms, romStatus, ROM_TERMS_URL } from './roms';
import { launchFor, locateServer, type ServerLaunch } from './server';

const CONFIG_SECTION = 'basically';
const VIEW_TYPE = 'basically.machine';

/**
 * One panel to a window, and one machine to a panel.
 *
 * Running a second listing plays it on the machine this panel already holds,
 * rather than opening another: the toolchain gives one machine to one
 * connection, so a panel per listing would be a toolchain process per listing,
 * and a user who ran three would be holding three machines without having asked
 * to. A window's panel is the place the listing you just ran is played.
 */
let current: MachinePanel | undefined;

export class MachinePanel {
  #panel: vscode.WebviewPanel;
  #operations: Operations | undefined;
  #channel: vscode.OutputChannel;
  #disposed = false;
  /**
   * The machine a play channel is open on, or null where none is.
   *
   * Held here because a play channel is this panel's: it is opened when a
   * listing is run and it ends when a debug session asks to mirror the same
   * machine, which is the toolchain's rule rather than ours. What reads the
   * machine needs to know which of the two it is looking at, because only one
   * of them goes on running with nothing having asked it to.
   */
  #playing: string | null = null;

  private constructor(panel: vscode.WebviewPanel, channel: vscode.OutputChannel) {
    this.#panel = panel;
    this.#channel = channel;
    this.#panel.onDidDispose(() => void this.#dispose());
  }

  static show(channel: vscode.OutputChannel): MachinePanel {
    if (current) {
      current.#panel.reveal(vscode.ViewColumn.Beside, true);
      return current;
    }
    const panel = vscode.window.createWebviewPanel(
      VIEW_TYPE,
      'Basically machine',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
      {
        enableScripts: true,
        // The machine goes on running while the panel is in a background tab;
        // rebuilding the frame on every switch would restart it.
        retainContextWhenHidden: true,
      },
    );
    current = new MachinePanel(panel, channel);
    return current;
  }

  /** The panel this window has, or none where nothing has been run yet. */
  static current(): MachinePanel | undefined {
    return current;
  }

  /**
   * The conversation this window's machine is held on, started if need be.
   *
   * One connection to a window, because the toolchain gives one machine to one
   * connection: the panel and a debug session ask different things of the same
   * machine rather than holding one each.
   */
  connection(launch: ServerLaunch): Operations {
    return (this.#operations ??= Operations.start(launch, (line) =>
      this.#channel.appendLine(line),
    ));
  }

  /** Close the panel, which lets the machine go. */
  close(): void {
    this.#panel.dispose();
  }

  async #dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    if (current === this) current = undefined;
    this.#playing = null;
    const operations = this.#operations;
    this.#operations = undefined;
    await operations?.dispose();
  }

  /** Everything the extension does to this panel goes through here. */
  async play(document: vscode.TextDocument, extensionPath: string): Promise<void> {
    this.#panel.title = `Basically — ${shortName(document)}`;
    this.#say('Starting the machine…');

    const config = vscode.workspace.getConfiguration(CONFIG_SECTION, document.uri);
    const launch = launchForDocument(document, extensionPath);

    try {
      await this.#playOn(document, config, launch);
    } catch (error) {
      if (error instanceof OperationFailed) {
        this.#say(
          'The toolchain could not run this listing.',
          error.message,
          'Installing the toolchain with "npm install -g @ba.sical.ly/cli" and setting ' +
            'basically.server.path points the client at a copy of your own.',
        );
        return;
      }
      this.#say(
        `Could not talk to the toolchain (${launch.command}).`,
        describe(error),
        'Install the toolchain with "npm install -g @ba.sical.ly/cli" and set ' +
          'basically.server.path, or set basically.server.nodePath to a Node.js 22 or newer.',
      );
    }
  }

  /**
   * Show the machine as a mirror, which is what a debug session watches.
   *
   * The same frame as playing, pointed at the other address and captioned, so
   * the user is not left pressing keys at a picture. How keys actually reach a
   * debugged program is said in the debug console at the moment a program
   * stops answering, which is when it matters.
   */
  async mirror(address: string, machineName: string): Promise<void> {
    // Asking to watch a machine ends the playing of it, so what was being
    // played is no longer being played whatever else this does.
    this.#playing = null;
    await this.#frame(
      address,
      machineName,
      `Mirroring the ${machineName} while it is debugged — send it keys from ` +
        'the debug console.',
    );
  }

  /** The debug session let the machine go, so there is nothing to show. */
  sessionEnded(machineName: string): void {
    this.#playing = null;
    this.#say(
      `The debug session has ended and the ${machineName} has been let go.`,
      'Start another session to stop the listing on a line again, or run it to ' +
        'play the machine and type at it.',
    );
  }

  /**
   * The conversation this window's machine is held on, or undefined where none
   * has been started.
   *
   * Separate from `connection`, which starts one: something that only reads the
   * machine must never be what brings a toolchain process into being. A window
   * that has run nothing has nothing to read.
   */
  held(): Operations | undefined {
    return this.#operations;
  }

  /**
   * The machine this panel is playing, or null where it is playing none.
   *
   * Null covers a panel showing nothing, one mirroring a debugged machine, and
   * one whose machine has gone. Only a machine that is being played advances
   * with nothing having asked it to, so only that one is worth reading on a
   * timer.
   */
  playing(): string | null {
    return this.#playing;
  }

  /** Reveal this panel without disturbing what it is showing. */
  reveal(): void {
    this.#panel.reveal(vscode.ViewColumn.Beside, true);
  }

  /** Title the panel for the listing a session is about. */
  titleFor(document: vscode.TextDocument, suffix = ''): void {
    this.#panel.title = `Basically — ${shortName(document)}${suffix}`;
  }

  /** What the panel says while nothing is showing yet. */
  starting(heading: string): void {
    this.#say(heading);
  }

  async #playOn(
    document: vscode.TextDocument,
    config: vscode.WorkspaceConfiguration,
    launch: ServerLaunch,
  ): Promise<void> {
    // Started on the first run rather than at activation, so a user who never
    // runs a listing never pays for a second toolchain process. Kept afterwards,
    // because letting it go would let the machine go with it.
    const operations = this.connection(launch);
    this.#playing = null;
    // A connection holds one machine, so the one a previous run left is let go
    // before this run asks for another. A no-op on the first run.
    await operations.ask('release');

    // The editor's text, unsaved changes and all — the language server already
    // sees the buffer rather than the file, so a listing with no problems shown
    // would otherwise refuse to run for reasons the user could not see. Nothing
    // but the text is sent: the toolchain resolves no location of ours.
    const source = document.getText();

    const configured = config.get<string>('machine', '');
    const declared = await operations.declaredMachine(source);
    let plan = planRun(await operations.machines(), declared, configured);

    if (plan.kind === 'needs-roms') {
      // Asked and recorded before anything is obtained; a machine that still
      // cannot be run afterwards is said so rather than attempted.
      const obtained = await this.#obtainRoms(launch, plan.machine);
      if (!obtained) return;
      plan = planRun(await operations.machines(), declared, configured);
    }
    if (plan.kind !== 'run') {
      this.#explain(plan);
      return;
    }

    const report = await operations.run(plan.machine.id, source);
    const fatal = report.errors.filter((problem) => problem.fatal !== false);
    if (fatal.length > 0) {
      this.#say(
        `The ${report.machine.name} could not run this listing.`,
        ...fatal.map(
          (problem) => `Line ${problem.line}: ${problem.message}`,
        ),
      );
      return;
    }

    const played = await operations.play();
    if (played.problem !== null) {
      this.#say(`The ${report.machine.name} cannot be played.`, played.problem);
      return;
    }
    this.#playing = report.machine.name;
    await this.#frame(played.address, report.machine.name);
  }

  /** Why the listing is not being run, and what to do about it. */
  #explain(plan: Exclude<RunPlan, { kind: 'run' }>): void {
    switch (plan.kind) {
      case 'no-machine':
        this.#say(
          'This listing does not say which machine it is for.',
          'Add a "#MACHINE" line at the top of it, or run "Basically: Choose the machine to ' +
            'check against" to set basically.machine.',
        );
        return;
      case 'unknown-machine':
        this.#say(
          `This server has no machine called "${plan.wanted}".`,
          'Run "Basically: Choose the machine to check against" to pick from the machines it has.',
        );
        return;
      case 'needs-roms':
        this.#say(
          `This server cannot run the ${plan.machine.name}.`,
          'It needs ROM images that are not held here, and obtaining them did not supply them.',
          'Installing the toolchain with "npm install -g @ba.sical.ly/cli" and setting ' +
            'basically.server.path points the client at a copy of your own — on the same ' +
            'terms as choosing which server serves the language.',
        );
        return;
    }
  }

  /**
   * Ask before anything is obtained, and record the answer through the
   * toolchain's own agree-in-advance path. Declining is not a failed run.
   */
  async #obtainRoms(launch: ServerLaunch, machine: Machine): Promise<boolean> {
    const status = await romStatus(launch);
    if (!status.agreed) {
      const download = 'Download the images';
      const terms = 'Read the terms';
      for (;;) {
        const answer = await vscode.window.showInformationMessage(
          `Running the ${machine.name} needs its original ROM images, which are not part of ` +
            'the toolchain. They would be downloaded from ' +
            `${status.publishedAt} into ${status.home}, and they carry their own terms.`,
          { modal: true },
          download,
          terms,
        );
        if (answer === terms) {
          await vscode.env.openExternal(vscode.Uri.parse(ROM_TERMS_URL));
          continue;
        }
        if (answer !== download) {
          this.#say(
            `Nothing was downloaded, so the ${machine.name} cannot be run here.`,
            'You declined the ROM images the machine needs. Nothing has changed.',
            `Their terms are at ${ROM_TERMS_URL}. Run this listing again to be asked once more, ` +
              'or point basically.server.path at a toolchain holding images of your own.',
          );
          return false;
        }
        break;
      }
    }
    this.#say(`Obtaining the images the ${machine.name} needs…`);
    await acceptRoms(launch);
    return true;
  }

  /**
   * The frame, pointed at the address, with nothing of ours added to it beyond
   * a caption where one is called for.
   */
  async #frame(
    address: string,
    machineName: string,
    caption?: string,
  ): Promise<void> {
    // Where the extension runs on one machine and the window is on another the
    // address is on the wrong side; this is what carries it across, and costs
    // nothing when both are the same machine.
    const external = await vscode.env.asExternalUri(vscode.Uri.parse(address));
    const origin = `${external.scheme}://${external.authority}`;
    this.#panel.webview.html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; frame-src ${origin}; style-src 'unsafe-inline';"
    />
    <title>${escape(machineName)}</title>
    <style>
      html, body { height: 100%; margin: 0; background: #000; }
      body { display: flex; flex-direction: column; }
      p.caption {
        margin: 0;
        padding: 0.4rem 0.75rem;
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        color: var(--vscode-descriptionForeground);
        background: var(--vscode-editorWidget-background);
      }
      iframe { display: block; flex: 1; width: 100%; border: 0; }
    </style>
  </head>
  <body>
    ${caption ? `<p class="caption">${escape(caption)}</p>` : ''}
    <iframe
      src="${escape(external.toString(true))}"
      title="${escape(machineName)}"
      allow="autoplay; clipboard-read; clipboard-write"
    ></iframe>
  </body>
</html>`;
  }

  /** What the panel says when there is no machine to show. */
  #say(heading: string, ...lines: string[]): void {
    this.#panel.webview.html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
    <title>${escape(heading)}</title>
    <style>
      body {
        margin: 0;
        padding: 1.5rem;
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        color: var(--vscode-foreground);
      }
      h1 { font-size: 1.1em; font-weight: 600; margin: 0 0 0.75em; }
      p { margin: 0 0 0.75em; max-width: 60ch; line-height: 1.5; }
    </style>
  </head>
  <body>
    <h1>${escape(heading)}</h1>
    ${lines.map((line) => `<p>${escape(line)}</p>`).join('\n    ')}
  </body>
</html>`;
  }
}

/**
 * Where the server is and what runs it, for the listing being acted on.
 *
 * Resolved for each operation rather than remembered from the language
 * server's, so a settings change reaches every conversation alike; and scoped
 * to the document, because a workspace may point one folder at a server of its
 * own.
 */
export function launchForDocument(
  document: vscode.TextDocument,
  extensionPath: string,
): ServerLaunch {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION, document.uri);
  return launchFor(
    locateServer(config.get<string>('server.path', ''), extensionPath),
    {
      configuredNodePath: config.get<string>('server.nodePath', ''),
      editorExecPath: process.execPath,
      editorNodeVersion: process.versions.node,
    },
  );
}

/**
 * Let the machine go when the editor stops without the panel being closed.
 *
 * Disposing the panel is what does it: the toolchain lets a machine go when the
 * connection holding it ends, and closing the panel ends that connection.
 */
export function closeMachinePanel(): void {
  current?.close();
}

function shortName(document: vscode.TextDocument): string {
  const path = document.uri.path;
  return path.slice(path.lastIndexOf('/') + 1) || 'listing';
}

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
