// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * A debug session driven with no editor and no server.
 *
 * The fourth of this repository's suites, and the second needing neither:
 * `handshake.test.mjs` establishes that a real server stops a real program on a
 * line, and what is left is the client's own half — which controls it offers
 * the editor, and what a row of a listing means to a machine that stops before
 * line numbers.
 *
 * Both are failures nothing else would catch. A control offered and not carried
 * out is a button that does nothing, which is the same fault as a semantic
 * token the manifest gives no scope for. A row read as a line number is a
 * program stopping somewhere the user did not ask for, and a listing that has
 * been renumbered is exactly where the two part company.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const clientDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

// The compiled modules, so what is driven is what ships.
const {
  DEBUG_CAPABILITIES,
  DEBUG_CONTROLS,
  DEBUG_REQUESTS,
  MachineDebugSession,
  planDebug,
  refusalFor,
} = await import(pathToFileURL(path.join(clientDir, 'out', 'machineDebug.js')).href);
const { lineNumberOn, rowOfLine } = await import(
  pathToFileURL(path.join(clientDir, 'out', 'debugLines.js')).href
);

const LISTING = ['#MACHINE zx81', '10 LET A=1', '', '20 PRINT A', 'REM tail'].join(
  '\n',
);

/** A stopped step, as the toolchain reports one. */
const stopped = (line) => ({
  canStep: true,
  ending: 'stopped',
  line,
  frames: 3,
  seconds: 0.06,
  running: true,
});

/**
 * The conversation, recorded rather than held.
 *
 * Only what a session asks of it: the point is which operation a control
 * reaches, not what the machine does with it — that is the server's half and is
 * driven against a real one in `handshake.test.mjs`.
 */
function recordingOperations(answers = {}) {
  const asked = [];
  return {
    asked,
    ask: async (action) => {
      asked.push(action);
      return {};
    },
    debugRun: async (machine, source, breakpoints) => {
      asked.push(`run ${breakpoints.join(',')}`);
      return answers.run ?? { machine: { id: machine, name: machine }, errors: [], stoppedAt: 10, ended: false };
    },
    setBreakpoints: async (lines) => {
      asked.push(`break ${lines.join(',')}`);
      return { canStep: true, lines };
    },
    step: async () => {
      asked.push('step');
      return answers.step ?? stopped(20);
    },
    resume: async () => {
      asked.push('continue');
      return answers.continue ?? stopped(20);
    },
    variables: async () => {
      asked.push('variables');
      return answers.variables ?? { variables: [] };
    },
    view: async () => {
      asked.push('view');
      return (
        answers.view ?? {
          address: 'http://127.0.0.1:1/',
          already: false,
          endedPlay: false,
          problem: null,
        }
      );
    },
    drive: async (script) => {
      asked.push(`drive ${script}`);
      return { ok: true, steps: [{ outcome: 'ok', detail: 'Pressed A.' }], frames: 2, sentInput: true };
    },
    where: async () => {
      asked.push('where');
      return { canStep: true, line: 20, running: true, breakpoints: [] };
    },
  };
}

/** A session over that conversation, and everything it sent back. */
function session(source = LISTING, answers = {}) {
  const sent = [];
  const operations = recordingOperations(answers);
  const mirrored = [];
  const debugged = new MachineDebugSession(
    {
      operations,
      machine: { id: 'zx81', name: 'ZX81' },
      source,
      path: '/listings/game.bas',
      mirror: async (address) => {
        mirrored.push(address);
      },
      released: async () => {
        mirrored.push('released');
      },
    },
    (message) => sent.push(message),
  );
  let seq = 0;
  const ask = async (command, args) => {
    await debugged.handle({
      seq: ++seq,
      type: 'request',
      command,
      arguments: args ?? {},
    });
    return sent.findLast(
      (message) => message.type === 'response' && message.command === command,
    );
  };
  const events = (name) =>
    sent.filter((message) => message.type === 'event' && message.event === name);
  return { debugged, operations, ask, sent, events, mirrored };
}

