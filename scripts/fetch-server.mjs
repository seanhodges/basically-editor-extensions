#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Put the language server inside the VS Code client, so the extension works
 * with nothing installed.
 *
 * The server is `@ba.sical.ly/cli` from npm — a Node program, not a binary, and
 * not one built here. Two facts shape what this does:
 *
 * - **Only the package's own files are needed.** Its dependency tree exists for
 *   running machines (an emulator, an image library, a UI toolkit) and comes to
 *   most of half a gigabyte. The language server boots no machine and reaches
 *   none of it, so `npm pack` and unpack is the whole install; `npm install`
 *   would put ~500MB into a ~4MB extension.
 * - **The version is pinned in one place** — `basically.serverVersion` in
 *   `clients/vscode/package.json` — so what CI packages and what a developer
 *   runs are the same server.
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

function installedVersion() {
  const file = path.join(serverDir, 'package.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')).version ?? null;
  } catch {
    return null;
  }
}

if (installedVersion() === spec.version) {
  console.log(`${wanted} is already in ${path.relative(root, serverDir)}`);
  process.exit(0);
}

const staging = mkdtempSync(path.join(tmpdir(), 'basically-server-'));
try {
  console.log(`fetching ${wanted}`);
  const tarball = execFileSync(
    'npm',
    ['pack', wanted, '--pack-destination', staging, '--silent'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  )
    .trim()
    .split('\n')
    .pop();

  rmSync(serverDir, { recursive: true, force: true });
  mkdirSync(serverDir, { recursive: true });
  // The tarball's single `package/` directory becomes `server/`.
  execFileSync(
    'tar',
    ['-xzf', path.join(staging, tarball), '-C', serverDir, '--strip-components=1'],
    { stdio: 'inherit' },
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
console.log(`${wanted} is in ${path.relative(root, serverDir)}`);
