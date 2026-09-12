## MODIFIED Requirements

### Requirement: A released client works with nothing else installed

A released client SHALL carry the language server within it, so that a user who
installs the client and nothing else can open a listing and be served.

What is carried SHALL be a package's own files and never the dependency tree it
resolves to. Those trees exist for building and for presenting, come to most of
half a gigabyte, and nothing a client starts reaches them.

A released client SHALL be able to run a machine and not only serve the
language. The emulator the toolchain reaches for SHALL therefore be carried
beside it — that package's own files, at the version the toolchain itself asks
for — because the toolchain resolves the emulator before it runs anything at
all, so a copy carrying no emulator runs no machine whatsoever, including the
machines whose emulation is in the toolchain's own files.

No ROM image SHALL be obtained, held in this repository, or published by the
build. A machine that needs an image SHALL be run only after the user has agreed
to it being obtained, and a machine whose emulator carries its own images needs
no such agreement. Which machine is which SHALL be established by asking the
carried server, so that the answer follows what is actually carried rather than
what was once true of it.

A user who has installed the toolchain themselves SHALL be able to be served
from it instead, and the client SHALL NOT require the carried copy to be used.
Where a user needs a machine the carried copy cannot run, installing the
toolchain and pointing the client at it SHALL be the remedy.

#### Scenario: Installing only the client

- **WHEN** the user installs a released client on a machine with no toolchain
- **THEN** opening a listing serves them, with nothing else to download

#### Scenario: Running a machine on a bare install

- **WHEN** the user installs only the client and runs a listing for a machine the
  carried server says it can run
- **THEN** it runs, with no toolchain installed and nothing obtained

#### Scenario: Running a machine whose images are not held

- **WHEN** the user installs only the client and runs a machine the carried
  server says needs images it does not hold
- **THEN** they are asked before anything is obtained, and told that installing
  the toolchain and pointing the client at it is the other way to supply them
