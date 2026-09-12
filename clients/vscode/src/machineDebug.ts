// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The debug conversation: what the editor asks about a stopped program, and
 * what the machine the client holds answers.
 *
 * Every fact here is the toolchain's. Where the program is, what its variables
 * hold, what a step cost and whether this machine can be stepped at all are all
 * asked of the server that was resolved; nothing is worked out from anything
 * held in the client, and the client sets nothing running. What it does is
 * translate: a row of the editor into the BASIC line the machine stops before,
 * and an outcome of the toolchain into the events the editor draws its gutter,
 * its stopped line and its variables pane from.
 *
 * Kept free of the `vscode` module, like `server.ts` and `operations.ts`, so the
 * whole of it can be driven with no editor involved. The editor's side of it —
 * registering the type, filling in a configuration and pumping messages — is
 * `machineDebugAdapter.ts`.
 */
import { lineNumberOn, rowOfLine } from './debugLines';
import {
  OperationFailed,
  type DebugRunReport,
  type Machine,
  type Operations,
  type RunPlan,
} from './operations';

/** The debug type the manifest contributes, and the sessions it names. */
export const DEBUG_TYPE = 'basically';

/**
 * The one thread, the one frame, and the one scope.
 *
 * The protocol scopes variables to a frame, so a session with no frame has
 * nowhere to put them; BASIC as these machines run it has no call stack the
 * toolchain reports, so one is also the honest number.
 */
const THREAD_ID = 1;
const FRAME_ID = 1;
const VARIABLES_REFERENCE = 1;

/**
 * What the editor is told this session can do.
 *
 * The editor draws its toolbar, its gutter menus and its variables pane from
 * this, so every control it offers has to be one the session carries out —
 * which is the same fault as a semantic token the manifest gives no scope for,
 * and is checked the same way. Everything declined is named rather than left
 * out, because a reader of this list should be able to see that the declining
 * was meant.
 */
export const DEBUG_CAPABILITIES = {
  supportsConfigurationDoneRequest: true,
  supportsFunctionBreakpoints: false,
  supportsConditionalBreakpoints: false,
  supportsHitConditionalBreakpoints: false,
  supportsEvaluateForHovers: false,
  supportsStepBack: false,
  supportsSetVariable: false,
  supportsRestartFrame: false,
  supportsGotoTargetsRequest: false,
  supportsStepInTargetsRequest: false,
  supportsCompletionsRequest: false,
  supportsModulesRequest: false,
  supportsRestartRequest: false,
  supportsExceptionInfoRequest: false,
  supportsTerminateRequest: false,
  supportsDataBreakpoints: false,
  supportsReadMemoryRequest: false,
  supportsWriteMemoryRequest: false,
  supportsDisassembleRequest: false,
  supportsSetExpression: false,
  supportsInstructionBreakpoints: false,
  supportsSteppingGranularity: false,
  supportsLogPoints: false,
  supportsLoadedSourcesRequest: false,
  supportsBreakpointLocationsRequest: false,
  supportsSingleThreadExecutionRequests: false,
  /** No filter, so the editor offers no exception to break on. */
  exceptionBreakpointFilters: [] as const,
};

/**
 * Each declared control, and the request it reaches the session as.
 *
 * The pairing is what makes the two-way check mechanical: a control offered
 * with no request behind it is a button that fails when used, and a request
 * answered with the control declined is work nothing can ask for. A few of the
 * declarations gate a field of another request rather than a request of their
 * own — a condition on a breakpoint, a granularity on a step — and name no
 * request here.
 */
