#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Put the modules the compiled client loads beside it, so the extension loads
 * with nothing present but the package.
 *
 * `clients/*` is a workspace glob, so what the client requires is installed at
 * the repository root and found by Node walking up from wherever the client
 * sits. Every way the client is exercised here works that way — the source
 * tree, the compiled output, the suite, the editor running it under its
 * debugger — and none of them is the way it ships. What ships is a directory
 * the editor unpacks on its own, with nothing above it, where that walk ends
 * immediately: the entry point cannot be loaded, so the client never runs, the
 * commands it contributes are never registered, and the editor answers the one
 * the user picked with a report that it does not exist.
 *
 * Three facts shape what this does:
 *
 * - **They go beside the compiled client, not at the top of it.** The packager
 *   collects what it will ship by globbing the client's directory with its own
 *   fixed exclusion of `node_modules` there, and the ignore file's
 *   re-inclusions filter that collection rather than adding to it — so a
 *   `node_modules` at the client's root is not merely ignored, it is never a
 *   candidate, and no ignore-file line can put it back. One directory down,
 *   neither exclusion matches. It is also the first place Node looks from the
 *   compiled entry point, which is what makes the debugger and the shipped
 *   package load the same files.
 * - **They are copied, never fetched.** The versions come from the tree this
 *   repository's own install produced, so what ships is what the suite ran
 *   against. Fetching would re-answer a version range at build time, which is
 *   the thing the single pinned server version exists to prevent, arrived at
 *   from the other direction — and it would need a registry, which this step
 *   cannot, because it runs whenever the client is compiled.
 * - **Each name is resolved the way Node resolves it**, by walking module
 *   directories upward from the package that asks. Reading the top of the tree
 *   instead would be wrong today, not just fragile: the language client has two
 *   of its own modules installed underneath it, at versions that differ from
 *   the same names at the top, and carrying the top ones would break it.
 *
 * `require.resolve` is not used for any of this. At least one of these packages
 * declares its entry points in a way that deliberately does not expose its own
 * manifest, so asking the resolver for that manifest throws.
 *
 * What is carried is what is loaded, and the licence that has to travel with
 * it: someone else's program under their own terms may not ship without its
 * notice. Type declarations and source maps are left behind.
 *
 * Idempotent: an `out/node_modules` already holding the wanted versions is left
 * alone.
 */
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientDir = path.join(root, 'clients', 'vscode');
const outDir = path.join(clientDir, 'out');
const carriedDir = path.join(outDir, 'node_modules');

