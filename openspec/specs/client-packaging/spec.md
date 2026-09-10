# client-packaging Specification

## Purpose

How a user comes to have a client that works. A released client carries the
language server inside it, so installing one thing is enough; the version it
carries is named in a single place, so what was tested and what ships are the
same server; and a package that could not have started, or that carries a
licensed program without its licence, fails the build rather than reaching
anybody.

## Requirements

### Requirement: A released client works with nothing else installed

A released client SHALL carry the language server within it, so that a user who
installs the client and nothing else can open a listing and be served.

What is carried SHALL be the server's own files and not the dependency tree it
never reaches. Those dependencies exist for running machines, and carrying them
would multiply the size of a client by a hundredfold for code the language
server never calls.

A user who has installed the toolchain themselves SHALL be able to be served
from it instead, and the client SHALL NOT require the carried copy to be used.

#### Scenario: Installing only the client

- **WHEN** the user installs a released client on a machine with no toolchain
- **THEN** opening a listing serves them, with nothing else to download

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

A build SHALL fail where the carried server arrives without its licence. What is
shipped is a program under a copyleft licence, and it may not ship without one.

A released package SHALL carry the compiled client and the server, and SHALL NOT
carry its sources, its tests or its build configuration.

#### Scenario: A server that unpacked without an entry point

- **WHEN** a build carries a server that has nothing to launch
- **THEN** the build fails, and no package is produced

#### Scenario: A server that unpacked without its licence

- **WHEN** a build carries a server without its licence
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
