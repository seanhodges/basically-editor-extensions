// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * What an export of a listing amounts to, and what the user is told about it.
 *
 * Kept free of the `vscode` module, like `server.ts` and `machineStatus.ts`, so
 * a plain Node test can drive every answer a user could meet with no editor and
 * no server involved. The editor's side of it — the dialogs, the conversation
 * and the writing — is `programTransferCommands.ts`.
 *
 * Nothing here knows a machine or a format. Which machines exist, which formats
 * each has, what they are called and what a build produced are all the server's
 * answers, and this only arranges them: where each file goes, and what to say.
 */
import path from 'node:path';

import { planRun, type BuildOutcome, type BuildTarget, type Machine, type RunPlan } from './operations';

/** What is to be done about exporting a listing, before anything is attempted. */
export type ExportPlan =
  | { kind: 'export'; machine: Machine }
  | Exclude<RunPlan, { kind: 'run' } | { kind: 'needs-roms' }>;

/**
 * Which machine to build for, from what the server reports it has.
 *
 * The order is `planRun`'s, because which machine a listing is for is one
 * question however it is going to be used. What differs is the answer that
 * gates running: building a program reads none of the machine's firmware, so a
 * machine this installation cannot run is still one it can export to — and
 * refusing there would deny an export to exactly the user most likely to want
 * one, since they have no emulator here to load the file into anyway.
 */
export function planExport(
  machines: Machine[],
  declared: string | null,
  configured: string,
): ExportPlan {
  const plan = planRun(machines, declared, configured);
  return plan.kind === 'run' || plan.kind === 'needs-roms'
    ? { kind: 'export', machine: plan.machine }
    : plan;
}

/** Why a listing is not being exported. */
export type ExportRefusalReason =
  | Exclude<ExportPlan, { kind: 'export' }>
  /** The server has the machine and reports no format to build it into. */
  | { kind: 'no-formats'; machine: Machine };

/** What the user is told when a listing cannot be exported, and what is left. */
export interface ExportRefusal {
  heading: string;
  remedy: string;
}

/**
 * Why this listing is not being exported, told apart from the other reasons.
 *
 * Only settings the client contributes are named, and the wording of the first
 * two is the wording every other surface uses for the same two answers: a user
 * who meets "no machine settled" on the status item and again here is meeting
 * one fact, not two.
 */
export function refusalFor(reason: ExportRefusalReason): ExportRefusal {
  switch (reason.kind) {
    case 'no-machine':
      return {
        heading: 'This listing does not say which machine it is for.',
        remedy:
          'Add a "#MACHINE" line at the top of it, or run "Basically: Choose ' +
          'the machine to check against" to set basically.machine.',
      };
    case 'unknown-machine':
      return {
        heading: `This server has no machine called "${reason.wanted}".`,
        remedy:
          'Run "Basically: Choose the machine to check against" to pick from ' +
          'the machines it has.',
      };
    case 'no-formats':
      return {
        heading: `This server has no file format for the ${reason.machine.name}.`,
        remedy:
          'Install the toolchain with "npm install -g @ba.sical.ly/cli" and ' +
          'set basically.server.path to a newer copy, which may have one.',
      };
  }
}

/**
 * The name to put in front of the user in the save dialog.
 *
 * The listing's own name with the format's extension in place of `.bas`, so a
 * user exporting `breakout.bas` as a tape image is offered `breakout.p` and
 * need not know what to type. A format that writes no file of its own leaves
 * the name bare rather than inventing an extension for it.
 */
export function suggestedFileName(
  listingName: string,
  target: BuildTarget,
): string {
  const base = path.basename(listingName);
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  return target.fileExtension === undefined
    ? stem
    : `${stem}.${target.fileExtension}`;
}

/** One file to write, and where. */
export interface ExportWrite {
  path: string;
  /** The file's bytes, base64 as the toolchain sent them. */
  base64: string;
}

/** What an export comes to: the files to write, and what to say about it. */
export interface ExportReport {
  /** Empty where a fatal problem stopped the build, so nothing is written. */
  writes: ExportWrite[];
  /** One sentence saying what happened. */
  message: string;
  /** A line per file written, or per problem that stopped the build. */
  detail: string[];
}

/**
 * What a build amounts to, given where the user said the first file goes.
 *
 * Two things are settled here. A fatal problem means nothing is written at all
 * — a half-written export is a file the machine will not load, found later by
 * a user who thought it worked. And a format producing more than one file puts
 * the rest beside the first under the names the format gave them, because the
 * user named one path and was never told how many files were coming; what they
 * get instead is every path named back to them.
 */
export function reportFor(
  outcome: BuildOutcome,
  chosenPath: string,
): ExportReport {
  const machine = outcome.machine.name;
  if (outcome.target === null) {
    return {
      writes: [],
      message: `Nothing was exported: this listing has a problem that stops the ${machine} building it.`,
      detail: outcome.errors
        .filter((problem) => problem.fatal !== false)
        .map((problem) => `Line ${problem.line}: ${problem.message}`),
    };
  }
  const format = outcome.target.label;
  // Not implied by the build having succeeded: a format is free to declare
  // itself as writing no file, and saying "exported" over nothing written is
  // how a user comes to look for a file that was never there.
  if (outcome.files.length === 0) {
    return {
      writes: [],
      message: `Nothing was exported: ${format} produces no file to write.`,
      detail: [],
    };
  }
  const beside = path.dirname(chosenPath);
  const writes = outcome.files.map((file, index) => ({
    path: index === 0 ? chosenPath : path.join(beside, file.fileName),
    base64: file.base64,
  }));
  return {
    writes,
    message:
      writes.length === 1
        ? `Exported for the ${machine} as ${format}.`
        : `Exported for the ${machine} as ${format}, in ${writes.length} files.`,
    detail: writes.map((write) => write.path),
  };
}
