import { existsSync } from 'node:fs';
import * as path from 'node:path';

import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

const LANGUAGE_ID = 'basically';
const CLIENT_ID = 'basicallyLanguageServer';
const CLIENT_NAME = 'Basically Language Server';

/** Name of the core server binary as it is shipped in `executables/`. */
const SERVER_BINARY = process.platform === 'win32' ? 'lsp-server.exe' : 'lsp-server';

let client: LanguageClient | undefined;

/**
 * Resolve the server command, in order of precedence:
 *   1. `basically.server.path` from settings,
 *   2. the binary bundled in the extension's `executables/` directory,
 *   3. the bare binary name, letting the OS resolve it on PATH.
 */
function resolveServerCommand(context: vscode.ExtensionContext): string {
  const configured = vscode.workspace
    .getConfiguration(LANGUAGE_ID)
    .get<string>('server.path');

  if (configured && configured.trim().length > 0) {
    return configured.trim();
  }

  const bundled = context.asAbsolutePath(path.join('executables', SERVER_BINARY));
  if (existsSync(bundled)) {
    return bundled;
  }

  return SERVER_BINARY;
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const command = resolveServerCommand(context);
  const args = vscode.workspace
    .getConfiguration(LANGUAGE_ID)
    .get<string[]>('server.args', []);

  const serverOptions: ServerOptions = {
    run: { command, args, transport: TransportKind.stdio },
    debug: { command, args: [...args, '--log-level=debug'], transport: TransportKind.stdio }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: LANGUAGE_ID },
      { scheme: 'untitled', language: LANGUAGE_ID }
    ],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{bas,basically}')
    },
    outputChannelName: CLIENT_NAME
  };

  client = new LanguageClient(CLIENT_ID, CLIENT_NAME, serverOptions, clientOptions);
  context.subscriptions.push(client);

  try {
    await client.start();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(
      `Could not start ${CLIENT_NAME} using "${command}": ${detail}. ` +
        'Set "basically.server.path" to the location of the lsp-server binary.'
    );
  }
}

export async function deactivate(): Promise<void> {
  await client?.stop();
  client = undefined;
}
