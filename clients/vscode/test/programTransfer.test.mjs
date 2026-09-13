// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * What a user is told about exporting a listing, and what the manifest offers
 * them to ask with.
 *
 * The fourth suite needing neither a server nor a package, in the manner of
 * `machineStatus.test.mjs`: `handshake.test.mjs` establishes that the server
 * builds what it is asked to build, and what is left — which machine an export
 * is planned for, where each file goes and what the user is told — needs no
 * server and no editor to drive.
 *
 * The machines and the outcomes are invented, because inventing them is what
 * lets a machine no copy can run appear in an export on a copy that can run
 * everything, and lets a format producing three files be read without finding
 * a machine that has one.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const clientDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

// The compiled modules, so what is driven is what ships.
const { planExport, refusalFor, reportFor, suggestedFileName } = await import(
  pathToFileURL(path.join(clientDir, 'out', 'programTransfer.js')).href
);

const manifest = JSON.parse(
  readFileSync(path.join(clientDir, 'package.json'), 'utf8'),
);

const RUNNABLE = {
  id: 'zx81',
  name: 'ZX81',
  description: 'Sinclair ZX81',
  canRun: true,
};
const NEEDS_ROMS = {
  id: 'bbcmicro',
  name: 'BBC Micro',
  description: 'Acorn BBC Micro',
  canRun: false,
};
const MACHINES = [RUNNABLE, NEEDS_ROMS];

/** A build that got as far as producing files. */
const built = (machine, label, files) => ({
  machine: { id: machine.id, name: machine.name },
  errors: [],
  target: { id: `${machine.id}-tape`, label, fileExtension: 'p' },
  files: files.map((fileName, index) => ({
    fileName,
    base64: 'AAEC',
    size: 3 + index,
  })),
});

