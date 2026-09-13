// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * What a user is told about moving a program between a listing and a machine's
 * own file, and what the manifest offers them to ask with.
 *
 * The fourth suite needing neither a server nor a package, in the manner of
 * `machineStatus.test.mjs`: `handshake.test.mjs` establishes that the server
 * builds what it is asked to build and reads it back, and what is left — which
 * machine an export is planned for, where each file goes, which machine a file
 * that settled none is offered as, and what the user is told of either — needs
 * no server and no editor to drive.
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
const {
  blocksWritten,
  importReportFor,
  machinesToChooseFrom,
  planExport,
  refusalFor,
  reportFor,
  suggestedFileName,
} = await import(
  pathToFileURL(path.join(clientDir, 'out', 'programTransfer.js')).href
);
const { Operations, OperationFailed } = await import(
  pathToFileURL(path.join(clientDir, 'out', 'operations.js')).href
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

/** A conversion that got as far as the BASIC the file held. */
const converted = (extra = {}) => ({
  machine: { id: 'zx81', name: 'ZX81' },
  source: '#MACHINE zx81\n10 PRINT "HI"',
  warnings: [],
  declared: true,
  ...extra,
});

/** One conversation's worth of answers, over no child process at all. */
const conversing = (answer) => {
  const asked = [];
  const operations = Object.create(Operations.prototype);
  operations.call = async (operation, input) => {
    asked.push({ operation, input });
    return answer(input);
  };
  return { operations, asked };
};

const refusing = (message) => () => {
  throw new OperationFailed(message, 'request');
};

describe('which machine a file is read as', () => {
  it('asks about the machines a refusal named, and no others', () => {
    assert.deepEqual(machinesToChooseFrom(MACHINES, ['ZX81']), [RUNNABLE]);
    // Matched back by either name the server uses for a machine, since the
    // choice is about to be sent again as the machine to read the file as.
    assert.deepEqual(machinesToChooseFrom(MACHINES, ['bbcmicro']), [NEEDS_ROMS]);
  });

  it('offers every machine where no format claimed the file', () => {
    assert.deepEqual(machinesToChooseFrom(MACHINES, []), MACHINES);
  });

  it('offers every machine rather than none it could not match back', () => {
    // A name this client failed to match would otherwise drop a machine out of
    // the list, and a list of none is a question with no answer to give.
    assert.deepEqual(machinesToChooseFrom(MACHINES, ['Jupiter Ace']), MACHINES);
  });

  it('reads a format more than one machine claims as a question', async () => {
    const { operations } = conversing(
      refusing(
        'more than one machine\'s format matches "game.tap": ZX Spectrum, ' +
          'Amstrad CPC (-m <machine> picks one)',
      ),
    );
    assert.deepEqual(await operations.convert('AAEC', 'game.tap'), {
      kind: 'which-machine',
      candidates: ['ZX Spectrum', 'Amstrad CPC'],
    });
  });

  it('reads a format no machine claims as the same question', async () => {
    const { operations } = conversing(
      refusing(
        'convert wants a machine: -m <machine> (basically machines lists ' +
          'them), since no registered machine\'s binary format matches "game.bin"',
      ),
    );
    assert.deepEqual(await operations.convert('AAEC', 'game.bin'), {
      kind: 'which-machine',
      candidates: [],
    });
  });

  it('leaves every other refusal a refusal', async () => {
    const { operations } = conversing(refusing('that file is not a ZX81 file'));
    await assert.rejects(() => operations.convert('AAEC', 'game.p'), /not a ZX81 file/);
  });

  it('reads the file without the declaration a server has never heard of', async () => {
    // A client never refuses over a version number, and an option is no
    // different from a runtime in that: what is lost is said in words instead.
    const { operations, asked } = conversing((input) => {
      if (input.declareMachine) {
        throw new OperationFailed('input has no property declareMachine', 'request');
      }
      return converted({ source: '10 PRINT "HI"' });
    });
    const answer = await operations.convert('AAEC', 'game.p');
    assert.equal(answer.kind, 'converted');
    assert.equal(answer.outcome.declared, false, 'an undeclared listing said it was declared');
    assert.deepEqual(
      asked.map((call) => call.input.declareMachine),
      [true, undefined],
      'the file was not read again without the declaration',
    );
  });

  it('names the machine only where the file did not settle one', async () => {
    const { operations, asked } = conversing(() => converted());
    const answer = await operations.convert('AAEC', 'game.p');
    assert.equal(answer.outcome.declared, true);
    assert.equal(
      asked[0].input.machine,
      undefined,
      'a machine was named over the file’s own format',
    );
    await operations.convert('AAEC', 'game.p', 'zxspectrum');
    assert.equal(asked[1].input.machine, 'zxspectrum');
  });
});

describe('what the user is told a file came to', () => {
  it('says what was read and as which machine', () => {
    const report = importReportFor(converted());
    assert.match(report.message, /Read as a ZX81 listing, 2 lines of BASIC/);
    assert.deepEqual(report.detail, []);
    assert.deepEqual(report.blocks, []);
    assert.equal(report.blocksAsk, null, 'a file holding no blocks asked for a folder');
  });

  it('puts the machine’s own warnings to the user, in its words', () => {
    const report = importReportFor(
      converted({ warnings: ['Line 40 held a character this machine has no name for.'] }),
    );
    assert.deepEqual(report.detail, [
      'Line 40 held a character this machine has no name for.',
    ]);
  });

  it('names what is not BASIC, and asks where to keep it', () => {
    const report = importReportFor(
      converted({
        blocks: [
          { id: 'b1', name: 'FONT', kind: 'memory', address: 0x3c00, base64: 'AAEC' },
          { id: 'b2', name: 'PLOT', kind: 'code', address: 0x8000, base64: 'AAECAw==' },
        ],
      }),
    );
    assert.deepEqual(report.detail, [
      'FONT: bytes, 3 bytes at 0x3C00.',
      'PLOT: machine code, 4 bytes at 0x8000.',
    ]);
    // Written under the names the machine's own reader gave them, which are
    // already safe as a file name's stem.
    assert.deepEqual(report.blocks, [
      { fileName: 'FONT.bin', base64: 'AAEC' },
      { fileName: 'PLOT.bin', base64: 'AAECAw==' },
    ]);
    assert.match(report.blocksAsk, /Choose a folder/);
  });

  it('names what the format held and did not hand over', () => {
    const report = importReportFor(
      converted({
        tapeFiles: [{ name: 'SCREEN', kind: 'bytes' }],
        autoStart: 10,
      }),
    );
    assert.deepEqual(report.detail, [
      'The file also held "SCREEN" (bytes), which is not read here.',
      'It started itself from line 10.',
    ]);
  });

  it('says an older server’s listing does not declare its machine', () => {
    const report = importReportFor(converted({ declared: false }));
    assert.match(report.detail[0], /does not say it is for the ZX81/);
    assert.match(report.detail[0], /#MACHINE zx81/);
    // The same rule the export refusals keep: a setting named to the user has
    // to be one this client contributes.
    const contributed = Object.keys(manifest.contributes.configuration.properties);
    for (const named of report.detail[0].match(/\bbasically(?:\.[a-zA-Z]+)+/g) ?? []) {
      assert.ok(
        contributed.includes(named),
        `an import tells the user to set ${named}, which the client does not contribute`,
      );
    }
  });

  it('names every block it kept, since the user named only the folder', () => {
    const said = blocksWritten(['/home/me/FONT.bin', '/home/me/PLOT.bin']);
    assert.match(said.message, /Kept 2 blocks/);
    assert.deepEqual(said.detail, ['/home/me/FONT.bin', '/home/me/PLOT.bin']);
  });
});

describe('what the manifest offers these two commands with', () => {
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

  it('offers reading a file by name whether or not a listing is open', () => {
    const importProgram = commands.find(
      (command) => command.command === 'basically.importProgram',
    );
    assert.ok(importProgram, 'the manifest contributes no command to read a file');
    assert.equal(importProgram.category, 'Basically');
    const palette = menus.commandPalette.find(
      (entry) => entry.command === 'basically.importProgram',
    );
    assert.ok(palette, 'reading a file is not offered by name at all');
    // The two entries differ because the questions differ: a user opening
    // somebody else's program has nothing open to ask about, while a title bar
    // is about the file beneath it.
    assert.equal(
      palette.when,
      undefined,
      'reading a file is offered by name only while a listing is open, and it needs none',
    );
    const toolbar = menus['editor/title'].find(
      (entry) => entry.command === 'basically.importProgram',
    );
    assert.match(toolbar.when, /editorLangId == basically/);
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
      [
        'basically.runListing',
        'basically.exportListing',
        'basically.importProgram',
      ],
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
