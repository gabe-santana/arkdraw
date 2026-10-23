//! Desktop configuration and desktop-only command-line flags.
//!
//! ```text
//! opendraw [file] [--enable-plugins] [--config <path>]
//! ```
//!
//! The config file is `config.json` in the app config directory (or the file
//! given with `--config`). It is optional; missing or malformed files fall back
//! to the defaults. Unknown keys are preserved when the UI writes it back.
//!
//! ```json
//! {
//!   "plugins": ["/abs/path/my-plugin.js"],
//!   "enablePlugins": false,
//!   "spellCheck": true,
//!   "spellCheckLanguage": "en-GB",
//!   "checkForUpdates": true
//! }
//! ```
//!
//! Plugins listed in the config only load when `--enable-plugins` is passed
//! (as in draw.io desktop) or `enablePlugins` is true. The front end reads
//! everything through `get_app_config` (src/desktop/config.ts).

use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use tauri::{AppHandle, Manager, State};

/// Desktop flags parsed from the command line (alongside cli.rs's export flags).
#[derive(Debug, Default, Clone, PartialEq)]
pub struct DesktopFlags {
    pub enable_plugins: bool,
    pub config_path: Option<PathBuf>,
}

/// Managed state: the flags plus whether this is a headless CLI export run.
pub struct DesktopState {
    pub flags: DesktopFlags,
    pub headless: bool,
}

/// `config.json`. Serialized camelCase for the front end (`AppConfig` in
/// src/desktop/config.ts).
#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct AppConfig {
    /// JavaScript plugin files (absolute paths) handed to the plugin runtime.
    pub plugins: Vec<String>,
    /// Load `plugins` without `--enable-plugins`.
    pub enable_plugins: bool,
    /// Spell checking in the text editor (default: on).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spell_check: Option<bool>,
    /// BCP 47 language for spell checking, e.g. "en-US", "de" (default: OS).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spell_check_language: Option<String>,
    /// Quiet update check on launch, at most once a day (default: on).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub check_for_updates: Option<bool>,
    /// Keys this version doesn't know about, kept on write.
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

/// What `get_app_config` returns.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfigInfo {
    pub config: AppConfig,
    /// The config file in use (may not exist yet).
    pub path: Option<String>,
    /// Whether that file exists.
    pub exists: bool,
    /// `--enable-plugins` was passed or `enablePlugins` is set.
    pub plugins_enabled: bool,
    /// Headless `--export` run: no update checks, no plugins.
    pub headless: bool,
}

fn absolute(path: &str) -> PathBuf {
    let p = PathBuf::from(path);
    if p.is_absolute() {
        return p;
    }
    std::env::current_dir().map(|d| d.join(&p)).unwrap_or(p)
}

/// Splits the arguments (without the program name) into desktop flags and the
/// remaining arguments (so `--config foo.xml` is never mistaken for a file to open).
pub fn parse_flags<I: IntoIterator<Item = String>>(args: I) -> (DesktopFlags, Vec<String>) {
    let mut flags = DesktopFlags::default();
    let mut rest = Vec::new();
    let mut it = args.into_iter();
    while let Some(arg) = it.next() {
        if arg == "--enable-plugins" {
            flags.enable_plugins = true;
        } else if arg == "--config" {
            if let Some(v) = it.next() {
                flags.config_path = Some(absolute(&v));
            }
        } else if let Some(v) = arg.strip_prefix("--config=") {
            flags.config_path = Some(absolute(v));
        } else {
            rest.push(arg);
        }
    }
    (flags, rest)
}

/// Parses a config file's text; anything invalid yields the defaults.
pub fn parse_config(text: &str) -> AppConfig {
    serde_json::from_str(text).unwrap_or_default()
}

fn config_path(app: &AppHandle, flags: &DesktopFlags) -> Option<PathBuf> {
    flags.config_path.clone().or_else(|| {
        app.path()
            .app_config_dir()
            .ok()
            .map(|dir| dir.join("config.json"))
    })
}

fn load(path: Option<&Path>) -> AppConfig {
    path.and_then(|p| fs::read_to_string(p).ok())
        .map(|s| parse_config(&s))
        .unwrap_or_default()
}

#[tauri::command]
pub fn get_app_config(app: AppHandle, state: State<'_, DesktopState>) -> AppConfigInfo {
    let path = config_path(&app, &state.flags);
    let config = load(path.as_deref());
    AppConfigInfo {
        plugins_enabled: !state.headless && (state.flags.enable_plugins || config.enable_plugins),
        exists: path.as_deref().is_some_and(Path::is_file),
        path: path.map(|p| p.to_string_lossy().into_owned()),
        headless: state.headless,
        config,
    }
}

#[tauri::command]
pub fn set_app_config(
    app: AppHandle,
    state: State<'_, DesktopState>,
    config: AppConfig,
) -> Result<(), String> {
    let path = config_path(&app, &state.flags).ok_or("No config directory")?;
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| format!("Could not create {}: {e}", dir.display()))?;
    }
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    crate::write_atomic(&path, json.as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(s: &str) -> Vec<String> {
        s.split_whitespace().map(String::from).collect()
    }

    #[test]
    fn parses_desktop_flags_and_keeps_the_rest() {
        let (flags, rest) = parse_flags(args("--enable-plugins a.drawio --config /etc/od.xml"));
        assert!(flags.enable_plugins);
        assert!(flags.config_path.unwrap().ends_with("od.xml"));
        assert_eq!(rest, args("a.drawio"));

        let (flags, rest) = parse_flags(args("--config=cfg.json b.vsdx"));
        assert!(!flags.enable_plugins);
        assert!(flags.config_path.unwrap().is_absolute());
        assert_eq!(rest, args("b.vsdx"));
    }

    #[test]
    fn config_defaults_and_unknown_keys() {
        assert_eq!(parse_config("not json"), AppConfig::default());
        let c = parse_config(r#"{"plugins":["/p.js"],"spellCheckLanguage":"de","custom":1}"#);
        assert_eq!(c.plugins, vec!["/p.js".to_string()]);
        assert_eq!(c.spell_check_language.as_deref(), Some("de"));
        assert!(!c.enable_plugins);
        let out = serde_json::to_value(&c).unwrap();
        assert_eq!(out["custom"], 1);
        assert_eq!(out["spellCheckLanguage"], "de");
        assert!(out.get("checkForUpdates").is_none());
    }
}
