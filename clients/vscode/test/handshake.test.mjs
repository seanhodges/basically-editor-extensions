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

const DECLARED_URI = 'file:///declared.bas';
const UNDECLARED_URI = 'file:///undeclared.bas';
/** A listing naming its machine, with an unterminated string on its second line. */
const DECLARED = '#MACHINE zx81\n10 PRINT "HI\n20 GOTO 10\n';
/** A listing several machines would read equally, so none can be inferred. */
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
    // Both listings are opened once here rather than by whichever test needs
    // one first: the server answers about open documents, and a test that
    // depends on an earlier test having opened its document breaks the moment
    // the two are reordered or one is run alone.
    client.open(DECLARED_URI, DECLARED);
    client.open(UNDECLARED_URI, UNDECLARED);
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

  it('serves colour for a whole program and for one range of it', () => {
    const provider = capabilities.semanticTokensProvider;
    assert.ok(provider, 'the server serves no colour');
    // Both, because the client relies on both: an editor showing one screen of
    // a long listing asks for the range rather than the whole.
    assert.ok(provider.full, 'no whole-program colour');
    assert.ok(provider.range, 'no per-range colour');
  });

  it('names no kind of colour the manifest has no scope for', () => {
    // The kinds a theme already colours need nothing from us. The two the
    // protocol has no word for - a line number and a graphics glyph - would
    // otherwise show as uncoloured runs nobody could explain, so the manifest
    // must carry a scope for every kind the server actually serves.
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
    const served = capabilities.semanticTokensProvider.legend.tokenTypes;
    for (const type of served) {
      assert.ok(
        standard.has(type) || styled.has(type),
        `the server serves "${type}" and the manifest gives it no scope`,
      );
    }
    // And the reverse: a scope for a kind no longer served is dead weight that
    // would quietly stop matching anything.
    for (const type of styled) {
      assert.ok(
        served.includes(type),
        `the manifest scopes "${type}" and the server serves no such kind`,
      );
    }
  });

  it('colours a listing by the machine it declares', async () => {
    const answer = await client.request('textDocument/semanticTokens/full', {
      textDocument: { uri: DECLARED_URI },
    });
    const types = capabilities.semanticTokensProvider.legend.tokenTypes;
    // The packed encoding, read back as the kinds it names.
    const kinds = [];
    for (let i = 0; i < answer.data.length; i += 5) {
      kinds.push(types[answer.data[i + 3]]);
    }
    assert.ok(kinds.includes('keyword'), 'no keyword coloured');
    assert.ok(
      kinds.includes('label'),
      'no line number coloured - a listing is all line numbers',
    );
    assert.equal(kinds[0], 'macro', 'the #MACHINE line is not a directive');
  });

  it('colours nothing in a listing it cannot bind to a machine', async () => {
    const answer = await client.request('textDocument/semanticTokens/full', {
      textDocument: { uri: UNDECLARED_URI },
    });
    assert.deepEqual(answer.data, [], 'coloured a listing with no machine');
  });

  it('reports a problem in a listing that declares its machine', async () => {
    const published = await client.waitFor(
      'textDocument/publishDiagnostics',
      (params) =>
        params.uri === DECLARED_URI && params.diagnostics.length > 0,
    );
    assert.match(published.diagnostics[0].message, /string/i);
    assert.equal(published.diagnostics[0].range.start.line, 1);
  });

  it('explains a keyword where it is written', async () => {
    const hover = await client.request('textDocument/hover', {
      textDocument: { uri: DECLARED_URI },
      position: { line: 2, character: 4 },
    });
    assert.match(hover.contents.value, /GOTO/);
  });

  it('says which setting to reach for when no machine can be told', async () => {
    const published = await client.waitFor(
      'textDocument/publishDiagnostics',
      (params) =>
        params.uri === UNDECLARED_URI && params.diagnostics.length > 0,
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
