## ADDED Requirements

### Requirement: A machine's own file can be opened as a listing

The extension SHALL be able to read a machine's own program file back into BASIC
and open it as a listing, without the user leaving the editor. The listing SHALL
open as one that has never been saved, so that where it belongs on the user's disk
is the user's decision, and SHALL NOT be written over anything the user already
has open.

Reading a file SHALL be possible whether or not a listing is open, since a user
opening a program from elsewhere has nothing open yet.

#### Scenario: Opening a program from a file

- **WHEN** the user reads a machine's program file
- **THEN** the BASIC it holds opens as a new unsaved listing, served as any other
  listing is

#### Scenario: Reading a file with nothing open

- **WHEN** the user reads a program file with no listing open
- **THEN** it is read, and opens as a listing

#### Scenario: An open listing is not disturbed

- **WHEN** the user reads a program file while editing a listing
- **THEN** what they were editing is unchanged

### Requirement: The machine a file is read as is the file's own

Which machine a file belongs to SHALL be settled by the file itself, and not by
what the user has configured for their listings — so that a file whose format
belongs to one machine is read as that machine wherever it is opened.

Where a format belongs to more than one machine the server has, or to none of
them, the user SHALL be asked which machine to read it as, and SHALL be told
which machines could have claimed it. Nothing SHALL be guessed.

The listing that opens SHALL declare the machine it was read as, so that it is
checked against that machine from the moment it opens rather than against
whatever the user's listings default to.

#### Scenario: A format belonging to one machine

- **WHEN** the user reads a file whose format belongs to exactly one machine the
  server has, while their listings default to a different machine
- **THEN** it is read as the file's machine, not the configured one

#### Scenario: A format more than one machine could claim

- **WHEN** the user reads a file whose format more than one machine could have
  produced
- **THEN** they are asked which of those machines to read it as, and it is read
  as the one they choose

#### Scenario: The listing says what it is

- **WHEN** a file is read and its listing opens
- **THEN** the listing declares the machine it was read as, and is checked
  against that machine

### Requirement: What the conversion could not carry is reported, not dropped

Everything the toolchain reports about a conversion it could not fully carry
SHALL reach the user: the warnings the machine's own reader raises, the parts of
the file that are not BASIC, and any further files the format held. The extension
SHALL NOT present a partial reading as a clean one.

Where the file held machine code alongside the BASIC, the user SHALL be offered
somewhere to keep it, and SHALL be told what was kept and where. Declining SHALL
leave the listing open and nothing written, and SHALL NOT be reported as a
failure, since the listing is what was asked for and it has already arrived.

#### Scenario: A file the machine's reader had warnings about

- **WHEN** a file is read whose conversion raised warnings
- **THEN** the listing opens and the warnings are put to the user, rather than
  the listing alone

#### Scenario: A file holding machine code as well as BASIC

- **WHEN** a file is read that held machine code beside the BASIC
- **THEN** the user is told what it held and offered somewhere to keep it, and is
  told what was kept and where

#### Scenario: Declining to keep what was recovered

- **WHEN** the user declines to say where recovered machine code should go
- **THEN** the listing stays open, nothing is written, and this is not reported
  as a failure

### Requirement: Reading a file is offered by name and on the editor

Reading a machine's file SHALL be offered both as a command the user can find by
name and as a control alongside the other things that can be done to a listing.

The command SHALL be findable by name whether or not a listing is open, because
it needs none; the control on the editor SHALL be offered where the other
controls on a listing are.

#### Scenario: Finding it by name with nothing open

- **WHEN** the user looks through the extension's commands by name with no
  listing open
- **THEN** reading a machine's file is among them

#### Scenario: Reading a file from the editor

- **WHEN** the user is editing a BASIC listing
- **THEN** a control to read a machine's file is offered alongside the others,
  and describes itself as the command does
