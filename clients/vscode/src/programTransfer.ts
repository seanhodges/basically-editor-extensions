// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * What moving a program between a listing and a machine's own file amounts to,
 * and what the user is told about it.
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

import {
  planRun,
  type BuildOutcome,
  type BuildTarget,
  type ConvertOutcome,
  type Machine,
  type RunPlan,
} from './operations';

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

/**
 * The machines to offer when a file's format did not settle one.
 *
 * The server names its candidates, so they are matched back to the machines it
 * reports rather than shown as bare words: the choice is about to be sent back
 * as the machine to read the file as, so it has to be one this server has. A
 * refusal naming none is a format no machine claimed, and then every machine is
 * a candidate — the file is some machine's, and only the user knows whose.
 */
export function machinesToChooseFrom(
  machines: Machine[],
  candidates: string[],
): Machine[] {
  if (candidates.length === 0) return machines;
  const named = new Set(candidates.map((candidate) => candidate.toLowerCase()));
  const matched = machines.filter(
    (machine) =>
      named.has(machine.name.toLowerCase()) ||
      named.has(machine.id.toLowerCase()),
  );
  // A name this client could not match back would drop a machine out of the
  // list the user chooses from, and a list of none is no choice at all.
  return matched.length === 0 ? machines : matched;
}

/** One recovered block, under the name it is to be written beside the listing. */
export interface ImportBlock {
  fileName: string;
  /** The block's bytes, base64 as the toolchain sent them. */
  base64: string;
}

/** What an import came to: what to say about it, and what is left to write. */
export interface ImportReport {
  /** One sentence saying what was read, and as which machine. */
  message: string;
  /** A line each for what the conversion could not carry into the listing. */
  detail: string[];
  /** The blocks recovered, ready for a folder the user has yet to name. */
  blocks: ImportBlock[];
  /** What the user is told the file held, before being asked where to keep it. */
  blocksAsk: string | null;
}

/**
 * What a conversion amounts to, told as the user meets it.
 *
 * Everything the server reported is said: the warnings in its own words, the
 * bytes that are not BASIC, the files the format named but did not hand over,
 * and the line the program would have started itself from — which is a fact
 * about the program that a listing has nowhere to keep. A listing that came
 * back without its declaration is a sentence of its own, because the alternative
 * is a listing quietly checked against whatever the user's machine happens to be.
 */
export function importReportFor(outcome: ConvertOutcome): ImportReport {
  const machine = outcome.machine.name;
  const lines = outcome.source.split('\n').length;
  const detail: string[] = [];
  if (!outcome.declared) {
    detail.push(
      `This toolchain is too old to write the machine into the listing, so it ` +
        `does not say it is for the ${machine}: add a "#MACHINE ` +
        `${outcome.machine.id}" line at the top of it, or run "Basically: ` +
        'Choose the machine to check against" to set basically.machine.',
    );
  }
  detail.push(...outcome.warnings);
  const blocks = outcome.blocks ?? [];
  for (const block of blocks) {
    detail.push(
      `${block.name}: ${block.kind === 'code' ? 'machine code' : 'bytes'}, ` +
        `${byteCount(block.base64)} at ${address(block.address)}.`,
    );
  }
  for (const file of outcome.tapeFiles ?? []) {
    detail.push(
      `The file also held "${file.name}" (${file.kind}), which is not read here.`,
    );
  }
  if (outcome.autoStart != null) {
    detail.push(`It started itself from line ${outcome.autoStart}.`);
  }
  return {
    message: `Read as a ${machine} listing, ${lines} line${lines === 1 ? '' : 's'} of BASIC.`,
    detail,
    blocks: blocks.map((block) => ({
      fileName: `${block.name}.bin`,
      base64: block.base64,
    })),
    blocksAsk:
      blocks.length === 0
        ? null
        : `This file held ${blocks.length} block${blocks.length === 1 ? '' : 's'} ` +
          'of bytes that are not BASIC, which a listing has nowhere to keep. ' +
          'Choose a folder to write them into.',
  };
}

/** What the user is told about the blocks written into the folder they named. */
export function blocksWritten(paths: string[]): {
  message: string;
  detail: string[];
} {
  return {
    message: `Kept ${paths.length} block${paths.length === 1 ? '' : 's'} beside the listing.`,
    detail: paths,
  };
}

/** How big a block is, counted from the bytes that will actually be written. */
function byteCount(base64: string): string {
  const bytes = Buffer.from(base64, 'base64').length;
  return `${bytes} byte${bytes === 1 ? '' : 's'}`;
}

/** An address as the machine's own documentation writes it. */
function address(value: number): string {
  return `0x${value.toString(16).toUpperCase().padStart(4, '0')}`;
}
