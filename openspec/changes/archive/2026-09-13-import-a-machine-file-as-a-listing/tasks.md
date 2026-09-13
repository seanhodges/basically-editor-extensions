## 1. Ask the toolchain to read a file

- [x] 1.1 Add `ConvertOutcome` to `clients/vscode/src/operations.ts`, naming what
      this client asks for: the machine it was read as, the source, the warnings,
      and the blocks and further files it found.
- [x] 1.2 Add the `convert` wrapper, taking the bytes, the file's name, an
      optional machine, and whether the source is to declare its machine.
- [x] 1.3 Read the two refusals as answers, in the manner `declaredMachine`
      already reads one: a format more than one machine claims, and a format none
      claims. Anything else stays a refusal.
- [x] 1.4 Read a third as an answer about the server's age: a refusal naming the
      declaration means a toolchain that has never heard of it, and the same
      conversion is asked for again without it.
- [x] 1.5 Name `binaryImports` on `MachineFacts`, for what the user is told about
      what a machine can be read from.

## 2. Decide what is to be done, apart from the editor

- [x] 2.1 Extend `clients/vscode/src/programTransfer.ts`: which machine to retry
      with, from a refusal that named the candidates.
- [x] 2.2 Turn a `ConvertOutcome` into what the user is told — the machine it was
      read as, the warnings as the server worded them, the blocks by name, and
      the further files it could name but not carry.
- [x] 2.3 Say what an import got when the declaration was refused, so an older
      server is a sentence rather than a silence.

## 3. Do the editor's part

- [x] 3.1 Add the command to `clients/vscode/src/programTransferCommands.ts`,
      over the conversation that change already owns: choose a file, read its
      bytes, and ask for the conversion with the file's name.
- [x] 3.2 On a refusal that named candidates, offer them and ask again with the
      same bytes and the machine named.
- [x] 3.3 Open the source as an untitled listing with its language set, and show
      it.
- [x] 3.4 Put the warnings to the user and into the shared output channel.
- [x] 3.5 Where blocks came back: say what they are, ask for a folder, write each
      one there, and name what was written. Declining leaves the listing open and
      is not a failure.
- [x] 3.6 Register it in `extension.ts` beside the others.

## 4. Offer it twice

- [x] 4.1 Contribute the command in `clients/vscode/package.json` with a codicon
      icon, its palette entry carrying no `when` clause since it needs no
      listing.
- [x] 4.2 Add the third `editor/title` navigation entry, after export, bound to a
      BASIC listing like its neighbours.
- [x] 4.3 Move `basically.server.version` to the release carrying
      `declare-the-machine-in-a-converted-program`. Where no such release exists
      yet, leave it and note that the fallback path is what runs.

## 5. Check it

- [x] 5.1 Extend `clients/vscode/test/programTransfer.test.mjs`: an import
      carrying warnings, one carrying blocks, each of the two refusals that name
      candidates, and the refusal that means an older server.
- [x] 5.2 Extend the manifest cross-check with the third command and its menu
      entry, and with the fact that the import command's palette entry is
      unconditional while its toolbar entry is not.
- [x] 5.3 Extend the case in `clients/vscode/test/handshake.test.mjs` that the
      export change added into a round trip against the real server: hand the
      bytes it built back to `convert`, and assert the recovered source is the
      listing again and declares its machine when that is asked for.
- [x] 5.4 Run that suite against a toolchain checkout carrying the paired change:
      `BASICALLY_SERVER_PATH=/path/to/basically/scripts/basically npm test`.

## 6. Say what it does

- [x] 6.1 Extend the README section the export change added: what reading a file
      does, where the listing lands, how the machine is settled from the file,
      and what becomes of what the file held besides BASIC.

## 7. Quality gates

- [x] 7.1 `npm run lint`
- [x] 7.2 `npm run build`
- [x] 7.3 `npm run server` — needs npm registry access; where it is unavailable,
      say so rather than reporting a green run.
- [x] 7.4 `npm test`
- [x] 7.5 `npm run package` — required: the manifest gains a command and a menu
      entry.
- [ ] 7.6 By hand in the editor: read a `.p` back and check the listing is
      coloured and declares its machine; read a file whose format two machines
      claim and check the choice offered; read one holding machine code and check
      the folder prompt, what is written, and that declining loses nothing.
      The Vim client is untouched, so no manual check is owed there.
