# Runtime license sources

Audited locally on 2026-10-03 against the installed packages below. This inventory records upstream notices and the local files to preserve; it is not a conclusion that a future public distribution has met every license obligation. The separately recorded Liberation source archive is stored under ignored `output/vendor-source/`; no source files or test PDFs were extracted into this directory.

## Supplementary QuickJS notices

`pdfjs-dist` 6.3.289 includes `wasm/quickjs-eval.js` and `wasm/quickjs-eval.wasm`, but its installed `wasm` directory has no QuickJS license file. The two adjacent license files fill that notice gap, without modifying their upstream text.

| Local notice | Official, revision-pinned source | SHA-256 of saved notice |
| --- | --- | --- |
| `QuickJS-LICENSE.txt` | [Bellard QuickJS LICENSE at 3d5e064e9dd67c70f7962836505a7fa067bf0a4e](https://raw.githubusercontent.com/bellard/quickjs/3d5e064e9dd67c70f7962836505a7fa067bf0a4e/LICENSE) | `598FD7FC928E4350ABCE36E337BA5A1346923C5C692F5BE92C3D8E29DDD7C18D` |
| `PDFJS-QuickJS-LICENSE.txt` | [Mozilla wrapper LICENSE at e2c5bfc8194b16f5973eea5e4e025b67be3c1015](https://raw.githubusercontent.com/mozilla/pdf.js.quickjs/e2c5bfc8194b16f5973eea5e4e025b67be3c1015/LICENSE) | `7FDAED3D938F3DFCE7189DB07E74773C23789143A55DB81A95D09DCBFDA267B0` |

Evidence for the attribution chain:

- [PDF.js v6.3.289 external/quickjs README](https://github.com/mozilla/pdf.js/blob/v6.3.289/external/quickjs/README.md) identifies Bellard QuickJS and `mozilla/pdf.js.quickjs`, and says the generated JavaScript is MIT licensed.
- [Mozilla wrapper Dockerfile at e2c5bfc](https://github.com/mozilla/pdf.js.quickjs/blob/e2c5bfc8194b16f5973eea5e4e025b67be3c1015/Dockerfile) points to `bellard/quickjs` commit `3d5e064e9dd67c70f7962836505a7fa067bf0a4e`. This is Bellard QuickJS, not quickjs-ng.
- The engine notice names Fabrice Bellard and Charlie Gordon, 2017-2021. The wrapper notice names Mozilla Foundation, 2026. Preserve both.
- This source audit identifies the documented build chain; it does not claim a fresh reproducible build of the shipped WASM.

Installed asset hashes:

| `node_modules/pdfjs-dist/wasm/` file | SHA-256 |
| --- | --- |
| `quickjs-eval.js` | `FE7930418E869791CE892567DBD0BC4698152B7E550B5CEFA553992C56DDC325` |
| `quickjs-eval.wasm` | `7BCACC9F22CACF7E9B23866D2A6D1639693D40C7F144E41B7C69ED37BA9CBE8F` |

## Notice files to carry with the runtime package

Paths below are relative to the repository's `node_modules/`. Copy the complete upstream texts, including their copyright notices, into the portable package's accessible third-party notices. An MIT label alone is not a replacement for the text.

| Shipped component | Installed version / license | Notice source to preserve |
| --- | --- | --- |
| pdf-lib | 1.17.1 / MIT | `pdf-lib/LICENSE.md` (Andrew Dillon, 2019) |
| @pdf-lib/standard-fonts | 1.0.0 / MIT | `@pdf-lib/standard-fonts/LICENSE.md` (Andrew Dillon, 2018), plus the original-repository attribution in `@pdf-lib/standard-fonts/README.md`: Copyright 2015-2018 Christopher Brown, MIT, https://chbrown.github.io/licenses/MIT/#2015-2018 |
| @pdf-lib/upng | 1.0.1 / MIT | `@pdf-lib/upng/LICENSE` (Photopea, 2017) |
| pako | 1.0.11 / MIT AND Zlib | Both `pako/LICENSE` and `pako/lib/zlib/README`; the latter contains the zlib notice and Gailly/Adler/Puzrin/Tupitsin attribution. Do not report this dependency as MIT only. |
| tslib | 1.14.1 / 0BSD | `tslib/LICENSE.txt`; also retain `tslib/CopyrightNotice.txt` if collecting bundled notices. The latter repeats the Microsoft notice. |
| PDF.js main code and worker | pdfjs-dist 6.3.289 / Apache-2.0 | `pdfjs-dist/LICENSE`, and preserve the Mozilla Foundation copyright notices in the bundled main/worker headers. Their current header names 2024. No separate package-level NOTICE file was found in this installed package. |
| Adobe CMaps | From pdfjs-dist 6.3.289 / BSD-style, 3 clauses | `pdfjs-dist/cmaps/LICENSE` (Adobe Systems, 1990-2009) |
| Foxit/PDFium standard fonts | From pdfjs-dist 6.3.289 / BSD-style, 3 clauses | `pdfjs-dist/standard_fonts/LICENSE_FOXIT`. The [versioned upstream README](https://github.com/mozilla/pdf.js/blob/v6.3.289/external/standard_fonts/README.md) also records original Foxit Software copyright 2014; retain that attribution. |
| Liberation Sans standard fonts | 1.07.4 / GPLv2 with Liberation font exception | Complete `pdfjs-dist/standard_fonts/LICENSE_LIBERATION`, including its GPLv2 text. See the source archive and distribution arrangement below. |
| OpenJPEG and Mozilla wrapper | From pdfjs-dist 6.3.289 / BSD-2-Clause notices | Both `pdfjs-dist/wasm/LICENSE_OPENJPEG` and `pdfjs-dist/wasm/LICENSE_PDFJS_OPENJPEG` |
| qcms and Mozilla wrapper | From pdfjs-dist 6.3.289 / MIT notices | Both `pdfjs-dist/wasm/LICENSE_QCMS` and `pdfjs-dist/wasm/LICENSE_PDFJS_QCMS` |
| JBIG2 decoder and Mozilla wrapper | From pdfjs-dist 6.3.289 / BSD and Apache notices | Both `pdfjs-dist/wasm/LICENSE_JBIG2` and `pdfjs-dist/wasm/LICENSE_PDFJS_JBIG2`. `LICENSE_JBIG2` contains multiple notices; copy it in full. |
| QuickJS and Mozilla wrapper | MIT | Both supplementary `.txt` files in this directory |

The app's asset glob currently covers `cmaps`, `standard_fonts`, and `wasm`, so it includes those resource families even if a particular PDF does not use them. If `pdfjs-dist/iccs` is added to the package later, also preserve its `LICENSE` (CC0 1.0). The present glob does not include `iccs`.

This browser-runtime inventory does not cover a separately bundled Node.js/.NET runtime, a native canvas binary, or another added executable. If a packaging change starts shipping one, inventory its own notices separately. Development-only packages are not runtime components merely because they occur in `node_modules`.

## Liberation source archive and distribution arrangement

[Mozilla's versioned standard_fonts README](https://github.com/mozilla/pdf.js/blob/v6.3.289/external/standard_fonts/README.md) explicitly identifies the shipped TTF files as the unmodified Liberation Sans **1.07.4** upstream release. It distinguishes them from OFL-licensed Liberation 2.0+. Do not substitute the current Liberation project's OFL license for these bytes.

The existing license's document-embedding exception concerns documents using the font. It does not, by itself, establish that putting the font in a distributed EXE satisfies the source-provision terms for the font software. The supplied GPLv2 text has separate executable/object-code distribution and corresponding-source provisions in section 3.

The [official historical release directory](https://releases.pagure.org/liberation-fonts/) lists both of these distinct files:

- Source archive: https://releases.pagure.org/liberation-fonts/liberation-fonts-1.07.4.tar.gz
- TTF archive: https://releases.pagure.org/liberation-fonts/liberation-fonts-ttf-1.07.4.tar.gz

The source archive was downloaded unchanged from the first URL on 2026-10-03 and retained locally as `output/vendor-source/liberation-fonts-1.07.4.tar.gz` (ignored by Git).

| Source archive property | Observed value |
| --- | --- |
| Bytes | 2,937,949 |
| SHA-256 | `AD98B7498DC2992F7F0868F79B65CE4A720A3ACDB63AB3F1F1CB6881117A5406` |
| Actual format | gzip magic `1F 8B`; successfully listed/read as a tar archive |
| Top-level directory | `liberation-fonts-1.07.4/` |
| Contents | 29 entries, including 16 `src/*.sfd` FontForge source files, `Makefile`, three conversion/build scripts, `README`, `License.txt`, `COPYING`, `AUTHORS`, `ChangeLog`, and `TODO`; no `.ttf` files |

Read-only inspection used `tar -tf` and `tar -xOf` for named members. No archive member was extracted onto the filesystem, and no script, Makefile target, or font build was executed.

- `README` describes building fonts from source with FontForge and identifies GPLv2 with exceptions, directing readers to `COPYING` and `License.txt`.
- `Makefile` sets `VER = 1.07.4`; the first `ChangeLog` entry is also for 1.07.4.
- All four `src/LiberationSans-{Regular,Bold,Italic,BoldItalic}.sfd` files identify version 1.07.4. These are the editable sources for the same family/styles that Mozilla identifies in its shipped fonts.
- `COPYING` contains GNU GPL version 2, June 1991; `License.txt` contains the Red Hat Liberation font agreement and exceptions. After normalizing line endings, both complete texts occur in the installed PDF.js `LICENSE_LIBERATION` notice.

Packaging arrangement: retain the archive unchanged and include it as a separate, accessible file in the same portable ZIP as the executable and third-party notices. The package builder must copy this exact local archive and verify the SHA-256 above in the finished ZIP. The notices should identify its relative path in that ZIP. Do not replace it with the TTF-only archive or only an upstream download link.

This establishes the retrieved archive's provenance, version, source contents, and license texts. No reproducible rebuild or byte-for-byte source-to-TTF verification has been performed. The final ZIP still needs a contents/hash check and a review of the chosen source-delivery arrangement before public distribution; including this archive is not recorded as a blanket legal-compliance conclusion. Keep the existing font functionality intact.

Installed TTF hashes, recorded to make that follow-up concrete:

| `node_modules/pdfjs-dist/standard_fonts/` file | SHA-256 |
| --- | --- |
| `LiberationSans-Bold.ttf` | `361C61B82D575C5C35FD9157FDA8B0194BCFCD0D88EA8521A4FB5DD53D33DDDC` |
| `LiberationSans-BoldItalic.ttf` | `A224075AC17495AD0A3AF3BC0A419AC0704A8B3FD1095456201FB9B095FC281D` |
| `LiberationSans-Italic.ttf` | `832B4406DBEF23628800D3AAAD21048534AC84D7E3AD955BE83B8172ED8EF512` |
| `LiberationSans-Regular.ttf` | `F8ACE1F892B2BD9DC1792BA7F097FA7588F84FED48321480E04DE5390828221F` |

## DOCX and Markdown export dependencies

The added direct browser dependencies are **docx 9.8.1** (MIT, `node_modules/docx/LICENSE`, copyright Dolan 2016) and **fflate 0.8.3** (MIT, `node_modules/fflate/LICENSE`, copyright Arjun Barrett 2026). fflate has no runtime package dependencies. docx's published ESM file already bundles dependencies and browser shims; its package.json dependency list alone is not a complete inventory of that code.

This focused audit uses the package regions in the installed `docx/dist/index.mjs` and the project's [official 9.8.1 package-lock.json](https://github.com/dolanmiu/docx/blob/9.8.1/package-lock.json). It includes the process shim and JSZip's packaged dependency tree. It conservatively retains notices for the prebundled code even if a later app build removes unused portions. It does not add build-only TypeScript declaration packages such as `@types/node` or unrelated dev tools to the runtime notice list.

- Installed `docx/dist/index.mjs` SHA-256: `4ba859836773eb7bddbe003a43f74d9eb80ff97fd41c69702b8f7c57d717badd`.
- Retrieved official 9.8.1 lockfile SHA-256: `4e7758ebdc8f190ecf52efc9b337111e19213f622cc1027b0ae6f295d22d6439`.
- npm source archives below were read in memory for notices and checked against the official lockfile's integrity values. No package installation, lifecycle script, or extracted third-party code was executed by this audit.
- JSZip 3.10.2 offers MIT or GPL; this package selects its **MIT option**, while retaining its complete upstream license file.
- The prebundled sax is **1.2.4**, with ISC and an embedded MIT notice. The separately installed sax 1.6.1 has a different license; its file is not substituted for the bundled version's notice.
- There are two readable-stream versions: 3.6.2 inside stream-browserify and 2.3.8 inside JSZip. Their separate provenance is retained.
- The correct installed nanoid notice is `docx/node_modules/nanoid/LICENSE` for version 6.0.1; the unrelated root nanoid version is not used for this attribution.
- Existing pako MIT **and** Zlib notices remain required. The new JSZip copy does not replace those notices.

The packager includes ordinary installed license files through `licenseInputs`, including the license sections in hash.js and isarray READMEs. It also includes this file so the supplemental exact upstream notices below remain accessible in the portable package.

| Component | Version | Upstream license | Notice location |
| --- | --- | --- | --- |
| available-typed-arrays | 1.0.7 | MIT | Supplemental notice below |
| base64-js | 1.5.1 | MIT | Supplemental notice below |
| buffer | 5.7.1 | MIT | Supplemental notice below |
| call-bind | 1.0.8 | MIT | Supplemental notice below |
| call-bind-apply-helpers | 1.0.2 | MIT | Supplemental notice below |
| call-bound | 1.0.4 | MIT | Supplemental notice below |
| core-util-is | 1.0.3 | MIT | Installed upstream notice included by packager |
| define-data-property | 1.1.4 | MIT | Supplemental notice below |
| dunder-proto | 1.0.1 | MIT | Supplemental notice below |
| es-define-property | 1.0.1 | MIT | Supplemental notice below |
| es-errors | 1.3.0 | MIT | Supplemental notice below |
| es-object-atoms | 1.1.1 | MIT | Supplemental notice below |
| events | 3.3.0 | MIT | Supplemental notice below |
| for-each | 0.3.5 | MIT | Supplemental notice below |
| function-bind | 1.1.2 | MIT | Supplemental notice below |
| get-intrinsic | 1.3.0 | MIT | Supplemental notice below |
| get-proto | 1.0.1 | MIT | Supplemental notice below |
| gopd | 1.2.0 | MIT | Supplemental notice below |
| has-property-descriptors | 1.0.2 | MIT | Supplemental notice below |
| has-symbols | 1.1.0 | MIT | Supplemental notice below |
| has-tostringtag | 1.0.2 | MIT | Supplemental notice below |
| hash.js | 1.1.7 | MIT | Installed upstream notice included by packager |
| hasown | 2.0.2 | MIT | Supplemental notice below |
| ieee754 | 1.2.1 | BSD-3-Clause | Supplemental notice below |
| immediate | 3.0.6 | MIT | Installed upstream notice included by packager |
| inherits | 2.0.4 | ISC | Installed upstream notice included by packager |
| is-arguments | 1.2.0 | MIT | Supplemental notice below |
| is-callable | 1.2.7 | MIT | Supplemental notice below |
| is-generator-function | 1.0.10 | MIT | Supplemental notice below |
| is-typed-array | 1.1.15 | MIT | Supplemental notice below |
| isarray | 1.0.0 | MIT | Installed upstream notice included by packager |
| jszip | 3.10.2 | (MIT OR GPL-3.0-or-later) | Installed upstream notice included by packager |
| lie | 3.3.0 | MIT | Installed upstream notice included by packager |
| math-intrinsics | 1.1.0 | MIT | Supplemental notice below |
| minimalistic-assert | 1.0.1 | ISC | Installed upstream notice included by packager |
| nanoid | 6.0.1 | MIT | Installed upstream notice included by packager |
| pako | 1.0.11 | (MIT AND Zlib) | Installed upstream notice included by packager |
| possible-typed-array-names | 1.0.0 | MIT | Supplemental notice below |
| process | 0.11.10 | MIT | Supplemental notice below |
| process-nextick-args | 2.0.1 | MIT | Installed upstream notice included by packager |
| readable-stream | 2.3.8 | MIT | Installed upstream notice included by packager |
| readable-stream | 3.6.2 | MIT | Supplemental notice below |
| safe-buffer | 5.1.2 | MIT | Installed upstream notice included by packager |
| sax | 1.2.4 | ISC plus MIT notice | Supplemental notice below |
| set-function-length | 1.2.2 | MIT | Supplemental notice below |
| setimmediate | 1.0.5 | MIT | Installed upstream notice included by packager |
| stream-browserify | 3.0.0 | MIT | Supplemental notice below |
| string_decoder | 1.1.1 | MIT | Installed upstream notice included by packager |
| util | 0.12.5 | MIT | Supplemental notice below |
| util-deprecate | 1.0.2 | MIT | Installed upstream notice included by packager |
| vite-plugin-node-polyfills | 0.28.0 | MIT | Supplemental notice below |
| which-typed-array | 1.1.19 | MIT | Supplemental notice below |
| xml | 1.0.1 | MIT | Installed upstream notice included by packager |
| xml-js | 1.6.11 | MIT | Installed upstream notice included by packager |

### Supplemental upstream notice texts

These libraries are embedded in docx's ESM bundle but their matching notice files are not installed at equivalent top-level paths in this project. Their original texts follow. Each archive URL identifies the exact package version; each SHA-256 identifies the bytes inspected. The text is attribution material, not executable code.

#### available-typed-arrays 1.0.7

Source: https://registry.npmjs.org/available-typed-arrays/-/available-typed-arrays-1.0.7.tgz

Archive SHA-256: `8b140e0fa3fede3d81d1dffcc400c9755d7388e8a4add228487f5e20c9cf7863`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) 2020 Inspect JS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### base64-js 1.5.1

Source: https://registry.npmjs.org/base64-js/-/base64-js-1.5.1.tgz

Archive SHA-256: `b1b7a945b52685269083425216d6597e33d97bf21699d656e92fdb3eb5210a85`

Original member: `package/LICENSE`

```text
The MIT License (MIT)

Copyright (c) 2014 Jameson Little

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

#### buffer 5.7.1

Source: https://registry.npmjs.org/buffer/-/buffer-5.7.1.tgz

Archive SHA-256: `98bfac55b7a37ade644f5eccbcf94a59269afd13e1f9af597e61fd06c057c0bc`

Original member: `package/LICENSE`

```text
The MIT License (MIT)

Copyright (c) Feross Aboukhadijeh, and other contributors.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

#### call-bind 1.0.8

Source: https://registry.npmjs.org/call-bind/-/call-bind-1.0.8.tgz

Archive SHA-256: `30e2bdf3ce00c012527ae4161df4145cbf4c797e9fa30e43fc7324b2e07b0523`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) 2020 Jordan Harband

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### call-bind-apply-helpers 1.0.2

Source: https://registry.npmjs.org/call-bind-apply-helpers/-/call-bind-apply-helpers-1.0.2.tgz

Archive SHA-256: `073e9ff9dbabedf5c128020a677381e9f92c90188d118830b30a7656a7c37d2c`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) 2024 Jordan Harband

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### call-bound 1.0.4

Source: https://registry.npmjs.org/call-bound/-/call-bound-1.0.4.tgz

Archive SHA-256: `32086f492fedf1b9b34811f2ee50ca2cca53da5c783f7cd5f939d3f1e86bbd32`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) 2024 Jordan Harband

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### define-data-property 1.1.4

Source: https://registry.npmjs.org/define-data-property/-/define-data-property-1.1.4.tgz

Archive SHA-256: `16304ad73df1364ca8623c28a8969de01cd7189b4f9b05668fadb598f110e4d2`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) 2023 Jordan Harband

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### dunder-proto 1.0.1

Source: https://registry.npmjs.org/dunder-proto/-/dunder-proto-1.0.1.tgz

Archive SHA-256: `ed1342228c82c10df9921c59d684df516a0cd6ed25b61e5f9d6330895326cfdb`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) 2024 ECMAScript Shims

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### es-define-property 1.0.1

Source: https://registry.npmjs.org/es-define-property/-/es-define-property-1.0.1.tgz

Archive SHA-256: `5986b8b13121340a8b0d5c7d8f0f961aa80ef3a74515ca9cb7a78d86ed0385f7`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) 2024 Jordan Harband

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### es-errors 1.3.0

