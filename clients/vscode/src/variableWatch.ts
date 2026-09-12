// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * What the user is told the machine holds, and when it is worth asking again.
 *
 * Kept free of the `vscode` module, like `machineStatus.ts` and `operations.ts`,
 * so a plain Node test can drive what a user would be shown for each answer with
 * no editor and no server involved. The view it is shown in is
 * `variableWatchView.ts`.
 *
 * Every value here is the server's. What a variable holds is read from the
 * machine this window is holding, through the operation that reports them;
 * nothing is worked out from anything the client has, and a machine that cannot
 * report its variables is said to be one rather than shown as empty.
 */
import type { VariableReport, VariablesReport } from './operations';

/** What the view is showing, which is one of these and never a mixture. */
export type WatchState =
  /** Nothing has been run, so there is no machine to read. */
  | { kind: 'no-machine' }
  /** Asked for, and not answered yet. Only ever shown before a first answer. */
  | { kind: 'reading' }
  /** The server's account of them; empty where the program holds none yet. */
  | { kind: 'variables'; machine: string; variables: VariableReport[] }
  /** This machine cannot say what its variables hold. */
  | { kind: 'cannot-report'; machine: string }
  /** This server will not report them while the machine is being played. */
  | { kind: 'not-while-played'; machine: string }
  /** The question could not be put at all. */
  | { kind: 'unavailable' };

/** Where a reading comes from, or null where this window holds no machine. */
export interface WatchSource {
  /** Named in what the user is told, so it says which machine cannot report. */
  machine: string;
  read(): Promise<VariablesReport>;
}

/**
 * What each kind is called, as the IDE's own watcher calls it: the table is the
 * same table, so a user who has seen one recognises the other.
 */
const KIND_LABELS: Record<VariableReport['kind'], string> = {
  number: 'number',
  string: 'string',
  'number-array': 'num array',
  'string-array': 'str array',
};

/** One variable as a row: what it is called, what it holds, and what it is. */
export interface VariableRow {
  name: string;
  value: string;
  kind: string;
}

/** What the view shows: rows, a sentence instead, or nothing at all. */
export type WatchContent =
  | { kind: 'rows'; rows: VariableRow[] }
  | { kind: 'message'; text: string }
  /** Nothing of ours: the editor draws its own welcome over an empty view. */
  | { kind: 'welcome' };

/**
 * What to show for an answer.
 *
 * A sentence rather than an emptiness for every state but the first: a table
 * showing nothing looks the same whether the program holds no variables, the
 * machine cannot report them, or the server will not answer, and those are
 * three different things to be told. Holding no machine is the exception,
 * because the editor's own welcome says it better than a row can - it can
 * offer the running of a listing rather than only describe it.
 */
export function contentFor(state: WatchState): WatchContent {
  switch (state.kind) {
    case 'no-machine':
      return { kind: 'welcome' };
    case 'reading':
      return { kind: 'message', text: 'Reading the machine…' };
    case 'variables':
      return state.variables.length === 0
        ? { kind: 'message', text: 'This program holds no variables yet.' }
        : { kind: 'rows', rows: state.variables.map(rowFor) };
    case 'cannot-report':
      return {
        kind: 'message',
        text: `The ${state.machine} cannot report what its variables hold.`,
      };
    // Named as the server's limitation and not the machine's, because the same
    // machine on a newer toolchain reports them perfectly well.
    case 'not-while-played':
      return {
        kind: 'message',
        text:
          `This server does not report what the ${state.machine} holds while ` +
          'the machine is being played. Debug the listing to see them at a ' +
          'stop, or point basically.server.path at a newer toolchain.',
      };
    case 'unavailable':
      return { kind: 'message', text: 'The machine could not be read.' };
  }
}

function rowFor(variable: VariableReport): VariableRow {
  return {
    name: variable.name,
    value: variable.value,
    kind: KIND_LABELS[variable.kind],
  };
}

/** Whether the server refused because the machine is being driven by a person. */
function refusedForPlaying(message: string): boolean {
  return /being played/i.test(message);
}

/** Whether the server refused because this window is holding no machine. */
function refusedForNoMachine(message: string): boolean {
  return /no machine is up/i.test(message);
}

/**
 * The machine's variables, read when there is reason to and never twice at once.
 *
 * Single-flight because replies are matched by id rather than by order: two
 * reads in flight are legal on the wire and would simply queue on the machine's
 * own thread, each answering later than the last. Skipping a read while one is
 * outstanding makes the cadence self-limiting - a server that answers slowly is
 * asked less often rather than asked more.
 */
export class VariableWatch {
  #source: () => WatchSource | null;
  #show: (state: WatchState) => void;
  #state: WatchState = { kind: 'no-machine' };
  #reading = false;

  constructor(
    source: () => WatchSource | null,
    show: (state: WatchState) => void,
  ) {
    this.#source = source;
    this.#show = show;
  }

  /** What the view is showing, for a caller that has just been attached. */
  get state(): WatchState {
    return this.#state;
  }

  /** Read once, unless a read is already outstanding. */
  async refresh(): Promise<void> {
    const source = this.#source();
    if (!source) {
      this.#settle({ kind: 'no-machine' });
      return;
    }
    if (this.#reading) return;
    this.#reading = true;
    // Only before a first answer: replacing a table the user is reading with
    // "reading" twice a second would be a worse table than a slightly old one.
    if (this.#state.kind === 'no-machine') this.#settle({ kind: 'reading' });
    try {
      const report = await source.read();
      this.#settle(
        report.variables === null
          ? { kind: 'cannot-report', machine: source.machine }
          : {
              kind: 'variables',
              machine: source.machine,
              variables: report.variables,
            },
      );
    } catch (error) {
      this.#settle(this.#refusal(error, source.machine));
    } finally {
      this.#reading = false;
    }
  }

  /** A machine that has gone: shown as one rather than left showing its last. */
  released(): void {
    this.#settle({ kind: 'no-machine' });
  }

  /**
   * What a refusal means, read from what the server said rather than from a
   * code, the way the client already reads the machineless lint refusal. A
   * server older than the one this client pins refuses a read of a played
   * machine, and that is a state to be shown rather than a fault to be thrown:
   * the user has a working editor and a working machine, and one sentence is the
   * honest answer.
   */
  #refusal(error: unknown, machine: string): WatchState {
    const message = error instanceof Error ? error.message : String(error);
    if (refusedForPlaying(message)) return { kind: 'not-while-played', machine };
    if (refusedForNoMachine(message)) return { kind: 'no-machine' };
    return { kind: 'unavailable' };
  }

  #settle(state: WatchState): void {
    this.#state = state;
    this.#show(state);
  }
}
