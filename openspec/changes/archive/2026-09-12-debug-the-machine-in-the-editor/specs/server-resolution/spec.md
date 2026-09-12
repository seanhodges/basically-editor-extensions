## ADDED Requirements

### Requirement: Being able to run a machine is not being able to step one

A client SHALL treat being able to run a machine and being able to stop a program
on one of its lines as two questions. Not every machine can say which BASIC line
it is executing, and a client that established a server can run a machine SHALL
NOT thereby assume that machine can be stepped.

The narrower question SHALL be settled by asking the server that was found,
before the client offers to debug anything on that machine, rather than by the
client holding knowledge of its own about which machines can be stepped. A
client SHALL NOT carry that answer, because the server serving the user may not
be the one the client shipped with, and the set of machines that can be stepped
is the toolchain's to change.

Where the machine can be run but cannot be stepped, the client SHALL say so and
say what can still be done with it, and running the listing SHALL go on being
offered.

#### Scenario: A machine that runs but cannot be stepped

- **WHEN** the user asks to debug a listing whose machine the server can run but
  cannot step
- **THEN** the user is told that this machine cannot be stepped and what can
  still be done with it, and running the listing is still offered

#### Scenario: Asking the server that is actually serving

- **WHEN** the user has pointed the client at a server of their own, and asks to
  debug a listing
- **THEN** whether that machine can be stepped is answered by the server the
  user named, not from anything the client carries