Source: https://registry.npmjs.org/es-errors/-/es-errors-1.3.0.tgz

Archive SHA-256: `d14dd1c35b4bd3b8aca3219fd3627eb7f3eb49cf6b4c8a7ca58b91fd7a190993`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) 2024 Jordan Harband

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### es-object-atoms 1.1.1

Source: https://registry.npmjs.org/es-object-atoms/-/es-object-atoms-1.1.1.tgz

Archive SHA-256: `3e18e4d757818aee7bf1921686c6c3e7f9676d17c5c6fec560567c6beee579ce`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) 2024 Jordan Harband

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### events 3.3.0

Source: https://registry.npmjs.org/events/-/events-3.3.0.tgz

Archive SHA-256: `2c30dd630b58299bdfaac8688f763c6f312d29779c500b1e3701a1d4fb3b534b`

Original member: `package/LICENSE`

```text
MIT

Copyright Joyent, Inc. and other Node contributors.

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the
following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
USE OR OTHER DEALINGS IN THE SOFTWARE.
```

#### for-each 0.3.5

Source: https://registry.npmjs.org/for-each/-/for-each-0.3.5.tgz

Archive SHA-256: `4bd2cfc8e674c93cf7abb3bd3d6fd8e388fa10324bec011223a8fa4f287185d1`