describe('the controls a debug session offers', () => {
  it('declares nothing it does not carry out, and carries out nothing it hides', () => {
    const { debugged } = session();
    const gated = new Map();
    for (const control of DEBUG_CONTROLS) {
      for (const request of control.requests) gated.set(request, control.capability);
    }

    for (const control of DEBUG_CONTROLS) {
      const declared = Array.isArray(DEBUG_CAPABILITIES[control.capability])
        ? DEBUG_CAPABILITIES[control.capability].length > 0
        : DEBUG_CAPABILITIES[control.capability] === true;
      for (const request of control.requests) {
        assert.equal(
          debugged.handles(request),
          declared,
          declared
            ? `${control.capability} is declared and "${request}" is not answered`
            : `${control.capability} is declined and "${request}" is answered anyway`,
        );
      }
    }

    // And the reverse, so a request answered under a control that was never
    // declared cannot slip through the pairing above.
    for (const request of DEBUG_REQUESTS) {
      assert.ok(debugged.handles(request), `"${request}" is listed and not answered`);
      const capability = gated.get(request);
      if (capability !== undefined) {
        assert.ok(
          DEBUG_CAPABILITIES[capability] === true,
          `"${request}" is answered and ${capability} is not declared`,
        );
      }
    }

    // Every declaration is covered by the pairing: one added without an entry
    // would otherwise never be checked against anything.
    for (const capability of Object.keys(DEBUG_CAPABILITIES)) {
      assert.ok(
        DEBUG_CONTROLS.some((control) => control.capability === capability),
        `${capability} is declared and paired with no request`,
      );
    }
  });

  it('declines everything BASIC on these machines cannot do', () => {
    for (const declined of [
      'supportsSetVariable',
      'supportsSetExpression',
      'supportsConditionalBreakpoints',
      'supportsHitConditionalBreakpoints',
      'supportsLogPoints',
      'supportsDataBreakpoints',
      'supportsFunctionBreakpoints',
      'supportsRestartRequest',
      'supportsDisassembleRequest',
      'supportsStepBack',
      'supportsStepInTargetsRequest',
      'supportsReadMemoryRequest',
      'supportsWriteMemoryRequest',
    ]) {
      assert.equal(DEBUG_CAPABILITIES[declined], false, `${declined} is claimed`);
    }
  });

  it('answers a request it does not know rather than falling silent', async () => {
    const { ask } = session();
    const answer = await ask('disassemble');
    assert.equal(answer.success, false);
    assert.match(answer.message, /does not do "disassemble"/);
  });

  it('runs on to the next BASIC line whichever way the editor asks to step', async () => {
    // The editor draws Step Into and Step Out for every stopped session and no
    // declaration removes them, so both do the one thing there is to do: where
    // nothing can be stepped into, stepping in is stepping.
    for (const command of ['next', 'stepIn', 'stepOut']) {
      const { ask, operations } = session();
      await ask(command);
      assert.deepEqual(
        operations.asked,
        ['step'],
        `"${command}" asked for something other than a step`,
      );
    }
  });
});

