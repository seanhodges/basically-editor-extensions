# vscode-client Specification

## Purpose

What a VS Code user gets: their BASIC listings recognised as BASIC, the
language server's help for as long as they have them open, the things the
protocol has no place for offered as commands they can find — running the
listing among them — settings for the machine and for the server, which machine
the listing they are editing is checked against, the same toolchain offered to
their editor's own agent, and colour for every kind of run the server reports
— including the two kinds nothing outside a BASIC listing has.

## Requirements

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

### Requirement: A BASIC listing edits as BASIC

The extension SHALL tell the editor how a BASIC listing is written, so that the
editor's own generic behaviour is right for it rather than right for some other
language: what introduces a comment, which brackets pair, what is worth closing
and surrounding automatically, and what counts as one word — which in BASIC
includes the sigil that marks a string variable, so that selecting or replacing
such a variable takes the whole of its name.

#### Scenario: Commenting a line

- **WHEN** the user asks the editor to comment out a line of a listing
- **THEN** it is commented the way that machine's BASIC comments a line

#### Scenario: Selecting a string variable

- **WHEN** the user double-clicks a string variable's name
- **THEN** the sigil that makes it a string variable is selected with it

### Requirement: The user can choose the machine and restart the server

The extension SHALL offer, as commands the user can find by name, the things the
protocol itself has no place for: choosing the machine listings are checked
against, starting the language server again, and running the listing being
edited so that its machine can be played.

Choosing a machine SHALL be a choice among the machines the running server has,
and SHALL be remembered against the project the user is working in where there
is one, and for them generally where there is not — so that a machine chosen for
one project does not follow them into another.

Restarting the server SHALL stop the one running and start a new one under the
settings as they now stand, without the user restarting their editor. It SHALL
NOT be required in order to run a listing, and SHALL NOT disturb a machine
already being played.

Running the listing SHALL open the panel `machine-panel` describes. The command
SHALL be offered wherever a listing is being edited, and where that listing
cannot be run the command SHALL say why rather than being absent without
explanation.

#### Scenario: Choosing a machine in a project

- **WHEN** the user chooses a machine while working in a project
- **THEN** the choice is remembered for that project, and other projects are
  unaffected

#### Scenario: Restarting after installing the toolchain

- **WHEN** the user installs the toolchain and restarts the server
- **THEN** the newly installed server is the one now serving them

#### Scenario: Finding the command to run a listing

- **WHEN** the user looks for the extension's commands by name while editing a
  listing
- **THEN** running the listing is among them

#### Scenario: Restarting the server while a machine is being played

- **WHEN** the user restarts the language server while a panel is playing a
  machine
- **THEN** the language server is restarted and the machine goes on being played

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

### Requirement: Every kind of run the server colours has a colour

Colour in a listing SHALL come from the server, and the extension SHALL give the
editor a style for every kind of run the server reports — including the kinds no
ordinary language has, a line number and a machine's own graphics character.

A kind of run the server reports and the extension has no style for SHALL be
treated as a fault in the extension rather than as the user's problem: it shows
as unexplained plain text in the middle of a coloured listing, and nothing tells
the user why. The extension SHALL be checked against the server it ships with,
so that a server that gains a kind of run cannot ship with a client that has no
style for it.

Where the server offers no colour at all, the listing SHALL still be served in
every other way.

#### Scenario: A line number and a graphics character are coloured

- **WHEN** the user opens a listing containing line numbers and the machine's
  own graphics characters
- **THEN** both are coloured, distinctly from the keywords and the strings
  around them

#### Scenario: A server that serves no colour

- **WHEN** the client is serving from a server that offers no colour
- **THEN** problems, completion, explanations and the rest are unaffected

### Requirement: The user is told which machine their listing is checked against

While the user is editing a BASIC listing, the extension SHALL show which
machine that listing is being checked against, without the user having to open
or run anything, and SHALL keep it current as they move between listings and as
the answer changes.

Where no machine could be settled, the extension SHALL say so as plainly as it
would name one. The server colours nothing in a listing it cannot bind to a
machine, which is correct and is also indistinguishable, to the user, from a
client that has stopped working; the point of this requirement is that the two
can be told apart at a glance.

The extension SHALL distinguish a listing with no machine settled from one whose
machine was named but this server does not have, and from one whose machine this
server has but cannot run as it stands. The third of these SHALL NOT be shown as
an absence: such a listing is being checked against that machine, and only
running it is affected.

What is shown SHALL be the server's answer, arrived at by the precedence stated
for every client. The extension SHALL NOT read a listing's declaration itself,
SHALL NOT infer a machine from a listing's text, and SHALL show nothing rather
than a machine it decided on its own.

The extension SHALL NOT restate what the user should set. That sentence is
already reported on the listing, and SHALL remain the one place it is said.
Choosing the machine SHALL be reachable from what is shown.

Keeping this current SHALL cost the user nothing they would notice. The
extension SHALL NOT ask again for a listing whose answer it already has, and
SHALL NOT ask as the user types. Where the answer is not yet known the extension
SHALL say that it is being worked out rather than showing the machine of a
listing the user is no longer editing, and where it cannot be got at all the
extension SHALL show nothing rather than reporting a fault it is not about.

Nothing SHALL be shown for a file that is not a BASIC listing.

#### Scenario: A listing that declares its machine

- **WHEN** the user is editing a listing that declares which machine it is for
- **THEN** that machine is named to them while they edit it

#### Scenario: A listing with no machine settled

- **WHEN** the user is editing a listing that declares no machine, having named
  none, whose text does not distinguish one machine from another
- **THEN** they are told that no machine is settled, and choosing one is
  reachable from there

#### Scenario: Telling correct silence from a broken client

- **WHEN** a listing is shown with none of the server's colour in it
- **THEN** the user can see whether a machine was settled, without opening or
  running anything

#### Scenario: A machine this server cannot run

- **WHEN** the user is editing a listing whose machine this server has but
  cannot run as it stands
- **THEN** that machine is named as the one it is checked against, and not
  reported as no machine

#### Scenario: Moving between two open listings

- **WHEN** the user moves back to a listing whose machine has already been
  established, its text unchanged
- **THEN** what is shown is that machine, and nothing is asked of the server
  again

#### Scenario: Editing a file that is not a listing

- **WHEN** the user is editing something that is not a BASIC listing
- **THEN** nothing about machines is shown to them

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
