# Releasing the desktop app

How OpenDraw's desktop builds are packaged, signed and updated. The workflow is
`.github/workflows/release.yml`; the Tauri configuration lives in `src-tauri/`.

## Packaging matrix

| OS | Package | Built by | Config | Auto-update |
| --- | --- | --- | --- | --- |
| Windows | NSIS `.exe` (per-user) | tauri-action | `tauri.windows.conf.json` | yes |
| Windows | MSI (WiX) | tauri-action | `tauri.windows.conf.json` | yes |
| Windows | Portable `.zip` (bare `OpenDraw.exe`) | release.yml step | — | no |
| macOS | `.app` / `.dmg` (universal, macOS 11+) | tauri-action | `tauri.macos.conf.json` | yes (`.app.tar.gz`) |
| Linux | AppImage | tauri-action | `tauri.linux.conf.json` | yes |
| Linux | `.deb` | tauri-action | `tauri.linux.conf.json` | no (use the package manager) |
| Linux | `.rpm` | tauri-action | `tauri.linux.conf.json` | no (use the package manager) |
| Linux | snap | `snap` job, `snap/snapcraft.yaml` | — | via the Snap Store |

Notes:

- **Portable Windows build**: the zip contains the executable only. It needs the
  WebView2 runtime, which ships with Windows 10 (1803+) and 11. It registers no
  file associations and keeps its settings in the usual app-data folders.
- **Snap**: Tauri's bundler has no snap target, so `snap/snapcraft.yaml` builds the
  `.deb` and repacks it with the GNOME extension (WebKitGTK). Build locally with
  `snapcraft` on Ubuntu. The CI job is best effort (`continue-on-error`). To publish
  to the Snap Store, run `snapcraft upload --release=stable opendraw_*.snap` with a
  store login.
- **File associations** (installers only): `.opendraw` (editor), `.drawio` (editor)
  and `.vsdx` (viewer, alternate handler on macOS), set in `bundle.fileAssociations`
  in `tauri.conf.json`. As with mxGraph desktop, `.png`/`.svg`/`.xml` open only
  through *File → Open*, not by association.

## Versioning

Bump `version` in `package.json`, `src-tauri/tauri.conf.json` and
`src-tauri/Cargo.toml`, then push a tag:

```sh
git tag v0.2.0 && git push origin v0.2.0
```

The workflow creates a **draft** release named `OpenDraw v0.2.0` with every package
attached. Review it and click *Publish*: the updater only sees published releases,
because `releases/latest/download/latest.json` resolves to the newest published,
non-prerelease release.

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

The workflow doesn't sign or notarise installers, so Windows SmartScreen and macOS
Gatekeeper will warn. This is separate from the updater key above. To sign them, add
the standard Tauri secrets to the tauri-action step:

- macOS: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`,
  and for notarisation `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`.
- Windows: a code-signing certificate configured through
  `bundle.windows.certificateThumbprint` or `bundle.windows.signCommand`.

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
