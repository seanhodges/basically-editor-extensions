// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The extension's own resolution, driven against the server it will really
 * start — the check that the thing being shipped answers the protocol.
 *
 * This exists because the shape of the server is the easiest thing in this
 * repository to be wrong about: it is a Node program from npm, not a binary,
 * and a client that names the wrong command installs perfectly and then does
 * nothing. Every assertion here is about the server as packaged.
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { LspClient } from './lspClient.mjs';
import { McpClient } from './mcpClient.mjs';

const execFileAsync = promisify(execFile);

const clientDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const manifest = JSON.parse(
  readFileSync(path.join(clientDir, 'package.json'), 'utf8'),
);

// The compiled resolution, so the test starts the server the way the extension
// does rather than the way this file imagines it would.
const { argsFor, envFor, envOverlayFor, launchFor, locateServer } = await import(
  pathToFileURL(path.join(clientDir, 'out', 'server.js')).href
);
// And the compiled conversation and the compiled decision, for the same reason:
// what is driven here is what ships.
const { Operations, planRun } = await import(
  pathToFileURL(path.join(clientDir, 'out', 'operations.js')).href
);
const { planDebug } = await import(
  pathToFileURL(path.join(clientDir, 'out', 'machineDebug.js')).href
);

// Normally the bundled copy. `BASICALLY_SERVER_PATH` points the same
// conversation at a checkout of the toolchain, which is how a server that is
// not published yet gets checked against this client.
const launch = launchFor(
  locateServer(process.env.BASICALLY_SERVER_PATH ?? '', clientDir),
  {
    configuredNodePath: '',
    editorExecPath: process.execPath,
    editorNodeVersion: process.versions.node,
  },
);

const DECLARED_URI = 'file:///declared.bas';
const UNDECLARED_URI = 'file:///undeclared.bas';
/** A listing naming its machine, with an unterminated string on its second line. */
const DECLARED = '#MACHINE zx81\n10 PRINT "HI\n20 GOTO 10\n';
/** A listing several machines would read equally, so none can be inferred. */
const UNDECLARED = '10 PRINT "HI"\n';

