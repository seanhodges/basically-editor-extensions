// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * What the user is shown of what the machine holds, and when it is read.
 *
 * The fourth client-against-itself suite, and like `machineStatus.test.mjs` it
 * needs neither an editor nor a server: what a real server answers for a played
 * machine is `handshake.test.mjs`'s subject, and what the client makes of each
 * answer is this one's. The states are the whole of the feature — a machine that
 * cannot report is a different thing from a window holding no machine, and both
 * are different from a server that will not answer while a machine is played —
 * and none of them is reachable from a test that needs a running editor.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const clientDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

// The compiled module, so what is driven is what ships.
const { contentFor, VariableWatch } = await import(
  pathToFileURL(path.join(clientDir, 'out', 'variableWatch.js')).href
);

const ZX81 = 'ZX81';

/** A source answering whatever is handed to it, recording what was asked. */
function recording(answers) {
  const asked = { reads: 0 };
  const source = {
    machine: ZX81,
    read: () => {
      asked.reads++;
      const next = answers.shift();
      if (next === undefined) throw new Error('read more times than answered');
      return typeof next === 'function' ? next() : Promise.resolve(next);
    },
  };
  return { source, asked };
}

/** Drive a watch over one source, collecting every state it settled on. */
function watching(source) {
  const seen = [];
  const watch = new VariableWatch(
    () => source,
    (state) => seen.push(state),
  );
  return { watch, seen };
}

describe('what each answer is shown as', () => {
  it('shows a variable with its value and what kind it is', () => {
    const content = contentFor({
      kind: 'variables',
      machine: ZX81,
      variables: [
        { name: 'A', kind: 'number', value: '12' },
        { name: 'B$', kind: 'string', value: '"FRED"' },
        { name: 'C', kind: 'number-array', value: '(10)' },
      ],
    });
    assert.equal(content.kind, 'rows');
    assert.deepEqual(content.rows, [
      { name: 'A', value: '12', kind: 'number' },
      { name: 'B$', value: '"FRED"', kind: 'string' },
      { name: 'C', value: '(10)', kind: 'num array' },
    ]);
  });

  it('says a program holds none rather than showing an empty table', () => {
    const content = contentFor({
      kind: 'variables',
      machine: ZX81,
      variables: [],
    });
    assert.equal(content.kind, 'message');
    assert.match(content.text, /no variables/i);
  });

  it('names the machine that cannot report them', () => {
    const content = contentFor({ kind: 'cannot-report', machine: ZX81 });
    assert.equal(content.kind, 'message');
    assert.match(content.text, /ZX81 cannot report/);
  });

  it('blames the server, not the machine, for not reading a played one', () => {
    const content = contentFor({ kind: 'not-while-played', machine: ZX81 });
    assert.equal(content.kind, 'message');
    assert.match(content.text, /this server does not report/i);
    // The remedy is a setting this client actually contributes, on the same
    // terms every other remedy it states is.
    assert.match(content.text, /basically\.server\.path/);
  });

  it('leaves a window holding no machine to the editor s own welcome', () => {
    // Nothing of ours, so the welcome the manifest contributes is what shows -
    // and it can offer the running of a listing rather than only describe it.
    assert.deepEqual(contentFor({ kind: 'no-machine' }), { kind: 'welcome' });
  });

  it('says every state as something, so none of them is a blank table', () => {
    const states = [
      { kind: 'no-machine' },
      { kind: 'reading' },
      { kind: 'variables', machine: ZX81, variables: [] },
      { kind: 'cannot-report', machine: ZX81 },
      { kind: 'not-while-played', machine: ZX81 },
      { kind: 'unavailable' },
    ];
    for (const state of states) {
      const content = contentFor(state);
      assert.ok(
        content.kind === 'welcome' || content.text.length > 0,
        `${state.kind} says nothing`,
      );
    }
  });
});

describe('reading the machine', () => {
  it('shows what the server answered', async () => {
    const { source } = recording([
      { variables: [{ name: 'A', kind: 'number', value: '1' }] },
    ]);
    const { watch, seen } = watching(source);
    await watch.refresh();
    assert.equal(watch.state.kind, 'variables');
    assert.equal(watch.state.variables.length, 1);
    // "reading" first, because nothing had been answered yet.
    assert.deepEqual(
      seen.map((state) => state.kind),
      ['reading', 'variables'],
    );
  });

  it('says a machine cannot report them where the server answers so', async () => {
    const { source } = recording([{ variables: null }]);
    const { watch } = watching(source);
    await watch.refresh();
    assert.equal(watch.state.kind, 'cannot-report');
    assert.equal(watch.state.machine, ZX81);
  });

  it('holds no machine where there is no source to read', async () => {
    const watch = new VariableWatch(
      () => null,
      () => {},
    );
    await watch.refresh();
    assert.equal(watch.state.kind, 'no-machine');
  });

  it('never reads twice at once', async () => {
    // Replies are matched by id rather than by order, so two reads in flight
    // are legal on the wire and would queue on the machine's own thread, each
    // answering later than the last. Skipping one while another is outstanding
    // is what keeps a slow server asked less often rather than more.
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    const { source, asked } = recording([
      () => held.then(() => ({ variables: [] })),
      { variables: [] },
    ]);
    const { watch } = watching(source);
    const first = watch.refresh();
    await watch.refresh();
    await watch.refresh();
    assert.equal(asked.reads, 1, 'read again while a read was outstanding');
    release();
    await first;
    // The one after it lands, because nothing is outstanding any more.
    await watch.refresh();
    assert.equal(asked.reads, 2);
  });

  it('reads a refusal for a played machine as its own state', async () => {
    // Recognised by what the server said rather than by a code, the way the
    // client already reads the machineless lint refusal. A server older than
    // the one this client pins refuses this, and a user with a working editor
    // and a working machine is owed a sentence rather than a failure.
    const { source } = recording([
      () =>
        Promise.reject(
          new Error(
            'This machine is being played, so it is advancing on its own ' +
              'clock and is not a machine anything can act on or measure.',
          ),
        ),
    ]);
    const { watch } = watching(source);
    await watch.refresh();
    assert.equal(watch.state.kind, 'not-while-played');
    assert.equal(watch.state.machine, ZX81);
  });

  it('reads a refusal for no machine as holding none', async () => {
    const { source } = recording([
      () => Promise.reject(new Error('No machine is up. Run a program first.')),
    ]);
    const { watch } = watching(source);
    await watch.refresh();
    assert.equal(watch.state.kind, 'no-machine');
  });

  it('says a machine it could not read at all could not be read', async () => {
    const { source } = recording([
      () => Promise.reject(new Error('the conversation ended')),
    ]);
    const { watch } = watching(source);
    await watch.refresh();
    assert.equal(watch.state.kind, 'unavailable');
  });

  it('goes on reading after a refusal rather than giving up', async () => {
    const { source, asked } = recording([
      () => Promise.reject(new Error('the conversation ended')),
      { variables: [{ name: 'A', kind: 'number', value: '7' }] },
    ]);
    const { watch } = watching(source);
    await watch.refresh();
    assert.equal(watch.state.kind, 'unavailable');
    await watch.refresh();
    assert.equal(watch.state.kind, 'variables');
    assert.equal(asked.reads, 2);
  });

  it('says the machine has gone when it is let go', async () => {
    const { source } = recording([{ variables: [] }]);
    const { watch } = watching(source);
    await watch.refresh();
    watch.released();
    assert.equal(watch.state.kind, 'no-machine');
  });
});
