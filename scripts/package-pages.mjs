import * as fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectBuildFiles, fontSource, readFontSource, thirdPartyNotices } from './package-windows.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Build a fresh, self-contained static distribution; never upload the checkout. */
export async function buildPagesPackage() {
  const dist = path.join(project, 'dist');
  const files = await collectBuildFiles(dist);
  const notices = await thirdPartyNotices();
  const source = await readFontSource();
  const parent = path.join(project, 'output', 'pages');
  await fs.mkdir(parent, { recursive: true });
  const folder = await fs.mkdtemp(path.join(parent, 'site-'));
  for (const relative of files) {
    const destination = path.join(folder, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(path.join(dist, relative), destination);
  }
  await fs.copyFile(path.join(project, 'LICENSE'), path.join(folder, 'LICENSE.txt'));
  await fs.writeFile(path.join(folder, 'THIRD-PARTY-NOTICES.txt'), notices);
  await fs.copyFile(path.join(project, 'tools/windows/licenses/sources.md'), path.join(folder, 'THIRD-PARTY-SOURCES.md'));
  await fs.mkdir(path.join(folder, 'third-party-sources'));
  await fs.writeFile(path.join(folder, 'third-party-sources', fontSource.name), source);
  await fs.writeFile(path.join(folder, 'credits.html'), `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SlidePrune — Licenses and source</title><style>body{max-width:760px;margin:60px auto;padding:0 24px;font:17px/1.7 system-ui;color:#183f32;background:#f6f4eb}a{color:inherit}</style>
<h1>SlidePrune</h1><p>PDF review and export run in your browser. This host serves the application files.</p>
<ul><li><a href="https://github.com/daluobo555/slideprune">Project source</a></li>
<li><a href="LICENSE.txt">Project MIT license</a></li>
<li><a href="THIRD-PARTY-NOTICES.txt">Third-party notices</a></li>
<li><a href="THIRD-PARTY-SOURCES.md">Third-party provenance</a></li>
<li><a href="third-party-sources/${fontSource.name}">Original Liberation font source</a></li></ul>
<p><a href="./">Open SlidePrune</a></p></html>\n`);
  const metadata = JSON.parse(await fs.readFile(path.join(project, 'package.json'), 'utf8'));
  const resources = {};
  for (const relative of await collectBuildFiles(folder))
    resources[relative] = sha256(await fs.readFile(path.join(folder, relative)));
  const commit = process.env.GITHUB_SHA;
  if (commit && !/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid GITHUB_SHA.');
  await fs.writeFile(path.join(folder, 'build-manifest.json'), JSON.stringify({
    version: metadata.version,
    sourceCommit: commit ?? null,
    thirdPartySources: [fontSource],
    resources,
  }, null, 2));
  return { folder, files: Object.keys(resources).length + 1 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildPagesPackage().then(async (result) => {
    if (process.env.GITHUB_OUTPUT)
      await fs.appendFile(process.env.GITHUB_OUTPUT, `folder=${result.folder}\n`);
    console.log(JSON.stringify(result, null, 2));
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