describe('the bundled server', () => {
  let client;
  let capabilities;

  before(async () => {
    client = new LspClient(
      launch.command,
      argsFor(launch, 'lsp', '--stdio'),
      launch.runAsNode
        ? { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } }
        : {},
    );
    capabilities = (await client.initialize({})).capabilities;
    // Both listings are opened once here rather than by whichever test needs
    // one first: the server answers about open documents, and a test that
    // depends on an earlier test having opened its document breaks the moment
    // the two are reordered or one is run alone.
    client.open(DECLARED_URI, DECLARED);
    client.open(UNDECLARED_URI, UNDECLARED);
  });

  after(async () => {
    await client?.stop();
  });

  it('is the version the manifest pins', (t) => {
    if (process.env.BASICALLY_SERVER_PATH) {
      t.skip('serving from BASICALLY_SERVER_PATH, not the bundled copy');
      return;
    }
    const packaged = JSON.parse(
      readFileSync(path.join(clientDir, 'server', 'package.json'), 'utf8'),
    );
    assert.equal(packaged.name, manifest.basically.server.package);

    // What was carried has to be what was named, or this suite has tested a
    // server that is not the one shipping. That comparison only means anything
    // where the name is a single version, which is the convention and is what
    // makes a build repeatable. A range names a set, so there is nothing here
    // to compare against: the run is against whatever the registry answered at
    // the moment the server was fetched, and it would answer differently
    // tomorrow. Said out loud rather than passed over quietly, because it is
    // the one thing about this suite that is not reproducible.
    const pinned = manifest.basically.server.version;
    assert.match(
      packaged.version,
      /^\d+\.\d+\.\d+/,
      'the carried server does not say which version it is',
    );
    if (!/^\d+\.\d+\.\d+/.test(pinned)) {
      t.skip(
        `basically.server.version is "${pinned}", which pins nothing; the carried server is ${packaged.version}`,
      );
      return;
    }
    assert.equal(packaged.version, pinned);
  });

  it('offers every kind of help the client relies on', () => {
    assert.equal(capabilities.textDocumentSync, 1, 'full document sync');
    for (const provider of [
      'completionProvider',
      'hoverProvider',
      'definitionProvider',
      'documentSymbolProvider',
      'referencesProvider',
      'documentHighlightProvider',
    ]) {
      assert.ok(capabilities[provider], `no ${provider}`);
    }
  });

  it('serves colour for a whole program and for one range of it', () => {
    const provider = capabilities.semanticTokensProvider;
    assert.ok(provider, 'the server serves no colour');
    // Both, because the client relies on both: an editor showing one screen of
    // a long listing asks for the range rather than the whole.
    assert.ok(provider.full, 'no whole-program colour');
    assert.ok(provider.range, 'no per-range colour');
  });

  it('names no kind of colour the manifest has no scope for', () => {
    // The kinds a theme already colours need nothing from us. The two the
    // protocol has no word for - a line number and a graphics glyph - would
    // otherwise show as uncoloured runs nobody could explain, so the manifest
    // must carry a scope for every kind the server actually serves.
    const styled = new Set(
      Object.keys(manifest.contributes.semanticTokenScopes[0].scopes),
    );
    const standard = new Set([
      'keyword',
      'function',
      'operator',
      'comment',
      'string',
      'number',
      'variable',
      'macro',
    ]);
    const served = capabilities.semanticTokensProvider.legend.tokenTypes;
    for (const type of served) {
      assert.ok(
        standard.has(type) || styled.has(type),
        `the server serves "${type}" and the manifest gives it no scope`,
      );
    }
    // And the reverse: a scope for a kind no longer served is dead weight that
    // would quietly stop matching anything.
    for (const type of styled) {
      assert.ok(
        served.includes(type),
        `the manifest scopes "${type}" and the server serves no such kind`,
      );
    }
  });

  it('colours a listing by the machine it declares', async () => {
    const answer = await client.request('textDocument/semanticTokens/full', {
      textDocument: { uri: DECLARED_URI },
    });
    const types = capabilities.semanticTokensProvider.legend.tokenTypes;
    // The packed encoding, read back as the kinds it names.
    const kinds = [];
    for (let i = 0; i < answer.data.length; i += 5) {
      kinds.push(types[answer.data[i + 3]]);
    }
    assert.ok(kinds.includes('keyword'), 'no keyword coloured');
    assert.ok(
      kinds.includes('label'),
      'no line number coloured - a listing is all line numbers',
    );
    assert.equal(kinds[0], 'macro', 'the #MACHINE line is not a directive');
  });

  it('colours nothing in a listing it cannot bind to a machine', async () => {
    const answer = await client.request('textDocument/semanticTokens/full', {
      textDocument: { uri: UNDECLARED_URI },
    });
    assert.deepEqual(answer.data, [], 'coloured a listing with no machine');
  });

  it('reports a problem in a listing that declares its machine', async () => {
    const published = await client.waitFor(
      'textDocument/publishDiagnostics',
      (params) =>
        params.uri === DECLARED_URI && params.diagnostics.length > 0,
    );
    assert.match(published.diagnostics[0].message, /string/i);
    assert.equal(published.diagnostics[0].range.start.line, 1);
  });

  it('explains a keyword where it is written', async () => {
    const hover = await client.request('textDocument/hover', {
      textDocument: { uri: DECLARED_URI },
      position: { line: 2, character: 4 },
    });
    assert.match(hover.contents.value, /GOTO/);
  });

  it('says which setting to reach for when no machine can be told', async () => {
    const published = await client.waitFor(
      'textDocument/publishDiagnostics',
      (params) =>
        params.uri === UNDECLARED_URI && params.diagnostics.length > 0,
    );
    // The message names the setting this extension contributes. If the two ever
    // part company the user is told to set something that does not exist.
    assert.match(published.diagnostics[0].message, /basically\.machine/);
    assert.ok(
      'basically.machine' in
        manifest.contributes.configuration.properties,
      'the extension does not contribute the setting the server names',
    );
  });
});

/**
 * A listing that prints one word, for whichever machine these tests run on.
 *
 * It ends by running out rather than by saying so, and that is deliberate: a
 * terminator would have to be the right word for that machine, and there is no
 * word that is right for all of them. `END` is not a statement on the ZX81 or
 * the ZX80, which stop with `STOP`; `STOP` is not one on the Apple I or the
 * Apple II, which end with `END`. Which machine these tests use is the first
 * the carried server says it can run, and that order is the toolchain's to
 * change — so the listing has to be one every machine accepts, and printing and
 * falling off the end is that listing.
 *
 * The word is left to the caller because two of these tests read it back off a
 * machine's screen, where a space would be a second thing to get right.
 */
