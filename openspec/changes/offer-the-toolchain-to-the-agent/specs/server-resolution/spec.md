## ADDED Requirements

### Requirement: An agent is served from the same server as the language

Where a client offers the toolchain to an agent, it SHALL offer the server it
found for the language: looked for in the same order, and run by the same
runtime, on the same terms. A user who pointed a client at a server of their own
SHALL NOT find their agent talking to a different one, because an agent that
answers from another toolchain than the one serving the listing would report
problems the editor does not show and run a machine the editor cannot.

Where a setting bearing on which server is found, or on what runs it, changes,
what the agent is offered SHALL be found again under the settings as they now
stand, rather than left as it was resolved.

What such a server can do SHALL be the agent's to ask of it, as running and
stepping are. A client SHALL NOT hold knowledge of its own about what a server
offers an agent, nor pass over the server the user pointed it at in favour of one
that offers more.

#### Scenario: A server the user pointed at

- **WHEN** the user has pointed a client at a server of their own, and their
  editor's agent is offered the toolchain
- **THEN** the server the user named is the one the agent is given

#### Scenario: The runtime that serves the language serves the agent

- **WHEN** a client has settled on a runtime to serve the language with, because
  it is the first new enough or the best there is
- **THEN** the agent's server is run by that same runtime, rather than by one
  chosen separately

#### Scenario: Pointing at a different server afterwards

- **WHEN** the user points the client at a different server after their agent has
  already been offered one
- **THEN** what the agent is offered is found again, and is the server now
  configured
