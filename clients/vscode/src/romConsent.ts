// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Asking the user to agree to the ROM images, wherever the asking is needed.
 *
 * The toolchain asks for itself at a terminal and will not block a caller it
 * cannot ask. Two callers here are exactly such a caller — the panel about to
 * run a listing, and the description handed to the editor of a server its agent
 * is about to be given — so the question lives here rather than with either of
 * them, and cannot drift into being asked two different ways.
 *
 * What a decline *means* stays with the caller, because it means different
 * things: a listing that will not run in one case, and a toolchain still worth
 * offering in the other.
 */
import * as vscode from 'vscode';

import { acceptRoms, romStatus, ROM_TERMS_URL } from './roms';
import { type ServerLaunch } from './server';

/**
 * Ask before anything is obtained, and record the answer through the
 * toolchain's own agree-in-advance path.
 *
 * `needing` names what wants the images, as a phrase the question reads with:
 * "Running the ZX81", "Letting your editor's agent run machines".
 *
 * Answers true once the images may be obtained, which includes the user having
 * agreed already — nothing is asked twice, and nothing is fetched again for a
 * toolchain that already holds a set.
 */
export async function agreeToRoms(
  launch: ServerLaunch,
  needing: string,
): Promise<boolean> {
  const status = await romStatus(launch);
  // Agreed to and already held is the steady state, and the one a caller
  // reached on its way to starting a server hits every time.
  if (status.agreed && status.images > 0) return true;

  if (!status.agreed) {
    const download = 'Download the images';
    const terms = 'Read the terms';
    for (;;) {
      const answer = await vscode.window.showInformationMessage(
        `${needing} needs original ROM images, which are not part of the ` +
          'toolchain. They would be downloaded from ' +
          `${status.publishedAt} into ${status.home}, and they carry their own terms.`,
        { modal: true },
        download,
        terms,
      );
      // Reading the terms answers the dialog, so the question is put again
      // rather than that being taken for a decline.
      if (answer === terms) {
        await vscode.env.openExternal(vscode.Uri.parse(ROM_TERMS_URL));
        continue;
      }
      if (answer !== download) return false;
      break;
    }
  }
  await acceptRoms(launch);
  return true;
}