const printing = (word) => `10 PRINT "${word}"\n`;

/**
 * The other half of what the extension asks of the toolchain: a machine of its
 * own, run and played without leaving the editor.
 *
 * Held against the server the extension would really start, for the same reason
 * the language half is: a client and a server that have parted company here
 * install perfectly and then show the user an empty panel.
 */
describe('a machine of the editor’s own', () => {
  let operations;
  let machines;

  before(async () => {
    operations = Operations.start(launch);
    machines = await operations.machines();
  });

  after(async () => {
    await operations?.dispose();
  });

  it('serves the operations conversation', () => {
    assert.ok(machines.length > 0, 'the server reports no machines at all');
    for (const machine of machines) {
      assert.equal(
        typeof machine.canRun,
        'boolean',
        `${machine.id} does not say whether it can be run`,
      );
    }
  });

  it('says which machines it cannot run, before anything is attempted', () => {
    // Two answers, both of which the client acts on before it runs anything:
    // the machines this copy can run, and the ones whose ROM images it does not
    // hold. A copy that claimed all of one or all of the other would leave the
    // client either refusing everything or failing after the fact.
    const runnable = machines.filter((machine) => machine.canRun);
    const needingRoms = machines.filter((machine) => !machine.canRun);
    assert.ok(
      runnable.length > 0,
      'this copy of the toolchain can run no machine at all; the panel would never show one',
    );
    assert.ok(
      needingRoms.length > 0,
      'every machine is said to be runnable, so the ROM agreement would never be asked for',
    );
    assert.deepEqual(planRun(machines, runnable[0].id, ''), {
      kind: 'run',
      machine: runnable[0],
    });
    assert.deepEqual(planRun(machines, needingRoms[0].id, ''), {
      kind: 'needs-roms',
      machine: needingRoms[0],
    });
  });

  it('tells a listing with no machine what to set, rather than guessing', async () => {
    assert.equal(await operations.declaredMachine(DECLARED), 'zx81');
    assert.equal(await operations.declaredMachine(UNDECLARED), null);
    assert.deepEqual(planRun(machines, null, ''), { kind: 'no-machine' });
    // What the panel then tells the user to set. If the two ever part company
    // the user is told to set something that does not exist.
    assert.ok(
      'basically.machine' in manifest.contributes.configuration.properties,
      'the extension does not contribute the setting the panel names',
    );
  });

  it('brings a machine up and gives back an address to play it at', async () => {
    const machine = machines.find((candidate) => candidate.canRun);
    const report = await operations.run(
      machine.id,
      printing('PLAYED IN THE EDITOR'),
    );
    assert.equal(report.machine.id, machine.id);
    assert.deepEqual(
      report.errors.filter((problem) => problem.fatal !== false),
      [],
      'the listing the test runs is not one this machine accepts',
    );

    const played = await operations.play();
    assert.equal(played.problem, null);
    // An address is only worth having if something is behind it: the panel puts
    // exactly this into a frame and adds nothing of its own.
    const answered = await fetch(played.address);
    assert.equal(answered.status, 200, 'nothing answers at the played address');
  });

  it('lets the machine go when the conversation ends', async () => {
    const machine = machines.find((candidate) => candidate.canRun);
    const held = Operations.start(launch);
    await held.run(machine.id, printing('HELD'));
    const { address } = await held.play();
    assert.equal((await fetch(address)).status, 200);

    await held.dispose();

    // The machine goes with the connection, so nothing is left running behind a
    // panel the user closed. Nothing in the client had to arrange this.
    await assert.rejects(
      fetch(address),
      'the machine was still being served after its conversation ended',
    );
  });

  it('holds a machine of its own, not the one the command line holds', async (t) => {
    const cli = (...operation) =>
      execFileAsync(launch.command, argsFor(launch, ...operation), {
        env: envFor(launch),
        maxBuffer: 4 * 1024 * 1024,
      });
    const machine = machines.find((candidate) => candidate.canRun);

    // The command line keeps its machine in a host shared across its commands.
    // Started here rather than by the first command that wants it, so that
    // command does not have to wait on a host being brought up; and stopped
    // afterwards only if this test is what started it.
    const before = JSON.parse((await cli('server', 'status', '--json')).stdout);
    if (!before.running) await cli('server', 'start');
    try {
      await operations.run(machine.id, printing('THEEDITORS'));
      // A file rather than standard input, which the command line would also
      // take but which nothing here is holding open to write to.
      const listing = path.join(mkdtempSync(path.join(tmpdir(), 'basically-test-')), 'theirs.bas');
      writeFileSync(listing, printing('THECOMMANDLINES'));
      try {
        await cli('run', '-m', machine.id, '--hold', '--screen-text', listing);
      } catch (error) {
        if (before.running) {
          // A host was already up, and it is not this copy of the toolchain -
          // which is the very separation being checked, so it is reported
          // rather than failed. Stop it and run the suite again to check it.
          t.skip(`a host that is not this toolchain is already running: ${error.message}`);
          return;
        }
        throw error;
      }

      const ours = await operations.call('look', {});
      const theirs = JSON.parse((await cli('look', '--json')).stdout);
      assert.match(ours.screen.lines.join('\n'), /THEEDITORS/);
      assert.match(theirs.screen.lines.join('\n'), /THECOMMANDLINES/);
      assert.doesNotMatch(
        theirs.screen.lines.join('\n'),
        /THEEDITORS/,
        'the command line was given the editor’s machine',
      );
      // And neither was disturbed by the other: the editor's machine still
      // shows what the editor ran after the command line ran something else.
      assert.match(
        (await operations.call('look', {})).screen.lines.join('\n'),
        /THEEDITORS/,
        'the command line disturbed the editor’s machine',
      );
    } finally {
      if (!before.running) await cli('server', 'stop').catch(() => {});
    }
  });
});


