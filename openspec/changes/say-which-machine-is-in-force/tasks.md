## 1. Ask for the cheaper answer first

This can be built without it, and should be built so that it can be moved onto
it. Settle it before the debouncing and caching below are written, because they
are the part that exists only in its absence.

- [x] 1.1 Raise, in the `basically` repository, the language server reporting the
      machine it bound a document to as part of what it publishes about that
      document. It has already settled it in order to decide what to colour, and
      it advertises no way to ask.
- [x] 1.2 Confirm whether a release carrying it is close enough to wait for. If
      it is, build against it and drop tasks 3.2 to 3.4 entirely; if not, build
      on the operations conversation and leave this change's design as the record
      of why that machinery is there.

## 2. What is shown

- [x] 2.1 Add a status item, shown only while a BASIC listing is being edited and
      gone when one is not.
- [x] 2.2 Say the machine by the name the user picked from, not the id the
      setting holds.
- [x] 2.3 Tell the four answers apart, reusing `planRun`'s own vocabulary rather
      than a second reading of the same question: settled, nothing settles it, a
      machine this server does not have, a machine it cannot run as it stands.
- [x] 2.4 Show the fourth as the machine it is checked against and not as an
      absence — the listing is being checked; only running it is affected.
- [x] 2.5 Make choosing the machine reachable from the item, and restate no
      remedy: the sentence naming what to set stays the server's problem on the
      listing.
- [x] 2.6 Say nothing, rather than reporting a fault, where the answer cannot be
      got at all; what went wrong belongs in the output channel, which already
      has it.

## 3. Where the answer comes from

- [x] 3.1 Get it from the server through the operations conversation already in
      `src/operations.ts` — `Operations.declaredMachine()` for what the listing
      itself settles, `planRun` for the precedence — and read no `#MACHINE` line
      and infer nothing from the text.
- [x] 3.2 Ask when the listing being edited changes and when one is saved, never
      as the user types.
- [x] 3.3 Remember the answer against the document and the version asked about,
      so returning to an unchanged listing asks nothing.
- [x] 3.4 Say that it is being worked out while waiting, rather than leaving the
      previous listing's machine showing.

## 4. Tests

- [x] 4.1 Cover the client's reading of all four answers. The existing suite
      already establishes that the server tells them apart; what is new is what
      the user is shown for each.
- [x] 4.2 Cover an unchanged listing being returned to without the server being
      asked again.
- [x] 4.3 Cover a failed question showing nothing.

## 5. Say what changed

- [x] 5.1 The VS Code client's README, beside the account of the precedence that
      settles the machine: what the client now tells the user is in force.
- [x] 5.2 `CLAUDE.md` only if a new file appears; the precedence itself is
      unchanged and must not be restated.

## 6. Quality gates

Run in this order; the tests import the compiled client and read the fetched
server, so building and fetching come first.

- [x] 6.1 `npm run lint`
- [x] 6.2 `npm run build`
- [x] 6.3 `npm run server` — needs npm registry access. Where it is unavailable,
      say so rather than reporting a green run.
- [x] 6.4 `npm test`
- [x] 6.5 `npm run package` is required only if the manifest gains a
      contribution; say which way it went.
- [ ] 6.6 Confirm by hand, in the editor, what no suite can: the item appears for
      a listing and not for another file, names the machine a declaring listing
      is checked against, says as plainly when none is settled, and survives
      moving between two listings.
- [x] 6.7 No Vim client check applies: nothing here touches `clients/vim/`,
      which has no surface to put this in. Should 1.1 land instead, an LSP host
      that shows such reports gets this for nothing, and that is worth a line in
      the Vim README rather than code.
