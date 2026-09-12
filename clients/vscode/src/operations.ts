// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The toolchain's operations conversation, held over a child process's standard
 * streams.
 *
 * This is the second thing the client starts, beside the language server, and
 * it is the same toolchain resolved the same way — `server.ts` takes the
 * operation as an argument for exactly this reason. It is what holds a machine:
 * the toolchain gives a machine to the connection that ran a program and lets
 * it go when that connection ends, which is the lifetime a panel wants and the
 * reason the panel does not reach through the command line's shared session.
 *
 * Kept free of the `vscode` module, like `server.ts`, so a plain Node test can
 * hold the same conversation the extension holds.
 */
import { spawn, type ChildProcess } from 'node:child_process';

import { encodeFrame, FrameReader } from './framing';
import { argsFor, envFor, type ServerLaunch } from './server';

/** A machine the server has, and whether this installation can run it. */
export interface Machine {
  id: string;
  name: string;
  description: string;
  /** False where the machine needs ROM images this installation does not hold. */
  canRun: boolean;
}

/** A problem in a listing, as the toolchain reports it. */
export interface Problem {
  line: number;
  column: number;
  message: string;
  /** Absent means fatal; only an explicit `false` is advisory. */
  fatal?: boolean;
}

/** What `lint` answers: the machine it settled on, and what it found. */
export interface LintReport {
  machine: { id: string; name: string };
  problems: Problem[];
  fatal: boolean;
}

/** What `run` answers. Only the parts the panel needs are named. */
export interface RunReport {
  machine: Machine & { manufacturer: string };
  errors: Problem[];
}

/** What `play` answers: an address a web view can be pointed at. */
export interface PlayReport {
  address: string;
  already: boolean;
  endedView: boolean;
  problem: string | null;
}

/**
 * What `view` answers: an address a web view can be pointed at to watch.
 *
 * The same shape as playing and a different thing: what is at this address
 * mirrors the machine and never drives it, and asking for it ends a play
 * channel onto the same machine rather than running beside one.
 */
export interface ViewReport {
  address: string | null;
  already: boolean;
  endedPlay: boolean;
  problem: string | null;
}

/** What `info` answers about one machine. Only what the client asks is named. */
export interface MachineFacts {
  id: string;
  name: string;
  /** Whether this installation can run the machine. */
  canRun: boolean;
  /** Whether it can be stopped a BASIC line at a time. */
  canStep: boolean;
}

/** How a step or a continue finished. */
export type DebugEnding = 'stopped' | 'ended' | 'exhausted' | 'cannot-step';

/** What a step or a continue did, and where it left the program. */
export interface DebugRunReport {
  canStep: boolean;
  ending: DebugEnding;
  /** The BASIC line the program is now stopped before, or null. */
  line: number | null;
  frames: number;
  seconds: number;
  running: boolean | null;
}

/** What `where` answers: where the held program is, and what stops it. */
export interface WhereReport {
  canStep: boolean;
  /** The BASIC line about to execute, or null where none can be told. */
  line: number | null;
  /** Whether a program is running; null on a machine still taking one. */
  running: boolean | null;
  /** The lines in force to stop before, ascending. */
  breakpoints: number[];
}

/** What `break` answers: the lines in force afterwards. */
export interface BreakReport {
  canStep: boolean;
  lines: number[];
}

/** One of the program's variables, as the machine displays it. */
export interface VariableReport {
  name: string;
  kind: 'number' | 'string' | 'number-array' | 'string-array';
  value: string;
}

/** What `variables` answers; null on a machine that cannot report them. */
export interface VariablesReport {
  variables: VariableReport[] | null;
}

/** What `drive` answers: whether the schedule was carried out, and what it did. */
export interface DriveReport {
  ok: boolean;
  /** One entry per action reached, each saying what it did as a sentence. */
  steps: { outcome: string; detail: string }[];
  frames: number;
  /** True where an action actually sent input, as against only waiting. */
  sentInput: boolean;
}

/**
 * What is to be done about a listing, before anything is attempted.
 *
 * Kept apart from the panel that says it, so the same decision a user meets can
 * be driven against a live server with no editor involved — the answers depend
 * entirely on what that server reports it has and can run.
 */
export type RunPlan =
  | { kind: 'run'; machine: Machine }
  /** Nothing settles which machine the listing is for. */
  | { kind: 'no-machine' }
  /** A machine was named that this server does not have. */
  | { kind: 'unknown-machine'; wanted: string }
  /** The machine is one this server has but cannot run as it stands. */
  | { kind: 'needs-roms'; machine: Machine };

/**
 * Which machine to run on, from what the server reports it has.
 *
 * The order is the one that already governs which machine a listing is checked
 * against: the listing's own declaration first, then what the user configured.
 * Where neither answers, nothing is guessed — the caller is told what to set.
 * A machine is never ruled in or out from anything held here: whether one can
 * be run is the server's answer, carried through as it was given.
 */