Original member: `package/LICENSE`

```text
The MIT License (MIT)

Copyright (c) 2012 Raynos.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### function-bind 1.1.2

Source: https://registry.npmjs.org/function-bind/-/function-bind-1.1.2.tgz

Archive SHA-256: `704402651b02a1454f17d445fc7dd716efc282d059407126d58ef30a47e807aa`

Original member: `package/LICENSE`

```text
Copyright (c) 2013 Raynos.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

#### get-intrinsic 1.3.0

Source: https://registry.npmjs.org/get-intrinsic/-/get-intrinsic-1.3.0.tgz

Archive SHA-256: `662e27e54e00fe46fbb08f9f4aacb054e3695dbe72cc14b436613fbcfb780544`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) 2020 Jordan Harband

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### get-proto 1.0.1

Source: https://registry.npmjs.org/get-proto/-/get-proto-1.0.1.tgz

Archive SHA-256: `eb2cc52afb1f1fd82c5fc2a58c2380f0f16fdcdb5631538f3c66887435d70681`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) 2025 Jordan Harband

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### gopd 1.2.0

Source: https://registry.npmjs.org/gopd/-/gopd-1.2.0.tgz

Archive SHA-256: `d536d0de4dd285dc1468fbb7f39334a47ee0eec9c27f9b626a6e71466c9fda82`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) 2022 Jordan Harband

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### has-property-descriptors 1.0.2

