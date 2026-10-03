import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectBuildFiles, verifyFontSource } from './package-windows.mjs';

const fixtures = fileURLToPath(new URL('../output/package-input-tests/', import.meta.url));
await fs.mkdir(fixtures, { recursive: true });
const fixture = () => fs.mkdtemp(path.join(fixtures, 'case-'));

test('enumerates every nested resource in stable route order', async () => {
  const folder = await fixture();
  await fs.mkdir(path.join(folder, 'assets'));
  await fs.writeFile(path.join(folder, 'index.html'), '<html></html>');
  await fs.writeFile(path.join(folder, 'assets', 'worker-abc.mjs'), 'worker');
  await fs.writeFile(path.join(folder, 'assets', 'font-123.ttf'), 'font');
  assert.deepEqual(await collectBuildFiles(folder), [
    'assets/font-123.ttf', 'assets/worker-abc.mjs', 'index.html',
  ]);
});

test('refuses incomplete builds without their entry document', async () => {
  await assert.rejects(collectBuildFiles(await fixture()), /must contain index.html/);
});

test('refuses resource names that the server cannot route', async () => {
  const folder = await fixture();
  await fs.writeFile(path.join(folder, 'index.html'), '');
  await fs.writeFile(path.join(folder, 'bad name.js'), '');
  await assert.rejects(collectBuildFiles(folder), /Unsupported resource name/);
});

test('refuses a junction or symlink rather than following external assets', async () => {
  const folder = await fixture();
  const outside = await fixture();
  await fs.writeFile(path.join(folder, 'index.html'), '');
  await fs.writeFile(path.join(outside, 'secret.txt'), 'fixture');
  await fs.symlink(outside, path.join(folder, 'assets'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(collectBuildFiles(folder), /Linked build inputs/);
});

test('rejects a substituted source archive before packaging', () => {
  assert.throws(() => verifyFontSource(Buffer.from('not the official font sources')), /does not match/);
});
