// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Where the machine's memory is being mapped, and what the user is told when it
 * is being mapped nowhere.
 *
 * Kept free of the `vscode` module, like `variableWatch.ts` and `operations.ts`,
 * so a plain Node test can drive what a user would be shown for each answer with
 * no editor and no server involved. The view it is shown in is
 * `memoryMapView.ts`.
 *
 * Nothing here knows what a map looks like. The layout, the addresses the
 * machine is touching, and how either is drawn are the toolchain's; this asks
 * where one is being served and says what it was told when the answer is
 * nowhere. Whoever holds the address it hands on can watch the machine's memory
 * and can do nothing else: they cannot act on the machine, and they cannot
 * learn what any address holds, because a map reports which addresses were
 * touched and never their contents.
 */
import type { MapReport } from './operations';

/** What the view is showing, which is one of these and never a mixture. */
export type MapState =
  /** Nothing has been run, so there is no machine to map. */
  | { kind: 'no-machine' }
  /** Asked for, and not answered yet. Only ever shown before a first answer. */
  | { kind: 'opening' }
  /** Where the toolchain is serving the map, for a frame to be pointed at. */
  | { kind: 'mapped'; address: string }
  /** There is no map of this machine, in the words the toolchain gave. */
  | { kind: 'cannot-map'; problem: string }
  /** This server projects no map at all. */
  | { kind: 'no-projection' }
  /** The question could not be put at all. */
  | { kind: 'unavailable' };

/** Where a map comes from, or null where this window holds no conversation. */
export interface MapSource {
  open(): Promise<MapReport>;
}

/**
 * What the view shows: a frame pointed somewhere, or something said instead.
 *
 * Never an empty frame. An address that shows nothing and a machine that has no
 * map look the same to a reader, and one of them is a thing to be told.
 */
export type MapContent =
  /** Point a frame here and put nothing of ours inside it. */
  | { kind: 'frame'; address: string }
  /** Say this instead, offering a listing to run where that is what is missing. */
  | { kind: 'message'; heading: string; lines: string[]; offerRun: boolean };

/**
 * What to show for an answer.
 *
 * A sentence for every state, because the ways a map can be missing are things
 * the user is owed rather than emptinesses to be read: a server that projects
 * none, a machine whose layout the toolchain does not describe, and a window
 * holding no machine are three different answers with three different remedies,
 * and an empty frame would be all of them at once.
 */
export function contentFor(state: MapState): MapContent {
  switch (state.kind) {
    case 'no-machine':
      return {
        kind: 'message',
        heading: 'No machine is up in this window.',
        lines: [
          'Run a listing to play its machine, or debug one to stop it on a ' +
            'line, and where its program is living in memory is mapped here.',
        ],
        offerRun: true,
      };
    case 'opening':
      return {
        kind: 'message',
        heading: 'Mapping the memory of this machine…',
        lines: [],
        offerRun: false,
      };
    case 'mapped':
      return { kind: 'frame', address: state.address };
    // The toolchain's own words. Which machines have a described layout is the
    // server's to know and to change, so a client that wrote its own sentence
    // here would be stating a fact it has no way to check.
    case 'cannot-map':
      return {
        kind: 'message',
        heading: 'The memory of this machine cannot be mapped.',
        lines: [state.problem],
        offerRun: false,
      };
    // Named as the server's limitation and not the machine's: the same machine
    // on a newer toolchain is mapped perfectly well.
    case 'no-projection':
      return {
        kind: 'message',
        heading: 'This server does not project a memory map.',
        lines: [
          'Point basically.server.path at a newer toolchain to see one. ' +
            'Everything else goes on working as it did.',
        ],
        offerRun: false,
      };
    case 'unavailable':
      return {
        kind: 'message',
        heading: 'The memory of this machine could not be mapped.',
        lines: [],
        offerRun: false,
      };
  }
}

/** Whether the server has never heard of the operation that projects a map. */
function refusedForNoSuchOperation(message: string): boolean {
  return /no (?:operation|tool) called "map"/i.test(message);
}

/** Whether the server refused because this window is holding no machine. */
function refusedForNoMachine(message: string): boolean {
  return /no machine is up/i.test(message);
}

/** Whether the toolchain answered that it has nowhere to serve a map. */
function hasNowhereToProject(problem: string): boolean {
  return /cannot project a map/i.test(problem);
}

/**
 * Where the map is, asked for when there is reason to and never twice at once.
 *
 * Asked once and then left alone: a map belongs to the caller rather than to
 * any one machine, so the address a conversation was given goes on showing
 * whatever machine that conversation holds, and a program run after the last
 * one has gone appears at the address that is already framed. Nothing here
 * paces the map itself - the page at that address follows the machine on its
 * own, and the client keeps no account of what it draws.
 *
 * Single-flight for the reason the variables watch is: replies are matched by
 * id rather than by order, so a second ask while one is outstanding would queue
 * behind it on the machine's own thread and answer later than it.
 */
export class MemoryMap {
  #source: () => MapSource | null;
  #show: (state: MapState) => void;
  #state: MapState = { kind: 'no-machine' };
  #opening = false;

  constructor(source: () => MapSource | null, show: (state: MapState) => void) {
    this.#source = source;
    this.#show = show;
  }

  /** What the view is showing, for a caller that has just been attached. */
  get state(): MapState {
    return this.#state;
  }

  /** Ask for a map, unless there is one already or an asking is outstanding. */
  async refresh(): Promise<void> {
    const source = this.#source();
    if (!source) {
      this.#settle({ kind: 'no-machine' });
      return;
    }
    if (this.#state.kind === 'mapped') return;
    if (this.#opening) return;
    this.#opening = true;
    // Only before a first answer, so a refusal already on the screen is not
    // replaced by "mapping" every time the user looks at the view again.
    if (this.#state.kind === 'no-machine') this.#settle({ kind: 'opening' });
    try {
      this.#settle(this.#answer(await source.open()));
    } catch (error) {
      this.#settle(this.#refusal(error));
    } finally {
      this.#opening = false;
    }
  }

  /** A machine that has gone: the map is asked for afresh for the next one. */
  released(): void {
    this.#settle({ kind: 'no-machine' });
  }

  /**
   * What an answer with no address means, read from what the toolchain said
   * rather than from a code, the way the client already reads the machineless
   * lint refusal. A toolchain with nowhere to serve a map and a machine whose
   * layout it does not describe are two answers with two different remedies,
   * and only the first is anything the user can do something about.
   */
  #answer(report: MapReport): MapState {
    if (report.address !== null) {
      return { kind: 'mapped', address: report.address };
    }
    const problem = report.problem ?? '';
    if (hasNowhereToProject(problem)) return { kind: 'no-projection' };
    return problem === ''
      ? { kind: 'unavailable' }
      : { kind: 'cannot-map', problem };
  }

  /**
   * What a refusal means. A server older than the one this client pins has
   * never heard of the operation and refuses the whole request over its name;
   * that is a state to be shown rather than a fault to be thrown, because a
   * client never refuses over a version number and the user has a working
   * editor and a working machine either way.
   */
  #refusal(error: unknown): MapState {
    const message = error instanceof Error ? error.message : String(error);
    if (refusedForNoSuchOperation(message)) return { kind: 'no-projection' };
    if (refusedForNoMachine(message)) return { kind: 'no-machine' };
    return { kind: 'unavailable' };
  }

  #settle(state: MapState): void {
    this.#state = state;
    this.#show(state);
  }
}
