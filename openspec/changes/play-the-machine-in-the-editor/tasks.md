## 1. Confirm the two assumptions that would invalidate the design

Neither is worth discovering after the panel is built. Both are cheap to check.

**Unticked, and left for a hands-on run:** none of these can be answered without
an editor to run, and nothing in this change has been inside one. The panel is
written to the documented contract instead — the address goes through
`vscode.env.asExternalUri` and the webview's content rules name the origin that
comes back from it — and `design.md` records that as an assumption rather than a
finding. Press F5 in `clients/vscode` and tick them.

- [ ] 1.1 Confirm a frame in a VS Code webview can show a page served from the
      loopback address the toolchain gives back, under the webview's own content
      rules, and record what those rules had to say to allow it.
- [ ] 1.2 Confirm the same works in a remote workspace — extension on one
      machine, window on another — through the editor's external-URI mapping. If
      it does not, revise the panel decision in `design.md` before going on.
- [ ] 1.3 Confirm keystrokes reach a machine inside that frame, and record which
      chords the editor keeps for itself, for 6.1 to document.

## 2. Talking to the toolchain about more than the language

- [x] 2.1 Move the `Content-Length`-framed JSON client out of the test folder and
      into the extension's own source, so the extension and the tests drive one
      implementation.
- [x] 2.2 Point the existing handshake test at the moved framing, proving the
      test still drives what ships before anything else uses it.
- [x] 2.3 Start the toolchain's operations conversation as a second long-lived
      child process, using the existing resolution asked for that operation —
      not a second set of rules — and only when a panel is opened.
- [x] 2.4 Carry the same runtime choice, the same environment handling for the
      editor's own executable, and the same output-channel notes the language
      client already gets from that resolution.

## 3. Asking what can be run, and getting a machine up

- [x] 3.1 Ask the resolved server which machines it can run, holding no such
      knowledge in the client, and cache it no longer than the server it was
      asked of.
- [x] 3.2 Settle the listing's machine by the order that already governs which
      machine it is checked against, and report exactly what to set where none
      can be settled.
- [x] 3.3 Send the editor's current text, unsaved changes included, resolving any
      path in the client before sending.
- [x] 3.4 Ask for the machine to be played and take back the address.
- [x] 3.5 Release the machine when the panel closes, and rely on the connection
      ending for every other way a panel can stop.

## 4. Obtaining a ROM

- [x] 4.1 Detect that a machine needs an image that has not been obtained, from
      what the server says rather than by inspecting anything ourselves.
- [x] 4.2 Ask the user, saying what would be obtained and where its terms are set
      out, and record agreement through the toolchain's own agree-in-advance
      path rather than passing a flag per request.
- [x] 4.3 On declining, say what was declined and how to change it, and leave the
      user as they were — not as a failed run.

## 5. The panel

- [x] 5.1 Open a panel holding a frame pointed at the address, passed through the
      editor's external-URI mapping, adding nothing of our own to what crosses
      it.
- [x] 5.2 Contribute the command that runs the listing, titled as a short
      imperative phrase in sentence case with no trailing period, and offered
      wherever a listing is being edited.
- [x] 5.3 Say in the panel why a listing cannot be run, when it cannot — the
      machine this server cannot run, or no machine settled — with the remedy.
- [x] 5.4 Decide the two open questions in `design.md` — one panel per listing or
      per window, and whether the command is hidden or explains itself — and
      write the decisions into `design.md` rather than leaving them open.

## 6. Documentation and the manifest

- [x] 6.1 Document the command in the VS Code client's README, saying in the
      client's own words that whoever holds the panel's address can type at the
      machine rather than only watch it, and naming the chords the editor keeps
      from 1.3.
- [x] 6.2 Scope the Notepad++ notes' claim that the server "needs no ROM" to the
      language server, so it does not become untrue now that a client can run a
      machine. No other change to that client, and none to the Vim one.
- [x] 6.3 Move the pinned server version to a release carrying the toolchain
      change this depends on, in the one place it is named. Until such a release
      exists, leave this unchecked and note which version is awaited.
      *Moved to 0.1.6, the newest published; 0.1.5 was the first to serve both
      the operations conversation and playing, and either would do.*

## 7. Tests

- [x] 7.1 Extend `clients/vscode/test/handshake.test.mjs` — the only place a
      client and a server are checked against each other — to hold a real
      operations conversation with the server the extension would really start:
      the conversation is served, a machine comes up, an address comes back, and
      the machine is let go when the connection ends.
- [x] 7.2 Cover, in the same suite, a machine the server cannot run being
      reported rather than attempted, and a listing with no settleable machine
      being told what to set.
- [x] 7.3 Confirm the machine held over this conversation is not the one the
      command line holds, by holding both at once.

## 8. Quality gates

Run in this order — the tests import the compiled output and read the fetched
server's manifest, so building and fetching come first.

- [x] 8.1 `npm run lint`
- [x] 8.2 `npm run build`
- [x] 8.3 `npm run server` — needs npm registry access. Where it is unavailable,
      say so rather than reporting a green run.
- [x] 8.4 `npm test`
- [x] 8.5 `npm run package`, required because the manifest gains a command and
      the pinned version moves.
- [x] 8.6 Confirm the suite ran against a server that actually serves this — the
      pin at 0.1.5 or later, or a checkout via
      `BASICALLY_SERVER_PATH=/path/to/basically/scripts/basically npm test`. A
      pass against an older server has exercised none of this and must be
      reported that way.
- [x] 8.7 No Vim client check applies: 6.2 touches only the Notepad++ notes and
      nothing under `clients/vim/`. Should any task come to touch it, name the
      manual check that was run here.
