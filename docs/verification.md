# Local verification — 2026-10-03

This records observed results for the local prototype. It does not establish product-market fit or superiority to other tools. This record covers development checks completed before the initial publication. External participant trials remain **0**; the checks below are developer verification, including original fixtures and independently authored public samples.

## Automated checks

- Latest application run for v0.3.1: `npm test` passes **156 tests**, including the reference-link regressions detailed below. These include mathematical-step retention, real formula/diagram PDF rendering and end-to-end exports, sequence playback, document exports, high-detail bounds, consecutive duplicate subchains, concurrent export caching, and shared handout resources. Earlier version-specific observations are retained below.
- `npm run test:package`: **5 passing packaging-input tests**, covering nested resources, missing entry document, unsupported route names, linked directories, and substituted font source bytes.
- `npm run test:windows -- <absolute EXE> <matching absolute assets directory>`: the previously packaged **0.2.0** executable passes **9 protocol/lifecycle subtests** (Node reports 10 including the parent test), including checks against all 67 embedded resources. This result does not verify a later package automatically.
- `npm run build`: TypeScript and the production bundle pass for the three-scenario work. PDF.js retains a lazy-loaded bundle over Vite's 500 kB advisory threshold. This is a size warning, not a failed build.
- npm dependency audit at installation: no known vulnerabilities reported. This is not a security audit.

## Document behavior

The original 12-page synthetic demo yields suggested kept pages **2, 5, 6, 7, 8, 9, 11, 12**. Exact copies and additive reveals are reduced; a disappearing orange mark and a changed number are retained. These are synthetic fixtures, not a representative accuracy benchmark.

- Actual browser PDF.js rendering and analysis produced the expected selection and 480 × 270 sample images.
- Export tests cover original order, duplicate selections, empty/invalid selections, notes/grid sheet counts, empty pages, rotations, and CropBox handling.
- Original-size slides contain 8 pages; the notes export contains 4 A4 sheets; the grid contains 2 A4 sheets.
- Poppler-rendered demo, notes, grid and rotation/CropBox samples were visually inspected. Exported source text remains extractable.
- A CJK fixture using an unembedded STSong font renders and extracts Chinese text; required CMaps are served locally.
- Password, 251-page and oversized input fixtures are rejected. Cancelling during rendering closes the worker and allows a fresh import. Five observed load workers closed after their work.
- A CropBox larger than the MediaBox initially exposed content outside the preview. The fix uses the effective intersection, with regression cases for partial overlap and disjoint/empty crop regions. Rendered notes/grid outputs contain no pixels from the synthetic hidden red mark. This is visual cropping, not secure redaction of content streams.
- PDFs with optional-content catalog settings are rejected for all export layouts; otherwise discarded layer visibility settings could reveal content absent from the preview.

## Interface checks

Production build served at `http://127.0.0.1:4173/` was exercised in the Codex in-app browser:

- Load the demo, inspect six groups, and observe 12 original / 8 kept / 4 excluded.
- Keep all changes the count to 12; Undo restores 8.
- Switch to the additive group, compare pages 4 and 5 side by side, and highlight their visual differences.
- Generate the real first-sheet notes preview, including the correct 1-of-4 footer, from the same bytes used for download.
- Import a synthetic invalid PDF; the error appears while the previous document and selection remain usable.
- Desktop 1280 × 900 and narrow 390 × 844 layouts were inspected. At 390px, document width equals viewport width; the group strip scrolls internally. Temporary viewport overrides were reset.
- Source inspection and the browser loader checks found no document upload endpoint or external resource requests during PDF processing. No original file is rewritten.

## Follow-up: readable review and full-render checks

Source previews now render the requested page from the PDF at up to 2200 × 3200 pixels. The demo's 16:9 source preview was observed at 2200 × 1238 pixels. Users can zoom and scroll, move between pages, jump to a page, and change the page selection within that view. Restoring source page 3 changed the demo selection from 8 to 9; Undo restored 8.

The new previews were exercised at 1280 × 900 and 390 × 844. At 390px, the document stayed 390px wide even when the zoomed image scrolled within its panel. Shift+Tab from Close wrapped to the modal's last enabled action. Ctrl+Z restored a source-page selection without leaving the preview. Browser error logs were empty at the end of these checks; this is a session observation, not exhaustive compatibility testing.

