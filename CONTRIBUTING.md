# Contributing to SlidePrune

Thanks for helping make lecture PDFs easier to review. Bug reports, small reproducible examples, documentation fixes, and focused code changes are welcome. English and 简体中文 are both welcome.

## Report a problem or suggest a change

Use the bug report or feature request template. For a suggestion error, identify the **original PDF page numbers** and which pages should stay. For an export error, include the output format (PDF, Word, or Markdown), original page number, and whether page images were included. For PDF, include the layout and affected output sheet; for Word or Markdown, include the application/version used to open the saved result.

Please do not post private lecture materials or PDFs you are not permitted to share. A small synthetic PDF, reproduction with the built-in demo, or a written description is enough to start. Check screenshots and logs before sharing. The JSON page report contains the **source filename**, page numbers, and selection details, even though it contains no PDF page content; remove identifying information first.

## Work on the code

Use Node.js **22.13 or later** and npm. From the project directory:

```sh
npm ci
npm run dev
```

Dependency installation needs internet access. Before proposing a code change, run:

```sh
npm test
npm run build
npm run test:package
```

Keep changes focused. Explain the problem, the resulting behavior, and what you checked. Add a small regression test when fixing comparison, PDF export, or launcher behavior. Use synthetic fixtures whenever possible and describe any third-party fixture's source and permission to redistribute it.

PDF processing should remain in the browser. Avoid adding external requests, telemetry, or uploaded document processing. For interface changes, check both English and Chinese and include a screenshot when it helps explain the result.

## Check the Windows portable package

On Windows with the .NET Framework C# compiler installed:

```sh
npm run package:windows
```

This builds a local package and prints its location. It may download the verified Liberation font source archive if that archive is not cached.

Run the launcher protocol tests with **two absolute paths**. Replace the placeholders below with the generated EXE and the matching `assets/` snapshot from that same build directory:

```sh
npm run test:windows -- "<absolute EXE path>" "<absolute matching assets directory>"
```

The asset snapshot is beside the generated application folder. Do not substitute a later `dist/` build: the tests compare every served resource with the exact files embedded in the EXE. These tests use `--no-open` and retain test copies under ignored `output/windows-qa/`.

Also check the affected workflow in a current desktop browser. State which checks you ran and any checks you could not run; protocol tests do not replace visual review or a real download check.

The local [check workflow](.github/workflows/check.yml) is prepared for Ubuntu and Windows on Node 22.13 and 24, with an additional Windows package check. It has not run on GitHub yet; there is no hosted CI result to claim. Its permissions are read-only and it does not publish packages or deploy the app. The pinned actions and configuration follow the official [checkout](https://github.com/actions/checkout) and [setup-node](https://github.com/actions/setup-node) documentation.
