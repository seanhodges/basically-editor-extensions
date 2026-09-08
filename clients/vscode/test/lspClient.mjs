// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * A minimal language-server client: enough of the protocol to hold a real
 * conversation with the server the extension will start, with no editor
 * involved.
 */
import { spawn } from 'node:child_process';

export class LspClient {
  #child;
  #buffer = Buffer.alloc(0);
  #nextId = 1;
  #pending = new Map();
  #notifications = [];
  #waiters = [];
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
    this.#child.stdout.on('data', (chunk) => this.#receive(chunk));
  }

  #receive(chunk) {
    this.#buffer = Buffer.concat([this.#buffer, chunk]);
    for (;;) {
      const headerEnd = this.#buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;
      const header = this.#buffer.subarray(0, headerEnd).toString('ascii');
      const length = Number(/content-length: *(\d+)/i.exec(header)?.[1]);
      if (!Number.isFinite(length)) {
        throw new Error(`no Content-Length in header: ${JSON.stringify(header)}`);
      }
      const bodyStart = headerEnd + 4;
      if (this.#buffer.length < bodyStart + length) return;
      const message = JSON.parse(
        this.#buffer.subarray(bodyStart, bodyStart + length).toString('utf8'),
      );
      this.#buffer = this.#buffer.subarray(bodyStart + length);
      this.#dispatch(message);
    }
  }

  #dispatch(message) {
    if (message.id !== undefined && this.#pending.has(message.id)) {
      const { resolve, reject } = this.#pending.get(message.id);
      this.#pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
      return;
    }
    if (message.method !== undefined && message.id === undefined) {
      this.#notifications.push(message);
      for (const waiter of this.#waiters.splice(0)) waiter();
    }
    // A server-to-client request (configuration, registration) is answered with
    // nothing: this client declares no capability that would make one useful.
    if (message.method !== undefined && message.id !== undefined) {
      this.#send({ jsonrpc: '2.0', id: message.id, result: null });
    }
  }

  #send(message) {
    const body = JSON.stringify(message);
    this.#child.stdin.write(
      `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`,
    );
  }

  request(method, params) {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#send({ jsonrpc: '2.0', id, method, params });
    });
  }

  notify(method, params) {
    this.#send({ jsonrpc: '2.0', method, params });
  }

  /** The first notification of `method` matching `predicate`, waited for. */
  async waitFor(method, predicate = () => true, timeoutMs = 15_000) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const found = this.#notifications.find(
        (m) => m.method === method && predicate(m.params),
      );
      if (found) return found.params;
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new Error(
          `timed out waiting for ${method}; stderr was: ${this.stderr || '(empty)'}`,
        );
      }
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, Math.min(remaining, 100));
        this.#waiters.push(() => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }

  async initialize(initializationOptions) {
    const result = await this.request('initialize', {
      processId: process.pid,
      rootUri: null,
      capabilities: {},
      initializationOptions,
    });
    this.notify('initialized', {});
    return result;
  }

  open(uri, text) {
    this.notify('textDocument/didOpen', {
      textDocument: { uri, languageId: 'basically', version: 1, text },
    });
  }

  async stop() {
    this.#child.kill();
    await new Promise((resolve) => this.#child.once('exit', resolve));
  }
}