Handout previews now navigate every generated sheet. The demo's fourth notes sheet shows original pages 11 and 12 and the printed 4/4 footer. Jumping to sheet 4 and then rapidly navigating back to sheet 2 showed the matching image and original-page mapping. An out-of-range page entry returned to the current valid page. Escape and Close return keyboard focus to the opening control; the background is inert while a modal is open.

Two usability problems were found during interaction checks: finishing a render could replace an edited page-number field, and the changing modal height could move Close under the pointer. Async completion now updates only the image and enabled state, and the preview area reserves its height. The immediate open/close sequence was repeated successfully after these fixes.

An independent review found that rapid navigation during the first export could generate the whole PDF repeatedly. The export cache now shares the in-flight Promise for the same file/selection/layout. Four async tests verify sharing, changing keys, clearing, and retrying failures. Closing cancels rendering and ignores stale results; PDF generation already in progress may still finish once. `@napi-rs/canvas@1.0.10` is an explicit development dependency for real-render tests. A clean temporary installation using `npm ci` also passed the three PDF integration tests.

The low-resolution comparison bug was reproduced with a generated PDF containing a 0.2-point line shifted by 0.05 points. Its 480px samples are identical even though its 800px renders differ. Comparisons now run on the full 800px-wide / 1600px-high render before downsampling; only the previous full render is retained. Regression cases check both false duplicates and a false additive reveal. This still uses finite-resolution pixels and is not a proof of semantic equivalence.

### External sample and actual limit