/**
 * A program stopped on a line, on a real machine.
 *
 * The third thing the extension asks of the toolchain, and the one no amount of
 * checking the client against itself can establish: whether this machine can be
 * stepped, whether a run given lines to stop before actually stops at one, and
 * whether a stopped program answers about where it is and what it holds. A
 * server that does not serve the debugger answers none of it, which is why this
 * suite says so out loud rather than passing.
 */
describe('a program the editor can stop on a line', () => {
  let operations;
  let machines;
  /** The first machine this copy can both run and step, or null where none. */
  let steppable = null;
  /** One it can run and cannot step, which is a different answer from a refusal. */
  let unsteppable = null;

  /**
   * A listing with two stops worth having, and a variable to read at each.
   *
   * `LET`, `FOR`, `NEXT` and `PRINT` for the same reason the listing above only
   * prints: which machine these tests use is the toolchain's to change, so the
   * listing has to be one every machine accepts.
   *
   * The loops are what make the stops reachable. A machine runs its program
   * between the frames a stop is looked for in, and the faster machines get
   * through a handful of statements inside the first frame — so a listing short
   * enough to finish in one is over before anything could stop it. Five hundred
   * iterations is more than a frame's worth on the quickest machine here and
   * still seconds of the slowest machine's own time.
   */
  const STOPPABLE = [
    '10 LET A=1',
    '20 FOR I=1 TO 500',
    '30 NEXT I',
    '40 LET A=2',
    '50 FOR I=1 TO 500',
    '60 NEXT I',
    '70 PRINT A',
    '',
  ].join('\n');

  before(async () => {
    operations = Operations.start(launch);
    machines = await operations.machines();
    for (const machine of machines) {
      if (!machine.canRun) continue;
      const facts = await operations.info(machine.id);
      if (facts.canStep && !steppable) steppable = machine;
      if (!facts.canStep && !unsteppable) unsteppable = machine;
      if (steppable && unsteppable) break;
    }
  });

  after(async () => {
    await operations?.dispose();
  });

  it('says of a machine whether it can be stepped, as well as whether it can be run', async (t) => {
    if (!steppable) {
      t.skip('this server can step no machine it can run; none of this is exercised');
      return;
    }
    // Two questions and the second is the narrower, which is the whole reason
    // the client asks it: a server can run a machine that cannot say which
    // BASIC line it is executing.
    const facts = await operations.info(steppable.id);
    assert.equal(facts.canRun, true);
    assert.equal(facts.canStep, true);
    assert.deepEqual(planDebug({ kind: 'run', machine: steppable }, facts.canStep), {
      kind: 'debug',
      machine: steppable,
    });
  });

  it('answers about a machine that cannot be stepped rather than failing', async (t) => {
    if (!unsteppable) {
      t.skip('every machine this server can run can be stepped');
      return;
    }
    const facts = await operations.info(unsteppable.id);
    assert.equal(facts.canStep, false, `${unsteppable.id} is said to be steppable`);
    // Which is what the client turns into a sentence and an offer to run the
    // listing instead, rather than a failure after the fact.
    assert.deepEqual(planDebug({ kind: 'run', machine: unsteppable }, facts.canStep), {
      kind: 'cannot-step',
      machine: unsteppable,
    });
  });

  it('stops a run before a line it was given, and steps on to the next', async (t) => {
    if (!steppable) {
      t.skip('this server can step no machine it can run');
      return;
    }
    // The stops travel with the run: by the time a machine is up the program
    // has already reached wherever it was going.
    const report = await operations.debugRun(steppable.id, STOPPABLE, [40]);
    assert.deepEqual(
      report.errors.filter((problem) => problem.fatal !== false),
      [],
      'the listing this test stops is not one this machine accepts',
    );
    assert.equal(report.stoppedAt, 40, 'the run did not stop where it was told to');

    const where = await operations.where();
    assert.equal(where.canStep, true);
    assert.equal(where.line, 40);
    assert.deepEqual(where.breakpoints, [40]);

    // What the variables pane is filled from, read off the machine the program
    // is stopped on rather than worked out here.
    const variables = await operations.variables();
    assert.ok(
      variables.variables === null || Array.isArray(variables.variables),
      'a stopped program answered neither variables nor that it has none to give',
    );
    if (variables.variables !== null) {
      const a = variables.variables.find((variable) => variable.name === 'A');
      assert.ok(a, 'the variable the listing set is not among the ones reported');
    }

    // And a step reports the line it is now stopped before, which is what moves
    // the editor's highlight on.
    const stepped = await operations.step();
    assert.equal(stepped.canStep, true);
    assert.equal(stepped.ending, 'stopped');
    assert.equal(stepped.line, 50);
  });

  it('stops again at a line added between two stops', async (t) => {
    if (!steppable) {
      t.skip('this server can step no machine it can run');
      return;
    }
    await operations.ask('release');
    const report = await operations.debugRun(steppable.id, STOPPABLE, [40]);
    assert.equal(report.stoppedAt, 40);
    // A breakpoint added while a program is stopped is in force for the rest of
    // the session, which is the whole of what changing them mid-session means.
    const set = await operations.setBreakpoints([40, 70]);
    assert.equal(set.canStep, true);
    assert.deepEqual(set.lines, [40, 70]);
    const resumed = await operations.resume();
    assert.equal(resumed.ending, 'stopped');
    assert.equal(resumed.line, 70);
  });

  it('refuses to stop on a machine that cannot be stepped, and says why', async (t) => {
    if (!unsteppable) {
      t.skip('every machine this server can run can be stepped');
      return;
    }
    await operations.ask('release');
    // Said rather than attempted: a run that accepted the lines and never
    // stopped would leave the user watching a program that was never going to
    // pause.
    await assert.rejects(
      operations.debugRun(unsteppable.id, STOPPABLE, [40]),
      (error) => /step/i.test(error.message),
      `${unsteppable.id} accepted lines to stop before`,
    );
  });

  it('mirrors the machine at an address, without letting it be driven', async (t) => {
    if (!steppable) {
      t.skip('this server can step no machine it can run');
      return;
    }
    await operations.ask('release');
    await operations.debugRun(steppable.id, STOPPABLE, [40]);
    const viewed = await operations.view();
    assert.equal(viewed.problem, null, 'the machine a session stops cannot be shown');
    // An address is only worth having if something is behind it: the panel puts
    // exactly this into a frame and adds nothing of its own.
    assert.equal((await fetch(viewed.address)).status, 200);
  });

  it('holds its stopped program apart from the one the command line stopped', async (t) => {
    if (!steppable) {
      t.skip('this server can step no machine it can run');
      return;
    }
    const cli = (...operation) =>
      execFileAsync(launch.command, argsFor(launch, ...operation), {
        env: envFor(launch),
        maxBuffer: 4 * 1024 * 1024,
      });

    const before = JSON.parse((await cli('server', 'status', '--json')).stdout);
    if (!before.running) await cli('server', 'start');
    try {
      await operations.ask('release');
      await operations.debugRun(steppable.id, STOPPABLE, [40]);

      const listing = path.join(
        mkdtempSync(path.join(tmpdir(), 'basically-test-')),
        'theirs.bas',
      );
      writeFileSync(listing, STOPPABLE);
      try {
        await cli('run', '-m', steppable.id, '--hold', '--break', '70', '--json', listing);
      } catch (error) {
        if (before.running) {
          t.skip(`a host that is not this toolchain is already running: ${error.message}`);
          return;
        }
        throw error;
      }

      // Two machines, each stopped where its own caller stopped it. A client
      // reaching through the command line's shared session would find the
      // editor's program on the command line's line.
      const ours = await operations.where();
      const theirs = JSON.parse((await cli('where', '--json')).stdout);
      assert.equal(ours.line, 40, 'the editor lost the line it stopped on');
      assert.equal(theirs.line, 70, 'the command line lost the line it stopped on');
      assert.equal(
        (await operations.where()).line,
        40,
        'the command line disturbed the program the editor had stopped',
      );
    } finally {
      if (!before.running) await cli('server', 'stop').catch(() => {});
    }
  });
});

