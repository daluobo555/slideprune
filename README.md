# SlidePrune

Review progressive reveals, formula derivations and changing diagrams, then make a study handout locally in your browser.

[简体中文](README.zh-CN.md)

Try the new [Word document](docs/assets/demo-study-notes.docx), [Markdown text](docs/assets/demo-study-notes.md), or [Markdown image ZIP](docs/assets/demo-markdown.zip), generated from the original demo. [View the export panel](docs/assets/document-export.png).

A lecture PDF can contain a new page for every bullet, equation or animation step. SlidePrune compares adjacent pages, suggests which repetition to skip, and helps you inspect the steps worth keeping before exporting.

Export your reviewed selection as PDF, Word (`.docx`), or Markdown. Input remains PDF only.

**Status: local prototype, v0.3.1.** The name is provisional. No public deployment is provided in this checkout.

![SlidePrune 0.3.0: progressive reveals, formula derivations and changing diagrams](docs/assets/study-workflows.png)

The original synthetic demo goes from 12 pages to 8 selected pages. This is one demonstration, not an accuracy benchmark. The [earlier review screenshot](docs/assets/review.jpg) and [actual output preview](docs/assets/export-preview.jpg) illustrate the original PDF handout workflow.

Explore the [demo source PDF](docs/assets/demo-lecture.pdf) and [exported study notes](docs/assets/demo-study-notes.pdf).

## Three ways to review a lesson

| Scenario | Review behavior |
| --- | --- |
| Progressive reveals | Suggest a later complete page only when the earlier text and rendered foreground appear to remain; inspect the build before accepting the suggestion. |
| Formula derivations | Extracted mathematical notation is a cue to retain distinct steps across the connected group, including cumulative equations. Consecutive exact copies can still be reduced. |
| Changing diagrams | Inspect changes in paths, colours and states in source order. Changing pixels with identical extracted text can receive a diagram-review cue. |

Open the three original examples from the start screen. The formula lesson derives `d(x^2)/dx = 2x`; the diagram lesson follows a signal through two graph routes. Each new example contains five distinct states and an exact final copy: **6 pages → 5 kept**, retaining original pages **1, 2, 3, 4 and 6**. These are demonstrations of the workflow, not general detection results.

For groups with multiple pages, **Play steps** visits every source page in that group, including excluded pages, and stops at the last step. It never changes the export selection. Step buttons let you inspect a particular frame; **Keep every step** and **Restore group suggestions** apply only to the current group. Selection changes remain undoable.

These categories are text and image comparison cues, not an understanding of the lesson. A missed formula cue or an uncertain group still needs manual review. No OCR or mathematical reasoning is performed.

## Try it locally

### Windows portable ZIP

The project author can generate a portable ZIP for local trials; **it has not been publicly released**. If you have that locally built package, extract it and double-click `SlidePrune.exe`. It requires **.NET Framework 4.x** and a current desktop browser, but does not require Node.js. The launcher serves the app locally and is designed to open your default browser; automatic browser opening has not yet been verified.

Keep the package together: it includes third-party license notices and the original Liberation 1.07.4 font source archive alongside the executable. See the package's `START-HERE.txt` for launch instructions.

### Run from source

Use **Node.js 22.13 or later** and npm. In the project directory:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Choose a built-in scenario example to explore the workflow without a file, or select a PDF of up to **40 MiB and 250 pages**. No account, API key, or PDF processing backend is needed.

```sh
npm test
npm run build
npm run preview
```

`build` checks TypeScript and creates the static application in `dist/`; `preview` serves that build locally. Dependency installation needs internet access. The application loads its worker and font assets locally.

## Review, then export

1. Import a PDF or open a progressive-reveal, formula or diagram example.
2. Inspect the proposed groups and thumbnails. Play the source sequence or jump to a step. Compare a page with the preceding page in its group side by side, or highlight their visual differences. Open the enlarged source preview to inspect fine details and keep or exclude the page there.
3. Keep or exclude any page. Preserve a whole group with **Keep every step**, or use **Keep all** for the whole document. Group suggestions can be restored separately. **Undo** or **Ctrl/Cmd+Z** reverses selection changes.
4. Choose **PDF**, **Word**, or **Markdown**. For PDF, select a layout and use **Preview handout** to inspect any output sheet. For Word or Markdown, choose whether to include original page images.
5. Download the chosen format and check the saved file. You can also download a JSON decision report.

| PDF layout | Output |
| --- | --- |
| Slides | Selected pages at their original size, in original order |
| Notes | Two slides per A4 sheet with space for handwritten notes |
| Grid | Four slides per A4 sheet |

**Word** exports editable extracted text in a `.docx`, with original-page PNG references included by default. **Markdown** can export a plain `.md` or a ZIP containing `index.md` and an `images/` folder. A newly loaded document with formula or diagram cues defaults to Markdown images enabled. Turning images off displays a reminder that essential visual details may be missing. Keep the image folder beside `index.md` when opening or importing it.

All PDF layouts, Word and Markdown use the same reviewed page selection in original order. Playing a sequence or changing its study view does not silently add or remove export pages.

Word and Markdown organize the selected pages into sections labeled with their original page numbers. They do not recreate the slide layout or perform OCR. Check the extracted reading order and formulas; a reference image does not turn a formula into an editable equation. Pages without extractable text need images to retain their visible content. Attached PNGs preserve the page proportions within **1280 × 1800 pixels**, with an **80 MiB total image-data limit** per export. If exceeded, select fewer pages or turn off page images.

