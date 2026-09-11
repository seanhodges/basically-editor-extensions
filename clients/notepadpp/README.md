# Basically — Notepad++ client

Notepad++ has no first-party LSP support, so integration goes through one of
three routes. This directory holds the notes for whichever route we ship; no
build is wired into the root workspace yet.

## The server

Whichever route is taken, the server is the same one every other client here
starts — the Basically toolchain from npm:

```
npm install -g @ba.sical.ly/cli
basically lsp --stdio
```

It is a Node program (22 or newer), not an executable to bundle. Serving the
language needs no ROM: `basically lsp --stdio` boots no machine, so nothing here
has to obtain one. Running a machine is a different operation of the same
toolchain and does need them — that is what the VS Code client's panel asks the
user about — but a plugin that only speaks LSP never reaches it.

On Windows the install puts `basically.cmd` alongside `basically`; a plugin
spawning it directly should invoke `node` with
`%APPDATA%\npm\node_modules\@ba.sical.ly\cli\dist\cli.mjs`, because `.cmd`
launchers and pipes get along badly.

Whatever the route, the plugin's whole job is to spawn that command and speak
LSP over its stdio. There is no Notepad++-specific server, and nothing to build
in the core repository.

## Option A — PythonScript bridge (fastest to prototype)

[PythonScript](https://github.com/bruderstein/PythonScript) runs Python inside
Notepad++ and can speak JSON-RPC over a subprocess pipe.

1. Install PythonScript via _Plugins → Plugins Admin_.
2. Drop a `basically_lsp.py` into
   `%APPDATA%\Notepad++\plugins\Config\PythonScript\scripts\`.
3. The script should:
   - spawn the server with `subprocess.Popen(..., stdin=PIPE, stdout=PIPE)`,
   - frame messages with `Content-Length: <n>\r\n\r\n<body>` per the LSP spec,
   - send `initialize` with `initializationOptions: {"machine": "zx81"}` (or
     leave it out and rely on each listing's `#MACHINE` line), then
     `initialized`, then `textDocument/didOpen` on
     `NOTIFICATION.BUFFERACTIVATED`,
   - forward `textDocument/didChange` from `SCINTILLANOTIFICATION.MODIFIED`,
   - render `textDocument/publishDiagnostics` with Scintilla indicators
     (`editor.indicSetStyle` / `editor.indicatorFillRange`).
4. Register it as a startup script under _Plugins → PythonScript →
   Configuration_.

Trade-off: easy to iterate on, but every user must install PythonScript, and
completion/hover UI is limited to what Scintilla calltips provide.

## Option B — an existing LSP plugin

If an LSP-capable Notepad++ plugin is acceptable as a dependency, we ship only a
config fragment rather than code. Most take a shape close to:

```json
{
  "languages": {
    "basically": {
      "extensions": [".bas"],
      "command": ["basically", "lsp", "--stdio"],
      "rootPatterns": [".git"]
    }
  }
}
```

Placed in that plugin's config directory. Lowest maintenance for us, highest
setup burden for users.

## Option C — Native C++ plugin DLL (shipping target)

A real `BasicallyLsp.dll` built against the Notepad++ plugin API.

Skeleton layout to add here when we commit to it:

```
clients/notepadpp/
├── CMakeLists.txt          # x64 + x86 MSVC targets, /MT runtime
├── src/
│   ├── PluginDefinition.cpp  # setInfo, getFuncsArray, beNotified, messageProc
│   ├── DllMain.cpp
│   ├── LspClient.cpp         # stdio JSON-RPC transport to the server
│   └── Diagnostics.cpp       # Scintilla indicator rendering
└── include/
    └── npp/                  # PluginInterface.h, Scintilla.h from the Npp SDK
```

Notes:

- Notepad++ loads plugins from
  `%ProgramFiles%\Notepad++\plugins\BasicallyLsp\BasicallyLsp.dll`; the folder
  name **must** match the DLL name.
- Build both `x64` and `x86` — Notepad++ ships both architectures and will not
  load a mismatched DLL.
- Link statically (`/MT`) so no VC++ redistributable is required.
- The plugin still shells out to the Node server; it does not embed one.
  Distribute the DLL alone and tell users to install the toolchain, or detect a
  missing `basically` and say so.
- Submission to the Plugins Admin list needs a PR against
  [`nppPluginList`](https://github.com/notepad-plus-plus/nppPluginList).

## Status

Not yet implemented. Option A is the recommended starting point for validating
the server against Notepad++ before investing in Option C.