/** A package's manifest, or null where there is no package there. */
function manifestAt(dir) {
  const file = path.join(dir, 'package.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

const manifest = manifestAt(clientDir);
if (!manifest) {
  throw new Error('clients/vscode/package.json could not be read');
}

/**
 * Where `name` resolves from `fromDir`, by the walk Node itself does.
 *
 * The walk matters rather than the destination: the same name exists at more
 * than one version in this tree, and which one a package gets depends on where
 * it is asking from.
 */
function locate(name, fromDir) {
  let dir = fromDir;
  for (;;) {
    const candidate = path.join(dir, 'node_modules', name);
    if (manifestAt(candidate)) return candidate;
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

/**
 * The file a package is entered at, as far as can be told from its manifest.
 *
 * Enough to catch a package that arrived without the thing it is for. The
 * conditions are walked in the order Node would care about here: this is a
 * CommonJS client running under Node.
 */
function entryOf(pkg) {
  const fromExports = (value) => {
    if (typeof value === 'string') return value;
    if (value === null || typeof value !== 'object') return null;
    for (const key of ['.', 'node', 'require', 'default']) {
      if (key in value) {
        const found = fromExports(value[key]);
        if (found) return found;
      }
    }
    return null;
  };
  return fromExports(pkg.exports) ?? pkg.main ?? 'index.js';
}

/** Whether a package is entered at a file that is actually there. */
function enterable(dir, pkg) {
  const entry = path.resolve(dir, entryOf(pkg));
  return [entry, `${entry}.js`, path.join(entry, 'index.js')].some(existsSync);
}

/** Whether a package carries the notice it may not ship without. */
function licensed(dir) {
  return readdirSync(dir).some((name) => /^(licen[cs]e|copying)/i.test(name));
}

/**
 * What to carry and where, worked out before anything is copied.
 *
 * A name is wanted at the top of `out/node_modules` first. Where that slot is
 * already held by a different copy of the same name, it goes underneath the
 * package that asked for it instead — npm's own rule, and Node's own
 * resolution. Two of these are nested today, so this is not provision for
 * later.
 */
function plan() {
  /** Destination directory → where it is copied from. */
  const carried = new Map();
  const queue = Object.keys(manifest.dependencies ?? {}).map((name) => ({
    name,
    askedFrom: clientDir,
    askedBy: 'clients/vscode/package.json',
    under: outDir,
  }));

  while (queue.length > 0) {
    const { name, askedFrom, askedBy, under } = queue.shift();

    const from = locate(name, askedFrom);
    if (!from) {
      throw new Error(
        `${askedBy} depends on ${name}, which is not in the installed tree — run npm install`,
      );
    }

    // The top of the carried tree unless something else is already there.
    const top = path.join(carriedDir, name);
    const to = !carried.has(top) || carried.get(top) === from
      ? top
      : path.join(under, 'node_modules', name);
    if (carried.get(to) === from) continue;
    if (carried.has(to)) {
      throw new Error(
        `${name} is wanted at two versions in the same place; ${askedBy} cannot be satisfied`,
      );
    }
    carried.set(to, from);

    const pkg = manifestAt(from);
    for (const dependency of Object.keys(pkg.dependencies ?? {})) {
      queue.push({
        name: dependency,
        askedFrom: from,
        askedBy: `${name}@${pkg.version}`,
        under: to,
      });
    }
  }
  return carried;
}

const carried = plan();

/**
 * Whether everything planned is already carried, at the same version.
 *
 * A stale tree is rebuilt whole rather than reconciled: it is a megabyte of
 * copying, and reconciling would have to answer what to do about a name that
 * is no longer wanted.
 */
function alreadyCarried() {
  for (const [to, from] of carried) {
    const there = manifestAt(to);
    if (!there || there.version !== manifestAt(from).version) return false;
  }
  return true;
}

if (alreadyCarried()) {
  console.log(
    `${carried.size} modules are already in ${path.relative(root, carriedDir).split(path.sep).join('/')}`,
  );
  process.exit(0);
}

rmSync(carriedDir, { recursive: true, force: true });

for (const [to, from] of carried) {
  const pkg = manifestAt(from);
  console.log(`carrying ${pkg.name}@${pkg.version}`);
  cpSync(from, to, {
    recursive: true,
    // A module of a module is carried by the plan, at the version the walk
    // found, rather than swept along here — which is what keeps the licence
    // and entry-point checks below covering every one of them.
    filter: (source) =>
      path.basename(source) !== 'node_modules' &&
      !source.endsWith('.d.ts') &&
      !source.endsWith('.map'),
  });
}

// Turning a packaging mistake into a build failure rather than into an
// extension that installs and then never runs.
for (const to of carried.keys()) {
  const pkg = manifestAt(to);
  const where = path.relative(clientDir, to).split(path.sep).join('/');
  if (!pkg) {
    throw new Error(`${where} was carried without a package.json`);
  }
  if (!enterable(to, pkg)) {
    throw new Error(
      `${pkg.name}@${pkg.version} was carried without ${entryOf(pkg)} — nothing to load`,
    );
  }
  if (!licensed(to)) {
    throw new Error(
      `${pkg.name}@${pkg.version} was carried without its licence — it may not ship without one`,
    );
  }
}

console.log(
  `${carried.size} modules are in ${path.relative(root, carriedDir).split(path.sep).join('/')}`,
);
