# client-packaging Specification

## Purpose

How a user comes to have a client that works. A released client carries the
language server inside it, the emulator that server reaches for to run a
machine, and the modules the client itself loads beside them, so that installing
one thing is enough and the one thing runs; the version of the
server it carries is named in a single place, so what was tested and what ships
are the same server; and a package that could not have started, that could not
have been loaded, or that carries a licensed program without its licence, fails
the build rather than reaching anybody.

## Requirements

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

### Requirement: A released client carries the modules it loads

A released client SHALL carry every module its own compiled entry point loads,
and every module those load in turn, within the package. Loading that entry
point SHALL need nothing present but the package itself.

This is distinct from carrying the server, and it fails differently. A client
that cannot find its server has run, and can say so; a client that cannot load
its entry point has not run, registers none of the commands it contributes, and
starts no server at all. The editor goes on offering those commands, because
what a palette offers is read without running anything, and answers the one the
user picks with a report that it does not exist. A released client SHALL
therefore not depend on a module being findable anywhere outside the package,
whatever arrangement of modules happens to surround it where it was built.

What is carried SHALL be the versions this repository's own resolution settled
on, so that the modules that ship are the modules the tests ran against. A build
SHALL NOT re-answer a version range while packaging, for the same reason the
server's version is named in exactly one place.

What is carried SHALL be what is loaded, and the licence that has to travel with
it. A carried module's own sources, tests and type declarations SHALL NOT be
carried.

The modules SHALL be carried where the compiled client itself looks first, so
that a client run under the editor's own debugger loads the copy that ships
rather than the one the workspace happens to offer. A development loop that
resolves differently from the released package is how a package that cannot load
reaches a user.

#### Scenario: A client asked for a module it does not carry

- **WHEN** a released client's entry point loads a module the package does not
  carry
- **THEN** the build fails, and no package is produced

#### Scenario: Loading a client with nothing around it

- **WHEN** a released client is installed on its own, with no modules anywhere
  above it
- **THEN** its entry point loads, its commands are registered, and the server is
  started

#### Scenario: Running the client under the debugger

- **WHEN** the client is run from a checkout under the editor's own debugger
- **THEN** it loads the modules carried beside it, the same ones the released
  package carries

### Requirement: The version that ships is the version that was named

The version of the server a client carries SHALL be named in exactly one place,
and the build, the tests and the release SHALL all take it from there. Changing
that one name SHALL be the whole of changing which server ships.

A build SHALL confirm that what it has carried is the version that was named,
and SHALL fail rather than ship a client whose server is not the one it was
tested against.

Preparing a client SHALL be repeatable: a client already carrying the named
version SHALL be left as it is rather than fetched again.

#### Scenario: Bumping the server

- **WHEN** the pinned version is changed in the one place that names it
- **THEN** the next build carries that version, tests against it, and releases
  it

#### Scenario: Preparing twice

- **WHEN** a client already carrying the named version is prepared again
- **THEN** nothing is fetched and nothing changes

### Requirement: A package that could not have worked fails the build

A build SHALL fail where what it carried has nothing it could launch, rather
than producing a client that installs perfectly and then does nothing.

A build SHALL fail where a client's entry point could not be loaded from inside
the package, rather than producing a client that installs perfectly and never
runs. What is checked SHALL be what the build will actually ship, stood up with
nothing around it, and the modules it asks for SHALL be resolved the way the
runtime resolves them rather than against a list kept alongside — so that a
module which would only have been found outside the package is not mistaken for
one that is carried.

A build SHALL fail where anything it carries arrives without its licence, the
server and the client's own modules alike. What is shipped is other people's
programs under their own terms, and it may not ship without them.

A released package SHALL carry the compiled client, the modules it loads, and
the server, and SHALL NOT carry its sources, its tests or its build
configuration. A build SHALL fail where it does, rather than leaving that
guarantee unchecked.

#### Scenario: A server that unpacked without an entry point

- **WHEN** a build carries a server that has nothing to launch
- **THEN** the build fails, and no package is produced

#### Scenario: A server that unpacked without its licence

- **WHEN** a build carries a server without its licence
- **THEN** the build fails, and no package is produced

#### Scenario: A client whose entry point cannot be loaded

- **WHEN** a build produces a package whose entry point asks for a module the
  package does not carry
- **THEN** the build fails, naming the module and the file that asked for it,
  and no package is produced

#### Scenario: A carried module without its licence

- **WHEN** a build carries a module the client loads, without that module's
  licence
- **THEN** the build fails, and no package is produced

#### Scenario: A package carrying what a user has no use for

- **WHEN** a build produces a package carrying the client's sources, its tests
  or its build configuration
- **THEN** the build fails, and no package is produced

### Requirement: Every change is packaged, and a tagged one is published

Every proposed and accepted change SHALL be built, checked against the server it
will ship with, and packaged, so that a change that breaks packaging is caught
where it was made rather than at a release.

A tagged release SHALL be published to the places users install from, and SHALL
be attached to a release in the project itself either way — so that a project
without publishing credentials configured still produces something a user can
install, rather than failing.

#### Scenario: A change that breaks packaging

- **WHEN** a change is proposed that would produce no installable package
- **THEN** it is reported as failing before it is accepted

#### Scenario: A release without publishing credentials

- **WHEN** a release is cut where no publishing credentials are configured
- **THEN** publishing is skipped, and the packaged clients are still attached
  to the release
