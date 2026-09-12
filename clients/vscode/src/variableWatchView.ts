// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The view saying what the machine this window is holding holds.
 *
 * A view of the user's own rather than the pane the editor draws for a stopped
 * session: it can be put where they work, it is there whether the listing is
 * being played or debugged, and it does not come and go with a debug session.
 * What it shows for each answer is `variableWatch.ts`; this is the tree it is
 * shown in and the two things that make it read again.
 *
 * It holds no machine and runs nothing. The machine is the panel's — one
 * connection to a window, shared with a debug session, because the toolchain
 * gives one machine to one connection.
 */
import * as vscode from 'vscode';

import { MachinePanel } from './machinePanel';
import {
  VariableWatch,
  contentFor,
  type VariableRow,
  type WatchSource,
} from './variableWatch';

export const VARIABLES_VIEW = 'basically.variables';

/**
 * What a debug session tells about where its program got to.
 *
 * Narrow on purpose: a session reports, and what it reports to is none of its
 * business. It is what lets the debug registration be independent of whether
 * this view was registered at all.
 */
export interface ProgramWatcher {
  moved(): void;
  released(): void;
}

/**
 * How often a played machine is read, in milliseconds.
 *
 * A played machine advances on its own clock, so what it holds can change with
 * nothing having asked it to, and only reading again shows it. Slower than the
 * browser IDE's own watcher, which reads the emulator in the same process: this
 * one crosses a pipe and a machine's worker thread, and a few readings a second
 * is a table that keeps up with a program without asking more of the machine
 * than watching it is worth. Not a setting — how often to read is not a
 * decision to hand a user.
 */
const PLAYED_INTERVAL_MS = 500;

/** A variable, or the sentence shown where there are none to show. */
type Node =
  | { kind: 'variable'; row: VariableRow }
  | { kind: 'message'; text: string };

export class VariableWatchView
  implements vscode.TreeDataProvider<Node>, ProgramWatcher
{
  #changed = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.#changed.event;

  #watch: VariableWatch;
  #view: vscode.TreeView<Node> | undefined;
  #timer: ReturnType<typeof setInterval> | undefined;

  private constructor() {
    this.#watch = new VariableWatch(
      () => this.#source(),
      () => this.#changed.fire(),
    );
  }

  /** Put the view in the editor and keep it current for as long as it runs. */
  static register(context: vscode.ExtensionContext): VariableWatchView {
    const provider = new VariableWatchView();
    const view = vscode.window.createTreeView(VARIABLES_VIEW, {
      treeDataProvider: provider,
    });
    provider.#view = view;
    context.subscriptions.push(
      view,
      // A view nobody is looking at is not worth reading a machine for, and a
      // background tab is nobody looking.
      view.onDidChangeVisibility(() => provider.#pace()),
      new vscode.Disposable(() => provider.#stop()),
    );
    provider.#pace();
    return provider;
  }

  /**
   * The program moved, so read it again.
   *
   * What a debug session calls at every stop. A debugged machine advances only
   * when something asks it to, so this is the whole of when there is anything
   * new to see on one.
   */
  moved(): void {
    void this.#watch.refresh();
  }

  /** The machine has gone; say so rather than leave its last values showing. */
  released(): void {
    this.#watch.released();
    this.#pace();
  }

  getTreeItem(node: Node): vscode.TreeItem {
    if (node.kind === 'message') {
      const item = new vscode.TreeItem(node.text);
      item.tooltip = node.text;
      return item;
    }
    const item = new vscode.TreeItem(node.row.name);
    // The value beside the name rather than under it, which is the shape of
    // every variables table the user has seen, this machine's included.
    item.description = node.row.value;
    item.tooltip = `${node.row.name} (${node.row.kind}) = ${node.row.value}`;
    return item;
  }

  getChildren(node?: Node): Node[] {
    // A flat table: an array reports its shape and a preview as its value,
    // because that is what the server reports for one. Nothing expands.
    if (node) return [];
    const content = contentFor(this.#watch.state);
    switch (content.kind) {
      // Nothing, so the editor draws the welcome the manifest contributes -
      // which can offer the running of a listing rather than only describe it.
      case 'welcome':
        return [];
      case 'message':
        return [{ kind: 'message', text: content.text }];
      case 'rows':
        return content.rows.map((row) => ({ kind: 'variable' as const, row }));
    }
  }

  /** Where a reading comes from, or null where this window holds no machine. */
  #source(): WatchSource | null {
    const panel = MachinePanel.current();
    const machine = panel?.playing();
    if (!panel || !machine) return null;
    const operations = panel.held();
    if (!operations) return null;
    return { machine, read: () => operations.variables() };
  }

  /**
   * Read on a timer only while a machine is being played, and only while
   * somebody is looking.
   */
  #pace(): void {
    const wanted = this.#view?.visible === true && this.#source() !== null;
    if (!wanted) {
      this.#stop();
      return;
    }
    void this.#watch.refresh();
    if (this.#timer) return;
    this.#timer = setInterval(() => {
      if (this.#source() === null) {
        this.#stop();
        this.#changed.fire();
        return;
      }
      void this.#watch.refresh();
    }, PLAYED_INTERVAL_MS);
  }

  #stop(): void {
    if (!this.#timer) return;
    clearInterval(this.#timer);
    this.#timer = undefined;
  }

  /** A listing has been run, so there may be a machine where there was none. */
  playing(): void {
    this.#pace();
  }
}
