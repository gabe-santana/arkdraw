//! Extra editor windows (File → New window, "Open in new window").
//!
//! Every window runs its own copy of the editor with its own document. The
//! first window is `main` (tauri.conf.json); extra ones are `editor-<n>`, which
//! `capabilities/default.json` grants the same permissions through the
//! `editor-*` pattern. A file to open in a new window is parked under the new
//! label and fetched by that window's UI with `take_launch_file`.

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

use crate::LaunchFiles;

/// Offset of a new window from the one that opened it (logical px).
const CASCADE: f64 = 28.0;

fn next_label(app: &AppHandle) -> String {
    (2u32..)
        .map(|n| format!("editor-{n}"))
        .find(|l| app.get_webview_window(l).is_none())
        .expect("a free window label")
}

/// Opens a new editor window, optionally loading `path` in it. Returns the
/// new window's label.
///
/// Async on purpose: creating a window from a synchronous command deadlocks
/// on Windows.
#[tauri::command]
pub async fn open_new_window(
    app: AppHandle,
    window: WebviewWindow,
    path: Option<String>,
) -> Result<String, String> {
    let label = next_label(&app);
    if let Some(path) = path {
        if let Ok(mut files) = app.state::<LaunchFiles>().0.lock() {
            files.insert(label.clone(), path);
        }
    }

    let mut builder = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App("index.html".into()))
        .title("OpenDraw")
        .min_inner_size(960.0, 600.0)
        .resizable(true)
        // Hidden until the UI's first paint, like the main window.
        .visible(false)
        .focused(true)
        .disable_drag_drop_handler();

    // Same size as the source window, cascaded down and to the right.
    match (window.scale_factor(), window.inner_size(), window.outer_position()) {
        (Ok(scale), Ok(size), Ok(pos)) => {
            let size = size.to_logical::<f64>(scale);
            let pos = pos.to_logical::<f64>(scale);
            builder = builder
                .inner_size(size.width, size.height)
                .position(pos.x + CASCADE, pos.y + CASCADE);
        }
        _ => builder = builder.inner_size(1440.0, 900.0).center(),
    }

    // Mirror tauri.macos.conf.json / tauri.conf.json window chrome.
    #[cfg(target_os = "macos")]
    {
        builder = builder
            .decorations(true)
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true)
            .traffic_light_position(tauri::LogicalPosition::new(16.0, 22.0));
    }
    #[cfg(not(target_os = "macos"))]
    {
        builder = builder.decorations(false).shadow(true);
    }

    let new_window = builder.build().map_err(|e| {
        if let Ok(mut files) = app.state::<LaunchFiles>().0.lock() {
            files.remove(&label);
        }
        format!("Could not open a new window: {e}")
    })?;

    // Safety net in case the UI never reveals it.
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(3));
        let _ = new_window.show();
    });
    Ok(label)
}

/// The window that should receive a file opened from the OS while running:
/// the focused one, else `main`, else any.
#[cfg_attr(not(any(target_os = "macos", target_os = "ios")), allow(dead_code))]
pub fn target_window_label(app: &AppHandle) -> Option<String> {
    let windows = app.webview_windows();
    windows
        .iter()
        .find(|(_, w)| w.is_focused().unwrap_or(false))
        .map(|(l, _)| l.clone())
        .or_else(|| windows.contains_key("main").then(|| "main".to_string()))
        .or_else(|| windows.keys().next().cloned())
}
