## ADDED Requirements

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

## MODIFIED Requirements

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
