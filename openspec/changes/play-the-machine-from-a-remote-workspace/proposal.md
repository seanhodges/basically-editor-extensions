## Why

The panel that runs a listing and plays its machine was built for a user whose
editor and whose extension are on the same computer, and that is where it has
been confirmed to work: the frame carries the machine's own display, and keys
reach it.

A user developing remotely — over SSH, in a container, in a tunnel, or in a
browser — has the extension running on one machine and the window on another.
The address the toolchain gives back is a loopback address on the side the
extension is running on, which is not the side the window is on. The panel
already passes that address through `vscode.env.asExternalUri`, which is the
editor's answer to exactly this, and its content rules are written around the
origin that comes back rather than the one that went in. That is the documented
contract, and it has never been run. Nobody has been shown a machine this way.

Confirming it is cheap; discovering it does not hold, after a client has shipped
promising a panel to every user, is not.

## What Changes

- **Running a listing and playing its machine is confirmed to work where the
  extension and the window are on different machines**, and the client says so
  where it documents the panel — or, where it turns out not to, says which
  arrangements it does not carry, rather than a user meeting an empty frame with
  nothing to read.
- **Whatever the confirmation turns up is fixed here.** The address crossing to
  the window, the origin the panel's content rules name, and a machine's keys
  travelling the same distance are the three places this can fail, and each is
  the client's to put right.
- No existing behaviour changes for a user whose editor and extension are on one
  computer. **Not breaking.**

## Non-goals

- **Anything else about the panel.** What settles a listing's machine, the
  machine belonging to this editor, ROM agreement, and what the client says when
  a listing cannot be run are settled in `play-the-machine-in-the-editor` and are
  not revisited.
- **The Vim and Notepad++ clients.** Only the VS Code client has a panel. The
  Vim plugin registers the server with whichever LSP host is present and has no
  surface a machine could be shown in; the Notepad++ notes have no build. Neither
  needs to follow.
- **Making the toolchain reachable where the editor cannot reach it.** This rests
  on the editor's own external-URI mapping. A client is not going to grow a
  tunnel of its own.
- **The debugger.** `debug-the-machine-in-the-editor` inherits this assumption
  and will inherit whatever this settles; it is not waiting on it and is not
  changed here.
- **Sound, editing in the panel, and replacing the browser IDE**, as before.

## Capabilities

### Modified Capabilities

- `machine-panel`: The panel guarantees the machine is shown and can be typed at
  where the extension and the window are on different computers, not only where
  they are on one — and where an arrangement is not carried, says so.

`server-resolution` and `client-packaging` are deliberately absent. Which server
is started, what runs it, and what the shipped copy can do are unchanged: the
toolchain runs where the extension runs, which is the same side of the
connection it was already on.

## Impact

- **The VS Code client** may gain fixes where the address crosses to the window;
  it gains no new setting and no new command. The panel's shape — a frame
  pointed at the address the toolchain gives back, with nothing of ours added to
  what crosses it — is what is being confirmed, not what is being changed.
- **The server contract** is expected to be untouched. The toolchain is asked
  for the same address it already gives back; making it reachable from the
  window is the editor's job, not the toolchain's. Should the confirmation show
  otherwise, that is a change in the `basically` repository and this change stops
  until it exists.
- **The tests** gain nothing automated. No suite here can put a window on
  another machine; this is confirmed by hand, and what is learnt is written down
  where the panel is documented.
- **The READMEs** gain what a remote user can expect of the panel.