export const DEBUG_CONTROLS: readonly {
  capability: keyof typeof DEBUG_CAPABILITIES;
  requests: readonly string[];
}[] = [
  { capability: 'supportsConfigurationDoneRequest', requests: ['configurationDone'] },
  { capability: 'supportsFunctionBreakpoints', requests: ['setFunctionBreakpoints'] },
  { capability: 'supportsConditionalBreakpoints', requests: [] },
  { capability: 'supportsHitConditionalBreakpoints', requests: [] },
  { capability: 'supportsEvaluateForHovers', requests: [] },
  { capability: 'supportsStepBack', requests: ['stepBack', 'reverseContinue'] },
  { capability: 'supportsSetVariable', requests: ['setVariable'] },
  { capability: 'supportsRestartFrame', requests: ['restartFrame'] },
  { capability: 'supportsGotoTargetsRequest', requests: ['gotoTargets'] },
  { capability: 'supportsStepInTargetsRequest', requests: ['stepInTargets'] },
  { capability: 'supportsCompletionsRequest', requests: ['completions'] },
  { capability: 'supportsModulesRequest', requests: ['modules'] },
  { capability: 'supportsRestartRequest', requests: ['restart'] },
  { capability: 'supportsExceptionInfoRequest', requests: ['exceptionInfo'] },
  { capability: 'supportsTerminateRequest', requests: ['terminate'] },
  { capability: 'supportsDataBreakpoints', requests: ['setDataBreakpoints', 'dataBreakpointInfo'] },
  { capability: 'supportsReadMemoryRequest', requests: ['readMemory'] },
  { capability: 'supportsWriteMemoryRequest', requests: ['writeMemory'] },
  { capability: 'supportsDisassembleRequest', requests: ['disassemble'] },
  { capability: 'supportsSetExpression', requests: ['setExpression'] },
  { capability: 'supportsInstructionBreakpoints', requests: ['setInstructionBreakpoints'] },
  { capability: 'supportsSteppingGranularity', requests: [] },
  { capability: 'supportsLogPoints', requests: [] },
  { capability: 'supportsLoadedSourcesRequest', requests: ['loadedSources'] },
  { capability: 'supportsBreakpointLocationsRequest', requests: ['breakpointLocations'] },
  { capability: 'supportsSingleThreadExecutionRequests', requests: [] },
  { capability: 'exceptionBreakpointFilters', requests: [] },
];

/**
 * The requests every session answers whatever it declares.
 *
 * `stepIn` and `stepOut` are here because the editor draws those two buttons
 * for every stopped session and no declaration removes them. Both run the
 * program on to its next BASIC line, which is what stepping into or out of a
 * line means where there is nothing to step into: each button does what it
 * says, rather than failing when it is used.
 *
 * `setExceptionBreakpoints` is answered though no filter is offered, because a
 * session that refused it would open with a notice about a request nobody made.
 */
export const DEBUG_REQUESTS = [
  'initialize',
  'launch',
  'configurationDone',
  'setBreakpoints',
  'setExceptionBreakpoints',
  'threads',
  'stackTrace',
  'scopes',
  'variables',
  'continue',
  'next',
  'stepIn',
  'stepOut',
  'pause',
  'evaluate',
  'disconnect',
] as const;

type DebugRequest = (typeof DEBUG_REQUESTS)[number];

/** What is to be done about debugging a listing, before anything is attempted. */
export type DebugPlan =
  | { kind: 'debug'; machine: Machine }
  /** The server can run this machine but cannot stop a program on its lines. */
  | { kind: 'cannot-step'; machine: Machine }
  | Exclude<RunPlan, { kind: 'run' }>;

/**
 * Whether this listing can be debugged, from what the server answered.
 *
 * Two questions, and the second is the narrower: a server that can run a
 * machine may still be unable to say which BASIC line it is executing. Neither
 * answer is held here — both are the server's, asked of the server that is
 * actually serving, because the user may have pointed the client at a copy of
 * their own and the set of machines that can be stepped is the toolchain's to
 * change.
 */
export function planDebug(plan: RunPlan, canStep: boolean): DebugPlan {
  if (plan.kind !== 'run') return plan;
  return canStep
    ? { kind: 'debug', machine: plan.machine }
    : { kind: 'cannot-step', machine: plan.machine };
}

/** What the user is told when a listing cannot be debugged, and what is left. */
export interface DebugRefusal {
  heading: string;
  remedy: string;
  /** Whether running the listing is still worth offering instead. */
  offerRun: boolean;
}

