# program-transfer Specification

## Purpose

Getting a program between the editor and the file formats the machine itself
loads, in both directions. This says that the listing being edited can be turned
into such a file without leaving the editor, that the formats offered and their
names are the server's rather than the client's, that a machine whose firmware is
absent can still be exported to, where the files go when a format produces more
than one, and that a listing the toolchain cannot build leaves no file behind.
It says the same of the other direction: that a machine's own file can be opened
as a listing, that the machine it is read as is settled by the file rather than
by the user's setting, and that nothing the conversion could not carry is
dropped in silence.

## Requirements

### Requirement: A listing can be exported as a file its machine loads

The extension SHALL be able to turn the listing being edited into a file the
machine it is written for can load, without the user leaving the editor. What is
exported SHALL be the text as it now stands, unsaved changes included, so that
what is exported is what the user is looking at and what running the listing
would run.

The machine SHALL be settled the way it is settled everywhere else — the
listing's own declaration first, then what the user configured — and a machine
this installation cannot run SHALL NOT for that reason be one it cannot export
to, since building a program reads none of the machine's firmware.

Where nothing settles which machine the listing is for, the user SHALL be told
what to set rather than being offered a guess.

#### Scenario: Exporting the listing being edited

- **WHEN** the user exports a listing whose machine is settled
- **THEN** a file that machine can load is written where the user said, built
  from the text as it now stands

#### Scenario: Exporting for a machine whose firmware is absent

- **WHEN** the user exports a listing for a machine this installation holds no
  images for
- **THEN** the export is carried out, because building the program needs none of
  them

#### Scenario: A listing whose machine cannot be settled

- **WHEN** the user exports a listing that declares no machine and no machine has
  been configured
- **THEN** they are told what to set, and nothing is written

### Requirement: The formats offered are the ones the server has

The formats a listing can be exported as SHALL be the ones the server reports for
that machine, described as the server describes them. The extension SHALL NOT
keep its own account of which machines have which formats, so that a server that
gains a format offers it here without the extension being changed, and one that
has never had a format never offers it.

Where the machine has more than one, the user SHALL choose; the chosen format
SHALL be the one built, rather than one worked out afterwards from what the user
named the file.

#### Scenario: Choosing among a machine's formats

- **WHEN** the user exports a listing for a machine with several formats
- **THEN** they are offered that machine's formats under the server's own names,
  and the one they choose is the one built

#### Scenario: A format the extension has never heard of

- **WHEN** the server reports a format the extension knows nothing about
- **THEN** it is offered like any other, described as the server describes it

### Requirement: The user says where the file goes, and is told what was written

The user SHALL choose where the exported file is written. Where the chosen format
produces more than one file, the further files SHALL be written beside the first
under the names that format gave them, and the user SHALL be told every file that
was written and where — so that a format producing more than one file does not
leave files a user did not know to look for.

#### Scenario: A format producing one file

- **WHEN** an export produces a single file
- **THEN** it is written where the user said, and the user is told so

#### Scenario: A format producing several files

- **WHEN** an export produces more than one file
- **THEN** the first is written where the user said, the rest beside it under
  their own names, and the user is told each one

### Requirement: A listing that cannot be built is not written

Where the toolchain reports a problem in the listing that stops it being built,
the extension SHALL write nothing and SHALL say that is why — so that a listing
with a genuine error never leaves a file behind that the machine will not load.

#### Scenario: Exporting a listing with a fatal problem

- **WHEN** the user exports a listing the toolchain cannot build
- **THEN** no file is written, and the user is told what stopped it

### Requirement: Exporting is offered by name and on the listing itself

The export SHALL be offered both as a command the user can find by name and as a
control on the listing being edited, so that it is discoverable by someone
looking for it and to hand for someone already working.

Both SHALL be offered only where there is a BASIC listing to act on. A control on
the listing SHALL say what activating it does, in the same words as the command
it runs, so that the two cannot come to describe the same act differently.

#### Scenario: Finding the export by name

- **WHEN** the user looks through the extension's commands by name while editing
  a listing
- **THEN** exporting the listing is among them

#### Scenario: Exporting from the listing itself

- **WHEN** the user is editing a BASIC listing
- **THEN** a control to export it is offered on that listing, and describes
  itself as the command does

#### Scenario: Editing something that is not a listing

- **WHEN** the user is editing a file that is not a BASIC listing
- **THEN** no control to export it is offered there

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