export function planRun(
  machines: Machine[],
  declared: string | null,
  configured: string,
): RunPlan {
  const wanted = declared ?? configured.trim();
  if (wanted === '') return { kind: 'no-machine' };
  const lowered = wanted.toLowerCase();
  const machine = machines.find(
    (m) => m.id.toLowerCase() === lowered || m.name.toLowerCase() === lowered,
  );
  if (!machine) return { kind: 'unknown-machine', wanted };
  return machine.canRun
    ? { kind: 'run', machine }
    : { kind: 'needs-roms', machine };
}

/** What the toolchain refused to do, and under which of its own headings. */
export class OperationFailed extends Error {
  constructor(
    message: string,
    readonly failure: string,
  ) {
    super(message);
    this.name = 'OperationFailed';
  }
}

interface Pending {
  resolve: (value: never) => void;
  reject: (error: Error) => void;
}

type Note = (line: string) => void;

/**
 * One connection, and therefore one machine.
 *
 * The toolchain answers every request with the id it was asked under, so the
 * replies are matched back by id rather than assumed to arrive in order.
 */
export class Operations {
  #child: ChildProcess;
  #reader = new FrameReader();
  #pending = new Map<number, Pending>();
  #nextId = 1;
  #ended: Error | null = null;
  #note: Note;

