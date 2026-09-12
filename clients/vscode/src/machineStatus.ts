// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * What the user is told about the machine their listing is checked against, and
 * when it is worth asking for it again.
 *
 * Kept free of the `vscode` module, like `server.ts` and `operations.ts`, so a
 * plain Node test can drive what a user would be shown for each answer with no
 * editor involved. The item it is shown in is `machineStatusItem.ts`.
 *
 * Everything here but `labelFor` exists only because the answer costs a
 * toolchain process. The language server has already settled the machine — that
 * is how it decides what to colour — and advertises no way to ask it, so the
 * answer has to be re-derived over the operations conversation. Were the server
 * to report what it bound a document to, the remembering below would go.
 */
import type { RunPlan } from './operations';

/** What is known about the listing being edited. */
export type MachineAnswer =
  | RunPlan
  /** Asked for, and not answered yet. */
  | { kind: 'pending' }
  /** The question could not be put at all. */
  | { kind: 'unavailable' };

/** What the item says, or null where it says nothing. */
export interface MachineLabel {
  text: string;
  tooltip: string;
}

/**
 * One short phrase for each answer, the machine named the way the user picked
 * it rather than the way the setting holds it.
 *
 * No remedy is given. The sentence saying what to set is reported on the
 * listing by the server, and saying it twice is how the two come to disagree;
 * what this offers instead is the choosing itself, on the item.
 */
export function labelFor(answer: MachineAnswer): MachineLabel | null {
  switch (answer.kind) {
    case 'pending':
      return {
        text: '$(loading~spin) Machine…',
        tooltip:
          'Working out which machine this listing is being checked against.',
      };
    case 'run':
      return {
        text: `$(circuit-board) ${answer.machine.name}`,
        tooltip: `This listing is being checked against the ${answer.machine.name}.`,
      };
    // Not an absence: the listing is being checked against that machine
    // perfectly well, and only running it is affected.
    case 'needs-roms':
      return {
        text: `$(circuit-board) ${answer.machine.name} (cannot run)`,
        tooltip:
          `This listing is being checked against the ${answer.machine.name}. ` +
          'This server cannot run that machine as it stands.',
      };
    case 'no-machine':
      return {
        text: '$(circuit-board) No machine settled',
        tooltip:
          'Nothing settles which machine this listing is for, so it is not ' +
          'being checked against one.',
      };
    case 'unknown-machine':
      return {
        text: `$(circuit-board) No such machine: ${answer.wanted}`,
        tooltip:
          `This server has no machine called "${answer.wanted}", so this ` +
          'listing is not being checked against one.',
      };
    // The output channel already has what went wrong, and an item that turned
    // into a fault report for a fault it is not about would be its own bug.
    case 'unavailable':
      return null;
  }
}

/** The listing being edited, as much of it as the question needs. */
export interface Listing {
  uri: string;
  version: number;
  text: string;
}

/** What the answer was, and the version of the listing it was the answer for. */
interface Remembered {
  version: number;
  plan: RunPlan;
}

/**
 * Which listing is being shown, and what has already been established about it.
 *
 * Nothing is asked as the user types: the answer can only change when the text
 * does, but a toolchain process per keystroke is not worth a label being fresh
 * between two characters. The caller asks when the listing being edited changes
 * and when one is saved, and an answer already held for the text in front of
 * the user is not asked for again.
 */
export class MachineWatch {
  #ask: (listing: Listing) => Promise<RunPlan>;
  #show: (label: MachineLabel | null) => void;
  #answers = new Map<string, Remembered>();
  /**
   * The listing and version the item is currently about, so an answer that
   * arrives after the user has moved on is dropped rather than shown against
   * the wrong listing.
   */
  #showing: string | null = null;

  constructor(
    ask: (listing: Listing) => Promise<RunPlan>,
    show: (label: MachineLabel | null) => void,
  ) {
    this.#ask = ask;
    this.#show = show;
  }

  /** Show what is known about this listing, asking only if it is not known. */
  async watch(listing: Listing | null): Promise<void> {
    if (!listing) {
      this.#showing = null;
      this.#show(null);
      return;
    }
    const asked = stamp(listing);
    this.#showing = asked;

    const known = this.#answers.get(listing.uri);
    if (known && known.version === listing.version) {
      this.#show(labelFor(known.plan));
      return;
    }

    // Rather than leaving the previous listing's machine showing, which would
    // be a confident wrong answer where this is only a brief one.
    this.#show(labelFor({ kind: 'pending' }));

    let plan: RunPlan;
    try {
      plan = await this.#ask(listing);
    } catch {
      if (this.#showing === asked) this.#show(labelFor({ kind: 'unavailable' }));
      return;
    }
    this.#answers.set(listing.uri, { version: listing.version, plan });
    if (this.#showing === asked) this.#show(labelFor(plan));
  }

  /** A listing that is closed is one nothing is remembered about. */
  forget(uri: string): void {
    this.#answers.delete(uri);
  }

  /**
   * Everything, for when the answer itself could have moved — the configured
   * machine changing, or the server being asked of changing.
   */
  forgetAll(): void {
    this.#answers.clear();
  }
}

function stamp(listing: Listing): string {
  return `${listing.uri}\u0000${listing.version}`;
}
