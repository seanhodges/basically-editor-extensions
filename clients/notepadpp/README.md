# Basically — Notepad++ client

Notepad++ has no first-party LSP support, so integration goes through one of
three routes. This directory holds the notes and scaffolding for whichever route
we ship; no build is wired into the root workspace yet.

## Option A — PythonScript bridge (fastest to prototype)

[PythonScript](https://github.com/bruderstein/PythonScript) runs Python inside
Notepad++ and can speak JSON-RPC over a subprocess pipe.

1. Install PythonScript via *Plugins → Plugins Admin*.
2. Drop a `basically_lsp.py` into
   `%APPDATA%\Notepad++\plugins\Config\PythonScript\scripts\`.
3. The script should:
   - spawn `lsp-server.exe` with `subprocess.Popen(..., stdin=PIPE, stdout=PIPE)`,
   - frame messages with `Content-Length: <n>\r\n\r\n<body>` per the LSP spec,
   - send `initialize` / `initialized`, then `textDocument/didOpen` on
     `NOTIFICATION.BUFFERACTIVATED`,
   - forward `textDocument/didChange` from `SCINTILLANOTIFICATION.MODIFIED`,
   - render `textDocument/publishDiagnostics` with Scintilla indicators
     (`editor.indicSetStyle` / `editor.indicatorFillRange`).
4. Register it as a startup script under *Plugins → PythonScript → Configuration*.

Trade-off: easy to iterate on, but every user must install PythonScript, and
completion/hover UI is limited to what Scintilla calltips provide.

## Option B — NppLSP / existing LSP plugin

If an LSP-capable Notepad++ plugin (e.g. `NppLSP`) is acceptable as a
dependency, we ship only a config fragment rather than code:

```json
{
  "languages": {
    "basically": {
      "extensions": [".bas", ".basically"],
      "command": ["lsp-server.exe"],
      "rootPatterns": [".git", "basically.toml"]
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
│   ├── LspClient.cpp         # stdio JSON-RPC transport to lsp-server.exe
│   └── Diagnostics.cpp       # Scintilla indicator rendering
├── include/
│   └── npp/                  # PluginInterface.h, Scintilla.h from the Npp SDK
└── executables/
    └── lsp-server.exe        # downloaded by CI, not committed
```

Notes:

- Notepad++ loads plugins from `%ProgramFiles%\Notepad++\plugins\BasicallyLsp\BasicallyLsp.dll`;
  the folder name **must** match the DLL name.
- Build both `x64` and `x86` — Notepad++ ships both architectures and will not
  load a mismatched DLL.
- Link statically (`/MT`) so no VC++ redistributable is required.
- Distribute as a zip containing the DLL plus `executables/lsp-server.exe`;
  submission to the Plugins Admin list needs a PR against
  [`nppPluginList`](https://github.com/notepad-plus-plus/nppPluginList).

## Server binary

Whichever route is used, the server is the same `lsp-server.exe` produced by the
core repository. CI downloads it into `clients/notepadpp/executables/` at package
time — it is git-ignored, never committed.

## Status

Not yet implemented. Option A is the recommended starting point for validating
the server against Notepad++ before investing in Option C.
