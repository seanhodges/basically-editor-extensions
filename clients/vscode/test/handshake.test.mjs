// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The extension's own resolution, driven against the server it will really
 * start — the check that the thing being shipped answers the protocol.
 *
 * This exists because the shape of the server is the easiest thing in this
 * repository to be wrong about: it is a Node program from npm, not a binary,
 * and a client that names the wrong command installs perfectly and then does
 * nothing. Every assertion here is about the server as packaged.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { LspClient } from './lspClient.mjs';

const clientDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const manifest = JSON.parse(
  readFileSync(path.join(clientDir, 'package.json'), 'utf8'),
);

// The compiled resolution, so the test starts the server the way the extension
// does rather than the way this file imagines it would.
const { argsFor, launchFor, locateServer } = await import(
  path.join(clientDir, 'out', 'server.js')
);

// Normally the bundled copy. `BASICALLY_SERVER_PATH` points the same
// conversation at a checkout of the toolchain, which is how a server that is
// not published yet gets checked against this client.
const launch = launchFor(
  locateServer(process.env.BASICALLY_SERVER_PATH ?? '', clientDir),
  {
    configuredNodePath: '',
    editorExecPath: process.execPath,
    editorNodeVersion: process.versions.node,
  },
);

const DECLARED = '#MACHINE zx81\n10 PRINT "HI\n20 GOTO 10\n';
const UNDECLARED = '10 PRINT "HI"\n';

describe('the bundled server', () => {
  let client;
  let capabilities;

  before(async () => {
    client = new LspClient(
      launch.command,
      argsFor(launch, 'lsp', '--stdio'),
      launch.runAsNode
        ? { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } }
        : {},
    );
    capabilities = (await client.initialize({})).capabilities;
  });

  after(async () => {
    await client?.stop();
  });

  it('is the version the manifest pins', (t) => {
    if (process.env.BASICALLY_SERVER_PATH) {
      t.skip('serving from BASICALLY_SERVER_PATH, not the bundled copy');
      return;
    }
    const packaged = JSON.parse(
      readFileSync(path.join(clientDir, 'server', 'package.json'), 'utf8'),
    );
    assert.equal(packaged.name, manifest.basically.server.package);
    assert.equal(packaged.version, manifest.basically.server.version);
  });

  it('offers every kind of help the client relies on', () => {
    assert.equal(capabilities.textDocumentSync, 1, 'full document sync');
    for (const provider of [
      'completionProvider',
      'hoverProvider',
      'definitionProvider',
      'documentSymbolProvider',
      'referencesProvider',
      'documentHighlightProvider',
    ]) {
      assert.ok(capabilities[provider], `no ${provider}`);
    }
  });

  it('names the two kinds of colour the manifest styles, if it serves colour', () => {
    // Colour arrives with the server, not with this client, so an older pinned
    // server simply has none. What must never happen is a server that serves
    // colour in kinds the manifest has no scope for, which would show as
    // uncoloured runs nobody could explain.
    const provider = capabilities.semanticTokensProvider;
    if (!provider) return;
    const styled = new Set(
      Object.keys(manifest.contributes.semanticTokenScopes[0].scopes),
    );
    const standard = new Set([
      'keyword',
      'function',
      'operator',
      'comment',
      'string',
      'number',
      'variable',
      'macro',
    ]);
    for (const type of provider.legend.tokenTypes) {
      assert.ok(
        standard.has(type) || styled.has(type),
        `the server serves "${type}" and the manifest gives it no scope`,
      );
    }
  });

  it('reports a problem in a listing that declares its machine', async () => {
    client.open('file:///declared.bas', DECLARED);
    const published = await client.waitFor(
      'textDocument/publishDiagnostics',
      (params) =>
        params.uri === 'file:///declared.bas' && params.diagnostics.length > 0,
    );
    assert.match(published.diagnostics[0].message, /string/i);
    assert.equal(published.diagnostics[0].range.start.line, 1);
  });

  it('explains a keyword where it is written', async () => {
    const hover = await client.request('textDocument/hover', {
      textDocument: { uri: 'file:///declared.bas' },
      position: { line: 2, character: 4 },
    });
    assert.match(hover.contents.value, /GOTO/);
  });

  it('says which setting to reach for when no machine can be told', async () => {
    client.open('file:///undeclared.bas', UNDECLARED);
    const published = await client.waitFor(
      'textDocument/publishDiagnostics',
      (params) =>
        params.uri === 'file:///undeclared.bas' &&
        params.diagnostics.length > 0,
    );
    // The message names the setting this extension contributes. If the two ever
    // part company the user is told to set something that does not exist.
    assert.match(published.diagnostics[0].message, /basically\.machine/);
    assert.ok(
      'basically.machine' in
        manifest.contributes.configuration.properties,
      'the extension does not contribute the setting the server names',
    );
  });
});
