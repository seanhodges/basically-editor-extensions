# machine-selection Specification

## Purpose

Every BASIC listing is written for one machine, and nothing a client offers
means anything until it is known which. This is how a user says so, what wins
when more than one answer is available, and how the answer reaches the server
that has to act on it — stated once, so that every client settles a listing's
machine the same way and a user moving between editors is not surprised.

## Requirements

### Requirement: A listing's own declaration settles its machine

Where a listing declares which machine it is for, that declaration SHALL settle
the question, whatever the user has configured. A user SHALL therefore be able
to keep listings for several machines in one project and have each of them
checked against its own.

A client SHALL recognise a listing that opens with such a declaration as a BASIC
listing, so that a listing is served whatever it happens to be named.

#### Scenario: A declared listing in a project configured for another machine

- **WHEN** the user opens a listing that declares its machine, having
  configured a different one
- **THEN** every answer about that listing is the declared machine's answer

#### Scenario: Several machines in one project

- **WHEN** the user opens two listings in one project that declare different
  machines
- **THEN** each is checked against the machine it declares, and neither
  disturbs the other

### Requirement: A user can name the machine their listings are checked against

A client SHALL offer the user a way to name the machine that listings are
checked against where they do not declare one themselves. A machine SHALL be
nameable the same way it is everywhere else in the product.

Where the user has named no machine, and the listing declares none, the machine
SHALL be worked out from the listing's own text; and where several machines
would read it equally well, the user SHALL be told rather than have one chosen
for them.

Naming no machine SHALL remain a choice the user can return to, so that a user
who picked one and now wants each listing to speak for itself can say so
without editing anything by hand.

#### Scenario: A configured machine answers for an undeclared listing

- **WHEN** the user has named a machine and opens a listing that declares none
- **THEN** every answer about that listing is the named machine's answer

#### Scenario: Standing down to the listing's own word

- **WHEN** the user clears the machine they had named
- **THEN** each listing is checked against what it declares, or what it can be
  worked out to be

### Requirement: The user is offered the machines this server has

Where a client offers the user a choice of machine, the choices SHALL be the
machines the server it is about to use actually has, asked of that server rather
than carried by the client. A client SHALL NOT offer a machine its server does
not have, nor omit one it has gained.

Where the server cannot be asked, the user SHALL be told that, rather than
offered a stale list or nothing at all.

#### Scenario: The choices match the server

- **WHEN** the user asks to choose a machine
- **THEN** what they are offered is what this server has, and choosing any of
  them is a choice the server will honour

#### Scenario: The server cannot be asked

- **WHEN** the user asks to choose a machine and the server cannot be reached
- **THEN** they are told that it could not be asked, rather than shown an empty
  or invented list

### Requirement: The chosen machine reaches the server, and changing it reaches every open listing

A client SHALL make the user's choice known to the server both as something the
server can ask for and as something it is handed when it starts, because clients
and servers differ in which of the two they support and a choice that reaches
neither is a choice that did nothing.

When the user changes which machine is chosen, every listing already open SHALL
be reconsidered against the new one without the user reopening it or restarting
anything.

#### Scenario: Changing the machine with listings open

- **WHEN** the user changes the chosen machine while listings are open
- **THEN** the problems reported for those listings become the new machine's,
  with nothing reopened

#### Scenario: The choice survives the server starting

- **WHEN** a client starts its server with a machine already chosen
- **THEN** the first answers about a listing are that machine's answers, not
  answers given before the choice arrived

### Requirement: Where no machine can be settled, the user is told exactly what to set

Where a listing declares no machine, the user has named none, and the listing
cannot be worked out, the user SHALL be told so on the listing itself, naming
what to set. A client SHALL NOT answer as though some machine had been chosen,
and SHALL NOT leave the user with silence.

What the user is told to set SHALL be something the client they are using
actually offers. A client SHALL NOT relay an instruction to set something it
does not have.

#### Scenario: An ambiguous listing with nothing configured

- **WHEN** the user opens a listing that declares no machine, having named
  none, and its text does not distinguish one machine from another
- **THEN** one problem is reported on the listing telling them what to set

#### Scenario: The instruction names something the client has

- **WHEN** the user is told which setting to reach for
- **THEN** the client they are using offers that setting
