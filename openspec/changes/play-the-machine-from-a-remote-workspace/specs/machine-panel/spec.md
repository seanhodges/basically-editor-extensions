## ADDED Requirements

### Requirement: The panel works where the editor and the extension are apart

A user whose editor window and whose extension are on different computers SHALL
be able to run a listing and be shown its machine, and SHALL be able to type at
that machine, on the same terms as a user for whom both are on one computer.

The address the panel is shown from SHALL be carried to the window by the
editor's own means of reaching a service running beside the extension, and the
panel SHALL be shown from the address that arrives at the window rather than the
one the toolchain gave back, so that the machine is reachable from where it is
being watched.

Where an arrangement is not carried, the user SHALL be told so in the panel,
with what would work instead — rather than being shown an empty frame with
nothing to read.

#### Scenario: An editor window on another computer

- **WHEN** the user runs a listing with the extension running on one computer and
  the editor window on another
- **THEN** a panel shows that listing running on its machine, and what the user
  types reaches the machine

#### Scenario: An arrangement the client cannot carry

- **WHEN** the panel cannot be shown because the address cannot be reached from
  where the window is
- **THEN** the user is told that, and what arrangement would work instead
