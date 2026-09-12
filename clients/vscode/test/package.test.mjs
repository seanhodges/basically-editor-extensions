// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The package, loaded the way the editor will load it — the check that the
 * thing being shipped can be run at all.
 *
 * This is the other half of `handshake.test.mjs`. That suite drives a client
 * against a server and catches the two having parted company; this one drives
 * the package against itself and catches a package that could never have got
 * as far as speaking to anything. The failure it exists for is silent from
 * every angle: the extension installs, the editor goes on offering the commands
 * it contributes because a palette is read without running anything, and the
 * one the user picks is answered as not existing — because a main module that
 * will not load registers nothing.
 *
 * Inside this repository everything the client asks for is findable, since
 * `clients/*` is a workspace and the modules sit above it. That is not the
 * arrangement that ships, so nothing here is asked of the client where it was
 * built: the shipped files are stood up on their own, and the runtime's own
 * resolver is asked, from there.
 *
 * The file list is the packager's own, so what is checked is what `npm run
 * package` will put in the `.vsix` rather than what this file imagines.
 */
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire, isBuiltin } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import vsce from '@vscode/vsce';

const clientDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const manifest = JSON.parse(
  readFileSync(path.join(clientDir, 'package.json'), 'utf8'),
);

/** The manifest's `main`, as the packager's file list spells it. */
const MAIN = manifest.main.replace(/^\.\//, '');

/** Where the modules the client loads are carried, beside the compiled client. */
const CARRIED = 'out/node_modules/';

/**
 * Every module a compiled file asks for.
 *
 * Reading the text is enough: the compiler emits each specifier as a plain
 * string, and no carried module computes one. A module that some day did would
 * be missed here rather than invented — the check can fail to catch something
 * new, and cannot report a failure that is not there.
 */
function requiredBy(source) {
  return [...source.matchAll(/\brequire\(\s*(['"])(.+?)\1\s*\)/g)].map(
    (match) => match[2],
  );
}

/** The name of the carried module a shipped path belongs to, or null. */
function carriedModule(file) {
  if (!file.startsWith(CARRIED)) return null;
  const rest = file.slice(CARRIED.length);
  // A module carried under another keeps the deeper name: what has to have a
  // licence is the package, wherever npm's own rule put it.
  const nested = rest.lastIndexOf('/node_modules/');
  const from = nested === -1 ? rest : rest.slice(nested + '/node_modules/'.length);
  const parts = from.split('/');
  // A scoped name is two segments; the file itself is never the name.
  const depth = from.startsWith('@') ? 2 : 1;
  return parts.length > depth
    ? file.slice(0, file.length - from.length) + parts.slice(0, depth).join('/')
    : null;
}

describe('the package the editor installs', () => {
  /** The packager's own paths, relative to the client and forward-slashed. */
  let shipped;
  /**
   * Those files and nothing above them.
   *
   * The point of the copy is what is *not* in it. Asked of the client's own
   * directory every module resolves, because the workspace's are two
   * directories up; asked here, a module that is not carried cannot be found by
   * accident — which is exactly how this went unnoticed until a user found it.
   */
  let mirror;

  before(async () => {
    // `PackageManager.None` is what `--no-dependencies` means to the packager,
    // and listing runs no prepublish step, so nothing is built or fetched here.
    shipped = new Set(
      await vsce.listFiles({
        cwd: clientDir,
        packageManager: vsce.PackageManager.None,
      }),
    );

    mirror = mkdtempSync(path.join(tmpdir(), 'basically-package-'));
    for (const file of shipped) {
      // The server is started as a program by path and never loaded as a
      // module, so it is left out rather than copied and walked. That it is
      // carried at all is asserted below.
      if (file.startsWith('server/')) continue;
      const to = path.join(mirror, file);
      mkdirSync(path.dirname(to), { recursive: true });
      cpSync(path.join(clientDir, file), to);
    }
  });

  after(() => rmSync(mirror, { recursive: true, force: true }));

  it('carries the entry point the manifest names', () => {
    assert.ok(
      shipped.has(MAIN),
      `the manifest's main is ${manifest.main} and the package carries no such file`,
    );
  });

  it('loads its entry point with nothing but itself', () => {
    const seen = new Set();
    const queue = [path.join(mirror, MAIN)];
    while (queue.length > 0) {
      const file = queue.pop();
      if (seen.has(file)) continue;
      seen.add(file);

      const resolver = createRequire(file);
      const asked = path.relative(mirror, file).split(path.sep).join('/');
      for (const specifier of requiredBy(readFileSync(file, 'utf8'))) {
        // Node's own, and the editor's own, which is injected into the
        // extension host and is no package anywhere.
        if (isBuiltin(specifier) || specifier === 'vscode') continue;

        let resolved;
        try {
          resolved = resolver.resolve(specifier);
        } catch {
          assert.fail(
            `${asked} loads "${specifier}" and the package carries nothing that resolves it`,
          );
        }
        assert.ok(
          resolved.startsWith(mirror),
          `${asked} resolves "${specifier}" to ${resolved}, outside the package`,
        );
        if (/\.[cm]?js$/.test(resolved)) queue.push(resolved);
      }
    }
    assert.ok(
      seen.size > 1,
      'the entry point loaded nothing at all, so this walked nothing',
    );
  });

  it('carries a licence for every module it carries', () => {
    const modules = new Map();
    for (const file of shipped) {
      const module = carriedModule(file);
      if (!module) continue;
      if (!modules.has(module)) modules.set(module, false);
      const name = file.slice(module.length + 1);
      if (/^(licen[cs]e|copying)/i.test(name)) modules.set(module, true);
    }
    assert.ok(modules.size > 0, 'the package carries no modules at all');
    for (const [module, licensed] of modules) {
      assert.ok(
        licensed,
        `${module} is carried without its licence, and may not ship without one`,
      );
    }
  });

  it('carries the server it will launch, and its licence', (t) => {
    if (process.env.BASICALLY_SERVER_PATH) {
      t.skip('serving from BASICALLY_SERVER_PATH, so no server was carried');
      return;
    }
    for (const file of ['server/dist/cli.mjs', 'server/LICENSE']) {
      assert.ok(shipped.has(file), `the package does not carry ${file}`);
    }
    // The toolchain resolves the emulator before it runs anything, so a copy
    // without it runs no machine at all.
    assert.ok(
      [...shipped].some((file) => file.startsWith('server/node_modules/')),
      'the emulator is not carried, so no machine would run',
    );
  });

  it('carries none of the client\'s sources, tests or build configuration', () => {
    for (const file of shipped) {
      // The server's own contents are the toolchain's business, and are
      // unpacked rather than assembled here.
      if (file.startsWith('server/') || file.startsWith(CARRIED)) continue;
      assert.doesNotMatch(
        file,
        /^(src|test)\/|\.map$|\.ts$|(^|\/)tsconfig\.json$/,
        `${file} is not something a user needs`,
      );
    }
  });

  it('carries no type declarations or source maps for the modules it carries', () => {
    // What is carried is what is loaded, and the licence that travels with it.
    // Declarations in particular are worth naming: they are most of the weight
    // of these modules, and the ignore file once had a line that would have
    // re-included every one of them.
    for (const file of shipped) {
      if (!file.startsWith(CARRIED)) continue;
      assert.doesNotMatch(
        file,
        /\.d\.ts$|\.map$/,
        `${file} is carried and is not loaded`,
      );
    }
  });
});
