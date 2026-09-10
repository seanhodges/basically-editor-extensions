## MODIFIED Requirements

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
