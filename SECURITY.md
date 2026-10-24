# Security Policy

## Supported versions

Security fixes go into the latest release. Please update before reporting an issue.

## Reporting a vulnerability

**Please do not open a public issue.** Instead, use GitHub's [private vulnerability reporting](https://github.com/gabe-santana/arkdraw/security/advisories/new) or email **gsantana.sza@gmail.com** with:

- a description of the issue and its impact,
- steps to reproduce (a sample file, URL parameters or plugin, if relevant),
- the version and platform (desktop OS or browser) you tested.

You can expect an acknowledgement within 72 hours and an update on the fix within 14 days. We'll credit you in the release notes unless you prefer otherwise.

## Scope

Areas we're especially interested in:

- opening crafted files (`.opendraw`, `.drawio`, `.vsdx`, SVG, HTML) or share links,
- the embed `postMessage` protocol and the read-only viewer,
- the desktop shell (Tauri commands, file access, the updater) and how API keys are stored,
- the plugin loader.

Plugins run with full access to the editor by design; only install plugins you trust.