The [official Beamer conference-talk example](https://mirrors.ibiblio.org/pub/mirrors/CTAN/macros/latex/contrib/beamer/doc/beamerexample-conference-talk.pdf) was downloaded only into ignored local verification storage. The [Beamer source project](https://github.com/josephwright/beamer) licenses its `doc` material under GFDL 1.3+ or LPPL 1.3c+. The PDF has 31 pages, 254,260 bytes, SHA-256 `0a3615a49571cf59629385b816e889b70460ea642dc4a1e4a5839e90cba5aafc`.

Actual browser analysis produced **31 kept, 0 excluded, 21 groups**. In particular, pages 7–12, 14–15, 18–19, 27–28 and 29–31 were grouped for review. Page 7 has a “no perfect phylogeny” explanation that disappears on page 8, and it was retained. Pages 27–28 add graphical edges and a legend but were also retained for review.

This is a **negative result for automatic page reduction on this template**. It supports using the comparison and manual selection workflow here, but does not establish a time saving. The synthetic 12→8 demo cannot be generalized to arbitrary Beamer courses. Additional real lecture formats and user task-completion evidence are needed before broad usefulness or competitive claims.

Further full-render inspection explains part of this conservatism: pages 27–28 overwrite 24 pixels belonging to old green node edges, in addition to adding content on the background. Pages 29–31 recolor earlier edges. The observed changes were not used to justify loosening the detector's old-foreground preservation rule.

### Independent text-overlay sample

The [abnTeX2 presentation template](https://mirrors.ibiblio.org/pub/mirrors/CTAN/macros/latex/contrib/abntex2/doc/examples/abntex2-modelo-slides.pdf), authored by Fábio Rodrigues Silva and distributed by the [abnTeX2 project](https://github.com/abntex/abntex2) under LPPL 1.3+, provides a second independently authored sample. The local PDF contains 13 physical pages, 254,976 bytes, SHA-256 `6d41f9ab4208147140e7ab0627f154a8963f5cf0f9cfb9415fa25919e0a89937`. Its source has two explicit `\\pause` steps for physical pages 4–6.

Both the real PDF.js/Canvas pipeline and the browser page served by the portable executable produced **13 original / 11 kept / 2 excluded**. The browser showed pages 4 and 5 excluded and page 6 kept; later topic and bibliography pages remained. This is a useful observed reduction on this sample, not a representative accuracy score. The original PDF and its screenshots remain in ignored local test storage.

Review groups now collapse strict consecutive duplicate subchains while retaining each distinct or uncertain state. The generated `100, 100, 101, 101` PDF was verified through both integration tests and the portable browser UI: pages **2 and 4** remain, preserving both numbers. Mixed build/change groups continue retaining their nonduplicate states. The localized explanation now says that different content states are retained and only consecutive exact repeats may be reduced.

## Windows portable local trial

### Shared-resource export regression

A new synthetic 40-page PDF shares one 600×600 RGB image across every page and adds distinct page text. The source is 1,091,567 bytes. The original handout loop called `embedPage` separately for each page, creating a separate object copier each time: notes grew to 43,264,516 bytes and grid to 43,254,201 bytes, each with 40 image objects. Both exceeded the PDF reader's 40 MiB limit, so a valid small input could produce an output that the app could not preview.

The exporter now embeds selected pages in one `embedPages` batch with their individual visible bounds. On the same sample, notes are **1,124,248 bytes / 20 sheets**, and grid **1,113,905 bytes / 10 sheets**, each with one image object. The two new regressions first failed on the old implementation, then passed along with the existing blank-page, crop, rotation, order and optional-layer checks. Source and output files plus byte/object counts are kept in ignored `output/pdfqa/shared-image*` files.

The newly packaged executable was checked in the in-app browser: 40 original/40 kept; notes sheet 20 contains original pages 39 and 40; grid sheet 10 contains pages 37–40. Both images and source text were visible, with correct output page footers and no browser errors. This verifies the reproduced case without changing the 40 MiB reader limit. Other unusual exports that grow beyond that limit still cannot be previewed in-app; that limit is now explicit in both READMEs.

### Package and protocol checks

The developer-side packager builds a C# 5 / .NET Framework console executable with the complete static app embedded as resources. Consumers do not need Node or npm. The launcher binds only `127.0.0.1` on an OS-assigned port and serves immutable app resources. It has no filesystem-serving, upload, proxy, or document-processing endpoint.

The final executable passed byte-for-byte GET and HEAD checks for all 65 resources, including the PDF worker, CMaps and fonts. Tests also cover concurrent loading, exact Host, method/body rejection, malformed and oversized requests, alternate/path-traversal attempts, the three-second header deadline, the 16-client limit, independent instances, and Enter/EOF shutdown releasing sockets. Its process listening address was inspected, rather than inferred solely from source.

The executable was copied to a path with Chinese characters and spaces and launched with PATH limited to Windows system directories. The actual in-app browser then checked its local origin: demo 12→8; generated notes sheet 4/4 with original pages 11 and 12; abnTeX2 13→11; numeric states 4→2; and a CJK PDF whose source preview rendered at 2200×1238 with readable Chinese text. Browser error logs were empty at the end. The temporary viewport override was reset.

The ZIP contains the executable, bilingual instructions, MIT project license, full third-party notices, provenance inventory, build manifest, and the original Liberation 1.07.4 font-source archive. The builder checks that archive against SHA-256 `ad98b7498dc2992f7f0868f79b65ce4a720a3acdb63ab3f1f1cb6881117a5406`. After compression it reads **every ZIP entry** back and compares its hash with the package file, including the font source. ZIP paths use `/`; an earlier Windows-backslash archive failed validation and is not the deliverable. No external lecture PDFs are packaged. This notice/source work is not represented as a blanket legal-compliance certification.

Build/test environment: Windows with .NET Framework 4.8.1. The consumer package is unsigned. Automatic opening in the default browser, Windows reputation prompts, real Ctrl+C input, and other machines/operating systems were not exercised. Browser testing used `--no-open` and opened the reported local URL explicitly. No system security or PowerShell execution settings were changed. The standard-browser download limit below still applies.

## Word and Markdown exports (0.2.0)

The application suite now passes 98 tests. The new checks cover actual OOXML editable Unicode text, XML escaping and invalid-control replacement, A4 page setup, source-page order, image relationships, blank-text notices, fixed Markdown ZIP paths, literal Markdown/HTML escaping, missing images and invalid selections. PDF.js integration checks exercise font changes within a word (`micro` + bold `scope`), separate baselines under a large number, and a selected-page PNG with a unique red marker. Existing PDF export, comparison, crop/rotation and optional-layer regressions still pass.

Document preparation renders only selected original pages, through one PDF worker, to PNG within 1280×1800 pixels. Tests cover text-only work without an image worker, image order, cleanup, cancellation between pages and cancellation from the final progress callback. Total PNG data is limited to 80 MiB. All three output formats share the encrypted/invalid/optional-layer PDF guard. Editable output is extracted text, not layout reconstruction, OCR or editable math. In particular, raised/lowered glyphs can be separated into different lines, and columns/reading order still require checking against the optional page images.

The actual application preparation/export modules generated an 8-section Word document from the demo's retained pages (2, 5, 6, 7, 8, 9, 11, 12), a text-only Word version, plain Markdown, and an image ZIP. Both Word versions render as 8 pages; all 16 pages were visually inspected, with full-size checks of pages 1, 2 and 8 from each. A separate 4-page rendering exercises Chinese text, a long section that flows across pages, and an image-only source section. The Chinese text and reference images are readable, with no overlapping or clipped content. Validation uses the installed LibreOffice 26.2.4.2 via the document renderer; Microsoft Word itself was not opened. Original diagrams in these Word/Markdown files are reference bitmaps. The demo DOCX, Markdown and ZIP are available under `docs/assets/`.

Browser checks covered the three format controls, Word images enabled by default, Markdown images disabled by default, independent options, correct `.docx`/`.md`/`.zip` download-link names, and preservation of the PDF notes layout. The PDF preview still renders actual output with original-page mapping. Desktop (1440 px) and narrow (390 px) views were inspected; the narrow document width equals the viewport's content width. In the final portable app, cancelling Word generation displayed the cancelled state without a new save link, and a subsequent export could be started again. Browser download persistence remains unconfirmed as described below.

The reviewed local Windows 0.2.0 ZIP includes the new runtime notices. It passes all five packaging-input checks and all nine launcher subtests (10 reported including the parent), including byte-for-byte checks for all 67 embedded resources. ZIP SHA-256: `16056a306e8e93728208031bfa2d1d89e9c49ef25a3a90b37457704fa3aeca16`. No upload or GitHub execution took place.

An independent spec review found that changing the interface language retained the previous language's completed document download. The language handler now revokes that URL and clears the old message. The browser regression generated Chinese Markdown, switched to English, observed zero old save links/messages, and generated a new English result. The 98 application tests and production build still pass. The standards review found no hard repository-rule violation and one optional worker-lifecycle duplication concern; that non-blocking refactor was deferred. The trial card, empty CSV and bug template now distinguish PDF, Word and Markdown, image options and opening software; these remain preparation, not participant evidence.

## Three study scenarios (0.3.0)

The start screen now offers original examples for progressive reveals, formula derivations and changing diagrams. Comparison still uses the existing bounded PDF rendering and extracted text. Mathematical notation is an additional conservative cue: distinct steps in the connected group are retained even when each new page only adds equations. Exact consecutive copies may still be excluded. A group with changing pixels and identical extracted text can receive the diagram-review cue. These labels do not establish semantic understanding or exhaustive recognition of every kind of formula or diagram.

Real PDF.js/Canvas integration tests exercise the original lessons through the production loading and analysis path:

| Original fixture | Pages | Suggested kept original pages | Observed comparison behavior |
| --- | --- | --- | --- |
| Existing mixed reveal lecture | 12 | 2, 5, 6, 7, 8, 9, 11, 12 | Existing duplicate/additive reductions remain; disappearing marks and replaced numbers remain. |
| Derivative of `x^2` | 6 | 1, 2, 3, 4, 6 | Five cumulative derivation states remain; page 5 is replaced by its exact copy on page 6. |
| Signal moving through a graph | 6 | 1, 2, 3, 4, 6 | Five distinct node/path states remain despite identical extracted text; only the final exact repetition is reduced. |

The formula fixture defines the difference quotient for nonzero `h`, expands and simplifies it, then takes the limit to obtain `2x`. The test checks the extracted final expression and the growing number of equation lines. Both new fixtures keep the same title/footer across stages, so a changing page number does not manufacture a difference. Their 6→5 result demonstrates the treatment of these fixtures only; it is not a general reduction ratio or accuracy score.

Analysis regressions cover extracted equations and mathematical symbols, cumulative formula steps, a formula cue appearing later in a connected group, strict duplicate subchains, and cached comparison results that conflict with current page evidence. The original reveal regression still expects 12→8. No OCR, symbolic math engine or model-based classification was added.

The sequence player has tests for its 1,400 ms interval, continuing from a middle page, restarting from the beginning when the current page is the last or absent, stopping without looping, empty/single-page input, cancellation without delayed steps, copying the caller's page list, replacing playback, and callbacks that stop or start another run. Playback visits the group's source pages, including excluded ones; it does not write the retained-page selection. The interface provides per-step navigation and whole-group keep/reset controls, with selection changes routed through the existing undo history.

The source selection remains shared across original-size, notes and grid PDFs, Word, and Markdown. Study cues and playback do not create a separate export selection. Formula preservation in a PDF is still source-page preservation; Word/Markdown still contain extracted text and optional page-image references, not editable mathematical equations. Their OCR, reading-order, image-size and fidelity limits remain those recorded for 0.2.0 above.

The production build and the 137-test application run passed during this work. This section records automated evidence and implemented behavior; it does not claim that the new interface, a newly packaged executable, or downloaded files have passed browser checks beyond the separately recorded observations. There are still no external participant results or measured task-completion improvements.

### Completed 0.3.0 browser and package checks

The final application suite passes **139 tests**. The two added export regressions follow actual formula and graph PDFs through loading, analysis, preparation and export. The retained pages 1, 2, 3, 4, 6 form three notes sheets with source mapping 2/2/1. Word and Markdown ZIPs each contain five source-page sections and five PNGs matching the prepared images byte for byte. Formula-stage text counts survive both text exports; pixel checks confirm five distinct graph activation states.

Browser checks used the local development server and then the packaged 0.3.0 executable:
- Three home cards load the matching original PDFs; reveal remains 12/8 and math/diagram are each 6/5.
- Group keep changes the reveal document from 8 to 10 while other groups keep their selections; group reset restores 8. Formula group keep gives 6, Undo restores 5.
- Playback reaches the final step and stops without changing the 5-page selection. Language changes pause playback. The control's document top remains 795.20 px from the first to last frame after fixing the switching-layout issue. First-frame comparisons explicitly label the starting reference page.
- The actual formula notes preview has three sheets; first-sheet source mapping is 1,2 and last-sheet mapping is 6. Diagram Word and image Markdown generation show their expected .docx and .zip save links. Browser file persistence remains unconfirmed below.
- Markdown images default on for a loaded document containing process cues; disabling them shows the formula/diagram visual-detail warning.
- Desktop 1440 px and narrow 390 px views were inspected. Narrow document content remains within the 375 px content area (15 px scrollbar); cards and review controls do not create horizontal page overflow. Temporary viewport overrides were reset. Portable-browser error logs were empty at the final check.

`npm run package:windows` produced `output/release/local-CK2jDX/SlidePrune-0.3.0-windows.zip` (5,821,346 bytes), SHA-256 `5c4476787d61816b0bc92f59de4f2172a70a7ac8aae74c22b3ed32184b0bba1e`. The five packaging tests and nine launcher subtests (ten including the parent) pass against all **68** embedded resources. The final executable was opened locally and its formula example verified. No external publication or participant trial took place.

## External study-sequence checks and reference-link fix (0.3.1)

The production PDF loading and analysis path was rerun against three independently authored PDFs on 2026-10-03. These are developer checks, not participant trials or a representative accuracy benchmark. Third-party PDFs and rendered evidence stay in ignored local storage and are not included in the application, repository assets or promotional materials.

| Sample | Physical pages | Suggested retained pages | Observed use |
| --- | --- | --- | --- |
| abnTeX2 text overlays, same SHA-256 recorded above | 13 | 11 | Pages 4–6 form a reveal group; 4 and 5 are excluded, 6 remains. |
| Official Beamer conference example, same SHA-256 recorded above | 31 | 31 | Graph changes remain available for comparison and manual review; no automatic page reduction. |
| IIT / Greg Fasshauer, *Differential Equations in MATLAB* | 82 | 82 | Pages 51–55 and 58–63 form separate derivation groups, retaining all five and six stages respectively. |

The IIT sample is linked by the author's [course handout page](https://math.iit.edu/~fass/100_handouts.html) to the [original PDF](https://math.iit.edu/~fass/Notes100_MATLAB6.pdf). The local copy is 880,889 bytes, SHA-256 `b443aff133a78b37a4eee34e82ae3b4a7eaa572f7758d87e48c008a2d94d99b1`. Its metadata identifies Beamer 3.20 and the lecture as Fall 2012. No explicit open redistribution license was found on the inspected source pages or PDF, so it is retained only as a local validation input.

Visual inspection confirms that pages 51–55 progress from a circular-orbit differential system through forward differences to update equations; all show printed frame 15. Pages 58–63 progress from falling-body acceleration through two integrations to a first-order system; all show printed frame 18. These are real content changes, not differences manufactured by changing page numbers. Page 53→54 also moves earlier equations. A separate 2× MuPDF render found no pixel-identical pair across the 82 pages. The 82→82 result supports process retention on this document; it does not demonstrate compression, correctness of the mathematics, or time savings.

This check exposed a 0.3.0 regression: ordinary reference links such as `<http://…>` could combine with surrounding prose into apparent comparisons (`m <h`, `t> (`). On abnTeX2 page 6 this promoted the entire pages 4–6 group to a derivation and changed 13→11 into 13→13. Mathematical-cue scanning now masks recognizable HTTP/HTTPS/FTP/www references and common email/mailto forms. The original text and pixels remain untouched for duplicate, text-retention and foreground-preservation comparisons. Equations beside links still trigger process retention. Broken-line or unusual reference syntax can still produce conservative false cues.

Seventeen original synthetic regressions were added; eight failed before the fix. All **156 application tests**, TypeScript checks, the production build, five packaging tests and nine launcher subtests (ten including the parent) pass. An independent focused review found no blocking issue. The three external samples also completed the actual loading/analysis path after the fix with the results above.

The local Windows 0.3.1 package is `output/release/local-byLKxz/SlidePrune-0.3.1-windows.zip`, 5,821,461 bytes, SHA-256 `7a126d73a75a6a759043f05b1779a9871c6d7835bd064d19358869eca973c5f9`. Its 68 embedded resources passed byte-for-byte protocol checks. No external publication or real-user trial took place.

The final executable was also exercised in the in-app browser. The abnTeX2 document showed 13 original / 11 retained / 2 excluded and a pages 4–6 reveal group. The IIT document showed 82/82 and the six retained stages 58–63; automatic playback reached step 6/6, stopped, and left 82 retained pages unchanged. Browser error logs were empty at the final check. This confirms these local UI interactions, not browser download persistence.

## Remaining verification limit

### Prepared repository checks

The locally prepared `.github/workflows/check.yml` covers Ubuntu/Windows and Node 22.13/24, plus a Windows portable-package protocol check. Workflow YAML was parsed/format-checked with the installed Prettier. The exact Windows PowerShell step was extracted from the workflow and executed locally: packaging completed and all nine launcher subtests passed (10 reported including the parent). GitHub-hosted execution, Linux and the Node 22.13 matrix entry remain unverified; no badge or hosted pass is claimed. The configuration uses only read permissions, revision-pinned official actions, and no deployment or artifact publishing step.

### Browser file delivery

The in-app browser displayed the generated Blob download link, but its download automation did not return a completed-download event or saved path. File delivery through that browser is therefore **not confirmed**. The app retains a visible Save file link; generated PDFs themselves were validated separately through the module and render checks above. Ordinary Chrome/Edge/Firefox download behavior still needs a manual compatibility check. This is not counted as a completed browser download test.

## Inspectable artifacts

- [Desktop review screenshot](assets/review.jpg)
- [Landing screenshot](assets/landing.jpg)
- [Navigable output preview screenshot](assets/export-preview.jpg)
- [High-detail source preview screenshot](assets/source-preview.jpg)
- [Portable app review screenshot](assets/portable-review.png)
- [Current handout preview](assets/current-handout.png)
- [Original synthetic lecture](assets/demo-lecture.pdf)
- [Generated notes handout](assets/demo-study-notes.pdf)

Additional disposable verification files are in the ignored `output/pdfqa/` and `output/uiqa/` directories. No private course files or third-party lecture material are included.
