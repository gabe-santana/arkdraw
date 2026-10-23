//! OpenDraw native backend.
//!
//! The Rust side is intentionally small: the editor itself lives in the web
//! front end, and this crate provides what a browser cannot do on its own —
//! reading and writing files at arbitrary paths, remembering recently opened
//! documents, and handing files opened from the OS (double-click, "Open with")
//! to the UI.

mod ai;
mod cli;

use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};

use percent_encoding::percent_decode_str;
use serde::{Deserialize, Serialize};
use tauri::{
    ipc::{InvokeBody, Request},
    AppHandle, Manager, State,
};
#[cfg(any(target_os = "macos", target_os = "ios"))]
use tauri::Emitter;

/// How many entries the "Open Recent" menu keeps.
const MAX_RECENT: usize = 10;

/// File extensions OpenDraw can open directly.
const OPENABLE_EXTENSIONS: [&str; 3] = ["opendraw", "drawio", "xml"];

/// A file passed to the app by the OS before the UI was ready to receive it.
#[derive(Default)]
struct LaunchFile(Mutex<Option<String>>);

#[derive(Serialize)]
struct OpenedFile {
    path: String,
    name: String,
    contents: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct RecentFile {
    path: String,
    name: String,
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_string_lossy().into_owned())
}

fn is_openable(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| OPENABLE_EXTENSIONS.contains(&e.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

/// Writes through a sibling temp file and renames it into place, so a crash
/// mid-save never leaves a truncated diagram behind.
fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let tmp = path.with_file_name(format!(".{}.tmp", file_name(path)));
    fs::write(&tmp, bytes).map_err(|e| format!("Could not write {}: {e}", path.display()))?;
    fs::rename(&tmp, path).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        format!("Could not save {}: {e}", path.display())
    })
}

#[tauri::command]
fn read_text_file(path: String) -> Result<OpenedFile, String> {
    let p = PathBuf::from(&path);
    let contents =
        fs::read_to_string(&p).map_err(|e| format!("Could not open {}: {e}", p.display()))?;
    Ok(OpenedFile {
        name: file_name(&p),
        path,
        contents,
    })
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    write_atomic(Path::new(&path), contents.as_bytes())
}

/// Binary writes (PNG / PDF exports) arrive as a raw IPC body to avoid the cost
/// of JSON-encoding large byte arrays. The target path travels in a
/// percent-encoded `x-path` header.
#[tauri::command]
fn write_binary_file(request: Request<'_>) -> Result<(), String> {
    let header = request
        .headers()
        .get("x-path")
        .and_then(|v| v.to_str().ok())
        .ok_or("Missing x-path header")?;
    let path = percent_decode_str(header)
        .decode_utf8()
        .map_err(|e| format!("Invalid path: {e}"))?;
    match request.body() {
        InvokeBody::Raw(bytes) => write_atomic(Path::new(path.as_ref()), bytes),
        InvokeBody::Json(_) => Err("Expected a raw binary body".into()),
    }
}

fn recent_store(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join("recent-files.json"))
}

fn load_recent(app: &AppHandle) -> Vec<RecentFile> {
    recent_store(app)
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str::<Vec<RecentFile>>(&s).ok())
        .unwrap_or_default()
        .into_iter()
        .filter(|f| Path::new(&f.path).exists())
        .collect()
}

fn save_recent(app: &AppHandle, files: &[RecentFile]) {
    if let Some(store) = recent_store(app) {
        if let Some(dir) = store.parent() {
            let _ = fs::create_dir_all(dir);
        }
        if let Ok(json) = serde_json::to_string_pretty(files) {
            let _ = write_atomic(&store, json.as_bytes());
        }
    }
}

#[tauri::command]
fn get_recent_files(app: AppHandle) -> Vec<RecentFile> {
    load_recent(&app)
}

#[tauri::command]
fn add_recent_file(app: AppHandle, path: String) -> Vec<RecentFile> {
    let mut files = load_recent(&app);
    files.retain(|f| f.path != path);
    files.insert(
        0,
        RecentFile {
            name: file_name(Path::new(&path)),
            path,
        },
    );
    files.truncate(MAX_RECENT);
    save_recent(&app, &files);
    files
}

#[tauri::command]
fn clear_recent_files(app: AppHandle) {
    save_recent(&app, &[]);
}

/// Returns (once) the file the app was launched with, if any.
#[tauri::command]
fn take_launch_file(state: State<'_, LaunchFile>) -> Option<String> {
    state.0.lock().ok().and_then(|mut f| f.take())
}

/// Windows and Linux pass "Open with" files as command-line arguments.
fn launch_file_from_args() -> Option<String> {
    std::env::args()
        .skip(1)
        .map(PathBuf::from)
        .find(|p| is_openable(p) && p.exists())
        .map(|p| p.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // `opendraw --export …` (see cli.rs): headless export, window stays hidden.
    let export_job = cli::job_from_env();
    let exporting = export_job.is_some();
    if exporting {
        cli::start_watchdog();
    }
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(LaunchFile(Mutex::new(if exporting { None } else { launch_file_from_args() })))
        .manage(cli::CliExport(Mutex::new(export_job)))
        .manage(ai::AiState::default())
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            write_binary_file,
            get_recent_files,
            add_recent_file,
            clear_recent_files,
            take_launch_file,
            ai::ai_set_key,
            ai::ai_has_key,
            ai::ai_delete_key,
            ai::ai_request,
            cli::take_export_job,
            cli::cli_log,
            cli::cli_exit,
        ])
        .setup(move |app| {
            if exporting {
                #[cfg(target_os = "macos")]
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                return Ok(());
            }
            // The window starts hidden and the UI reveals it after its first
            // paint (no white flash). This is a safety net in case it never does.
            if let Some(window) = app.get_webview_window("main") {
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let _ = window.show();
                });
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building OpenDraw");

    app.run(|_app, _event| {
        // macOS delivers "Open with" / double-clicked files as an event.
        #[cfg(any(target_os = "macos", target_os = "ios"))]
        if let tauri::RunEvent::Opened { urls } = &_event {
            if let Some(path) = urls
                .iter()
                .filter_map(|u| u.to_file_path().ok())
                .find(|p| is_openable(p))
            {
                let path = path.to_string_lossy().into_owned();
                if let Some(state) = _app.try_state::<LaunchFile>() {
                    if let Ok(mut f) = state.0.lock() {
                        *f = Some(path.clone());
                    }
                }
                let _ = _app.emit("opendraw://open-file", path);
            }
        }
    });
}
