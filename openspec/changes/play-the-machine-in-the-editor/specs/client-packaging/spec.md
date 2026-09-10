## MODIFIED Requirements

### Requirement: A released client works with nothing else installed

A released client SHALL carry the language server within it, so that a user who
installs the client and nothing else can open a listing and be served.

What is carried SHALL be the server's own files and not the dependency tree they
do not contain. Those dependencies exist for running machines, and carrying them
would multiply the size of a client by a hundredfold.

The consequence SHALL be stated rather than left to be discovered: a client
carrying no dependency tree can run every machine whose emulation travels in the
server's own files, and cannot run one whose emulation is a dependency. Which
machine that is SHALL be established by asking the carried server, so that the
answer follows what is actually carried rather than what was once true of it.

A user who has installed the toolchain themselves SHALL be able to be served
from it instead, and the client SHALL NOT require the carried copy to be used.
Where a user needs a machine the carried copy cannot run, installing the
toolchain and pointing the client at it SHALL be the remedy.

#### Scenario: Installing only the client

- **WHEN** the user installs a released client on a machine with no toolchain
- **THEN** opening a listing serves them, with nothing else to download

#### Scenario: Running a machine the carried copy cannot

- **WHEN** the user installs only the client and runs a machine whose emulation
  is not carried
- **THEN** they are told that this copy cannot run it, and that installing the
  toolchain and pointing the client at it is the remedy