describe('a row of the editor and a line of the machine', () => {
  it('reads the number a row carries, and nothing where it carries none', () => {
    assert.equal(lineNumberOn(LISTING, 1), null, 'the #MACHINE line is a line number');
    assert.equal(lineNumberOn(LISTING, 2), 10);
    assert.equal(lineNumberOn(LISTING, 3), null, 'a blank row carries a number');
    assert.equal(lineNumberOn(LISTING, 4), 20);
    assert.equal(lineNumberOn(LISTING, 5), null, 'a row with no number carries one');
    assert.equal(lineNumberOn(LISTING, 99), null, 'a row past the end carries one');
  });

  it('finds the row a line is written on', () => {
    assert.equal(rowOfLine(LISTING, 10), 2);
    assert.equal(rowOfLine(LISTING, 20), 4);
    assert.equal(rowOfLine(LISTING, 30), null);
  });

  it('verifies a breakpoint the machine can stop at, and only that', async () => {
    const { ask, operations } = session();
    const answer = await ask('setBreakpoints', {
      source: { path: '/listings/game.bas' },
      breakpoints: [{ line: 2 }, { line: 3 }, { line: 5 }],
    });
    assert.deepEqual(
      answer.body.breakpoints.map((breakpoint) => breakpoint.verified),
      [true, false, false],
    );
    // The rows come back as they were set, never moved to a numbered row
    // nearby: a user who marked a blank line between two routines would find
    // the program stopping in the one above.
    assert.deepEqual(
      answer.body.breakpoints.map((breakpoint) => breakpoint.line),
      [2, 3, 5],
    );
    assert.match(answer.body.breakpoints[1].message, /no BASIC line number/);
    // Nothing reaches the machine before there is one; the run carries the
    // first set.
    assert.deepEqual(operations.asked, []);
  });

  it('sends a changed set to a machine already holding a program', async () => {
    const { ask, operations } = session();
    await ask('setBreakpoints', { breakpoints: [{ line: 2 }] });
    await ask('launch');
    operations.asked.length = 0;
    await ask('setBreakpoints', { breakpoints: [{ line: 2 }, { line: 4 }] });
    assert.deepEqual(operations.asked, ['break 10,20']);
  });

  it('reads a renumbered listing as it now stands', async () => {
    const renumbered = ['#MACHINE zx81', '100 LET A=1', '', '200 PRINT A'].join('\n');
    const { ask } = session(renumbered);
    const answer = await ask('setBreakpoints', { breakpoints: [{ line: 4 }] });
    assert.equal(answer.body.verified, undefined);
    assert.equal(answer.body.breakpoints[0].verified, true);
    // And the frame for a stop on that line is located by the row it is on now,
    // not by the row it was on when a previous session set the breakpoint.
    assert.equal(rowOfLine(renumbered, 200), 4);
    assert.equal(rowOfLine(LISTING, 200), null);
  });
});

describe('what a session shows and says', () => {
  it('runs the listing with its stops in place and reports where it stopped', async () => {
    const { ask, operations, events, mirrored } = session();
    await ask('setBreakpoints', { breakpoints: [{ line: 4 }] });
    await ask('launch');
    assert.deepEqual(operations.asked, ['release', 'run 20', 'view']);
    assert.deepEqual(mirrored, ['http://127.0.0.1:1/']);
    assert.deepEqual(events('stopped')[0].body, {
      reason: 'breakpoint',
      threadId: 1,
      allThreadsStopped: true,
    });
  });

  it('names the stopped line, and the row it is written on', async () => {
    const { ask } = session();
    await ask('launch');
    const answer = await ask('stackTrace', { threadId: 1 });
    assert.deepEqual(answer.body.stackFrames, [
      {
        id: 1,
        name: 'Line 10',
        line: 2,
        column: 1,
        source: { name: 'game.bas', path: '/listings/game.bas' },
      },
    ]);
  });

  it('says a machine cannot report its variables rather than showing none', async () => {
    const { ask, events } = session(LISTING, { variables: { variables: null } });
    await ask('launch');
    const answer = await ask('variables', { variablesReference: 1 });
    assert.equal(answer.body.variables.length, 1);
    assert.match(answer.body.variables[0].value, /cannot report/);
    assert.ok(
      events('output').some((event) => /cannot report/.test(event.body.output)),
    );
  });

  it('ends the session when the program ends, and says it ended', async () => {
    const { ask, events } = session(LISTING, {
      run: { machine: { id: 'zx81', name: 'ZX81' }, errors: [], stoppedAt: null, ended: true },
    });
    await ask('launch');
    assert.equal(events('terminated').length, 1);
    assert.ok(events('output').some((event) => /program ended/.test(event.body.output)));
  });

  it('says a program that is still going is still going, and how to type at it', async () => {
    const { ask, events } = session(LISTING, {
      run: { machine: { id: 'zx81', name: 'ZX81' }, errors: [], stoppedAt: null, ended: false },
    });
    await ask('launch');
    assert.equal(events('terminated').length, 0, 'a running program ended the session');
    assert.equal(events('stopped').length, 0, 'a running program was shown as stopped');
    const said = events('output').map((event) => event.body.output).join('');
    assert.match(said, /still going/);
    assert.match(said, /type a schedule/);
    assert.match(said, /does not take typing/);
  });

  it('says a play channel ended when a session takes the same machine', async () => {
    const { ask, events } = session(LISTING, {
      view: {
        address: 'http://127.0.0.1:1/',
        already: false,
        endedPlay: true,
        problem: null,
      },
    });
    await ask('launch');
    const said = events('output').map((event) => event.body.output).join('');
    assert.match(said, /that has ended/);
  });

  it('sends what is typed in the console to the machine as a schedule', async () => {
    const { ask, operations } = session();
    await ask('launch');
    operations.asked.length = 0;
    const answer = await ask('evaluate', {
      expression: 'PRESS A',
      context: 'repl',
    });
    assert.deepEqual(operations.asked, ['drive PRESS A']);
    assert.match(answer.body.result, /Pressed A/);
  });

  it('evaluates nothing outside the console', async () => {
    const { ask } = session();
    const answer = await ask('evaluate', { expression: 'A', context: 'watch' });
    assert.equal(answer.success, false);
    assert.match(answer.message, /evaluates no expressions/);
  });

  it('lets the machine go when the session stops', async () => {
    const { ask, operations, mirrored } = session();
    await ask('launch');
    operations.asked.length = 0;
    await ask('disconnect', {});
    assert.deepEqual(operations.asked, ['release']);
    assert.ok(mirrored.includes('released'));
  });
});

