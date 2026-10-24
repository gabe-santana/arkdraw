# Releasing the desktop app

How OpenDraw's desktop builds are packaged, signed and updated. The workflow is
`.github/workflows/release.yml`; the Tauri configuration lives in `src-tauri/`.

## Packaging matrix

| OS | Package | Built by | Config | Auto-update |
| --- | --- | --- | --- | --- |
| Windows | MSIX via the Microsoft Store; the release attaches the Store's web installer (`*_windows-installer.exe`, signed by Microsoft) | `scripts/msix/build-msix.mjs`, `msstore` CLI | `src-tauri/msix/AppxManifest.xml` | yes (Store) |
| macOS | `.app` / `.dmg` (universal, macOS 11+) | tauri-action | `tauri.macos.conf.json` | yes (`.app.tar.gz`) |
| Linux (x64, arm64) | AppImage | tauri-action | `tauri.linux.conf.json` | yes |
| Linux (x64, arm64) | `.deb` | tauri-action | `tauri.linux.conf.json` | no (use the package manager) |
| Linux (x64, arm64) | `.rpm` | tauri-action | `tauri.linux.conf.json` | no (use the package manager) |
| Linux | snap | `snap` job, `snap/snapcraft.yaml` | — | via the Snap Store |

Notes:

- **Windows**: no unsigned installers are published. Windows users install from the
  Microsoft Store, either through the store link or through the small web installer
  attached to each release, which Microsoft signs. Local MSI/NSIS builds still work
  with `npm run tauri build`.
- **Snap**: Tauri's bundler has no snap target, so `snap/snapcraft.yaml` builds the
  `.deb` and repacks it with the GNOME extension (WebKitGTK). Build locally with
  `snapcraft` on Ubuntu. The CI job is best effort (`continue-on-error`). To publish
  to the Snap Store, run `snapcraft upload --release=stable opendraw_*.snap` with a
  store login.
- **File associations** (installers only): `.opendraw` (editor), `.drawio` (editor)
  and `.vsdx` (viewer, alternate handler on macOS), set in `bundle.fileAssociations`
  in `tauri.conf.json`. `.png`/`.svg`/`.xml` open only through *File → Open*,
  not by association.

## Versioning

Bump `version` in `package.json`, `src-tauri/tauri.conf.json` and
`src-tauri/Cargo.toml`, then push a tag:

```sh
git tag v0.2.0 && git push origin v0.2.0
```

The workflow then:

1. **prepare** — fails fast if the tag doesn't match all three versions, and creates
   a draft release with generated release notes;
2. **build** — Windows x64, macOS universal, Linux x64 and Linux arm64 in parallel,
   each uploading its packages to the draft;
3. **snap** — best effort;
4. **publish** — uploads `SHA256SUMS.txt` and publishes the release (marked *latest*).
   If any platform fails, the release stays a draft so nothing half-built goes out;
   fix and re-run the failed jobs, or run the workflow manually with the tag.

Tags with a pre-release suffix (`v0.3.0-1`) are published as pre-releases and never
become *latest* (so the updater ignores them). MSI only accepts numeric pre-release
identifiers, so use `-1`, `-2`… rather than `-beta`.

## Auto-update