describe('the toolchain served to an agent', () => {
  let agent;
  let tools;

  before(async () => {
    agent = new McpClient(
      launch.command,
      argsFor(launch, 'mcp', '--stdio'),
      launch.runAsNode
        ? { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } }
        : {},
    );
    await agent.initialize();
    tools = (await agent.tools()).tools;
  });

  after(async () => {
    await agent?.stop();
  });

  // The extension names this operation to the editor and never speaks it
  // itself, so nothing else in this repository would notice a server that had
  // stopped answering it.
  it('answers the agent protocol over the server the client will name', () => {
    assert.ok(
      Array.isArray(tools) && tools.length > 0,
      'the server offered an agent no tools at all',
    );
    for (const tool of tools) {
      assert.ok(tool.name, 'a tool arrived without a name');
      assert.ok(
        tool.inputSchema,
        `the ${tool.name} tool arrived without a schema to call it by`,
      );
    }
  });

  // Deliberately not an assertion about *which* tools there are: what the
  // toolchain offers an agent is the toolchain's to change, and the editor is
  // the one that reads the list.
  it('carries out a request needing no machine and no images', async () => {
    const answer = await agent.call('machines');
    assert.ok(
      !answer.isError,
      `the server refused a request needing nothing: ${JSON.stringify(answer.content)}`,
    );
    const text = answer.content.map((part) => part.text ?? '').join('');
    assert.match(text, /zx81/i, 'the machines it reported named no machine');
  });
});