Enlarged previews render the requested page directly from the PDF, at up to **2200 × 3200 pixels** while preserving its proportions. Use **Zoom in** and scroll to inspect details. In source and PDF output previews, **← / →** moves between pages and **Escape** closes the preview; a page-number field also lets you jump directly to a page. Each output sheet lists its original page numbers.

Output preview is available **only for PDF** and is generated when requested. Preview and download reuse the same generated PDF while the file, layout, and page selection remain unchanged. Check Word and Markdown after downloading them. The app can request a browser download but cannot confirm that the browser saved it; check your downloads and the complete saved file.

English and simplified Chinese interfaces are included. The decision report records source page numbers and selection reasons so you can check how an export was assembled.

## What the suggestions mean

For imported PDFs, the detector verifies adjacent-page decisions using extracted text and full-page renders capped at **800 pixels wide and 1600 pixels high**. Smaller samples, up to 480 pixels wide, are retained for compact storage and change highlighting. Exact duplicates and verified additive reveals can be suggested for exclusion. When extracted mathematical notation is detected, distinct steps in that connected group are retained even if they are additive. Changed, disappearing, or uncertain content is retained for review. Repeated slides far apart are not globally deduplicated.

**Suggestions are heuristics, not a guarantee that no content will be lost.** Detection still uses a finite rendering resolution: small formula changes, low contrast graphics, unusual fonts, and complex animation sequences need careful review. The last animation frame is not always the complete slide. Review excluded pages in the detailed source preview and check the downloaded file before relying on it.

The [abnTeX2 text-reveal template](https://ctan.org/pkg/abntex2) went from **13 to 11 pages** in both real PDF.js rendering checks in Node and a browser check served by the Windows portable launcher: pages 4 and 5 were excluded, keeping the complete text build on page 6. In a browser check with Beamer's official conference example, **31 pages remained 31**: the changing text on pages 7–8 was preserved, but this template received **no automatic page reduction**. These two samples do not establish general accuracy; see the [verification record](docs/verification.md).

The source PDF is never overwritten. **PDF exports** copy or embed original PDF page content rather than exporting thumbnail images. Vector diagrams and formulas remain vector where they were vector in the source; raster scans remain raster. Interactive annotations, links, bookmarks, and other document features are not guaranteed to survive PDF reassembly. Word and Markdown use the extracted text and optional raster references described above.

## Privacy and limits

- PDF parsing, comparison, and export run in the browser. There is no document upload endpoint, telemetry, or external AI service.
- PDF bytes are held in memory for the current session; the application does not persist them to browser storage. Clearing the file or closing the page ends that session. Downloaded exports remain wherever you save them.
- Input is PDF only. Password-protected or corrupt files are rejected. PPTX, OCR, semantic summaries, batch folders, and PDF editing are outside this version.
- PDFs with optional content layers (OCG / `OCProperties`) can be viewed, but output preview and export are rejected in this version to prevent hidden layers from unexpectedly appearing in the output.
- The 40 MiB / 250-page limits bound typical work, but complex documents can still consume substantial memory. A current desktop browser is the intended environment.
- PDF output previews currently use the same 40 MiB PDF-reader limit. A PDF export that grows beyond it can still be generated, but cannot be previewed inside the app; review the saved file in a PDF viewer.
- Use files you are entitled to process. The bundled demo is generated for this project and contains no third-party lecture material.

## Development

| Module | Responsibility |
| --- | --- |
| `src/pdf.ts` | Bounded PDF loading, rendering, and text extraction with PDF.js |
| `src/analyze.ts` | Pure page comparison and conservative selection suggestions |
| `src/export.ts` | Original-page and vector PDF handout exports with pdf-lib |
| `src/document-export.ts` | Editable-text Word documents and Markdown files or image ZIPs |
| `src/demo.ts` | Synthetic lecture with duplicates, builds, and content changes |
| `src/study-demo.ts` | Original formula and diagram lessons, plus the existing reveal example |
| `src/study-ui.ts`, `src/study.css` | Scenario examples, study guidance and sequence controls |
| `src/sequence-player.ts` | Cancellable, single-pass source-page playback |
| `src/main.ts`, `src/i18n.ts`, `src/styles.css` | Review interface and language support |

To check packaging inputs and build the Windows portable ZIP:

```sh
npm run test:package
npm run package:windows
```

Package creation runs on Windows and uses the installed .NET Framework C# compiler. The command prints the generated package location. It includes the third-party notices and the verified Liberation font source archive; packaging may download that archive when it is not already cached. This creates a local artifact and does not publish it.

When reporting a problem, include the browser, reproduction steps, affected page numbers, and whether it concerns a suggestion or an export. Prefer a small synthetic reproduction; do not publish private or copyrighted course PDFs without permission.

See [Contributing](CONTRIBUTING.md) for reproducible checks and the information that helps diagnose a problem. English and Chinese reports are welcome.

See the [direction research](docs/research.md) and [verification record](docs/verification.md) for existing alternatives, observed results and limitations.

## License

[MIT](LICENSE), copyright 2026 SlidePrune contributors. Third-party dependencies retain their own licenses.
