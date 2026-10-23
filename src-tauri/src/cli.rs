//! Command-line export (docs/cli-export.md):
//!
//! ```text
//! opendraw --export <input.opendraw|.drawio> --format png|svg|pdf|jpg|webp|html|vsdx|drawio
//!          --output <path> [--page N | --all-pages] [--scale 2] [--transparent] [--border 10] [--embed]
//! ```
//!
//! Arguments are parsed here before the UI starts. With `--export` the window
//! stays hidden, the job is parked in managed state and the front end
//! (src/app/cliExport.ts) fetches it with `take_export_job`, renders with the
//! regular exporters, reports through `cli_log` and ends with `cli_exit`.

use std::{
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
};

use serde::Serialize;
use tauri::State;

/// Seconds after which a stuck export gives up.
const WATCHDOG_SECS: u64 = 300;

pub const USAGE: &str = "\
Usage: opendraw --export <input> [options]

Exports a diagram (.opendraw, .drawio, .xml) without opening the editor.

Options:
  -x, --export <input>    Diagram to export
  -f, --format <fmt>      png | svg | pdf | jpg | webp | html | vsdx | drawio | url
                          (default: from the output extension, else png)
  -o, --output <path>     Output file (default: input name with the format's extension).
                          Several outputs (--all-pages with an image format) are written
                          as <name>-1.<ext>, <name>-2.<ext>…, or into <path> if it ends with / or \\
  -p, --page <n>          Page to export, 1-based (default: 1)
  -a, --all-pages         Export every page (PDF/HTML/VSDX/draw.io: one file; images: one file per page)
  -s, --scale <k>         Raster scale, e.g. 2 for 192 dpi (default: 1)
  -b, --border <px>       Border around the drawing in px (default: 0)
  -t, --transparent       Transparent background (PNG, WebP, SVG, HTML)
  -e, --embed             Embed the diagram so the PNG/SVG/PDF stays editable
  -q, --quality <0-100>   JPEG/WebP quality (default: 90)
  -h, --help              Show this help

Exit codes: 0 success, 1 export failed, 2 invalid arguments, 3 timed out.";

/// One export request. Serialized camelCase for the front end (`CliExportJob`).
#[derive(Serialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExportJob {
    pub input: String,
    pub format: String,
    pub output: Option<String>,
    pub page: Option<u32>,
    pub all_pages: bool,
    pub scale: Option<f64>,
    pub transparent: bool,
    pub border: Option<f64>,
    pub embed: bool,
    pub quality: Option<f64>,
}

/// The pending job, handed to the UI once.
#[derive(Default)]
pub struct CliExport(pub Mutex<Option<ExportJob>>);

#[derive(Debug, PartialEq)]
pub enum Parsed {
    Help,
    Job(ExportJob),
}

const FORMATS: [&str; 11] = [
    "png", "svg", "pdf", "jpg", "jpeg", "webp", "html", "vsdx", "drawio", "xml", "url",
];

/// True when the command line asks for a CLI export.
pub fn is_export_invocation(args: &[String]) -> bool {
    args.iter()
        .any(|a| a == "-x" || a == "--export" || a.starts_with("--export="))
}

fn absolute(path: &str) -> String {
    let p = Path::new(path);
    if p.is_absolute() {
        return path.to_string();
    }
    std::env::current_dir()
        .map(|d| d.join(p))
        .unwrap_or_else(|_| PathBuf::from(p))
        .to_string_lossy()
        .into_owned()
}

fn number<T: std::str::FromStr>(name: &str, v: &str) -> Result<T, String> {
    v.parse::<T>()
        .map_err(|_| format!("{name} expects a number, got \"{v}\""))
}