describe('what the client owes itself about the agent', () => {
  it('adds to the environment only what the launch needs', () => {
    assert.deepEqual(
      envOverlayFor({ command: 'node', prefixArgs: [], runAsNode: false, notes: [] }),
      {},
      'a launch that needs nothing added still added something',
    );
    assert.deepEqual(
      envOverlayFor({ command: 'code', prefixArgs: [], runAsNode: true, notes: [] }),
      { ELECTRON_RUN_AS_NODE: '1' },
      "the editor's own executable was not told to serve",
    );
    // The whole environment is still what a spawn of our own is given; the
    // overlay is for the editor, which supplies its own.
    const whole = envFor({
      command: 'code',
      prefixArgs: [],
      runAsNode: true,
      notes: [],
    });
    assert.equal(whole.ELECTRON_RUN_AS_NODE, '1');
    assert.equal(whole.PATH, process.env.PATH);
  });

  // The client registers under the name and label it reads from here, so a
  // contribution that went missing or arrived without a label is an extension
  // that offers the agent nothing and says nothing about why.
  it('contributes the provider it registers under', () => {
    const contributed = manifest.contributes.mcpServerDefinitionProviders;
    assert.ok(
      Array.isArray(contributed) && contributed.length === 1,
      'the manifest contributes no agent-server provider',
    );
    assert.ok(contributed[0].id, 'the provider is contributed without an id');
    assert.ok(
      contributed[0].label,
      'the provider is contributed without a label, so the editor lists it unnamed',
    );
  });

  // The editor holds this extension to the version it asks for, and the API the
  // provider is registered through does not exist in an older one.
  it('asks for an editor new enough to be told about a server', () => {
    const asked = Number(/\d+\.(\d+)\./.exec(manifest.engines.vscode)?.[1]);
    assert.ok(
      asked >= 101,
      `the manifest asks for ${manifest.engines.vscode}, which cannot register a provider`,
    );
  });

  it('offers a setting for everything it tells the user to set', () => {
    const properties = manifest.contributes.configuration.properties;
    assert.ok(
      'basically.mcp.enabled' in properties,
      'the toolchain can be offered to an agent with no way to decline it',
    );
    assert.equal(properties['basically.mcp.enabled'].default, true);
  });
});
