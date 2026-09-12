// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * What the user is told about the machine in force, and what keeping it current
 * costs.
 *
 * The third of this repository's suites, and the only one needing neither a
 * server nor a package: `handshake.test.mjs` establishes that the server tells
 * the four answers apart, and `package.test.mjs` that the thing shipped can be
 * loaded at all. What is left, and what is here, is the client's own reading of
 * those answers — which is the whole of what the user sees, and which needs no
 * editor to drive.
 *
 * The plans are made by the compiled `planRun` rather than written out, so what
 * is read here is the vocabulary the panel already acts on. Only the machines
 * are invented: which machines a given server has is `handshake.test.mjs`'s
 * subject, and inventing them is what lets a machine that cannot be run appear
 * in a run on a copy that can run everything.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const clientDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

// The compiled modules, so what is driven is what ships — the same reason
// `handshake.test.mjs` imports the compiled resolution.
const { labelFor, MachineWatch } = await import(
  pathToFileURL(path.join(clientDir, 'out', 'machineStatus.js')).href
);
const { planRun } = await import(
  pathToFileURL(path.join(clientDir, 'out', 'operations.js')).href
);

const RUNNABLE = {
  id: 'zx81',
  name: 'ZX81',
  description: 'Sinclair ZX81',
  canRun: true,
};
const NEEDS_ROMS = {
  id: 'bbc',
  name: 'BBC Micro',
  description: 'Acorn BBC Micro',
  canRun: false,
};
const MACHINES = [RUNNABLE, NEEDS_ROMS];

/** A listing, as much of one as the watch is ever given. */
const listing = (uri, version, text = '10 PRINT "HI"\n') => ({
  uri,
  version,
  text,
});

describe('what the user is told about the machine in force', () => {
  it('names the machine a settled listing is checked against', () => {
    const label = labelFor(planRun(MACHINES, 'zx81', ''));
    // The name the user picked from, never the id the setting holds.
    assert.match(label.text, /ZX81/);
    assert.doesNotMatch(label.text, /zx81/);
    assert.match(label.tooltip, /checked against the ZX81/);
  });

  it('says as plainly when no machine is settled', () => {
    const label = labelFor(planRun(MACHINES, null, ''));
    assert.ok(label, 'a listing with no machine settled is shown nothing');
    assert.match(label.text, /no machine/i);
  });

  it('says which machine was named where this server has no such machine', () => {
    const label = labelFor(planRun(MACHINES, null, 'spectrum'));
    // Which name it was, or a typo cannot be told from a machine this server
    // genuinely does not have.
    assert.match(label.text, /spectrum/);
    assert.match(label.tooltip, /spectrum/);
  });

  it('shows a machine that cannot be run as the machine, not as an absence', () => {
    const plan = planRun(MACHINES, 'bbc', '');
    assert.equal(plan.kind, 'needs-roms');
    const label = labelFor(plan);
    // The listing is being checked against it perfectly well, and only running
    // it is affected; collapsing the two would tell a user their listing is
    // unchecked when it is not.
    assert.match(label.text, /BBC Micro/);
    assert.doesNotMatch(label.text, /no machine/i);
    assert.match(label.tooltip, /checked against the BBC Micro/);
  });

  it('tells the four answers apart', () => {
    const shown = [
      planRun(MACHINES, 'zx81', ''),
      planRun(MACHINES, null, ''),
      planRun(MACHINES, null, 'spectrum'),
      planRun(MACHINES, 'bbc', ''),
    ].map((plan) => labelFor(plan).text);
    assert.equal(new Set(shown).size, 4, `two answers read alike: ${shown}`);
  });

  it('restates no remedy, which the problem on the listing already gives', () => {
    for (const plan of [
      planRun(MACHINES, null, ''),
      planRun(MACHINES, null, 'spectrum'),
      planRun(MACHINES, 'bbc', ''),
    ]) {
      const label = labelFor(plan);
      // Said twice, in two places, is how the two come to disagree. Choosing
      // the machine is offered on the item instead.
      assert.doesNotMatch(
        `${label.text} ${label.tooltip}`,
        /basically\.machine|#MACHINE/,
        'the item restates what the problem on the listing already says',
      );
    }
  });

  it('says nothing at all where the answer could not be got', () => {
    assert.equal(labelFor({ kind: 'unavailable' }), null);
  });

  it('says the answer is being worked out rather than showing nothing', () => {
    const label = labelFor({ kind: 'pending' });
    assert.ok(label, 'nothing is shown while the answer is awaited');
    assert.notEqual(label.text.trim(), '');
  });
});

