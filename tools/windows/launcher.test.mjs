import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { copyFile, mkdir, mkdtemp, readdir, readFile } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const [executable, dist] = process.argv.slice(2);
assert.equal(process.platform, 'win32', 'This suite verifies the Windows executable.');
assert.ok(
  executable && path.isAbsolute(executable),
  'First argument must be an absolute EXE path.',
);
assert.ok(
  dist && path.isAbsolute(dist),
  'Second argument must be the matching absolute dist path.',
);
const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

async function start(exe, options = {}) {
  const child = spawn(exe, ['--no-open'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
    ...options,
  });
  let output = '';
  let errors = '';
  const exited = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  child.stderr.setEncoding('utf8').on('data', (chunk) => {
    errors += chunk;
  });
  const url = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Launcher did not report a URL: ${output} ${errors}`));
    }, 10000);
    child.stdout.setEncoding('utf8').on('data', (chunk) => {
      output += chunk;
      const match = output.match(/^SLIDEPRUNE_URL=(http:\/\/127\.0\.0\.1:\d+\/)\r?$/m);
      if (match) {
        clearTimeout(timeout);
        resolve(new URL(match[1]));
      }
    });
    exited.then(
      (result) => {
        clearTimeout(timeout);
        reject(new Error(`Launcher exited before readiness: ${JSON.stringify(result)} ${errors}`));
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
  return { child, url, exited, errors: () => errors };
}

function request(launcher, resource = '/', method = 'GET') {
  return new Promise((resolve, reject) => {
    const call = http.request(
      {
        hostname: launcher.url.hostname,
        port: launcher.url.port,
        path: resource,
        method,
        agent: false,
        timeout: 7000,
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('error', reject);
        response.on('end', () =>
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks),
          }),
        );
      },
    );
    call.on('timeout', () => call.destroy(new Error('HTTP request timed out')));
    call.on('error', reject);
    call.end();
  });
}

function raw(launcher, data, drip = false) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: launcher.url.hostname,
      port: Number(launcher.url.port),
    });
    const chunks = [];
    let interval;
    const timeout = setTimeout(() => socket.destroy(new Error('Raw request timed out')), 8000);
    socket.once('connect', () => {
      socket.write(data);
      if (drip) interval = setInterval(() => socket.write('x'), 250);
    });
    socket.on('data', (chunk) => chunks.push(chunk));
    socket.once('error', (error) => {
      if (!chunks.length) reject(error);
    });
    socket.once('close', () => {
      clearTimeout(timeout);
      clearInterval(interval);
      const response = Buffer.concat(chunks).toString('latin1');
      resolve({ status: Number(response.match(/^HTTP\/1\.1 (\d{3}) /)?.[1]), response });
    });
  });
}

async function files(directory, relative = '') {
  const result = [];
  for (const entry of await readdir(path.join(directory, relative), { withFileTypes: true })) {
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) result.push(...(await files(directory, name)));
    else if (entry.isFile()) result.push(name);
    else assert.fail(`Unexpected build entry: ${name}`);
  }
  return result;
}

async function stop(launcher, eof = false) {
  if (launcher.child.exitCode !== null || launcher.child.signalCode !== null) return;
  if (eof) launcher.child.stdin.end();
  else launcher.child.stdin.write('\n');
  const result = await Promise.race([
    launcher.exited,
    delay(5000).then(() => {
      throw new Error('Launcher did not stop');
    }),
  ]);
  assert.equal(result.code, 0, launcher.errors());
  await assert.rejects(request(launcher), /ECONNREFUSED|ECONNRESET|socket hang up/);
}

test('portable Windows launcher', { timeout: 60000 }, async (suite) => {
  const launchers = [];
  suite.after(async () => {
    for (const launcher of launchers) {
      if (launcher.child.exitCode === null && launcher.child.signalCode === null) {
        launcher.child.stdin.end();
        await Promise.race([launcher.exited, delay(1000)]);
        if (launcher.child.exitCode === null) launcher.child.kill();
      }
    }
  });
  const first = await start(executable);
  launchers.push(first);
  const builtFiles = await files(dist);
  const expectedTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.wasm': 'application/wasm',
    '.ttf': 'font/ttf',
    '.bcmap': 'application/octet-stream',
    '.pfb': 'application/octet-stream',
  };

  await suite.test('binds its listening socket exclusively to IPv4 loopback', () => {
    const netstat = spawnSync(
      path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'netstat.exe'),
      ['-ano', '-p', 'tcp'],
      { windowsHide: true, encoding: 'utf8' },
    );
    assert.equal(netstat.status, 0, netstat.stderr);
    const endpoints = netstat.stdout
      .split(/\r?\n/)
      .map((line) => line.trim().split(/\s+/))
      .filter((columns) => columns[0] === 'TCP' && columns.at(-1) === String(first.child.pid))
      .map((columns) => columns[1]);
    assert.deepEqual(endpoints, [first.url.host]);
  });

  await suite.test(
    'serves every embedded file byte for byte with correct MIME and HEAD',
    async () => {
      for (const name of builtFiles) {
        const resource = '/' + name.split(path.sep).join('/');
        const expected = await readFile(path.join(dist, name));
        const response = await request(first, resource);
        assert.equal(response.status, 200, resource);
        assert.deepEqual(response.body, expected, resource);
        assert.equal(Number(response.headers['content-length']), expected.length, resource);
        assert.equal(response.headers['x-content-type-options'], 'nosniff');
        assert.equal(response.headers['access-control-allow-origin'], undefined);
        const expectedType = expectedTypes[path.extname(name)];
        if (expectedType)
          assert.ok(response.headers['content-type'].startsWith(expectedType), resource);
        const head = await request(first, resource, 'HEAD');
        assert.equal(head.status, 200, resource);
        assert.equal(head.body.length, 0, resource);
        assert.equal(head.headers['content-length'], response.headers['content-length'], resource);
      }
      assert.deepEqual((await request(first)).body, await readFile(path.join(dist, 'index.html')));
      assert.equal((await request(first, '/index.html?local=1')).status, 200);
      assert.equal((await request(first, '/missing-file', 'HEAD')).body.length, 0);
    },
  );

  await suite.test('supports concurrent module and font requests', async () => {
    for (let offset = 0; offset < builtFiles.length; offset += 8) {
      const responses = await Promise.all(
        builtFiles
          .slice(offset, offset + 8)
          .map((name) => request(first, '/' + name.split(path.sep).join('/'))),
      );
      assert.ok(responses.every((response) => response.status === 200));
    }
  });

  await suite.test('rejects methods, hostile hosts, malformed requests, and bodies', async () => {
    const authority = first.url.host;
    const cases = [
      [`POST / HTTP/1.1\r\nHost: ${authority}\r\n\r\n`, 405],
      [`OPTIONS / HTTP/1.1\r\nHost: ${authority}\r\n\r\n`, 405],
      ['GET / HTTP/1.1\r\nHost: example.com\r\n\r\n', 403],
      ['GET / HTTP/1.1\r\n\r\n', 403],
      [`GET / HTTP/1.1\r\nHost: ${authority}\r\nHost: ${authority}\r\n\r\n`, 400],
      [`GET / HTTP/2.0\r\nHost: ${authority}\r\n\r\n`, 400],
      [`GET / HTTP/1.1\r\nHost: ${authority}\r\nBad Header: value\r\n\r\n`, 400],
      [`GET / HTTP/1.1\r\nHost: ${authority}\r\nContent-Length: 1\r\n\r\n`, 400],
      [`GET / HTTP/1.1\r\nHost: ${authority}\r\nTransfer-Encoding: chunked\r\n\r\n`, 400],
    ];
    for (const [data, status] of cases) assert.equal((await raw(first, data)).status, status, data);
    const response = await request(first, '/', 'POST');
    assert.equal(response.headers.allow, 'GET, HEAD');
  });

  await suite.test('never serves filesystem or alternate path requests', async () => {
    for (const target of [
      '/../README.md',
      '/assets/../../README.md',
      '/%2e%2e/README.md',
      '/%252e%252e/README.md',
      '/C:/Windows/win.ini',
      '/\\localhost/share/file',
      '/index.html:secret',
      '/%00',
      '//example.com/index.html',
      'http://example.com/index.html',
      '/.git/config',
      '/SlidePrune.exe',
    ]) {
      const response = await raw(
        first,
        `GET ${target} HTTP/1.1\r\nHost: ${first.url.host}\r\n\r\n`,
      );
      assert.ok([400, 404].includes(response.status), `${target}: ${response.status}`);
    }
    assert.equal(
      (await raw(first, `GET /${'x'.repeat(2049)} HTTP/1.1\r\nHost: ${first.url.host}\r\n\r\n`))
        .status,
      414,
    );
  });

  await suite.test(
    'bounds oversized headers and slow readers, including continuously arriving bytes',
    async () => {
      const prefix = `GET / HTTP/1.1\r\nHost: ${first.url.host}\r\nX-Large: `;
      assert.equal((await raw(first, prefix + 'x'.repeat(16384 - prefix.length))).status, 431);
      const began = Date.now();
      assert.equal((await raw(first, 'GET / HTTP/1.1\r\nX-Slow: ', true)).status, 408);
      assert.ok(
        Date.now() - began < 6500,
        'Header timeout must bound the whole read, not each chunk.',
      );
      assert.equal((await request(first)).status, 200);
    },
  );

  await suite.test('limits pending clients and recovers after they disconnect', async () => {
    const sockets = [];
    try {
      for (let index = 0; index < 24; index++) {
        const socket = net.createConnection({
          host: first.url.hostname,
          port: Number(first.url.port),
        });
        sockets.push(socket);
        socket.on('error', () => {});
        socket.resume();
        await once(socket, 'connect');
        socket.write('GET / HTTP/1.1\r\n');
      }
      await delay(200);
      assert.ok(
        sockets.some((socket) => socket.destroyed),
        'Connections beyond the cap must be closed.',
      );
    } finally {
      for (const socket of sockets) socket.destroy();
    }
    await delay(200);
    assert.equal((await request(first)).status, 200);
  });

  let second;
  await suite.test(
    'runs a second independent copy in a Chinese path with no Node on PATH',
    async () => {
      const qaRoot = path.join(projectRoot, 'output', 'windows-qa');
      await mkdir(qaRoot, { recursive: true });
      const directory = await mkdtemp(path.join(qaRoot, '中文 空格-'));
      const copiedExe = path.join(directory, 'SlidePrune 本地.exe');
      await copyFile(executable, copiedExe);
      const windows = process.env.SystemRoot ?? 'C:\\Windows';
      const environment = { ...process.env };
      for (const key of Object.keys(environment))
        if (key.toLowerCase() === 'path') delete environment[key];
      environment.Path = [
        path.join(windows, 'System32'),
        windows,
        path.join(windows, 'System32', 'WindowsPowerShell', 'v1.0'),
      ].join(';');
      const where = spawnSync(path.join(windows, 'System32', 'where.exe'), ['node.exe'], {
        env: environment,
        cwd: directory,
        windowsHide: true,
        encoding: 'utf8',
      });
      assert.equal(where.status, 1, `Node unexpectedly found in test environment: ${where.stdout}`);
      second = await start(copiedExe, { cwd: directory, env: environment });
      launchers.push(second);
      assert.notEqual(second.url.port, first.url.port);
      assert.deepEqual((await request(second)).body, await readFile(path.join(dist, 'index.html')));
      console.log(`Portable copy retained at ${copiedExe}`);
    },
  );

  await suite.test(
    'Enter closes active clients and releases the port; EOF stops the other instance',
    async () => {
      const pending = net.createConnection({
        host: first.url.hostname,
        port: Number(first.url.port),
      });
      pending.on('error', () => {});
      await once(pending, 'connect');
      pending.write('GET / HTTP/1.1\r\n');
      const closed = once(pending, 'close');
      await stop(first);
      await closed;
      assert.equal((await request(second)).status, 200);
      await stop(second, true);
    },
  );
});
