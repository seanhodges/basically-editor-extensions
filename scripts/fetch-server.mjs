#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Put the toolchain inside the VS Code client, so the extension works with
 * nothing installed.
 *
 * The server is `@ba.sical.ly/cli` from npm — a Node program, not a binary, and
 * not one built here. Three facts shape what this does:
 *
 * - **Only a package's own files are ever taken.** `npm pack` and unpack is the
 *   whole install for each; `npm install` would resolve dependency trees coming
 *   to most of half a gigabyte — an image library, a UI toolkit, a build
 *   toolchain — none of which either package reaches when it runs a machine.
 * - **The emulator's own files come too.** The toolchain asks Node where
 *   `jsbeeb` is before it runs anything at all, so a copy without it runs no
 *   machine whatsoever — not the ones whose emulation travels in the
 *   toolchain's own files either. Its own files, without its tree, are what
 *   make every machine runnable, and they are taken at the version the
 *   toolchain itself asks for rather than one named here.
 * - **The version is pinned in one place** — `basically.server.version` in
 *   `clients/vscode/package.json` — so what CI packages and what a developer
 *   runs are the same server.
 *
 * No ROM image is fetched, committed, or published by this script. What ships
 * beside the emulator is whatever that emulator's own package carries; every
 * other machine's images are the user's to obtain, through the toolchain's own
 * agreement, on the machine they are running on.
 *
 * Idempotent: a `server/` already holding the pinned version is left alone.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientDir = path.join(root, 'clients', 'vscode');
const serverDir = path.join(clientDir, 'server');

const manifest = JSON.parse(
  readFileSync(path.join(clientDir, 'package.json'), 'utf8'),
);
const spec = manifest.basically?.server;
if (!spec?.package || !spec?.version) {
  throw new Error(
    'clients/vscode/package.json must carry basically.server.package and .version',
  );
}
const wanted = `${spec.package}@${spec.version}`;

/**
 * The emulator the toolchain reaches for. Named here because the toolchain asks
 * Node to resolve it before any machine runs; the version comes from the
 * toolchain's own manifest, never from this file.
 */
const EMULATOR = 'jsbeeb';

function installedVersion() {
  const file = path.join(serverDir, 'package.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')).version ?? null;
  } catch {
    return null;
  }
}

// Both halves must be there: a `server/` at the right version but without the
// emulator beside it is a tree from before the emulator travelled with it, and
// would run no machine at all.
if (
  installedVersion() === spec.version &&
  existsSync(path.join(serverDir, 'node_modules', EMULATOR, 'src', 'utils.js'))
) {
  console.log(`${wanted} is already in ${path.relative(root, serverDir)}`);
  process.exit(0);
}

/**
 * Run npm, and give back what it wrote to stdout.
 *
 * npm is started as its own JavaScript under this very Node rather than by
 * name. The name on `PATH` is a shim, and on Windows a `.cmd` one, which Node
 * will not spawn directly; handing the spawn to a shell instead would leave
 * the arguments unescaped, and one of them is a temporary directory whose name
 * the machine chooses. npm sets `npm_execpath` for every script it runs, so a
 * build started the documented way already says where npm is; a run started by
 * hand falls back to the copy beside this Node, and then to the bare name,
 * which resolves everywhere but Windows.
 */
function npm(args, options) {
  const cli = process.env.npm_execpath ?? npmBesideNode();
  return cli
    ? execFileSync(process.execPath, [cli, ...args], options)
    : execFileSync('npm', args, options);
}

/** npm as it is laid out beside the running Node, or null where it is not. */
function npmBesideNode() {
  const dir = path.dirname(process.execPath);
  return (
    [
      path.join(dir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
      path.join(dir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    ].find((cli) => existsSync(cli)) ?? null
  );
}

/** `npm pack` one package and unpack its own files into `into`. */
function unpack(what, into, staging) {
  console.log(`fetching ${what}`);
  const tarball = npm(
    ['pack', what, '--pack-destination', staging, '--silent'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  )
    .trim()
    .split('\n')
    .pop();

  rmSync(into, { recursive: true, force: true });
  mkdirSync(into, { recursive: true });
  // The tarball's single `package/` directory becomes `into`. tar is run in
  // the staging directory, and told where to unpack in forward slashes: the
  // tar that comes with Git for Windows reads a `C:\…` after `-f` as a host
  // to connect to, and mangles the backslashes of a path after `-C`. Windows'
  // own tar takes either form, so what is given is the form both understand.
  execFileSync(
    'tar',
    [
      '-xzf',
      tarball,
      '-C',
      into.split(path.sep).join('/'),
      '--strip-components=1',
    ],
    { cwd: staging, stdio: 'inherit' },
  );
}

const staging = mkdtempSync(path.join(tmpdir(), 'basically-server-'));
try {
  unpack(wanted, serverDir, staging);

  // The toolchain resolves the emulator by name from beside itself, so it goes
  // where Node will look for it rather than anywhere of our choosing, and at
  // the version the toolchain asks for rather than one this script decides.
  const emulator = JSON.parse(
    readFileSync(path.join(serverDir, 'package.json'), 'utf8'),
  ).dependencies?.[EMULATOR];
  if (!emulator) {
    throw new Error(
      `${wanted} does not depend on ${EMULATOR}; this script no longer knows what to carry beside it`,
    );
  }
  unpack(
    `${EMULATOR}@${emulator}`,
    path.join(serverDir, 'node_modules', EMULATOR),
    staging,
  );
} finally {
  rmSync(staging, { recursive: true, force: true });
}

// The one file the extension actually launches. Checking it here turns a
// packaging mistake into a build failure rather than into an extension that
// installs and then cannot start.
const entry = path.join(serverDir, 'dist', 'cli.mjs');
if (!existsSync(entry)) {
  throw new Error(`${wanted} unpacked without dist/cli.mjs — nothing to launch`);
}
if (!existsSync(path.join(serverDir, 'LICENSE'))) {
  throw new Error(`${wanted} unpacked without its LICENSE — it may not ship without one`);
}
// The emulator is GPL too, and travels under its own licence text.
const emulatorDir = path.join(serverDir, 'node_modules', EMULATOR);
if (!existsSync(path.join(emulatorDir, 'src', 'utils.js'))) {
  throw new Error(
    `${EMULATOR} unpacked without src/utils.js — the toolchain resolves that file before it runs any machine`,
  );
}
if (!['COPYING', 'LICENSE'].some((name) => existsSync(path.join(emulatorDir, name)))) {
  throw new Error(`${EMULATOR} unpacked without its licence text — it may not ship without one`);
}
console.log(`${wanted} is in ${path.relative(root, serverDir)}`);
