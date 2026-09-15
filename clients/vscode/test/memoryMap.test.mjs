// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * What the user is shown of where the program is living in memory, and what is
 * asked for it.
 *
 * The fifth client-against-itself suite, and like `variableWatch.test.mjs` it
 * needs neither an editor nor a server: what a real server answers for a map is
 * `handshake.test.mjs`'s subject, and what the client makes of each answer is
 * this one's. The refusals are the whole of the feature — a server that
 * projects no map, a machine whose layout the toolchain does not describe and a
 * window holding no machine are three answers with three different remedies,
 * and none of them may reach the user as an empty frame, which is what all
 * three would look like.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const clientDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

// The compiled module, so what is driven is what ships.
const { contentFor, MemoryMap } = await import(
  pathToFileURL(path.join(clientDir, 'out', 'memoryMap.js')).href
);

const manifest = JSON.parse(
  readFileSync(path.join(clientDir, 'package.json'), 'utf8'),
);

const MEMORY_VIEW = 'basically.memory';
const ADDRESS = 'http://127.0.0.1:51234/m/abcdef';

/** What the toolchain answers a caller with nowhere to serve a projection. */
const CANNOT_PROJECT =
  'This toolchain cannot project a map of a machine’s memory. A map is ' +
  'served by a host that is holding the machine for you.';

/** What it answers about a machine whose layout it does not describe. */
const CANNOT_BE_MAPPED =
  'The toolchain does not describe this machine’s memory layout, so ' +
  'there is no map of it to show.';

/** A source answering whatever is handed to it, recording what was asked. */
function recording(answers) {
  const asked = { opens: 0 };
  const source = {
    open: () => {
      asked.opens++;
      const next = answers.shift();
      if (next === undefined) throw new Error('asked more times than answered');
      return typeof next === 'function' ? next() : Promise.resolve(next);
    },
  };
  return { source, asked };
}

/** Drive a map over one source, collecting every state it settled on. */
function mapping(source) {
  const seen = [];
  const map = new MemoryMap(
    () => source,
    (state) => seen.push(state),
  );
  return { map, seen };
}

describe('what each answer is shown as', () => {
  it('frames the address and adds nothing of its own to it', () => {
    const content = contentFor({ kind: 'mapped', address: ADDRESS });
    assert.deepEqual(content, { kind: 'frame', address: ADDRESS });
  });

  it('says the toolchain s own words about a machine with no layout', () => {
    // The server's account, carried through as it was given: which machines
    // have a described layout is the toolchain's to know and to change.
    const content = contentFor({
      kind: 'cannot-map',
      problem: CANNOT_BE_MAPPED,
    });
    assert.equal(content.kind, 'message');
    assert.ok(content.lines.includes(CANNOT_BE_MAPPED));
  });

  it('blames the server, not the machine, for projecting no map', () => {
    const content = contentFor({ kind: 'no-projection' });
    assert.equal(content.kind, 'message');
    assert.match(content.heading, /this server does not project/i);
    // The remedy is a setting this client actually contributes, on the same
    // terms every other remedy it states is.
    const named = [content.heading, ...content.lines].join(' ');
    assert.match(named, /basically\.server\.path/);
  });

  it('names no setting this client does not contribute', () => {
    const contributed = Object.keys(
      manifest.contributes.configuration.properties,
    );
    const states = [
      { kind: 'no-machine' },
      { kind: 'opening' },
      { kind: 'mapped', address: ADDRESS },
      { kind: 'cannot-map', problem: CANNOT_BE_MAPPED },
      { kind: 'no-projection' },
      { kind: 'unavailable' },
    ];
    for (const state of states) {
      const content = contentFor(state);
      if (content.kind !== 'message') continue;
      const said = [content.heading, ...content.lines].join(' ');
      for (const setting of said.match(/basically\.[a-z.]*[a-z]/gi) ?? []) {
        assert.ok(
          contributed.includes(setting),
          `${state.kind} tells the user to set ${setting}, which this client does not contribute`,
        );
      }
    }
  });

  it('offers a listing to run where a machine is what is missing', () => {
    const content = contentFor({ kind: 'no-machine' });
    assert.equal(content.kind, 'message');
    assert.equal(content.offerRun, true);
    // And nowhere else: a window that has a machine is not one to be told to
    // run a listing to get one.
    for (const state of [
      { kind: 'opening' },
      { kind: 'cannot-map', problem: CANNOT_BE_MAPPED },
      { kind: 'no-projection' },
      { kind: 'unavailable' },
    ]) {
      assert.equal(contentFor(state).offerRun, false, `${state.kind} offers a run`);
    }
  });

  it('says every state as something, so none of them is an empty frame', () => {
    const states = [
      { kind: 'no-machine' },
      { kind: 'opening' },
      { kind: 'mapped', address: ADDRESS },
      { kind: 'cannot-map', problem: CANNOT_BE_MAPPED },
      { kind: 'no-projection' },
      { kind: 'unavailable' },
    ];
    for (const state of states) {
      const content = contentFor(state);
      if (content.kind === 'frame') {
        assert.ok(content.address.length > 0, 'a frame with nowhere to point');
        continue;
      }
      assert.ok(content.heading.length > 0, `${state.kind} says nothing`);
    }
  });

  it('tells the three refusals apart rather than showing one emptiness', () => {
    const refusals = [
      contentFor({ kind: 'no-projection' }),
      contentFor({ kind: 'cannot-map', problem: CANNOT_BE_MAPPED }),
      contentFor({ kind: 'no-machine' }),
    ].map((content) => [content.heading, ...content.lines].join(' '));
    assert.equal(
      new Set(refusals).size,
      refusals.length,
      'two of the three refusals say the same thing',
    );
  });
});

