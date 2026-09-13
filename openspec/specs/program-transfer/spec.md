# program-transfer Specification

## Purpose

Getting a program between the editor and the file formats the machine itself
loads. This says that the listing being edited can be turned into such a file
without leaving the editor, that the formats offered and their names are the
server's rather than the client's, that a machine whose firmware is absent can
still be exported to, where the files go when a format produces more than one,
and that a listing the toolchain cannot build leaves no file behind.

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