/// Parses export arguments (without the program name).
pub fn parse_args<I: IntoIterator<Item = String>>(args: I) -> Result<Parsed, String> {
    let mut job = ExportJob::default();
    let mut input: Option<String> = None;
    let mut format: Option<String> = None;
    let mut it = args.into_iter().peekable();

    while let Some(raw) = it.next() {
        // Support both `--flag value` and `--flag=value`.
        let (flag, inline) = match raw.split_once('=') {
            Some((f, v)) if f.starts_with("--") => (f.to_string(), Some(v.to_string())),
            _ => (raw.clone(), None),
        };
        let mut value = |name: &str| -> Result<String, String> {
            if let Some(v) = inline.clone() {
                return Ok(v);
            }
            match it.next() {
                Some(v) if !(v.starts_with('-') && v.len() > 1 && v.parse::<f64>().is_err()) => {
                    Ok(v)
                }
                _ => Err(format!("{name} needs a value")),
            }
        };
        match flag.as_str() {
            "-h" | "--help" => return Ok(Parsed::Help),
            "-x" | "--export" => {
                // `--export` may also be a bare flag with the input given positionally (draw.io style).
                if inline.is_some() {
                    input = inline.clone();
                } else if let Some(next) = it.peek() {
                    if !next.starts_with('-') {
                        input = it.next();
                    }
                }
            }
            "-f" | "--format" => format = Some(value("--format")?.to_ascii_lowercase()),
            "-o" | "--output" => job.output = Some(value("--output")?),
            "-p" | "--page" | "--page-index" => {
                let n: u32 = number("--page", &value("--page")?)?;
                if n == 0 {
                    return Err("--page is 1-based".into());
                }
                job.page = Some(n);
            }
            "-a" | "--all-pages" => job.all_pages = true,
            "-s" | "--scale" => {
                let k: f64 = number("--scale", &value("--scale")?)?;
                if !(k > 0.0 && k <= 16.0) {
                    return Err("--scale must be between 0 and 16".into());
                }
                job.scale = Some(k);
            }
            "-b" | "--border" => {
                let b: f64 = number("--border", &value("--border")?)?;
                job.border = Some(b.max(0.0));
            }
            "-t" | "--transparent" => job.transparent = true,
            "-e" | "--embed" | "--embed-diagram" => job.embed = true,
            "-q" | "--quality" => {
                let q: f64 = number("--quality", &value("--quality")?)?;
                job.quality = Some(q.clamp(1.0, 100.0));
            }
            // Desktop flags (config.rs) are accepted and ignored by exports.
            "--enable-plugins" => {}
            "--config" => {
                value("--config")?;
            }
            other if other.starts_with('-') && other.len() > 1 => {
                return Err(format!("unknown option {other}"));
            }
            _ => {
                if input.is_none() {
                    input = Some(raw);
                } else {
                    return Err(format!("unexpected argument \"{raw}\""));
                }
            }
        }
    }

    let input = input.ok_or("missing input file (--export <input>)")?;
    if job.page.is_some() && job.all_pages {
        return Err("use either --page or --all-pages".into());
    }
    let format = match format {
        Some(f) => f,
        None => job
            .output
            .as_deref()
            .and_then(|o| Path::new(o).extension())
            .map(|e| e.to_string_lossy().to_ascii_lowercase())
            .filter(|e| FORMATS.contains(&e.as_str()))
            .unwrap_or_else(|| "png".into()),
    };
    if !FORMATS.contains(&format.as_str()) {
        return Err(format!("unsupported format \"{format}\""));
    }
    job.format = format;
    job.input = absolute(&input);
    job.output = job.output.as_deref().map(absolute);
    Ok(Parsed::Job(job))
}

/// GUI-subsystem builds on Windows have no console: attach to the parent's so
/// `println!` reaches the terminal (unless stdout is already redirected).
#[cfg(windows)]
fn attach_parent_console() {
    #[link(name = "kernel32")]
    extern "system" {
        fn AttachConsole(process_id: u32) -> i32;
        fn GetStdHandle(std_handle: u32) -> *mut core::ffi::c_void;
    }
    const ATTACH_PARENT_PROCESS: u32 = u32::MAX;
    const STD_OUTPUT_HANDLE: u32 = -11i32 as u32;
    // SAFETY: plain Win32 calls without pointers; failures are harmless (no console to attach to).
    unsafe {
        if GetStdHandle(STD_OUTPUT_HANDLE).is_null() {
            AttachConsole(ATTACH_PARENT_PROCESS);
        }
    }
}