describe('asking where the map is', () => {
  it('shows the address the toolchain answered', async () => {
    const { source } = recording([
      { address: ADDRESS, already: false, problem: null },
    ]);
    const { map, seen } = mapping(source);
    await map.refresh();
    assert.equal(map.state.kind, 'mapped');
    assert.equal(map.state.address, ADDRESS);
    // "opening" first, because nothing had been answered yet.
    assert.deepEqual(
      seen.map((state) => state.kind),
      ['opening', 'mapped'],
    );
  });

  it('holds no machine where there is no conversation to ask', async () => {
    const map = new MemoryMap(
      () => null,
      () => {},
    );
    await map.refresh();
    assert.equal(map.state.kind, 'no-machine');
  });

  it('reads an answer with nowhere to serve one as the server s limitation', async () => {
    const { source } = recording([
      { address: null, already: false, problem: CANNOT_PROJECT },
    ]);
    const { map } = mapping(source);
    await map.refresh();
    assert.equal(map.state.kind, 'no-projection');
  });

  it('reads a machine with no described layout as its own state', async () => {
    const { source } = recording([
      { address: null, already: false, problem: CANNOT_BE_MAPPED },
    ]);
    const { map } = mapping(source);
    await map.refresh();
    assert.equal(map.state.kind, 'cannot-map');
    assert.equal(map.state.problem, CANNOT_BE_MAPPED);
  });

  it('reads a server that has no such operation as projecting no map', async () => {
    // A server older than the one this client pins has never heard of the
    // operation and refuses the whole request over its name. A client never
    // refuses over a version number, so this is a sentence rather than a fault.
    const { source } = recording([
      () => Promise.reject(new Error('there is no operation called "map"')),
    ]);
    const { map } = mapping(source);
    await map.refresh();
    assert.equal(map.state.kind, 'no-projection');
  });

  it('reads a refusal for no machine as holding none', async () => {
    const { source } = recording([
      () => Promise.reject(new Error('No machine is up. Run a program first.')),
    ]);
    const { map } = mapping(source);
    await map.refresh();
    assert.equal(map.state.kind, 'no-machine');
  });

  it('says a map it could not ask for at all could not be had', async () => {
    const { source } = recording([
      () => Promise.reject(new Error('the conversation ended')),
    ]);
    const { map } = mapping(source);
    await map.refresh();
    assert.equal(map.state.kind, 'unavailable');
  });

  it('never asks twice at once', async () => {
    // Replies are matched by id rather than by order, so two askings in flight
    // are legal on the wire and would queue on the machine's own thread, each
    // answering later than the last.
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    const { source, asked } = recording([
      () => held.then(() => ({ address: null, already: false, problem: null })),
      { address: ADDRESS, already: false, problem: null },
    ]);
    const { map } = mapping(source);
    const first = map.refresh();
    await map.refresh();
    await map.refresh();
    assert.equal(asked.opens, 1, 'asked again while an asking was outstanding');
    release();
    await first;
    // The one after it lands, because nothing is outstanding any more.
    await map.refresh();
    assert.equal(asked.opens, 2);
  });

  it('keeps the map it has rather than asking for a second one', async () => {
    // A map belongs to the caller rather than to any one machine: the address
    // goes on showing whatever that conversation holds, so a program run after
    // the last one has gone appears at the address already framed.
    const { source, asked } = recording([
      { address: ADDRESS, already: false, problem: null },
    ]);
    const { map } = mapping(source);
    await map.refresh();
    await map.refresh();
    await map.refresh();
    assert.equal(asked.opens, 1);
    assert.equal(map.state.address, ADDRESS);
  });

  it('goes on asking after a refusal rather than giving up', async () => {
    const { source, asked } = recording([
      () => Promise.reject(new Error('the conversation ended')),
      { address: ADDRESS, already: true, problem: null },
    ]);
    const { map } = mapping(source);
    await map.refresh();
    assert.equal(map.state.kind, 'unavailable');
    await map.refresh();
    assert.equal(map.state.kind, 'mapped');
    assert.equal(asked.opens, 2);
  });

  it('asks afresh for the next machine when one is let go', async () => {
    const { source, asked } = recording([
      { address: ADDRESS, already: false, problem: null },
      { address: ADDRESS, already: true, problem: null },
    ]);
    const { map } = mapping(source);
    await map.refresh();
    map.released();
    assert.equal(map.state.kind, 'no-machine');
    await map.refresh();
    assert.equal(map.state.kind, 'mapped');
    assert.equal(asked.opens, 2);
  });
});

