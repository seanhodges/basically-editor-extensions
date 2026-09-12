## ADDED Requirements

### Requirement: Being able to serve the language is not being able to run a machine

A client SHALL treat what a server can do as two questions, not one. Serving the
language asks less of a server than running a machine does, and a client that
found a server good enough to serve the language SHALL NOT thereby assume it can
run every machine.

The narrower question SHALL be settled by asking the server that was found,
before the client offers to run anything on it, rather than by the client
holding knowledge of its own about what any particular server can do.

The order in which a server is looked for SHALL NOT change on account of this: a
client SHALL NOT pass over the server the user pointed it at, or the copy that
shipped with it, in favour of one that can run more. Where the server found
cannot run a machine the user asked for, the client SHALL say so and name the
remedy rather than silently serving them from a different one.

#### Scenario: A server that serves the language but cannot run a machine

- **WHEN** the server a client found serves the language but cannot run the
  machine the user asked to run
- **THEN** the language goes on being served from it, and the user is told that
  this server cannot run that machine and what to do about it

#### Scenario: The order is not changed by what can run

- **WHEN** the user has pointed the client at a server, and another that could
  run more is also present
- **THEN** the server the user named is still the one used, for the language and
  for running alike
