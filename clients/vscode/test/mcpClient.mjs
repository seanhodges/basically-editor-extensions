// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * A minimal agent-protocol client: enough of it to hold a real conversation with
 * the server the extension tells the editor about, with no editor involved.
 *
 * It frames nothing the way `lspClient.mjs` does, and deliberately shares no
 * code with it. The language server delimits its messages by a declared length;
 * this one delimits them by a newline, and a reader that tried to be both would
 * be a third framing that nothing ships.
 */
import { spawn } from 'node:child_process';

export class McpClient {
  #child;
  #buffer = '';
  #nextId = 1;
  #pending = new Map();
  stderr = '';

  constructor(command, args, options = {}) {
    this.#child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options,
    });
    this.#child.stderr.setEncoding('utf8');
    this.#child.stderr.on('data', (chunk) => {
      this.stderr += chunk;
    });
    this.#child.stdout.setEncoding('utf8');
    this.#child.stdout.on('data', (chunk) => this.#receive(chunk));
    this.#child.on('exit', (code) => {
      // Nothing is coming, so a caller waiting on a reply is told why rather
      // than waiting out its timeout.
      for (const { reject } of this.#pending.values()) {
        reject(
          new Error(
            `the server exited with ${code} before answering; stderr was: ${
              this.stderr || '(empty)'
            }`,
          ),
        );
      }
      this.#pending.clear();
    });
  }

  #receive(chunk) {
    this.#buffer += chunk;
    for (;;) {
      const end = this.#buffer.indexOf('\n');
      if (end < 0) return;
      const line = this.#buffer.slice(0, end).trim();
      this.#buffer = this.#buffer.slice(end + 1);
      if (line) this.#dispatch(JSON.parse(line));
    }
  }

  #dispatch(message) {
    if (message.id === undefined || !this.#pending.has(message.id)) return;
    const { resolve, reject } = this.#pending.get(message.id);
    this.#pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  }

  #send(message) {
    this.#child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  request(method, params, timeoutMs = 30_000) {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(
          new Error(
            `timed out waiting for ${method}; stderr was: ${
              this.stderr || '(empty)'
            }`,
          ),
        );
      }, timeoutMs);
      const settle = (fn) => (value) => {
        clearTimeout(timer);
        fn(value);
      };
      this.#pending.set(id, {
        resolve: settle(resolve),
        reject: settle(reject),
      });
      this.#send({ jsonrpc: '2.0', id, method, params });
    });
  }

  notify(method, params) {
    this.#send({ jsonrpc: '2.0', method, params });
  }

  /** The opening exchange, after which the server will answer anything else. */
  async initialize() {
    const result = await this.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'basically-vscode-test', version: '1' },
    });
    this.notify('notifications/initialized', {});
    return result;
  }

  tools() {
    return this.request('tools/list', {});
  }

  call(name, args = {}) {
    return this.request('tools/call', { name, arguments: args });
  }

  async stop() {
    this.#child.kill();
    await new Promise((resolve) => this.#child.once('exit', resolve));
  }
}
