## ADDED Requirements

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
