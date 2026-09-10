# vim-client Specification

## Purpose

What a Vim or Neovim user gets: the language server registered with whichever
LSP host they happen to run, a single listing served without a project built
around it, and a plugin that stands quietly aside when there is nothing for it
to do rather than putting an error in front of someone who never asked for it.

## Requirements

### Requirement: The server is registered with whichever host is present

The plugin SHALL register the language server with the LSP host the user
actually runs, covering both the editor's own and the established third-party
one, and SHALL work out which is present rather than requiring the user to say.

Where the user runs a plugin that manages LSP configuration, the plugin SHALL
register through it, so that the user's own settings and conventions apply.
Where they do not, the plugin SHALL register directly, so that using it does not
require installing anything further.

The plugin SHALL be loadable the way plugins for that editor are loaded, and
SHALL register once however many times it is sourced.

#### Scenario: A user with an LSP configuration plugin

- **WHEN** the user loads the plugin with an LSP configuration plugin installed
- **THEN** the server is registered through it, and their own settings apply

#### Scenario: A user with no LSP configuration plugin

- **WHEN** the user loads the plugin with the editor's own LSP support and
  nothing else
- **THEN** the server is registered anyway, and their listings are served

### Requirement: The plugin stands aside rather than complaining

Where the toolchain is not installed, the plugin SHALL do nothing at all: no
registration, no error, no message. A user who has not installed the server yet
has not made a mistake.

Where the user has said they do not want the plugin to register, it SHALL not,
however it came to be loaded.

Where neither LSP host is present, the plugin SHALL leave the editor as it found
it.

Recognising a BASIC listing SHALL NOT take a listing another plugin has already
claimed, so that a user who already has a BASIC plugin keeps it.

#### Scenario: The toolchain is not installed

- **WHEN** the user loads the plugin without the toolchain installed
- **THEN** nothing is registered and nothing is reported

#### Scenario: Another BASIC plugin is already in use

- **WHEN** the user opens a listing that another plugin has already recognised
- **THEN** that plugin's recognition stands

### Requirement: A lone listing is served

The plugin SHALL serve a listing that has no project around it, treating the
listing's own location as where it lives. A user opening a single BASIC file
SHALL get the same help as one working inside a checkout; a listing needs no
project built around it before it can be checked.

Where the listing does sit inside a project, the plugin SHALL treat the project
as where it lives, so that listings in one project are served together.

#### Scenario: One file, opened on its own

- **WHEN** the user opens a single BASIC listing outside any project
- **THEN** it is served, rather than left unserved for want of a project

### Requirement: The user can name the machine and the command

The plugin SHALL let the user name the machine their listings are checked
against, and SHALL make that choice known to the server both as something it can
ask for and as something it is handed at startup, because the hosts differ in
which of the two they support.

The plugin SHALL let the user name how the server is started, so that a
toolchain installed somewhere unusual, or a working copy of it, can be used
without changing the plugin.

Both SHALL be settable before the plugin loads, the way that editor's settings
are given.

#### Scenario: A machine named in the user's configuration

- **WHEN** the user names a machine in their configuration and opens a listing
  that declares none
- **THEN** the listing is checked against the named machine

#### Scenario: A toolchain installed somewhere unusual

- **WHEN** the user names how the server is to be started
- **THEN** that is what is started, and the plugin does not fall back to
  looking for it elsewhere

### Requirement: The user is told how to colour what their colourscheme has no name for

Colour comes from the server as semantic tokens, and most of the kinds it reports
map to groups a user's colourscheme already has. The two that do not — a line
number and a machine's own graphics character — SHALL be documented with the
mapping a user needs, since nothing outside a BASIC listing calls for them.

A user who has not set those mappings SHALL still get every other kind of run
coloured; the unmapped ones SHALL be left plain rather than breaking the rest.

#### Scenario: A user who has set no mappings

- **WHEN** the user opens a listing without having mapped the two BASIC-only
  kinds
- **THEN** keywords, strings, numbers and comments are still coloured, and only
  those two runs are plain