  private constructor(child: ChildProcess, note: Note) {
    this.#child = child;
    this.#note = note;

    child.stdout?.on('data', (chunk: Buffer) => this.#receive(chunk));
    child.stderr?.setEncoding('utf8');
    // The toolchain writes its own difficulties here; they belong in the
    // channel beside the notes about which server and runtime were chosen.
    child.stderr?.on('data', (chunk: string) => {
      for (const line of chunk.split('\n')) {
        if (line.trim() !== '') note(line.trimEnd());
      }
    });
    child.on('error', (error) => this.#end(error));
    child.on('exit', (code, signal) =>
      this.#end(
        new Error(
          `the toolchain stopped (${signal ?? `exit ${code ?? 'unknown'}`})`,
        ),
      ),
    );

    this.#send({ kind: 'hello', conversation: 'ops' });
  }

  /**
   * Start the conversation, on the server and runtime already resolved for it.
   * Nothing is awaited: the toolchain answers `hello` with a welcome, and every
   * request queued before it arrives is answered after it.
   */
  static start(launch: ServerLaunch, note: Note = () => {}): Operations {
    for (const line of launch.notes) note(line);
    const child = spawn(launch.command, argsFor(launch, 'ops', '--stdio'), {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: envFor(launch),
    });
    return new Operations(child, note);
  }

  #receive(chunk: Buffer): void {
    let messages: unknown[];
    try {
      messages = this.#reader.push(chunk);
    } catch (error) {
      this.#end(error instanceof Error ? error : new Error(String(error)));
      this.#child.kill();
      return;
    }
    for (const message of messages) {
      const reply = message as {
        kind?: string;
        id?: number;
        outcome?: { value: unknown; notes?: string[]; failed?: boolean };
        message?: string;
        failure?: string;
        reason?: string;
      };
      if (reply.kind === 'refusal') {
        this.#end(
          new Error(reply.reason ?? 'the toolchain refused the conversation'),
        );
        continue;
      }
      if (reply.id === undefined) continue;
      const pending = this.#pending.get(reply.id);
      if (!pending) continue;
      this.#pending.delete(reply.id);
      if (reply.kind === 'error') {
        pending.reject(
          new OperationFailed(
            reply.message ?? 'the toolchain gave no reason',
            reply.failure ?? 'request',
          ),
        );
        continue;
      }
      if (reply.kind === 'result') {
        for (const line of reply.outcome?.notes ?? []) this.#note(line);
        pending.resolve(reply.outcome?.value as never);
        continue;
      }
      // A host answer carries its fields beside the id rather than in an
      // outcome, so it is handed back whole.
      pending.resolve(reply as never);
    }
  }

  #end(error: Error): void {
    if (this.#ended) return;
    this.#ended = error;
    for (const pending of this.#pending.values()) pending.reject(error);
    this.#pending.clear();
  }

  #send(message: unknown): void {
    this.#child.stdin?.write(encodeFrame(message));
  }

  #expect<T>(message: (id: number) => unknown): Promise<T> {
    if (this.#ended) return Promise.reject(this.#ended);
    const id = this.#nextId++;
    return new Promise<T>((resolve, reject) => {
      this.#pending.set(id, {
        resolve: resolve as (value: never) => void,
        reject,
      });
      this.#send(message(id));
    });
  }

  /** One operation of the toolchain, on this connection's own machine. */
  call<T>(operation: string, input: Record<string, unknown>): Promise<T> {
    return this.#expect<T>((id) => ({ kind: 'call', id, operation, input }));
  }

  /** Something asked of the host rather than of a machine. */
  ask<T extends object>(
    action: 'status' | 'release' | 'unview' | 'unplay' | 'stop',
  ): Promise<T> {
    return this.#expect<T>((id) => ({ kind: 'host', id, action }));
  }

  /** The machines this server has, and which of them it can run. */
  machines(): Promise<Machine[]> {
    return this.call<Machine[]>('machines', {});
  }

  /**
   * The machine a listing declares, or null where it declares none.
   *
   * Asked of the server rather than read out of the text here: which line
   * declares a machine, and what names a machine answers to, are the server's
   * to know, and a client that parsed them itself would be a second opinion
   * that could differ from the one the listing is checked against.
   */
  async declaredMachine(source: string): Promise<string | null> {
    try {
      const report = await this.call<LintReport>('lint', { source });
      return report.machine.id;
    } catch (error) {
      // Refusing for want of a machine is the answer "it declares none"; any
      // other refusal is a real one and is not swallowed.
      if (
        error instanceof OperationFailed &&
        /wants a machine/i.test(error.message)
      ) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Run a listing and leave its machine up.
   *
   * The machine is settled by the caller and passed, because a machine passed
   * here overrides the listing's own declaration; `declaredMachine` is what
   * reads that declaration.
   */
  run(machine: string, source: string): Promise<RunReport> {
    return this.call<RunReport>('run', {
      machine,
      source,
      // Enough frames for a machine to boot and the program to reach whatever
      // it is going to ask the user; it goes on running once the panel has it.
      frames: 120,
      screenText: false,
      screenshot: false,
      profile: false,
      time: false,
      variables: false,
    });
  }

  /**
   * Run a listing with the lines it is to stop before already in place.
   *
   * Breakpoints have to reach the toolchain with the run itself: by the time a
   * machine is up the program has already reached wherever it was going, so a
   * first stop can only be arranged before it starts. No frame count is named,
   * which leaves the run the toolchain's own bound — long enough for a machine
   * to boot and a program to reach a stop, and short enough that one that never
   * stops still answers.
   */
  debugRun(
    machine: string,
    source: string,
    breakpoints: number[],
  ): Promise<RunReport & { stoppedAt: number | null; ended: boolean }> {
    return this.call('run', {
      machine,
      source,
      breakpoints,
      screenText: false,
      screenshot: false,
      profile: false,
      time: false,
      variables: false,
    });
  }

  /** What this server says about one machine, including whether it steps. */
  info(machine: string): Promise<MachineFacts> {
    return this.call<MachineFacts>('info', { machine });
  }

  /** Replace the BASIC lines the held program is to stop before. */
  setBreakpoints(lines: number[]): Promise<BreakReport> {
    return this.call<BreakReport>('break', { lines });
  }

  /** Run the stopped program on to its next BASIC line. */
  step(): Promise<DebugRunReport> {
    return this.call<DebugRunReport>('step', {});
  }

  /** Run the stopped program on to its next stop or its end. */
  resume(): Promise<DebugRunReport> {
    return this.call<DebugRunReport>('continue', {});
  }

  /** Where the held program is; spends none of the machine's frames. */
  where(): Promise<WhereReport> {
    return this.call<WhereReport>('where', {});
  }

  /** What the held program's variables hold, as the machine displays them. */
  variables(): Promise<VariablesReport> {
    return this.call<VariablesReport>('variables', {});
  }

  /** Act on the held machine through a schedule of what to press and when. */
  drive(script: string): Promise<DriveReport> {
    return this.call<DriveReport>('drive', { script });
  }

  /** The address the machine can be watched at, without being driven. */
  view(): Promise<ViewReport> {
    return this.call<ViewReport>('view', {});
  }

  /** The address the machine can be played at. */
  play(): Promise<PlayReport> {
    return this.call<PlayReport>('play', {});
  }

  /**
   * Let the machine go and close the conversation.
   *
   * The polite half only: the toolchain releases a machine whose holder
   * disconnects or disappears, so every other way a panel can end is already
   * covered and needs nothing here.
   */
  async dispose(): Promise<void> {
    try {
      await this.ask('release');
    } catch {
      // A connection that has already ended has already let the machine go.
    }
    this.#end(new Error('the conversation has ended'));
    this.#child.stdin?.end();
    if (this.#child.exitCode === null && this.#child.signalCode === null) {
      this.#child.kill();
      // Waited for, because what the machine was being played at is served by
      // this process: until it is gone the address is still answering, and a
      // caller told the machine was let go would be told wrongly.
      await new Promise<void>((resolve) => {
        const done = setTimeout(resolve, 5_000);
        this.#child.once('exit', () => {
          clearTimeout(done);
          resolve();
        });
      });
    }
  }
}
