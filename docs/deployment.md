# Hosting the browser demo

SlidePrune is a static application. A web host serves its JavaScript, worker, fonts and other assets; selected PDF bytes are processed in the visitor's browser. This does not make a hosted site an offline installation: loading the site and its assets requires access to the host.

## Prepare locally

Use Node.js 22.13 or later:

```sh
npm ci
npm test
npm run test:package
npm run build
node scripts/package-pages.mjs
```

The packaging command prints a fresh folder under `output/pages/`. Publish **that folder**, not the checkout or an unmodified `dist/`. It includes the project license, audited dependency notices, their provenance and the original Liberation 1.07.4 font source. `build-manifest.json` records resource hashes. `/credits.html` links to the included notices and source.

Vite uses relative asset URLs (`base: './'`), so the same artifact can run below a repository path such as `/slideprune/`. Test the worker, fonts, three original examples and exports at that path before announcing a hosted URL.

## GitHub Pages

The **Deploy demo** workflow is manual and runs only from `main`. A normal source push does not publish a website.

1. After reviewing and approving the public deployment, set repository **Settings → Pages → Source → GitHub Actions**.
2. In **Actions → Deploy demo**, choose **Run workflow** from `main`.
3. The build job installs locked dependencies, runs application and package tests, builds the app and packages the notices/source. The deployment job alone has Pages and OIDC write permissions.
4. Wait for a successful workflow and verify its reported URL in a browser. For `daluobo555/slideprune`, the expected address is `https://daluobo555.github.io/slideprune/`; it is not a live-site claim until deployment and browser checks succeed.
5. Only after verification, add the working URL to the repository About field, README and promotional material.

If a deployment has a regression, prepare an approved source revert and manually deploy that revision from `main`. Do not describe a cancelled or failed workflow as a release.

The workflow follows [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). It does not create accounts, add analytics or upload user PDFs.

## Windows preview release

`npm run package:windows` builds a separate portable ZIP on Windows. Publish the ZIP together with its generated `SHA256SUMS.txt`; retain all bundled notices and original font source. Attach the package to a release whose version and source correspond to the build, and describe it as an unsigned preview until platform launch behavior has been verified.

Users can verify a downloaded archive with PowerShell:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath .\SlidePrune-0.4.0-windows.zip
```

Compare the complete checksum with `SHA256SUMS.txt`. Extract the complete ZIP and follow `START-HERE.txt`. The application needs .NET Framework 4.x and a current desktop browser, but does not require Node.js. If the browser does not open automatically, use the loopback URL printed by the launcher. Keep existing operating-system protections enabled.
