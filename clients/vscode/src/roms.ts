// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Where the machines' ROM images come from, and the agreement to obtain them.
 *
 * The images are the machines' original firmware. They are not part of the
 * toolchain, they are published separately, and they carry their own terms — so
 * nothing is obtained until someone has agreed to it.
 *
 * The toolchain asks for that agreement at a terminal, and will not block a
 * caller it cannot ask; an editor is exactly such a caller, so the client that
 * *can* ask is the one that has to. The answer is recorded through the
 * toolchain's own agree-in-advance path rather than asserted per request, which
 * is what makes it hold for later machines and later runs.
 *
 * Kept free of the `vscode` module: the asking belongs to the editor, the
 * recording does not.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { argsFor, envFor, type ServerLaunch } from './server';

const run = promisify(execFile);

/** Where the toolchain reads ROM images from, and what it holds. */
export interface RomStatus {
  /** Where the images in use come from: "none" until some are held. */
  source: string;
  /** The directory the downloaded set lives in. */
  home: string;
  /** Where the published set is obtained from. */
  publishedAt: string;
  /** Whether downloading has been agreed to. */
  agreed: boolean;
  /** How many images are held. */
  images: number;
}

/** Where the terms the images carry are set out. */
export const ROM_TERMS_URL =
  'https://github.com/seanhodges/basically/blob/main/public/roms/ATTRIBUTION.md';

async function roms(
  launch: ServerLaunch,
  action: 'status' | 'accept',
): Promise<RomStatus> {
  const { stdout } = await run(
    launch.command,
    argsFor(launch, 'roms', action, '--json'),
    { env: envFor(launch), maxBuffer: 4 * 1024 * 1024 },
  );
  return JSON.parse(stdout) as RomStatus;
}

/** What is held and where from. Never downloads anything and never asks. */
export function romStatus(launch: ServerLaunch): Promise<RomStatus> {
  return roms(launch, 'status');
}

/**
 * Record the agreement and obtain the published images.
 *
 * Only ever called once a user has said yes. The toolchain would ask for itself
 * at a terminal; started this way it has no one to ask, and takes the recorded
 * agreement as the answer.
 */
export function acceptRoms(launch: ServerLaunch): Promise<RomStatus> {
  return roms(launch, 'accept');
}