Source: https://registry.npmjs.org/has-property-descriptors/-/has-property-descriptors-1.0.2.tgz

Archive SHA-256: `0219bbd8f32e268eeb6efff55a2c6ff2d502098f49c583ff023b2d9d5a8bfa87`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) 2022 Inspect JS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### has-symbols 1.1.0

Source: https://registry.npmjs.org/has-symbols/-/has-symbols-1.1.0.tgz

Archive SHA-256: `4460c7532f28b8df2ddc9a1ec17816d43c24d4b9591dc6c5936b82f7f86ae7c5`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) 2016 Jordan Harband

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### has-tostringtag 1.0.2

Source: https://registry.npmjs.org/has-tostringtag/-/has-tostringtag-1.0.2.tgz

Archive SHA-256: `dc1c74e3f1179a6271f84747d72c89f258aa46ad3e6464fae0e41737a7f0ef7b`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) 2021 Inspect JS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### hasown 2.0.2

Source: https://registry.npmjs.org/hasown/-/hasown-2.0.2.tgz

Archive SHA-256: `50cdc4d2cd11ae04b6ee29f328d09022244962e5dfab303c8fc223ff8dfa807d`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) Jordan Harband and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### ieee754 1.2.1

Source: https://registry.npmjs.org/ieee754/-/ieee754-1.2.1.tgz

