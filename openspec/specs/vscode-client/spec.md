# vscode-client Specification

## Purpose

What a VS Code user gets: their BASIC listings recognised as BASIC, the
language server's help for as long as they have them open, the two things the
protocol has no place for offered as commands they can find, settings for the
machine and for the server, and colour for every kind of run the server reports
— including the two kinds nothing outside a BASIC listing has.

## Requirements

### Requirement: A BASIC listing is recognised and served

The extension SHALL recognise a BASIC listing by the name it is saved under, and
also by a listing that opens by declaring its machine, so that a listing is
served whether or not it has been saved yet.

Opening such a listing SHALL be enough to bring the language server up; the user
SHALL NOT have to run anything first. The extension SHALL go on serving a
listing that has never been saved as well as one on disk.

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

The extension SHALL offer, as commands the user can find by name, the two things
the protocol itself has no place for: choosing the machine listings are checked
against, and starting the language server again.

Choosing a machine SHALL be a choice among the machines the running server has,
and SHALL be remembered against the project the user is working in where there
is one, and for them generally where there is not — so that a machine chosen for
one project does not follow them into another.

Restarting the server SHALL stop the one running and start a new one under the
settings as they now stand, without the user restarting their editor.

#### Scenario: Choosing a machine in a project

- **WHEN** the user chooses a machine while working in a project
- **THEN** the choice is remembered for that project, and other projects are
  unaffected

#### Scenario: Restarting after installing the toolchain

- **WHEN** the user installs the toolchain and restarts the server
- **THEN** the newly installed server is the one now serving them

### Requirement: The user can say which server to use and watch it work

The extension SHALL offer settings for the machine to check against, for which
server to use, for the runtime that runs it, and for whether the conversation
with the server is recorded for the user to read.

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
