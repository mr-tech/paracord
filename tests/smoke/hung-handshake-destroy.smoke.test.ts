import { describe, it, expect } from 'vitest';
import { execFile } from 'child_process';
import path from 'path';

const fixture = path.join(__dirname, '..', 'fixtures', 'handshakeDestroy.cjs');

function run(variant: string): Promise<{ code: number | null, stdout: string, stderr: string }> {
  return new Promise((resolve) => {
    execFile('node', [fixture, variant], (error, stdout, stderr) => {
      const code = error && typeof (error as NodeJS.ErrnoException & { code?: number }).code === 'number'
        ? (error as NodeJS.ErrnoException & { code?: number }).code as number
        : (error ? 1 : 0);
      resolve({ code, stdout, stderr });
    });
  });
}

describe('AC-0.4(c): destroy() on a CONNECTING socket crashes the process', () => {
  it('as-library: removeAllListeners() then terminate() exits non-zero with the A-1.7 error', async () => {
    const { code, stderr } = await run('as-library');
    expect(code).not.toBe(0);
    expect(stderr).toContain('WebSocket was closed before the connection was established');
  });

  it('guarded: an error listener attached before terminate() survives (mechanism control)', async () => {
    const { code, stdout } = await run('guarded');
    expect(code).toBe(0);
    expect(stdout).toContain('SURVIVED');
  });
});
