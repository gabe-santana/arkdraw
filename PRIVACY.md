# Privacy Policy

_Last updated: October 24, 2026_

ArkDraw is an open-source diagram editor that runs on your device. This policy
explains what happens to your data when you use the desktop app (Windows, macOS,
Linux, including the Microsoft Store version) or the web app.

## The short version

- **We don't collect anything.** ArkDraw has no accounts, no analytics, no
  telemetry, no ads and no tracking. We never receive your diagrams or any
  information about you.
- **Your diagrams stay on your device.** Files are saved where you choose.
  Crash recovery, revision history, preferences and recent files are stored
  locally on your device.
- **Optional features can contact third parties, only when you use them**, as
  described below.

## Optional features that use the network

| Feature | What is sent | To whom |
| --- | --- | --- |
| **AI assistant** (off until you add your own API key) | The prompt you type and, in edit mode, a text summary of the current diagram | The AI provider **you** configure (for example Anthropic, OpenAI, Google, or a local Ollama server). Their privacy policy applies. Your API key is stored in your operating system's keychain on desktop. In the web app it is encrypted with a non-exportable key and kept in your browser's storage on this device (you can turn this off to keep it in memory only); it is only ever sent to that provider. |
| **Web fonts** (only if a diagram uses a Google Font) | A standard request for the font file | Google Fonts |
| **Reporting an AI response** (the flag on an AI result) | The reason you pick, your note and, if you leave it ticked, your request and the AI's output, plus the model name and ArkDraw version | The maintainer, as an email you send from your own mail app. Nothing is sent until you send that email. |
| **Update check** (desktop) | A request for the latest version information | GitHub |
| **Images or diagrams opened from a URL** | A request for that URL | The website you entered |
| **Share links** | Nothing: the diagram is encoded in the link itself, in the part of the URL that browsers never send to servers | — |

The AI conversation (your prompts and the assistant's replies) is saved inside
the diagram file, so it is still there when you reopen it. Anyone you send the
file to can read it; **New conversation** in the AI tab clears it from the file.
Exports (PNG, SVG, PDF, HTML…) and share links never include it.

Plugins you choose to install run with full access to the editor; only install
plugins you trust.

## Children

ArkDraw doesn't knowingly collect information from anyone, including children.

## Changes

Changes to this policy are published in this file, in the project's public
repository: https://github.com/gabe-santana/arkdraw

## Contact

Questions: open an issue at https://github.com/gabe-santana/arkdraw/issues or
email gsantana.sza@gmail.com.