/**
 * Why this listing is not being debugged, told apart from the other reasons.
 *
 * The three are different things with different remedies, and a user met with
 * one message for all of them would be sent to change a setting that was never
 * the problem. Only settings the client contributes are named.
 */
export function refusalFor(
  plan: Exclude<DebugPlan, { kind: 'debug' }>,
): DebugRefusal {
  switch (plan.kind) {
    case 'no-machine':
      return {
        heading: 'This listing does not say which machine it is for.',
        remedy:
          'Add a "#MACHINE" line at the top of it, or run "Basically: Choose ' +
          'the machine to check against" to set basically.machine.',
        offerRun: false,
      };
    case 'unknown-machine':
      return {
        heading: `This server has no machine called "${plan.wanted}".`,
        remedy:
          'Run "Basically: Choose the machine to check against" to pick from ' +
          'the machines it has.',
        offerRun: false,
      };
    case 'needs-roms':
      return {
        heading: `This server cannot run the ${plan.machine.name} at all.`,
        remedy:
          'It needs ROM images that are not held here. Run this listing to be ' +
          'asked about obtaining them, or install the toolchain with ' +
          '"npm install -g @ba.sical.ly/cli" and set basically.server.path to ' +
          'a copy holding images of your own.',
        offerRun: false,
      };
    case 'cannot-step':
      return {
        heading:
          `The ${plan.machine.name} cannot say which BASIC line it is ` +
          'executing, so a program on it cannot be stopped on one.',
        remedy:
          `You can still run the listing and play the ${plan.machine.name}, ` +
          'look at its screen and type at it.',
        offerRun: true,
      };
  }
}

/** How a listing reaches the machine, and where the answers are put. */
export interface DebugHost {
  /** The conversation the machine is held on, shared with the panel. */
  operations: Operations;
  /** The machine the listing is checked against, already settled. */
  machine: { id: string; name: string };
  /** The listing as it stands on the screen, unsaved changes included. */
  source: string;
  /** Where that listing is written, so the editor can highlight a row of it. */
  path: string;
  /** Point the editor's own surface at the address the machine is mirrored at. */
  mirror(address: string): Promise<void>;
  /** The machine has been let go; say so where the screen was. */
  released(): Promise<void>;
}

/** One message of the debug protocol, as the editor hands it over. */
export interface DebugProtocolMessage {
  seq: number;
  type: string;
  command?: string;
  arguments?: Record<string, unknown>;
}

type Handler = (args: Record<string, unknown>) => Promise<unknown> | unknown;

/**
 * How a schedule of keys is written, as an example rather than a grammar.
 *
 * The vocabulary is the toolchain's and is not restated here; what the user
 * needs at the moment a program is waiting is enough of it to type one key.
 */
function keysHint(machine: string): string {
  return (
    'Send it keys from this console: type a schedule such as `PRESS ENTER` or ' +
    '`TYPE "FRED"; PRESS ENTER`. The screen beside you mirrors the machine and ' +
    'does not take typing, so that the program only ever advances when ' +
    `something asked it to. "basically info ${machine}" lists the key names ` +
    'this machine answers to.'
  );
}

/**
 * One debug session, over one machine.
 *
 * The editor hands every message here and takes every response and event back
 * through `send`. Work that has to follow a response — the events that say a
 * session is under way, that a program stopped, that it ended — is run after
 * the response has gone, because an editor that has not been answered yet is
 * not listening for them.
 */
export class MachineDebugSession {
  #host: DebugHost;
  #send: (message: Record<string, unknown>) => void;
  #seq = 1;
  #handlers: Record<DebugRequest, Handler>;
  /** The BASIC lines in force, from the rows the user marked. */
  #lines: number[] = [];
  /** The line the program is stopped before, or null when it is not stopped. */
  #line: number | null = null;
  /** Whether a machine is held, so breakpoint changes can reach it. */
  #holding = false;
  #finished = false;
  /** Said once: repeating it on every stop would bury the variables pane. */
  #saidNoVariables = false;
  #after: (() => Promise<void>) | null = null;

