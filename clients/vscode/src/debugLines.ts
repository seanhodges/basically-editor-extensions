// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Which BASIC line a row of the editor carries, and which row a line is on.
 *
 * A breakpoint is set on a row and a machine stops before a line number, and
 * the two are not the same thing: a listing can be renumbered without a row
 * moving, a row can be blank, and the `#MACHINE` line carries no number at all.
 * Reading the number off the row is the whole of the translation, and it is
 * needed in both directions — the row a stopped line is on is what makes the
 * editor highlight it.
 *
 * Kept free of the `vscode` module, like `server.ts` and `operations.ts`, so
 * what a row maps to can be checked with no editor involved. Rows are 1-based
 * throughout, which is how the debug protocol counts them.
 */

/** The rows of a listing, however its lines are ended. */
function rowsOf(source: string): string[] {
  return source.split(/\r\n|\r|\n/);
}

/**
 * The BASIC line number a row carries, or null where it carries none.
 *
 * A number is what the row begins with. A blank row, a `#MACHINE` directive and
 * a row beginning with a keyword all carry none, and none of them can be
 * stopped on.
 */
export function lineNumberOn(source: string, row: number): number | null {
  const text = rowsOf(source)[row - 1];
  if (text === undefined) return null;
  const digits = /^\s*(\d+)/.exec(text);
  return digits ? Number(digits[1]) : null;
}

/**
 * The row a BASIC line is written on, or null where the listing has no such
 * line.
 *
 * Read from the listing as it stands rather than remembered from when the
 * breakpoint was set, so a listing renumbered between two sessions highlights
 * the row the line is on now.
 */
export function rowOfLine(source: string, line: number): number | null {
  const rows = rowsOf(source);
  for (let row = 1; row <= rows.length; row++) {
    if (lineNumberOn(source, row) === line) return row;
  }
  return null;
}
