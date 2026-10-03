import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const project = fileURLToPath(new URL('../', import.meta.url));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const fontSource = Object.freeze({
  name: 'liberation-fonts-1.07.4.tar.gz',
  url: 'https://releases.pagure.org/liberation-fonts/liberation-fonts-1.07.4.tar.gz',
  size: 2937949,
  sha256: 'ad98b7498dc2992f7f0868f79b65ce4a720a3acdb63ab3f1f1cb6881117a5406',
});

export function verifyFontSource(bytes) {
  if (bytes.length !== fontSource.size || sha256(bytes) !== fontSource.sha256)
    throw new Error('Liberation source archive does not match the audited upstream release.');
  return bytes;
}

async function readFontSource() {
  const cache = path.join(project, 'output', 'vendor-source', fontSource.name);
  try { return verifyFontSource(await fs.readFile(cache)); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  // Developer-side only. The packaged application never makes this request.
  const response = await fetch(fontSource.url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Font source download failed: HTTP ${response.status}`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > fontSource.size) throw new Error('Font source download exceeds its expected size.');
    chunks.push(chunk);
  }
  const bytes = verifyFontSource(Buffer.concat(chunks));
  await fs.mkdir(path.dirname(cache), { recursive: true });
  await fs.writeFile(cache, bytes);
  return bytes;
}

/** Resource names deliberately match the launcher's ASCII-only static route table. */
export async function collectBuildFiles(directory) {
  const files = [];
  async function visit(relative) {
    const absolute = path.join(directory, relative);
    const info = await fs.lstat(absolute);
    if (info.isSymbolicLink()) throw new Error(`Linked build inputs are not allowed: ${relative || '.'}`);
    if (relative && !/^[A-Za-z0-9._/-]+$/.test(relative))
      throw new Error(`Unsupported resource name: ${relative}`);
    if (info.isDirectory()) {
      for (const name of (await fs.readdir(absolute)).sort())
        await visit(relative ? `${relative}/${name}` : name);
    } else if (info.isFile()) files.push(relative);
    else throw new Error(`Unsupported build input: ${relative}`);
  }
  await visit('');
  if (!files.includes('index.html')) throw new Error('Build output must contain index.html. Run npm run build first.');
  return files;
}

const licenseInputs = [
  ['PDF.js', 'node_modules/pdfjs-dist/LICENSE'],
  ['PDF.js CMaps', 'node_modules/pdfjs-dist/cmaps/LICENSE'],
  ['PDF.js Foxit fonts', 'node_modules/pdfjs-dist/standard_fonts/LICENSE_FOXIT'],
  ['PDF.js Liberation fonts', 'node_modules/pdfjs-dist/standard_fonts/LICENSE_LIBERATION'],
  ['PDF.js QCMS wrapper', 'node_modules/pdfjs-dist/wasm/LICENSE_PDFJS_QCMS'],
  ['QCMS', 'node_modules/pdfjs-dist/wasm/LICENSE_QCMS'],
  ['PDF.js OpenJPEG wrapper', 'node_modules/pdfjs-dist/wasm/LICENSE_PDFJS_OPENJPEG'],
  ['OpenJPEG', 'node_modules/pdfjs-dist/wasm/LICENSE_OPENJPEG'],
  ['PDF.js JBIG2 wrapper', 'node_modules/pdfjs-dist/wasm/LICENSE_PDFJS_JBIG2'],
  ['JBIG2', 'node_modules/pdfjs-dist/wasm/LICENSE_JBIG2'],
  ['QuickJS', 'tools/windows/licenses/QuickJS-LICENSE.txt'],
  ['Mozilla QuickJS wrapper', 'tools/windows/licenses/PDFJS-QuickJS-LICENSE.txt'],
  ['pdf-lib', 'node_modules/pdf-lib/LICENSE.md'],
  ['pdf-lib standard fonts', 'node_modules/@pdf-lib/standard-fonts/LICENSE.md'],
  ['pdf-lib standard fonts attribution', 'node_modules/@pdf-lib/standard-fonts/README.md'],
  ['pdf-lib UPNG', 'node_modules/@pdf-lib/upng/LICENSE'],
  ['pako', 'node_modules/pako/LICENSE'],
  ['pako zlib port', 'node_modules/pako/lib/zlib/README'],
  ['tslib', 'node_modules/tslib/LICENSE.txt'],
  ['tslib copyright', 'node_modules/tslib/CopyrightNotice.txt'],
  ['docx', 'node_modules/docx/LICENSE'],
  ['fflate', 'node_modules/fflate/LICENSE'],
  ['hash.js', 'node_modules/hash.js/README.md'],
  ['inherits', 'node_modules/inherits/LICENSE'],
  ['minimalistic-assert', 'node_modules/minimalistic-assert/LICENSE'],
  ['JSZip (MIT option)', 'node_modules/jszip/LICENSE.markdown'],
  ['lie', 'node_modules/lie/license.md'],
  ['immediate', 'node_modules/immediate/LICENSE.txt'],
  ['readable-stream 2.3.8', 'node_modules/readable-stream/LICENSE'],
  ['core-util-is', 'node_modules/core-util-is/LICENSE'],
  ['isarray', 'node_modules/isarray/README.md'],
  ['process-nextick-args', 'node_modules/process-nextick-args/license.md'],
  ['safe-buffer', 'node_modules/safe-buffer/LICENSE'],
  ['string_decoder', 'node_modules/string_decoder/LICENSE'],
  ['util-deprecate', 'node_modules/util-deprecate/LICENSE'],
  ['setimmediate', 'node_modules/setimmediate/LICENSE.txt'],
  ['nanoid 6.0.1', 'node_modules/docx/node_modules/nanoid/LICENSE'],
  ['xml', 'node_modules/xml/LICENSE'],
  ['xml-js', 'node_modules/xml-js/LICENSE'],
  ['docx embedded browser libraries and provenance', 'tools/windows/licenses/sources.md'],
];

async function thirdPartyNotices() {
  const sections = [];
  for (const [name, relative] of licenseInputs) {
    const contents = await fs.readFile(path.join(project, relative), 'utf8');
    sections.push(`${name}\n${'='.repeat(name.length)}\nSource file: ${relative}\n\n${contents.trim()}\n`);
  }
  return `SlidePrune third-party notices\n\nThese components retain their original licenses.\nLiberation 1.07.4 corresponding source: third-party-sources/${fontSource.name}\nFoxit standard fonts: Copyright 2014 Foxit Software Incorporated.\n\n${sections.join('\n\n')}`;
}

function run(executable, args, cwd) {
  const result = spawnSync(executable, args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(executable)} failed:\n${result.stdout}\n${result.stderr}`);
}

export async function buildWindowsPackage() {
  if (process.platform !== 'win32') throw new Error('Build the Windows portable package on Windows.');
  const metadata = JSON.parse(await fs.readFile(path.join(project, 'package.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(metadata.version)) throw new Error('Invalid package version.');
  const dist = path.join(project, 'dist');
  const files = await collectBuildFiles(dist);
  const notices = await thirdPartyNotices();
  const sourceArchive = await readFontSource();
  const windows = process.env.SystemRoot || process.env.WINDIR || 'C:\\Windows';
  const candidates = ['Framework64', 'Framework'].map((folder) =>
    path.join(windows, 'Microsoft.NET', folder, 'v4.0.30319', 'csc.exe'));
  let compiler;
  for (const candidate of candidates) {
    try { await fs.access(candidate); compiler = candidate; break; } catch { /* Try the other installed architecture. */ }
  }
  if (!compiler) throw new Error('The installed .NET Framework C# compiler was not found.');
  const release = path.join(project, 'output', 'release');
  await fs.mkdir(release, { recursive: true });
  const build = await fs.mkdtemp(path.join(release, 'local-'));
  const name = `SlidePrune-${metadata.version}-windows`;
  const folder = path.join(build, name);
  await fs.mkdir(folder);
  const resourceHashes = {};
  for (const relative of files) {
    const bytes = await fs.readFile(path.join(dist, relative));
    const destination = path.join(build, 'assets', relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, bytes);
    resourceHashes[relative] = sha256(bytes);
  }
  const executable = path.join(folder, 'SlidePrune.exe');
  run(compiler, ['/nologo', '/target:exe', '/langversion:5', '/optimize+', '/platform:anycpu',
    `/out:${executable}`, path.join(project, 'tools', 'windows', 'SlidePrune.cs'),
    ...files.map((relative) => `/resource:assets/${relative},web/${relative}`)], build);
  await fs.copyFile(path.join(project, 'LICENSE'), path.join(folder, 'LICENSE.txt'));
  await fs.copyFile(path.join(project, 'tools', 'windows', 'START-HERE.txt'), path.join(folder, 'START-HERE.txt'));
  await fs.writeFile(path.join(folder, 'THIRD-PARTY-NOTICES.txt'), notices, 'utf8');
  await fs.copyFile(path.join(project, 'tools', 'windows', 'licenses', 'sources.md'), path.join(folder, 'THIRD-PARTY-SOURCES.md'));
  await fs.mkdir(path.join(folder, 'third-party-sources'));
  await fs.writeFile(path.join(folder, 'third-party-sources', fontSource.name), sourceArchive);
  await fs.writeFile(path.join(folder, 'build-manifest.json'), JSON.stringify({
    version: metadata.version,
    createdAt: new Date().toISOString(),
    executableSha256: sha256(await fs.readFile(executable)),
    launcherSourceSha256: sha256(await fs.readFile(path.join(project, 'tools/windows/SlidePrune.cs'))),
    thirdPartySources: [fontSource],
    resources: resourceHashes,
  }, null, 2));
  const zip = path.join(build, `${name}.zip`);
  run(path.join(windows, 'System32/WindowsPowerShell/v1.0/powershell.exe'), ['-NoLogo', '-NoProfile', '-NonInteractive',
    '-File', path.join(project, 'tools/windows/create-archive.ps1'),
    '-SourceFolder', folder, '-ZipPath', zip,
    '-FontSourceName', fontSource.name, '-FontSourceHash', fontSource.sha256], build);
  const checksum = sha256(await fs.readFile(zip));
  await fs.writeFile(path.join(build, 'SHA256SUMS.txt'), `${checksum}  ${path.basename(zip)}\n`);
  console.log(JSON.stringify({ executable, zip, checksum, resources: files.length }, null, 2));
  return { executable, zip, folder, checksum };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildWindowsPackage().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
