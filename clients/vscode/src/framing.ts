// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * `Content-Length`-framed JSON, the way the toolchain speaks over a pipe.
 *
 * Both conversations the client holds are framed this way — the language
 * server's and the operations one — so the framing lives here rather than in
 * either of them, and the tests drive this same code rather than a second
 * implementation of it that could pass while the shipped one was broken.
 */

/** Refuse a frame larger than the toolchain will ever send, rather than grow to it. */
export const MAX_FRAME_BYTES = 64 * 1024 * 1024;

/** As much header as may arrive before the blank line that ends it. */
const MAX_HEADER_BYTES = 8 * 1024;

const SEPARATOR = '\r\n\r\n';

export function encodeFrame(message: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  return Buffer.concat([
    Buffer.from(`Content-Length: ${body.length}${SEPARATOR}`, 'ascii'),
    body,
  ]);
}

/**
 * Chunks in, whole messages out.
 *
 * A pipe splits wherever it likes, so a chunk is neither one message nor a
 * whole one: what arrives is buffered until a frame is complete, and every
 * frame a chunk completed comes back together.
 */
export class FrameReader {
  #buffer = Buffer.alloc(0);
  #expected: number | null = null;

  push(chunk: Buffer): unknown[] {
    this.#buffer = Buffer.concat([this.#buffer, chunk]);
    const messages: unknown[] = [];
    for (;;) {
      if (this.#expected === null) {
        const end = this.#buffer.indexOf(SEPARATOR);
        if (end === -1) {
          if (this.#buffer.length > MAX_HEADER_BYTES) {
            throw new Error('no frame header arrived before the header limit');
          }
          return messages;
        }
        const header = this.#buffer.subarray(0, end).toString('ascii');
        const length = /Content-Length:\s*(\d+)/i.exec(header)?.[1];
        if (length === undefined) {
          throw new Error(`frame header has no length: ${JSON.stringify(header)}`);
        }
        const expected = Number(length);
        if (expected > MAX_FRAME_BYTES) {
          throw new Error(`frame of ${expected} bytes is over the limit`);
        }
        this.#expected = expected;
        this.#buffer = this.#buffer.subarray(end + SEPARATOR.length);
      }
      if (this.#buffer.length < this.#expected) return messages;
      const body = this.#buffer.subarray(0, this.#expected).toString('utf8');
      this.#buffer = this.#buffer.subarray(this.#expected);
      this.#expected = null;
      try {
        messages.push(JSON.parse(body));
      } catch {
        throw new Error('frame body is not JSON');
      }
    }
  }
}
