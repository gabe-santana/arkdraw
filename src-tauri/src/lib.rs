//! ArkDraw native backend.
//!
//! The Rust side is intentionally small: the editor itself lives in the web
//! front end, and this crate provides what a browser cannot do on its own —
//! reading and writing files at arbitrary paths, remembering recently opened
//! documents, and handing files opened from the OS (double-click, "Open with")
//! to the UI.

mod ai;
mod cli;
mod config;
mod editor_windows;

use std::{
    collections::HashMap,
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

/// File extensions ArkDraw opens from the command line / file association.
/// (.vsdx is binary: the UI reads it with `read_binary_file`.)
const OPENABLE_EXTENSIONS: [&str; 4] = ["arkdraw", "drawio", "xml", "vsdx"];

/// Files to open in a window once its UI is ready, keyed by window label:
/// the file the app was launched with ("main") and files sent to new windows
/// (editor_windows.rs).
#[derive(Default)]
struct LaunchFiles(Mutex<HashMap<String, String>>);

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

/// `diagram.arkdraw` → `diagram.arkdraw.bkp` (same folder).
fn backup_path(path: &Path) -> PathBuf {
    path.with_file_name(format!("{}.bkp", file_name(path)))
}

/// Copies the current file contents to its `.bkp` sibling. Best effort: a
/// failed backup never blocks the save itself.
fn write_backup(path: &Path) {
    if path.is_file() {
        if let Err(e) = fs::copy(path, backup_path(path)) {
            eprintln!("arkdraw: could not back up {}: {e}", path.display());
        }
    }
}

/// `backup: true` keeps the previous contents as `<file>.bkp` before writing.
#[tauri::command]
fn write_text_file(path: String, contents: String, backup: Option<bool>) -> Result<(), String> {
    let path = Path::new(&path);
    if backup.unwrap_or(false) {
        write_backup(path);
    }
    write_atomic(path, contents.as_bytes())
}

/// Raw bytes (e.g. .vsdx, .png) as an ArrayBuffer, without JSON encoding.
#[tauri::command]
fn read_binary_file(path: String) -> Result<tauri::ipc::Response, String> {
    fs::read(&path)
        .map(tauri::ipc::Response::new)
        .map_err(|e| format!("Could not open {path}: {e}"))
}

/// Relaunches the app (after an update was installed).
#[tauri::command]
fn restart_app(app: AppHandle) {
    app.request_restart();
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

/// Returns (once) the file this window should open on startup, if any.
#[tauri::command]
fn take_launch_file(window: tauri::WebviewWindow, state: State<'_, LaunchFiles>) -> Option<String> {
    state
        .0
        .lock()
        .ok()
        .and_then(|mut f| f.remove(window.label()))
}

/// Windows and Linux pass "Open with" files as command-line arguments
/// (desktop flags already removed, see config.rs).
fn launch_file_from_args(args: &[String]) -> Option<String> {
    args.iter()
        .map(PathBuf::from)
        .find(|p| is_openable(p) && p.exists())
        .map(|p| p.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // `arkdraw --export …` (see cli.rs): headless export, window stays hidden.
    let export_job = cli::job_from_env();
    let exporting = export_job.is_some();
    if exporting {
        cli::start_watchdog();
    }
    // `--enable-plugins`, `--config <path>` (config.rs); the rest may name a file to open.
    let (flags, rest) = config::parse_flags(std::env::args().skip(1));
    let mut launch_files = HashMap::new();
    if !exporting {
        if let Some(path) = launch_file_from_args(&rest) {
            launch_files.insert("main".to_string(), path);
        }
    }
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(LaunchFiles(Mutex::new(launch_files)))
        .manage(config::DesktopState {
            flags,
            headless: exporting,
        })
        .manage(cli::CliExport(Mutex::new(export_job)))
        .manage(ai::AiState::default())
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            read_binary_file,
            write_binary_file,
            get_recent_files,
            add_recent_file,
            clear_recent_files,
            take_launch_file,
            restart_app,
            editor_windows::open_new_window,
            config::get_app_config,
            config::set_app_config,
            ai::ai_set_key,
            ai::ai_has_key,
            ai::ai_delete_key,
            ai::ai_request,
            cli::take_export_job,
            cli::cli_log,
            cli::cli_exit,
        ])
        .setup(move |app| {
            // Endpoint and public key: plugins.updater in tauri.conf.json.
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;
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
        .expect("error while building ArkDraw");

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
                // The focused window opens it (offering a new window if its
                // document has unsaved changes). Also parked for that window in
                // case its UI isn't listening yet (cold start).
                let label =
                    editor_windows::target_window_label(_app).unwrap_or_else(|| "main".to_string());
                if let Some(state) = _app.try_state::<LaunchFiles>() {
                    if let Ok(mut f) = state.0.lock() {
                        f.insert(label.clone(), path.clone());
                    }
                }
                let _ = _app.emit_to(label.as_str(), "arkdraw://open-file", path);
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn backup_sits_next_to_the_file() {
        let p = Path::new("/docs/flow.arkdraw");
        assert_eq!(backup_path(p), Path::new("/docs/flow.arkdraw.bkp"));
    }

    #[test]
    fn write_with_backup_keeps_previous_contents() {
        let dir = std::env::temp_dir().join(format!("arkdraw-bkp-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let file = dir.join("a.arkdraw");
        let path = file.to_string_lossy().into_owned();
        write_text_file(path.clone(), "v1".into(), Some(true)).unwrap();
        assert!(!backup_path(&file).exists(), "no backup for a new file");
        write_text_file(path.clone(), "v2".into(), Some(true)).unwrap();
        assert_eq!(fs::read_to_string(backup_path(&file)).unwrap(), "v1");
        write_text_file(path, "v3".into(), None).unwrap();
        assert_eq!(fs::read_to_string(backup_path(&file)).unwrap(), "v1");
        assert_eq!(fs::read_to_string(&file).unwrap(), "v3");
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn launch_file_accepts_diagrams_only() {
        let dir = std::env::temp_dir().join(format!("arkdraw-launch-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let vsdx = dir.join("b.vsdx");
        fs::write(&vsdx, b"PK").unwrap();
        let args = vec![
            dir.join("missing.drawio").to_string_lossy().into_owned(),
            dir.join("notes.txt").to_string_lossy().into_owned(),
            vsdx.to_string_lossy().into_owned(),
        ];
        assert_eq!(launch_file_from_args(&args), Some(args[2].clone()));
        let _ = fs::remove_dir_all(dir);
    }
}
