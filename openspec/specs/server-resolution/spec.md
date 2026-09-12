# server-resolution Specification

## Purpose

Which language server a client starts, and what runs it. A client is a thin
thing whose whole job is to reach the right server, so getting this wrong looks
to a user exactly like an editor that installed perfectly and then does nothing.
This says where a client looks, in what order, what it does when the runtime it
finds is older than the server asks for, and what it tells the user when it
cannot start at all — and, because running a machine asks more of a server than
serving the language does and stepping one asks more again, that what a server
found this way can run, and what it can step, are asked of it rather than
assumed.

## Requirements

### Requirement: A client looks for its server in a stated order

A client SHALL find its server by taking the first of these that answers: the
server the user pointed it at, the copy that shipped with the client, then the
toolchain installed on the system. The order SHALL be the same every time, so
that a user who points a client at a particular server gets that one and nobody
has to guess which of several is in use.

Pointing a client at a server SHALL work both for an installed toolchain and for
a working copy of it, so that someone changing the server itself can try it
without publishing anything.

Where a client ships with no copy and the toolchain is not installed, the
attempt SHALL still be made and SHALL fail as described below, rather than the
client quietly doing nothing.

#### Scenario: The user points at their own server

- **WHEN** the user points a client at a server of their own, and a copy also
  shipped with the client
- **THEN** the server the user named is the one that serves them

#### Scenario: Nothing is installed and nothing was configured

- **WHEN** the user has a client that shipped with a copy of the server, and
  has installed no toolchain
- **THEN** the copy that shipped with the client serves them

#### Scenario: A user who installed the toolchain themselves

- **WHEN** the user has a client that shipped with no copy, and has the
  toolchain installed
- **THEN** the installed toolchain serves them

### Requirement: A client never refuses to serve over a version number

Where the server needs a runtime, a client SHALL choose one by taking the first
of these that answers: the runtime the user named, the one installed on the
system, then the editor's own. It SHALL prefer the first that is new enough for
the server.

Where none of them is new enough, a client SHALL serve with the best it has
anyway, and SHALL tell the user it has done so and what to set to improve it.
Refusing to start would leave the user with a working editor and no language
help at all, which is worse than serving on an old runtime.

Where the user named a runtime that does not answer as one, a client SHALL fall
back to the next candidate and SHALL say that it did, so that a mistyped setting
is visible rather than silently ignored.

Where the runtime a client settles on is the editor's own, the client SHALL
start it in a way that makes it serve, rather than in a way that opens the
editor again.

#### Scenario: Only an old runtime is available

- **WHEN** the user has no runtime as new as the server asks for
- **THEN** the server is started on the newest one available, and the user is
  told which was used and what to set

#### Scenario: A runtime setting that points at nothing

- **WHEN** the user has named a runtime that does not answer as one
- **THEN** the next candidate is used, and the user is told the named one was
  not taken

#### Scenario: Falling back to the editor's own runtime

- **WHEN** no runtime is available but the editor's own
- **THEN** the server runs and serves, rather than the editor opening a second
  time

### Requirement: A client that cannot start its server says what to do about it

Where a client cannot start its server at all, it SHALL tell the user, name what
it tried to start, and say what to install or what to set. It SHALL NOT fail
silently, and SHALL NOT leave the editor looking as though the listing simply
has nothing to say about it.

A client SHALL let the user start over without restarting their editor, so that
installing the toolchain or correcting a setting can be acted on immediately.

What a client has to say about its own starting SHALL reach the user somewhere
they can go back and read, separately from the conversation with the server.

#### Scenario: Nothing to start

- **WHEN** the user opens a listing and the client can find no server to start
- **THEN** they are told what was tried and what to install or set

#### Scenario: Acting on the advice

- **WHEN** the user installs the toolchain or corrects a setting after being
  told to
- **THEN** they can have the client try again without restarting the editor

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
