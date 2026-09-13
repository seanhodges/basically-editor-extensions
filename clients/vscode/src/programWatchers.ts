// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * What a run and a debug session tell about the machine this window is holding,
 * and how more than one thing gets told.
 *
 * Narrow on purpose: a session reports, and what it reports to is none of its
 * business. That is what lets the debug registration be independent of whether
 * any particular view was registered — and telling several changes nothing
 * about that narrowness, because a fan-out is still one listener as far as the
 * session is concerned.
 *
 * Free of the `vscode` module, so what joins here is the only part that needs
 * an editor.
 */

/** What a debug session tells about where its program got to. */
export interface ProgramWatcher {
  moved(): void;
  released(): void;
}

/** One that is also told when a listing has been run and played. */
export interface MachineWatcher extends ProgramWatcher {
  /** A listing has been run, so there may be a machine where there was none. */
  playing(): void;
}

/**
 * One watcher that tells every one of these.
 *
 * Each is told whatever the ones before it did: a view that throws must not
 * keep the news from the rest, because nothing here can be asked again and a
 * view that missed it would go on showing a machine that has gone.
 */
export function tellAll(
  watchers: readonly MachineWatcher[],
): MachineWatcher {
  const each = (tell: (watcher: MachineWatcher) => void): void => {
    for (const watcher of watchers) {
      try {
        tell(watcher);
      } catch {
        // Nothing to do about a view that cannot be told, and nothing worth
        // stopping the others for.
      }
    }
  };
  return {
    moved: () => each((watcher) => watcher.moved()),
    released: () => each((watcher) => watcher.released()),
    playing: () => each((watcher) => watcher.playing()),
  };
}