Archive SHA-256: `8ef14b9b397e339db89db97881fb714f49319d8f0eb1275901f45567b28f9dac`

Original member: `package/LICENSE`

```text
Copyright 2008 Fair Oaks Labs, Inc.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

#### is-arguments 1.2.0

Source: https://registry.npmjs.org/is-arguments/-/is-arguments-1.2.0.tgz

Archive SHA-256: `476c29799ec4f51b694d576fc70a27631c8ffe00e4269b7608027e12c7b0e51c`

Original member: `package/LICENSE`

```text
The MIT License (MIT)

Copyright (c) 2014 Jordan Harband

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

#### is-callable 1.2.7

Source: https://registry.npmjs.org/is-callable/-/is-callable-1.2.7.tgz

Archive SHA-256: `1b5c6e4e8ab142a6857fca2fb79d880ba64f2c4ad87907b583934d04b503c3a1`

Original member: `package/LICENSE`

```text
The MIT License (MIT)

Copyright (c) 2015 Jordan Harband

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### is-generator-function 1.0.10

Source: https://registry.npmjs.org/is-generator-function/-/is-generator-function-1.0.10.tgz

Archive SHA-256: `7100ebf1ed50e34793ad1d1e0c9572dd84fca9d490beb0b5c431a6dd2fc90c47`

Original member: `package/LICENSE`

```text
The MIT License (MIT)