describe('what keeping it current costs', () => {
  it('shows nothing for a file that is not a listing', async () => {
    const shown = [];
    const watch = new MachineWatch(
      () => assert.fail('asked about something that is not a listing'),
      (label) => shown.push(label),
    );
    await watch.watch(null);
    assert.deepEqual(shown, [null]);
  });

  it('asks nothing when an unchanged listing is returned to', async () => {
    let asked = 0;
    const shown = [];
    const watch = new MachineWatch(
      () => {
        asked += 1;
        return Promise.resolve(planRun(MACHINES, 'zx81', ''));
      },
      (label) => shown.push(label),
    );

    await watch.watch(listing('file:///a.bas', 3));
    assert.equal(asked, 1);
    // Another listing, and then back to the first with its text unchanged.
    await watch.watch(listing('file:///b.bas', 1));
    assert.equal(asked, 2);
    await watch.watch(listing('file:///a.bas', 3));
    assert.equal(asked, 2, 'asked again about a listing already established');

    assert.match(shown.at(-1).text, /ZX81/);
    // And nothing was waited for on the way back, so nothing said so.
    assert.notDeepEqual(shown.at(-1), labelFor({ kind: 'pending' }));
  });

  it('asks again once the listing has changed', async () => {
    let asked = 0;
    const watch = new MachineWatch(
      () => {
        asked += 1;
        return Promise.resolve(planRun(MACHINES, 'zx81', ''));
      },
      () => {},
    );
    await watch.watch(listing('file:///a.bas', 3));
    await watch.watch(listing('file:///a.bas', 4));
    assert.equal(asked, 2, 'showed an answer about text the user has replaced');
  });

  it('says it is working it out rather than leaving the last machine showing', async () => {
    const shown = [];
    let answer;
    const watch = new MachineWatch(
      () => new Promise((resolve) => (answer = resolve)),
      (label) => shown.push(label),
    );
    const watching = watch.watch(listing('file:///a.bas', 1));
    assert.equal(shown.length, 1, 'nothing was shown while the answer was awaited');
    assert.deepEqual(shown[0], labelFor({ kind: 'pending' }));
    answer(planRun(MACHINES, 'zx81', ''));
    await watching;
    assert.match(shown.at(-1).text, /ZX81/);
  });

  it('drops an answer that arrives after the user has moved on', async () => {
    const shown = [];
    const answers = new Map();
    const watch = new MachineWatch(
      (asked) => new Promise((resolve) => answers.set(asked.uri, resolve)),
      (label) => shown.push(label),
    );

    const first = watch.watch(listing('file:///a.bas', 1));
    const second = watch.watch(listing('file:///b.bas', 1));
    // The first listing's answer comes back last, and is about a listing the
    // user is no longer editing.
    answers.get('file:///b.bas')(planRun(MACHINES, 'bbc', ''));
    answers.get('file:///a.bas')(planRun(MACHINES, 'zx81', ''));
    await Promise.all([first, second]);

    assert.match(
      shown.at(-1).text,
      /BBC Micro/,
      'the machine of a listing the user had left was shown',
    );
  });

  it('shows nothing where the question could not be put', async () => {
    const shown = [];
    const watch = new MachineWatch(
      () => Promise.reject(new Error('no server')),
      (label) => shown.push(label),
    );
    await watch.watch(listing('file:///a.bas', 1));
    // Pending, and then nothing: what went wrong belongs in the output channel,
    // and an item that turned into a fault report for a fault it is not about
    // would be its own bug.
    assert.deepEqual(shown.at(-1), null);
  });

  it('asks again after a failure rather than remembering it', async () => {
    let asked = 0;
    const watch = new MachineWatch(
      () => {
        asked += 1;
        return asked === 1
          ? Promise.reject(new Error('no server'))
          : Promise.resolve(planRun(MACHINES, 'zx81', ''));
      },
      () => {},
    );
    await watch.watch(listing('file:///a.bas', 1));
    await watch.watch(listing('file:///a.bas', 1));
    assert.equal(asked, 2, 'a failed question was remembered as an answer');
  });

  it('asks again once the configured machine could have moved', async () => {
    let asked = 0;
    const watch = new MachineWatch(
      () => {
        asked += 1;
        return Promise.resolve(planRun(MACHINES, null, 'zx81'));
      },
      () => {},
    );
    await watch.watch(listing('file:///a.bas', 1));
    watch.forgetAll();
    await watch.watch(listing('file:///a.bas', 1));
    assert.equal(asked, 2, 'showed a machine settled under the old settings');
  });

  it('forgets a listing that is closed', async () => {
    let asked = 0;
    const watch = new MachineWatch(
      () => {
        asked += 1;
        return Promise.resolve(planRun(MACHINES, 'zx81', ''));
      },
      () => {},
    );
    await watch.watch(listing('file:///a.bas', 1));
    watch.forget('file:///a.bas');
    await watch.watch(listing('file:///a.bas', 1));
    assert.equal(asked, 2);
  });
});