describe('which machine a listing is exported for', () => {
  it('settles it the way every other surface does', () => {
    assert.deepEqual(planExport(MACHINES, 'zx81', ''), {
      kind: 'export',
      machine: RUNNABLE,
    });
    // The listing's own declaration first, then the configured machine.
    assert.deepEqual(planExport(MACHINES, null, 'ZX81'), {
      kind: 'export',
      machine: RUNNABLE,
    });
    assert.deepEqual(planExport(MACHINES, 'zx81', 'bbcmicro'), {
      kind: 'export',
      machine: RUNNABLE,
    });
  });

  it('exports for a machine this copy cannot run', () => {
    // The whole of why an export is planned apart from a run: building reads
    // none of the machine's firmware, and a user with no images here is the one
    // most likely to want a file for the machine itself.
    assert.deepEqual(planExport(MACHINES, 'bbcmicro', ''), {
      kind: 'export',
      machine: NEEDS_ROMS,
    });
  });

  it('tells a listing with no machine what to set, rather than guessing', () => {
    const plan = planExport(MACHINES, null, '');
    assert.deepEqual(plan, { kind: 'no-machine' });
    const refusal = refusalFor(plan);
    assert.match(refusal.heading, /does not say which machine/);
    assert.match(refusal.remedy, /#MACHINE/);
  });

  it('says so of a machine this server does not have', () => {
    const plan = planExport(MACHINES, null, 'spectrum');
    assert.deepEqual(plan, { kind: 'unknown-machine', wanted: 'spectrum' });
    assert.match(refusalFor(plan).heading, /no machine called "spectrum"/);
  });

  it('names only settings the client contributes', () => {
    const contributed = Object.keys(
      manifest.contributes.configuration.properties,
    );
    for (const reason of [
      { kind: 'no-machine' },
      { kind: 'unknown-machine', wanted: 'spectrum' },
      { kind: 'no-formats', machine: RUNNABLE },
    ]) {
      const refusal = refusalFor(reason);
      const said = `${refusal.heading} ${refusal.remedy}`;
      for (const named of said.match(/\bbasically(?:\.[a-zA-Z]+)+/g) ?? []) {
        assert.ok(
          contributed.includes(named),
          `${reason.kind} tells the user to set ${named}, which the client does not contribute`,
        );
      }
    }
  });
});

describe('the name the save dialog opens with', () => {
  it('keeps the listing’s name and takes the format’s extension', () => {
    assert.equal(
      suggestedFileName('breakout.bas', { id: 't', label: 'Tape', fileExtension: 'p' }),
      'breakout.p',
    );
    assert.equal(
      suggestedFileName('/home/me/maze.bas', { id: 't', label: 'Tape', fileExtension: 'wav' }),
      'maze.wav',
    );
  });

  it('invents no extension for a format that declares none', () => {
    assert.equal(
      suggestedFileName('breakout.bas', { id: 't', label: 'Raw bytes' }),
      'breakout',
    );
  });
});

describe('what the user is told an export came to', () => {
  it('writes nothing where a problem stopped the build', () => {
    const report = reportFor(
      {
        machine: { id: 'zx81', name: 'ZX81' },
        errors: [
          { line: 20, column: 3, message: 'PRIMT is not a keyword' },
          { line: 30, column: 0, message: 'this program is large', fatal: false },
        ],
        target: null,
        files: [],
      },
      '/home/me/breakout.p',
    );
    assert.deepEqual(report.writes, [], 'a listing that would not build wrote a file');
    assert.match(report.message, /Nothing was exported/);
    // The problem that stopped it, and not the advisory one, which stopped
    // nothing and would read as a second cause.
    assert.deepEqual(report.detail, ['Line 20: PRIMT is not a keyword']);
  });

  it('puts one file where the user said', () => {
    const report = reportFor(
      built(RUNNABLE, 'ZX81 tape image', ['breakout.p']),
      '/home/me/games/renamed.p',
    );
    assert.deepEqual(report.writes, [
      { path: '/home/me/games/renamed.p', base64: 'AAEC' },
    ]);
    assert.match(report.message, /Exported for the ZX81 as ZX81 tape image/);
    assert.deepEqual(report.detail, ['/home/me/games/renamed.p']);
  });

  it('puts the rest beside it under the names the format gave them', () => {
    const report = reportFor(
      built(NEEDS_ROMS, 'BBC disc files', ['prog', 'prog.inf', 'prog.bbc']),
      path.join('/home/me/games', 'renamed'),
    );
    assert.deepEqual(
      report.writes.map((write) => write.path),
      [
        path.join('/home/me/games', 'renamed'),
        path.join('/home/me/games', 'prog.inf'),
        path.join('/home/me/games', 'prog.bbc'),
      ],
    );
    // Every one of them named back, because the user was asked about the first
    // alone and would not know to look for the others.
    assert.deepEqual(report.detail, report.writes.map((write) => write.path));
    assert.match(report.message, /3 files/);
  });

  it('says nothing was exported where a format produced no file', () => {
    const report = reportFor(
      built(RUNNABLE, 'Nothing at all', []),
      '/home/me/breakout.p',
    );
    assert.deepEqual(report.writes, []);
    assert.match(report.message, /Nothing was exported/);
  });
});

describe('what the manifest offers the export with', () => {
  const commands = manifest.contributes.commands;
  const menus = manifest.contributes.menus;

  it('offers exporting by name, as a command about the listing being edited', () => {
    const exportListing = commands.find(
      (command) => command.command === 'basically.exportListing',
    );
    assert.ok(exportListing, 'the manifest contributes no export command');
    assert.equal(exportListing.category, 'Basically');
    const palette = menus.commandPalette.find(
      (entry) => entry.command === 'basically.exportListing',
    );
    assert.ok(palette, 'the export is offered by name whatever is being edited');
    assert.match(palette.when, /editorLangId == basically/);
  });

  it('names in a menu only commands the manifest contributes', () => {
    // A menu entry naming a command that is not contributed is a button the
    // editor offers and then answers as not found.
    const contributed = new Set(commands.map((command) => command.command));
    for (const [menu, entries] of Object.entries(menus)) {
      for (const entry of entries) {
        assert.ok(
          contributed.has(entry.command),
          `${menu} names ${entry.command}, which the manifest does not contribute`,
        );
      }
    }
  });

  it('draws every icon it declares, and only where one can be drawn', () => {
    // An icon is only ever seen in a menu that draws one, so a command carrying
    // one and appearing in none has an icon nobody will see; and the title is
    // what the button's tooltip says, so nothing is worded twice.
    const drawn = new Set(
      (menus['editor/title'] ?? []).map((entry) => entry.command),
    );
    for (const command of commands) {
      if (command.icon === undefined) continue;
      assert.ok(
        drawn.has(command.command),
        `${command.command} carries an icon and appears in no menu that draws one`,
      );
      assert.match(
        command.icon,
        /^\$\([a-z0-9-]+\)$/,
        `${command.command} does not carry a codicon id`,
      );
    }
  });

  it('offers the toolbar only where there is a listing to act on', () => {
    const toolbar = menus['editor/title'] ?? [];
    assert.deepEqual(
      toolbar.map((entry) => entry.command),
      ['basically.runListing', 'basically.exportListing'],
    );
    for (const entry of toolbar) {
      assert.match(
        entry.when ?? '',
        /editorLangId == basically/,
        `${entry.command} is offered on the title bar of files that are not listings`,
      );
      assert.match(entry.group ?? '', /^navigation/);
    }
  });
});