describe('what the manifest contributes for it', () => {
  it('contributes the view the client registers', () => {
    const views = Object.values(manifest.contributes.views).flat();
    const map = views.find((view) => view.id === MEMORY_VIEW);
    assert.ok(map, `the manifest contributes no ${MEMORY_VIEW} view`);
    // A frame is a webview and nothing else can hold one: a view contributed
    // as a tree would be registered by a provider the editor never asks for,
    // and the user would open an empty pane.
    assert.equal(map.type, 'webview');
    assert.ok(map.name.length > 0, 'the view has no name to dock');
  });

  it('activates the extension when the view is opened', () => {
    // The user may dock the map and restart the editor without opening a
    // listing; nothing registers the provider unless activation reaches it.
    assert.ok(
      manifest.activationEvents.includes(`onView:${MEMORY_VIEW}`),
      'opening the memory view does not activate the extension',
    );
  });

  it('contributes no welcome for it, because a webview draws its own', () => {
    // Welcome content is drawn for tree views only. What a window holding no
    // machine is told is the view's own page, which `contentFor` settles and
    // this suite checks above.
    const welcomes = manifest.contributes.viewsWelcome ?? [];
    assert.equal(
      welcomes.some((welcome) => welcome.view === MEMORY_VIEW),
      false,
      'a welcome is contributed for a webview view, where it is never drawn',
    );
  });

  it('offers a command it contributes where it offers one at all', () => {
    const content = contentFor({ kind: 'no-machine' });
    assert.equal(content.offerRun, true);
    assert.ok(
      manifest.contributes.commands.some(
        (command) => command.command === 'basically.runListing',
      ),
      'the view offers a command the manifest does not contribute',
    );
  });
});