  constructor(host: DebugHost, send: (message: Record<string, unknown>) => void) {
    this.#host = host;
    this.#send = send;
    // Typed as exactly the declared requests, so a request added to the list
    // without an answer, or answered without being listed, fails to compile.
    this.#handlers = {
      initialize: () => this.#initialize(),
      launch: () => this.#launch(),
      configurationDone: () => ({}),
      setBreakpoints: (args) => this.#setBreakpoints(args),
      setExceptionBreakpoints: () => ({ breakpoints: [] }),
      threads: () => ({ threads: [{ id: THREAD_ID, name: 'BASIC' }] }),
      stackTrace: () => this.#stackTrace(),
      scopes: () => ({
        scopes: [
          {
            name: 'Variables',
            variablesReference: VARIABLES_REFERENCE,
            expensive: false,
          },
        ],
      }),
      variables: () => this.#variables(),
      continue: () => this.#continue(),
      next: () => this.#step(),
      stepIn: () => this.#step(),
      stepOut: () => this.#step(),
      pause: () => this.#pause(),
      evaluate: (args) => this.#evaluate(args),
      disconnect: () => this.#disconnect(),
    };
  }

  /** Whether this session answers a request, for the check that it declares it. */
  handles(command: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.#handlers, command);
  }

  /** Everything the editor sends arrives here. */
  async handle(message: DebugProtocolMessage): Promise<void> {
    if (message.type !== 'request' || message.command === undefined) return;
    const handler = this.#handlers[message.command as DebugRequest] as
      | Handler
      | undefined;
    if (!handler) {
      this.#respond(
        message,
        false,
        undefined,
        `A Basically debug session does not do "${message.command}".`,
      );
      return;
    }
    try {
      const body = await handler(message.arguments ?? {});
      this.#respond(message, true, body);
    } catch (error) {
      this.#respond(message, false, undefined, describe(error));
    }
    const after = this.#after;
    this.#after = null;
    if (after) await after().catch((error) => this.#fail(describe(error)));
  }

  #initialize(): Record<string, unknown> {
    // The editor is told what is served only once it has been answered, which
    // is what tells it to send the breakpoints it is holding.
    this.#after = async () => {
      this.#event('initialized');
    };
    return { ...DEBUG_CAPABILITIES };
  }

  /**
   * Bring the machine up with the lines to stop before already in place.
   *
   * They have to travel with the run: by the time a machine is up the program
   * has already reached wherever it was going, so the first stop can only be
   * arranged before it starts.
   */
  #launch(): Record<string, unknown> {
    this.#after = () => this.#start();
    return {};
  }

  async #start(): Promise<void> {
    const operations = this.#host.operations;
    // A connection holds one machine, so whatever a previous run or session
    // left is let go before this one asks for another.
    await operations.ask('release');
    let report;
    try {
      report = await operations.debugRun(
        this.#host.machine.id,
        this.#host.source,
        this.#lines,
      );
    } catch (error) {
      this.#fail(
        error instanceof OperationFailed
          ? `The toolchain could not debug this listing. ${error.message}`
          : `Could not talk to the toolchain. ${describe(error)}`,
      );
      return;
    }
    this.#holding = true;

    const fatal = report.errors.filter((problem) => problem.fatal !== false);
    if (fatal.length > 0) {
      for (const problem of fatal) {
        this.#say(`Line ${problem.line}: ${problem.message}`);
      }
      this.#fail(
        `The ${this.#host.machine.name} could not run this listing.`,
      );
      return;
    }

    await this.#showScreen();
    this.#arrive(report.stoppedAt, report.ended, 'breakpoint');
  }

  /**
   * Put the machine's screen where the user can see it, mirrored.
   *
   * The mirror is what the session rests on: a machine being driven by a person
   * runs on its own clock, and a machine on its own clock is not one that can
   * be stopped on a line or measured. So asking for the mirror is also what
   * ends a play channel onto the same machine, and the user is told that is
   * what happened rather than being left with a screen that quietly stopped
   * answering.
   */
  async #showScreen(): Promise<void> {
    const viewed = await this.#host.operations.view();
    if (viewed.address === null) {
      this.#say(
        viewed.problem ??
          'The machine cannot be shown, so this session has no screen.',
      );
      return;
    }
    if (viewed.endedPlay) {
      this.#say(
        `You were playing the ${this.#host.machine.name}; that has ended, ` +
          'because a machine is either played or debugged and not both. The ' +
          'screen now mirrors it and does not take typing.',
      );
    }
    await this.#host.mirror(viewed.address);
  }

  /** Where the program is now, as the editor is told it. */
  #arrive(
    line: number | null,
    ended: boolean,
    reason: 'breakpoint' | 'step' | 'pause',
  ): void {
    if (line !== null) {
      this.#line = line;
      this.#event('stopped', {
        reason,
        threadId: THREAD_ID,
        allThreadsStopped: true,
      });
      return;
    }
    this.#line = null;
    if (ended) {
      this.#say('The program ended.');
      this.#finish();
      return;
    }
    // Neither a stop nor an end within the frames it was given. The machine is
    // left where it is and advances only when something asks it to, so a
    // program sitting at an INPUT looks exactly like one looping forever — and
    // the one thing the user needs in either case is how to type at it.
    this.#say(
      'The program is still going: it reached neither a stop nor its end. ' +
        keysHint(this.#host.machine.id),
    );
  }

  async #setBreakpoints(args: Record<string, unknown>): Promise<unknown> {
    const asked = (args.breakpoints as { line: number }[] | undefined) ?? [];
    // A row and a BASIC line are not the same thing, and a row carrying no
    // number cannot be stopped on. Saying so is what makes the editor show the
    // breakpoint as one that will not be hit; moving it to the nearest numbered
    // row would stop the program somewhere the user did not ask for.
    const mapped = asked.map((breakpoint) => ({
      row: breakpoint.line,
      line: lineNumberOn(this.#host.source, breakpoint.line),
    }));
    this.#lines = [
      ...new Set(
        mapped
          .map((entry) => entry.line)
          .filter((line): line is number => line !== null),
      ),
    ].sort((a, b) => a - b);
    // A set changed while a session is under way is in force for the rest of
    // it; before the machine is up there is nothing to tell, and the run itself
    // carries them.
    if (this.#holding && !this.#finished) {
      await this.#host.operations.setBreakpoints(this.#lines);
    }
    return {
      breakpoints: mapped.map((entry) => ({
        verified: entry.line !== null,
        line: entry.row,
        message:
          entry.line === null
            ? 'This row carries no BASIC line number, so the program cannot ' +
              'stop before it.'
            : undefined,
      })),
    };
  }

  #stackTrace(): Record<string, unknown> {
    if (this.#line === null) return { stackFrames: [], totalFrames: 0 };
    // Read from the listing as it stands rather than from where the breakpoint
    // was set, so a listing renumbered between two sessions highlights the row
    // the line is on now.
    const row = rowOfLine(this.#host.source, this.#line);
    return {
      stackFrames: [
        {
          id: FRAME_ID,
          name: `Line ${this.#line}`,
          line: row ?? 0,
          column: 1,
          source:
            row === null
              ? undefined
              : { name: basename(this.#host.path), path: this.#host.path },
        },
      ],
      totalFrames: 1,
    };
  }

  async #variables(): Promise<unknown> {
    const report = await this.#host.operations.variables();
    if (report.variables === null) {
      const cannot = `The ${this.#host.machine.name} cannot report what its variables hold.`;
      if (!this.#saidNoVariables) {
        this.#saidNoVariables = true;
        this.#say(cannot);
      }
      // Said in the pane as well as the console: a pane showing nothing reads
      // as a program holding nothing.
      return {
        variables: [
          { name: 'Variables', value: cannot, variablesReference: 0 },
        ],
      };
    }
    return {
      variables: report.variables.map((variable) => ({
        name: variable.name,
        value: variable.value,
        type: variable.kind,
        variablesReference: 0,
      })),
    };
  }

  #continue(): Record<string, unknown> {
    this.#after = () => this.#advance('continue');
    return { allThreadsContinued: true };
  }

  #step(): Record<string, unknown> {
    this.#after = () => this.#advance('step');
    return {};
  }

  async #advance(kind: 'step' | 'continue'): Promise<void> {
    const operations = this.#host.operations;
    let report: DebugRunReport;
    try {
      report = kind === 'step' ? await operations.step() : await operations.resume();
    } catch (error) {
      this.#fail(describe(error));
      return;
    }
    if (!report.canStep) {
      this.#fail(
        `The ${this.#host.machine.name} cannot be stepped, so this session ` +
          'can go no further.',
      );
      return;
    }
    // The cost travels with every move, because timing a stretch of a program a
    // line at a time is most of what stepping it is for.
    this.#say(
      `${kind === 'step' ? 'Stepped' : 'Continued'} in ${report.seconds.toFixed(2)}s of ` +
        `the machine's own time (${report.frames} frame${report.frames === 1 ? '' : 's'}).`,
    );
    this.#arrive(
      report.line,
      report.ending === 'ended',
      kind === 'step' ? 'step' : 'breakpoint',
    );
  }

  /**
   * Where the program got to, without spending any of the machine's frames.
   *
   * A machine held by this client advances only when something asks it to, so
   * there is nothing to interrupt: pausing is the editor catching up with where
   * the program already is.
   */
  #pause(): Record<string, unknown> {
    this.#after = async () => {
      const report = await this.#host.operations.where();
      this.#line = report.line;
      if (report.line === null) {
        this.#say(
          'Which line the program is on cannot be told right now, so there is ' +
            'no line to show it stopped before.',
        );
      }
      this.#event('stopped', {
        reason: 'pause',
        threadId: THREAD_ID,
        allThreadsStopped: true,
      });
    };
    return {};
  }

  /**
   * The console, which is how keys reach a debugged program.
   *
   * What is typed is a schedule, read by the same parser that reads one written
   * into a file — so a key sent by hand and the same key in a written schedule
   * mean the same thing to the machine. Nothing else is evaluated: the toolchain
   * implements no way to read or write an expression on a held machine, and a
   * watch that answered with something invented would be worse than one that
   * says so.
   */
  async #evaluate(args: Record<string, unknown>): Promise<unknown> {
    const expression = String(args.expression ?? '');
    if (args.context !== 'repl') {
      throw new Error(
        'A Basically debug session evaluates no expressions. The variables ' +
          'pane shows what the program holds, and this console sends keys to ' +
          'the machine.',
      );
    }
    const report = await this.#host.operations.drive(expression);
    const said = report.steps.map((step) => step.detail).join('\n');
    return {
      result: said === '' ? 'Nothing to send.' : said,
      variablesReference: 0,
    };
  }

  async #disconnect(): Promise<unknown> {
    this.#finished = true;
    if (this.#holding) {
      this.#holding = false;
      // The machine goes; the conversation stays, because the panel that opened
      // it holds it for whatever is run next.
      await this.#host.operations.ask('release').catch(() => {});
    }
    await this.#host.released();
    return {};
  }

  /** The session is over and the user is told why. */
  #fail(message: string): void {
    this.#say(message);
    this.#finish();
  }

  #finish(): void {
    if (this.#finished) return;
    this.#finished = true;
    this.#line = null;
    this.#event('terminated');
  }

  #say(text: string): void {
    this.#event('output', { category: 'console', output: `${text}\n` });
  }

  #event(event: string, body?: Record<string, unknown>): void {
    this.#send({ seq: this.#seq++, type: 'event', event, body });
  }

  #respond(
    request: DebugProtocolMessage,
    success: boolean,
    body?: unknown,
    message?: string,
  ): void {
    this.#send({
      seq: this.#seq++,
      type: 'response',
      request_seq: request.seq,
      command: request.command,
      success,
      body,
      message,
    });
  }
}

function basename(path: string): string {
  const cut = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return path.slice(cut + 1) || path;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