describe('what stops a listing being debugged', () => {
  const zx81 = { id: 'zx81', name: 'ZX81', description: '', canRun: true };
  const romless = { id: 'bbcmicro', name: 'BBC Micro', description: '', canRun: false };

  it('tells the three reasons apart', () => {
    assert.deepEqual(planDebug({ kind: 'run', machine: zx81 }, true), {
      kind: 'debug',
      machine: zx81,
    });
    assert.deepEqual(planDebug({ kind: 'run', machine: zx81 }, false), {
      kind: 'cannot-step',
      machine: zx81,
    });
    // Whether a machine can be run is the earlier question and is not asked
    // again here: a machine the server cannot run is never asked about stepping.
    assert.deepEqual(planDebug({ kind: 'needs-roms', machine: romless }, false), {
      kind: 'needs-roms',
      machine: romless,
    });
    assert.deepEqual(planDebug({ kind: 'no-machine' }, false), { kind: 'no-machine' });
  });

  it('offers running the listing only where running it is what is left', () => {
    assert.equal(refusalFor({ kind: 'cannot-step', machine: zx81 }).offerRun, true);
    assert.equal(refusalFor({ kind: 'needs-roms', machine: romless }).offerRun, false);
    assert.equal(refusalFor({ kind: 'no-machine' }).offerRun, false);
  });

  it('names only settings the client contributes', async () => {
    const { readFileSync } = await import('node:fs');
    const manifest = JSON.parse(
      readFileSync(path.join(clientDir, 'package.json'), 'utf8'),
    );
    const contributed = Object.keys(manifest.contributes.configuration.properties);
    for (const plan of [
      { kind: 'no-machine' },
      { kind: 'unknown-machine', wanted: 'spectrum' },
      { kind: 'needs-roms', machine: romless },
      { kind: 'cannot-step', machine: zx81 },
    ]) {
      const refusal = refusalFor(plan);
      const said = `${refusal.heading} ${refusal.remedy}`;
      for (const named of said.match(/\bbasically(?:\.[a-zA-Z]+)+/g) ?? []) {
        assert.ok(
          contributed.includes(named),
          `${plan.kind} tells the user to set ${named}, which the client does not contribute`,
        );
      }
    }
  });
});
