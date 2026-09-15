// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The view showing where in memory the machine this window is holding is
 * working.
 *
 * A view of the user's own, like the variables one: it can be docked where they
 * work — a memory map is tall and narrow, which is the shape a side dock gives
 * it — it is there whether the listing is being played or debugged, and it does
 * not come and go with a debug session.
 *
 * What is in the frame is the toolchain's page, exactly as the machine's own
 * picture is. The client resolves the address for the editor's outer window,
 * frames it under a policy naming that origin and nothing else, and puts
 * nothing of its own inside the frame: the layout, the addresses the machine is
 * touching, and how either is drawn are none of this client's business.
 *
 * It holds no machine and starts nothing. The conversation is the panel's, and
 * it is asked for the one it is already holding rather than for one to be
 * started: a map watches a machine that exists, and looking at an empty view is
 * not a reason to spend a toolchain process.
 */
import * as vscode from 'vscode';

import { MachinePanel } from './machinePanel';
import { contentFor, MemoryMap, type MapSource } from './memoryMap';
import type { MachineWatcher } from './programWatchers';

export const MEMORY_VIEW = 'basically.memory';

export class MemoryMapView
  implements vscode.WebviewViewProvider, MachineWatcher
{
  #map: MemoryMap;
  #view: vscode.WebviewView | undefined;

  private constructor() {
    this.#map = new MemoryMap(
      () => this.#source(),
      () => void this.#render(),
    );
  }

  /** Put the view in the editor and keep it current for as long as it runs. */
  static register(context: vscode.ExtensionContext): MemoryMapView {
    const provider = new MemoryMapView();
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(MEMORY_VIEW, provider),
    );
    return provider;
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.#view = view;
    view.webview.options = {
      // Nothing of ours runs in here: the frame's own origin is what the
      // policy admits, and the only script on the page is the toolchain's,
      // inside the frame and served from there.
      enableScripts: true,
      // For the one link the view offers where there is no machine, which runs
      // the command the editor's own welcome would have offered.
      enableCommandUris: true,
    };
    // A view nobody is looking at is not worth mapping a machine for, and a
    // background tab is nobody looking: the frame goes with the view, and the
    // toolchain records nothing about a machine nobody is watching.
    view.onDidChangeVisibility(() => this.#pace());
    view.onDidDispose(() => {
      this.#view = undefined;
    });
    this.#pace();
  }

  /**
   * The program moved, so there may be a machine to map where there was none.
   *
   * What a debug session calls at every stop. Nothing is re-read here: the map
   * follows the machine on its own, and what a step touched is on the page
   * before this returns.
   */
  moved(): void {
    this.#pace();
  }

  /** The machine has gone; the next one is mapped afresh. */
  released(): void {
    this.#map.released();
    this.#pace();
  }

  /** A listing has been run, so there may be a machine where there was none. */
  playing(): void {
    this.#pace();
  }

  /** Where a map comes from, or null where this window holds no conversation. */
  #source(): MapSource | null {
    // The conversation the panel is already holding, never one to be started:
    // a window that has run nothing has nothing to map, and the server says so
    // for a conversation holding no machine.
    const operations = MachinePanel.current()?.held();
    return operations ? { open: () => operations.map() } : null;
  }

  /**
   * Draw what is known, and ask for what is not.
   *
   * Both, because a view that has just been shown again is a fresh webview with
   * nothing in it, and the state it is to show may be one settled long before —
   * a map already open is not asked for a second time, so nothing would settle
   * and nothing would be drawn.
   */
  #pace(): void {
    if (this.#view?.visible !== true) return;
    void this.#render();
    void this.#map.refresh();
  }

  async #render(): Promise<void> {
    const view = this.#view;
    if (!view) return;
    const content = contentFor(this.#map.state);
    if (content.kind === 'message') {
      view.webview.html = say(content.heading, content.lines, content.offerRun);
      return;
    }
    // Where the extension runs on one machine and the window is on another the
    // address is on the wrong side; this is what carries it across, and costs
    // nothing when both are the same machine.
    const external = await vscode.env.asExternalUri(
      vscode.Uri.parse(content.address),
    );
    // Settled again, because resolving the address yields and the machine may
    // have gone in the meantime.
    if (this.#view !== view) return;
    view.webview.html = frame(external);
  }
}

/** The frame, pointed at the address, with nothing of ours inside it. */
function frame(external: vscode.Uri): string {
  const origin = `${external.scheme}://${external.authority}`;
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; frame-src ${origin}; style-src 'unsafe-inline';"
    />
    <title>Machine memory</title>
    <style>
      html, body { height: 100%; margin: 0; background: #000; }
      iframe { display: block; height: 100%; width: 100%; border: 0; }
    </style>
  </head>
  <body>
    <iframe
      src="${escape(external.toString(true))}"
      title="Machine memory"
      referrerpolicy="no-referrer"
    ></iframe>
  </body>
</html>`;
}

/** What the view says when there is no map to show. */
function say(heading: string, lines: string[], offerRun: boolean): string {
  const offer = offerRun
    ? '<p><a href="command:basically.runListing">Run this listing</a></p>'
    : '';
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
    <title>${escape(heading)}</title>
    <style>
      body {
        margin: 0;
        padding: 1rem;
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        color: var(--vscode-foreground);
      }
      h1 { font-size: 1.05em; font-weight: 600; margin: 0 0 0.6em; }
      p { margin: 0 0 0.6em; max-width: 60ch; line-height: 1.5; }
      a { color: var(--vscode-textLink-foreground); }
    </style>
  </head>
  <body>
    <h1>${escape(heading)}</h1>
    ${lines.map((line) => `<p>${escape(line)}</p>`).join('\n    ')}
    ${offer}
  </body>
</html>`;
}

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
