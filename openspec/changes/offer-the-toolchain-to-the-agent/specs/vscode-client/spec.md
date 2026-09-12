## ADDED Requirements

### Requirement: The toolchain is offered to the editor's own agent

The extension SHALL offer the toolchain it starts to the editor's own agent, so
that a user who has installed the extension can have their agent work on BASIC —
running a listing, reading the screen it draws, pressing keys at it, and the rest
of what the toolchain does — without naming a command or a path themselves.

What the agent is offered SHALL be the toolchain's, not the extension's: the
extension SHALL say where the server is and leave the editor to start it, stop it
and ask it what it can do. The extension SHALL NOT hold that conversation itself,
and SHALL NOT describe, add to or leave out any part of what the toolchain offers
an agent.

The user SHALL be able to say that the toolchain is not to be offered, and SHALL
be able to change their mind without restarting their editor. Where a setting
that bears on which server is offered changes, what the agent is offered SHALL
change with it.

Where the machines an agent could run need images the user has not yet agreed to
obtain, the extension SHALL ask before the server is started, on the same terms
as it asks before running a listing. The toolchain cannot ask for itself, because
an editor starting a server is not someone it can put a question to. Declining
SHALL NOT stop the toolchain being offered: what needs no images goes on working,
and a machine that needs them is refused by the server in its own words.

#### Scenario: An agent that has never been configured

- **WHEN** the user has the extension installed and asks their editor's agent to
  work on a listing, having configured nothing
- **THEN** the agent has the toolchain to work with

#### Scenario: A user who does not want the toolchain offered

- **WHEN** the user says the toolchain is not to be offered to their agent
- **THEN** it is no longer offered, without their editor being restarted, and
  their listings go on being served as before

#### Scenario: An agent asked to run a machine whose images are not held

- **WHEN** the toolchain is about to be offered and the user has not agreed to
  obtain the images the machines need
- **THEN** they are asked once, on the same terms as running a listing asks, and
  declining leaves the toolchain offered rather than withheld

## MODIFIED Requirements

### Requirement: A BASIC listing is recognised and served

The extension SHALL recognise a BASIC listing by the name it is saved under, and
also by a listing that opens by declaring its machine, so that a listing is
served whether or not it has been saved yet.

Opening such a listing SHALL be enough to bring the language server up; the user
SHALL NOT have to run anything first. The extension SHALL go on serving a
listing that has never been saved as well as one on disk.

Where no listing is open, the extension SHALL NOT start a language server. The
extension may be loaded for reasons that have nothing to do with a listing —
offering the toolchain to the editor's agent is one — and a user who has opened
no BASIC should not be given a server they have no use for.

Everything the user is offered about a listing — the problems, the completions,
the explanations, jumping to a called line, the outline, a variable's uses and
its highlights — SHALL come from the server, so that a listing is answered on
the terms of the machine it is for rather than on the editor's idea of BASIC.

When the editor closes the listing or shuts down, the extension SHALL stop the
server it started rather than leave it running.

#### Scenario: Opening a listing

- **WHEN** the user opens a BASIC listing
- **THEN** the language server starts without being asked for, and problems in
  the listing are reported as the editor's own

#### Scenario: A listing that has never been saved

- **WHEN** the user types a listing into a new unsaved document and declares
  its machine
- **THEN** it is served the same as one on disk

#### Scenario: A window with no listing in it

- **WHEN** the extension is loaded in a window where no BASIC listing is open
- **THEN** no language server is started, and one starts as soon as a listing is
  opened

### Requirement: The user can say which server to use and watch it work

The extension SHALL offer settings for the machine to check against, for which
server to use, for the runtime that runs it, for whether the toolchain is offered
to the editor's own agent, and for whether the conversation with the server is
recorded for the user to read.

A setting that is about the user's machine rather than about their work SHALL be
settable per machine, so that a path that is right on one computer is not
carried to another by a shared project.

Where recording the conversation is asked for, it SHALL appear alongside
whatever the extension has to say about starting the server, so that a user
diagnosing a client that will not start and a user diagnosing a server that
answers oddly look in the same place.

#### Scenario: A path that is right on one computer

- **WHEN** the user points the extension at a server by path in a project they
  share with others
- **THEN** the path is theirs, and is not imposed on anyone else opening that
  project

#### Scenario: Watching the conversation

- **WHEN** the user asks for the conversation with the server to be recorded
- **THEN** they can read it, together with what the extension said about
  starting that server