Copyright (c) 2014 Jordan Harband

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

#### is-typed-array 1.1.15

Source: https://registry.npmjs.org/is-typed-array/-/is-typed-array-1.1.15.tgz

Archive SHA-256: `d1ef6229208ce395c816f88637e45b970f6d742d616d3c980fb0dbb679cb7690`

Original member: `package/LICENSE`

```text
The MIT License (MIT)

Copyright (c) 2015 Jordan Harband

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### math-intrinsics 1.1.0

Source: https://registry.npmjs.org/math-intrinsics/-/math-intrinsics-1.1.0.tgz

Archive SHA-256: `b8c2c35575493dc086df88cfc468a9e2651b6617336480ab3f00fcf853f443a7`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) 2024 ECMAScript Shims

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### possible-typed-array-names 1.0.0

Source: https://registry.npmjs.org/possible-typed-array-names/-/possible-typed-array-names-1.0.0.tgz

Archive SHA-256: `36f999d2e86e4423100dcc35cae10e3260ea7bae0d3dec7eb2b90a46ead57945`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) 2024 Jordan Harband

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### process 0.11.10

Source: https://registry.npmjs.org/process/-/process-0.11.10.tgz

Archive SHA-256: `7c10569b3c9cb056152ad630d40f9f4fcc321a0013c2bb8384f036aaa674e6bb`

Original member: `package/LICENSE`

```text
(The MIT License)