The app uses [`tauri-plugin-updater`](https://v2.tauri.app/plugin/updater/):

- Endpoint: `https://github.com/gabe-santana/opendraw/releases/latest/download/latest.json`
  (`plugins.updater.endpoints` in `tauri.conf.json`).
- On launch the main window runs a quiet check at most once a day. Turn it off with
  `"checkForUpdates": false` in `config.json` (see below). *Help → Check for
  updates…* runs a check on demand.
- When an update is found a toast offers **Restart to update**: OpenDraw asks to
  save unsaved changes, downloads and verifies the signed package, installs it and
  relaunches. On Windows the installer runs in `passive` mode and restarts the app.
- Update packages are signed; the app checks every download against the public key
  in `plugins.updater.pubkey`.

### One-time setup: the signing key

1. Generate a key pair (keep the private key secret and backed up; if you lose it,
   installed copies can never update again):

   ```sh
   npm run tauri signer generate -- -w ~/.tauri/opendraw.key
   ```

2. Put the **public** key (contents of `~/.tauri/opendraw.key.pub`) in
   `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`, replacing the
   `REPLACE_WITH_…` placeholder. Until you do, update checks work but every
   download fails signature verification.

3. Add the repository secrets (*Settings → Secrets and variables → Actions*):

   | Secret | Value |
   | --- | --- |
   | `TAURI_SIGNING_PRIVATE_KEY` | contents of `~/.tauri/opendraw.key` (or its path on a self-hosted runner) |
   | `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | the password you chose (empty if none) |

With `TAURI_SIGNING_PRIVATE_KEY` set, the workflow merges
`src-tauri/tauri.updater.conf.json` (`bundle.createUpdaterArtifacts: true`), so the
bundler writes a `.sig` next to every updatable package and tauri-action uploads a
`latest.json` that covers all three platform jobs. Without the secret the release
still builds, minus the updater files (the workflow logs a warning).

Local builds (`npm run tauri build`) don't create updater artifacts, so they don't
need the key. To test signing locally:

```sh
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/opendraw.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=...
npm run tauri build -- --config src-tauri/tauri.updater.conf.json
```

## Code signing (installers)

Signing is separate from the updater key above and fully optional: each signing
step is skipped when its secrets are missing. Unsigned builds work, but Windows
SmartScreen shows *Windows protected your PC* (users click *More info → Run anyway*)
and macOS Gatekeeper refuses to open the app until the user right-clicks it and
chooses *Open* (or runs `xattr -dr com.apple.quarantine /Applications/OpenDraw.app`).

| Secret | Platform | Value |
| --- | --- | --- |
| `WINDOWS_CERTIFICATE` | Windows | base64 of a code-signing `.pfx` (`[Convert]::ToBase64String([IO.File]::ReadAllBytes('cert.pfx'))`) |
| `WINDOWS_CERTIFICATE_PASSWORD` | Windows | the `.pfx` password |
| `APPLE_CERTIFICATE` | macOS | base64 of a *Developer ID Application* `.p12` |
| `APPLE_CERTIFICATE_PASSWORD` | macOS | the `.p12` password |
| `APPLE_SIGNING_IDENTITY` | macOS | e.g. `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` | macOS | notarisation: Apple ID, an app-specific password, and the team ID |

With `WINDOWS_CERTIFICATE` the workflow imports the certificate and signs the exe,
MSI and setup with SHA-256 and a DigiCert timestamp. An EV or Azure Trusted Signing
certificate removes the SmartScreen warning immediately; a standard OV certificate
builds reputation over time. With the Apple secrets, the app is signed with the
hardened runtime and notarised, so it opens without warnings.

## Microsoft Store and winget (no SmartScreen prompts)

Installs from the Microsoft Store and from `winget` never show the SmartScreen
*unknown publisher* screen, even while the MSI on GitHub is unsigned.

### Microsoft Store (MSIX)

`scripts/msix/build-msix.mjs` packages the release executable as an MSIX
(`src-tauri/msix/AppxManifest.xml`); the Store signs it on ingestion. The release
workflow builds it when the identity variables exist and submits it when the Store
API secrets exist.

One-time setup (needs your Microsoft account, so it can't be scripted):

1. Register at <https://storedeveloper.microsoft.com> (individual accounts are free).
2. In Partner Center create the app and reserve the name **OpenDraw**.
3. *Product identity* page → add repository **variables**
   (*Settings → Secrets and variables → Actions → Variables*):
   `MSIX_IDENTITY_NAME` (Package/Identity/Name), `MSIX_PUBLISHER` (Package/Identity/Publisher),
   `MSIX_PUBLISHER_DISPLAY_NAME`, and `MSSTORE_PRODUCT_ID` (the Store ID, `9N…`).
4. *Account settings → User management → Microsoft Entra applications* → create an
   application with the **Manager** role, then add the **secrets**
   `MSSTORE_TENANT_ID`, `MSSTORE_CLIENT_ID`, `MSSTORE_CLIENT_SECRET` and `MSSTORE_SELLER_ID`.
5. Complete the first submission in Partner Center (listing text, screenshots, age
   rating questionnaire); upload the `msix` artifact from the release run.

After that every stable tag builds the MSIX and submits it with the
[Microsoft Store CLI](https://learn.microsoft.com/windows/apps/publish/msstore-dev-cli/overview)
(`msstore publish`). Pre-release tags are never submitted.

To build the package locally: `npm run tauri build` then `node scripts/msix/build-msix.mjs`
(placeholder identity unless the `MSIX_*` variables are set).

### winget

Store apps are installable with winget through its `msstore` source, so no separate
manifest is needed: `winget install 9PG6WQTHD78Q`.

## Desktop configuration file

`config.json` in the app config directory (*Help → Configuration file…* reveals it),
or any file passed with `--config <path>`:

```json
{
  "plugins": ["/home/me/opendraw-plugins/my-plugin.js"],
  "enablePlugins": false,
  "spellCheck": true,
  "spellCheckLanguage": "en-GB",
  "checkForUpdates": true,
  "createBackups": true
}
```

| Key | Default | Effect |
| --- | --- | --- |
| `plugins` | `[]` | JavaScript plugin files. They load only when plugins are enabled. |
| `enablePlugins` | `false` | Enable plugins without the `--enable-plugins` flag. |
| `spellCheck` | `true` | Spell checking while editing labels. |
| `spellCheckLanguage` | OS | BCP 47 tag set as the label editor's `lang`. WebKit (macOS/Linux) uses it as a hint; WebView2 (Windows) spell-checks with the OS input languages. |
| `checkForUpdates` | `true` | The daily quiet update check on launch. |
| `createBackups` | `true` | Before each save, copy the previous file to `<name>.bkp` next to it. |

Command-line flags (they can be combined with a file to open, and with `--export`):

```text
opendraw [file] [--enable-plugins] [--config <path>]
```
