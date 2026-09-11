// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Where the language server is and what runs it.
 *
 * Kept free of the `vscode` module so the same resolution the extension uses
 * can be driven from a plain Node test — the failure this guards against is a
 * client that installs and then cannot start, which no amount of unit-testing
 * the activation code would catch.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

/** The published toolchain asks for this; older is allowed but said out loud. */
export const REQUIRED_NODE_MAJOR = 22;

/** How the server is reached: a command that is the toolchain, or a script for Node to run. */
export type ServerLocation =
  | { kind: 'command'; command: string }
  | { kind: 'script'; script: string };

/** How to invoke the toolchain: a command, and whatever must precede an operation. */
export interface ServerLaunch {
  command: string;
  /** The script to run, where the command is a Node rather than the toolchain itself. */
  prefixArgs: string[];
  /** Set when the runtime is the editor's own Node, which needs telling to be Node. */
  runAsNode: boolean;
  /** What to say in the output channel — empty when there is nothing to say. */
  notes: string[];
}

/** The arguments for one operation of the toolchain, however it is being invoked. */
export function argsFor(
  launch: ServerLaunch,
  ...operation: string[]
): string[] {
  return [...launch.prefixArgs, ...operation];
}

/**
 * The environment to start the server in.
 *
 * The editor's own executable is Electron, which runs as Node only when told
 * to. Without this it would open a second window rather than serve. Every
 * conversation with the toolchain goes through here, so the language server and
 * the operations conversation are started on the same terms.
 */
export function envFor(launch: ServerLaunch): NodeJS.ProcessEnv {
  return launch.runAsNode
    ? { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    : { ...process.env };
}

/** The bundled server, as `scripts/fetch-server.mjs` lays it out. */
export function bundledServer(extensionPath: string): string {
  return path.join(extensionPath, 'server', 'dist', 'cli.mjs');
}

/**
 * Where to serve from, in order: what the user configured, the copy bundled
 * with the extension, then `basically` on PATH for someone who installed the
 * toolchain themselves.
 *
 * A configured path ending in `.mjs`/`.js` is a script to run with Node -
 * which is what a checkout of the toolchain offers - and anything else is
 * taken to be the command itself.
 */
export function locateServer(
  configuredPath: string,
  extensionPath: string,
): ServerLocation {
  const configured = configuredPath.trim();
  if (configured !== '') {
    return /\.[cm]?js$/.test(configured)
      ? { kind: 'script', script: configured }
      : { kind: 'command', command: configured };
  }
  const bundled = bundledServer(extensionPath);
  if (existsSync(bundled)) return { kind: 'script', script: bundled };
  return { kind: 'command', command: 'basically' };
}

/** The major version `node -v` reports, or null when that command is not a Node. */
export function nodeMajorOf(command: string): number | null {
  try {
    const reported = execFileSync(command, ['-v'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5_000,
    });
    const major = /^v?(\d+)\./.exec(reported.trim())?.[1];
    return major === undefined ? null : Number(major);
  } catch {
    return null;
  }
}

/**
 * How to start the server the extension found.
 *
 * A script needs a Node to run it, chosen in order: what the user configured,
 * `node` from PATH, and the editor's own. The first new enough wins; where none
 * is, the best available is used anyway and the output channel says so, because
 * refusing to start over a version number would leave a user with a working
 * editor and no language help at all.
 */
export function launchFor(
  location: ServerLocation,
  options: {
    configuredNodePath: string;
    /** The editor's own executable, which runs as Node when told to. */
    editorExecPath: string;
    /** The Node the editor itself is built on, e.g. `process.versions.node`. */
    editorNodeVersion: string;
    /** Injected so a test can resolve without spawning anything. */
    majorOf?: (command: string) => number | null;
  },
): ServerLaunch {
  if (location.kind === 'command') {
    return {
      command: location.command,
      prefixArgs: [],
      runAsNode: false,
      notes: [],
    };
  }

  const majorOf = options.majorOf ?? nodeMajorOf;
  const editorMajor = Number(options.editorNodeVersion.split('.')[0]) || null;
  const candidates: { command: string; major: number | null; asNode: boolean }[] =
    [];
  const configured = options.configuredNodePath.trim();
  if (configured !== '') {
    candidates.push({ command: configured, major: majorOf(configured), asNode: false });
  }
  candidates.push({ command: 'node', major: majorOf('node'), asNode: false });
  candidates.push({
    command: options.editorExecPath,
    major: editorMajor,
    asNode: true,
  });

  const usable = candidates.filter((c) => c.major !== null);
  const chosen =
    usable.find((c) => c.major! >= REQUIRED_NODE_MAJOR) ?? usable[0]!;
  const notes: string[] = [];
  if (configured !== '' && candidates[0]!.major === null) {
    notes.push(
      `basically.server.nodePath is set to "${configured}", which did not answer as a Node. Falling back.`,
    );
  }
  if (chosen.major! < REQUIRED_NODE_MAJOR) {
    notes.push(
      `Serving with Node ${chosen.major} from ${chosen.command}; the toolchain asks for ${REQUIRED_NODE_MAJOR} or newer. Set basically.server.nodePath to a newer Node if the server misbehaves.`,
    );
  }
  return {
    command: chosen.command,
    prefixArgs: [location.script],
    runAsNode: chosen.asNode,
    notes,
  };
}