Copyright (c) 2013 Roman Shtylman <shtylman@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

#### readable-stream 3.6.2

Source: https://registry.npmjs.org/readable-stream/-/readable-stream-3.6.2.tgz

Archive SHA-256: `edd866c05e318aa9c091763eebdd4207409b7a7648be19c5317a96047305ab5d`

Original member: `package/LICENSE`

```text
Node.js is licensed for use as follows:

"""
Copyright Node.js contributors. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
"""

This license applies to parts of Node.js originating from the
https://github.com/joyent/node repository:

"""
Copyright Joyent, Inc. and other Node contributors. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
"""
```

#### sax 1.2.4

Source: https://registry.npmjs.org/sax/-/sax-1.2.4.tgz

Archive SHA-256: `adc442e017041cffca4d4418d06006ae5f17a9984557fa80c3a6cd8859021cf2`

Original member: `package/LICENSE`

```text
The ISC License

Copyright (c) Isaac Z. Schlueter and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR
IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

====

`String.fromCodePoint` by Mathias Bynens used according to terms of MIT
License, as follows:

    Copyright Mathias Bynens <https://mathiasbynens.be/>

    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including
    without limitation the rights to use, copy, modify, merge, publish,
    distribute, sublicense, and/or sell copies of the Software, and to
    permit persons to whom the Software is furnished to do so, subject to
    the following conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
    LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
    OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
    WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

#### set-function-length 1.2.2

Source: https://registry.npmjs.org/set-function-length/-/set-function-length-1.2.2.tgz

Archive SHA-256: `a339df70dfa3507a3fe2137464915212d69a9585d201c253b90f0c13fd952b4a`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) Jordan Harband and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### stream-browserify 3.0.0

Source: https://registry.npmjs.org/stream-browserify/-/stream-browserify-3.0.0.tgz

Archive SHA-256: `376fa4c0ffd38961cf23c210f8a8dbcc46b00862c1d1bce1bbc66f7ea9a433cf`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) James Halliday

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

#### util 0.12.5

Source: https://registry.npmjs.org/util/-/util-0.12.5.tgz

Archive SHA-256: `d3b9dac1449f7d6b6995355f5cc73179fec7b90bfa8967ff7d3c0654525ab282`

Original member: `package/LICENSE`

```text
Copyright Joyent, Inc. and other Node contributors. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
```

#### vite-plugin-node-polyfills 0.28.0

Source: https://registry.npmjs.org/vite-plugin-node-polyfills/-/vite-plugin-node-polyfills-0.28.0.tgz

Archive SHA-256: `c38064a458496d3a7893831629a54a5126536bbaa1e1dd06f13aeba43816d18c`

Original member: `package/LICENSE`

```text
MIT License

Copyright (c) 2022 David R. Myers

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### which-typed-array 1.1.19

Source: https://registry.npmjs.org/which-typed-array/-/which-typed-array-1.1.19.tgz

Archive SHA-256: `aaccea91985a6e1731f84192d4682f474aea76f64a210982576e488732b0ad3f`

Original member: `package/LICENSE`

```text
The MIT License (MIT)

Copyright (c) 2015 Jordan Harband

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
