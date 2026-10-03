import { describe, expect, it, vi } from 'vitest';
import { ExportCache } from './export-cache';

function deferred() {
  let resolve!: (bytes: Uint8Array) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Uint8Array>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('export cache', () => {
  it('shares pending work and reuses the completed bytes for the same key', async () => {
    const cache = new ExportCache();
    const pending = deferred();
    const create = vi.fn(() => pending.promise);
    const first = cache.get('slides:1,2', create);
    expect(cache.get('slides:1,2', create)).toBe(first);
    await Promise.resolve();
    expect(create).toHaveBeenCalledOnce();
    const bytes = new Uint8Array([1, 2]);
    pending.resolve(bytes);
    expect(await first).toBe(bytes);
    expect(cache.get('slides:1,2', create)).toBe(first);
    expect(await cache.get('slides:1,2', create)).toBe(bytes);
    expect(create).toHaveBeenCalledOnce();
  });

  it('does not let an older key overwrite the current completed export', async () => {
    const cache = new ExportCache();
    const old = deferred();
    const current = deferred();
    const first = cache.get('slides', () => old.promise);
    const second = cache.get('notes', () => current.promise);
    const bytes = new Uint8Array([2]);
    current.resolve(bytes);
    await second;
    old.resolve(new Uint8Array([1]));
    await first;
    const create = vi.fn(async () => new Uint8Array([3]));
    expect(cache.get('notes', create)).toBe(second);
    expect(await cache.get('notes', create)).toBe(bytes);
    expect(create).not.toHaveBeenCalled();
  });

  it('clears pending or completed work without letting an old failure evict its replacement', async () => {
    const cache = new ExportCache();
    const old = deferred();
    const first = cache.get('slides', () => old.promise);
    const failed = expect(first).rejects.toThrow('old failure');
    cache.clear();
    const bytes = new Uint8Array([2]);
    const create = vi.fn(async () => bytes);
    const replacement = cache.get('slides', create);
    expect(replacement).not.toBe(first);
    await replacement;
    old.reject(new Error('old failure'));
    await failed;
    expect(cache.get('slides', create)).toBe(replacement);
    cache.clear();
    expect(cache.get('slides', create)).not.toBe(replacement);
    expect(await cache.get('slides', create)).toBe(bytes);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('retries after a rejected factory or a synchronous factory error', async () => {
    const cache = new ExportCache();
    await expect(
      cache.get('slides', async () => {
        throw new Error('export failed');
      }),
    ).rejects.toThrow('export failed');
    await expect(
      cache.get('slides', () => {
        throw new Error('factory failed');
      }),
    ).rejects.toThrow('factory failed');
    const bytes = new Uint8Array([3]);
    const create = vi.fn(async () => bytes);
    expect(await cache.get('slides', create)).toBe(bytes);
    expect(await cache.get('slides', create)).toBe(bytes);
    expect(create).toHaveBeenCalledOnce();
  });
});