#[cfg(not(windows))]
fn attach_parent_console() {}

fn flush() {
    let _ = std::io::stdout().flush();
    let _ = std::io::stderr().flush();
}

/// Reads the process arguments. Returns the export job when `--export` was
/// given; prints help / errors and exits for invalid or help invocations.
pub fn job_from_env() -> Option<ExportJob> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if !is_export_invocation(&args) {
        return None;
    }
    attach_parent_console();
    match parse_args(args) {
        Ok(Parsed::Help) => {
            println!("{USAGE}");
            flush();
            std::process::exit(0);
        }
        Ok(Parsed::Job(job)) => {
            if !Path::new(&job.input).is_file() {
                eprintln!("opendraw: input file not found: {}", job.input);
                flush();
                std::process::exit(2);
            }
            Some(job)
        }
        Err(e) => {
            eprintln!("opendraw: {e}\n\n{USAGE}");
            flush();
            std::process::exit(2);
        }
    }
}

/// Exits if the front end never finishes (e.g. the webview failed to load).
pub fn start_watchdog() {
    std::thread::spawn(|| {
        std::thread::sleep(std::time::Duration::from_secs(WATCHDOG_SECS));
        eprintln!("opendraw: export timed out after {WATCHDOG_SECS}s");
        flush();
        std::process::exit(3);
    });
}

#[tauri::command]
pub fn take_export_job(state: State<'_, CliExport>) -> Option<ExportJob> {
    state.0.lock().ok().and_then(|mut j| j.take())
}

#[tauri::command]
pub fn cli_log(message: String, error: Option<bool>) {
    if error.unwrap_or(false) {
        eprintln!("{message}");
    } else {
        println!("{message}");
    }
    flush();
}

#[tauri::command]
pub fn cli_exit(code: i32) {
    flush();
    std::process::exit(code);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(s: &str) -> Vec<String> {
        s.split_whitespace().map(String::from).collect()
    }

    fn job(s: &str) -> ExportJob {
        match parse_args(args(s)).expect("parses") {
            Parsed::Job(j) => j,
            Parsed::Help => panic!("unexpected help"),
        }
    }

    #[test]
    fn detects_export_mode() {
        assert!(is_export_invocation(&args("--export a.opendraw")));
        assert!(is_export_invocation(&args("-x a.opendraw")));
        assert!(!is_export_invocation(&args("a.opendraw")));
    }

    #[test]
    fn parses_full_command() {
        let j = job("--export /d/a.opendraw --format pdf --output /d/out.pdf --all-pages --scale 2 --transparent --border 10 --embed");
        assert!(j.input.ends_with("a.opendraw"));
        assert_eq!(j.format, "pdf");
        assert!(j.output.unwrap().ends_with("out.pdf"));
        assert!(j.all_pages && j.transparent && j.embed);
        assert_eq!(j.scale, Some(2.0));
        assert_eq!(j.border, Some(10.0));
    }

    #[test]
    fn infers_format_and_accepts_equals_syntax() {
        let j = job("-x /d/a.drawio --output=/d/b.svg --page=2");
        assert_eq!(j.format, "svg");
        assert_eq!(j.page, Some(2));
        let j = job("--export --format jpg /d/a.drawio");
        assert_eq!(j.format, "jpg");
        assert!(j.input.ends_with("a.drawio"));
    }

    #[test]
    fn rejects_bad_input() {
        assert!(parse_args(args("--export")).is_err());
        assert!(parse_args(args("--export a.opendraw --format bmp")).is_err());
        assert!(parse_args(args("--export a.opendraw --page 0")).is_err());
        assert!(parse_args(args("--export a.opendraw --page 2 --all-pages")).is_err());
        assert!(parse_args(args("--export a.opendraw --scale x")).is_err());
        assert!(parse_args(args("--export a.opendraw --bogus")).is_err());
        assert!(parse_args(args("--export a.opendraw --enable-plugins --config c.json")).is_ok());
        assert_eq!(
            parse_args(args("--export a.opendraw --help")),
            Ok(Parsed::Help)
        );
    }
}
