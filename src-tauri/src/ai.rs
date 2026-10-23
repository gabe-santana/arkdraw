//! AI assistant backend (bring-your-own-key).
//!
//! API keys are stored in the OS keychain and never handed back to the
//! webview. The front end builds provider requests without credentials and
//! asks `ai_request` to send them; this module injects the auth header and only
//! talks to the provider's own host — or, for Ollama and custom
//! OpenAI-compatible endpoints, to the origin the user saved the key for.

use std::{collections::HashMap, time::Duration};

use serde::{Deserialize, Serialize};
use tauri::State;
use url::{Host, Url};

/// Keychain service name; the account name is the provider id.
const SERVICE: &str = "app.opendraw.desktop.ai";
const ANTHROPIC_VERSION: &str = "2023-06-01";

pub struct AiState {
    client: reqwest::Client,
}

impl Default for AiState {
    fn default() -> Self {
        let client = reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(20))
            .timeout(Duration::from_secs(600))
            // Never follow redirects: a redirect could carry the key elsewhere.
            .redirect(reqwest::redirect::Policy::none())
            .user_agent(concat!("OpenDraw/", env!("CARGO_PKG_VERSION")))
            .build()
            .expect("failed to build the HTTP client");
        Self { client }
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Provider {
    Anthropic,
    OpenAi,
    Gemini,
    Ollama,
    Custom,
}

impl Provider {
    fn parse(id: &str) -> Result<Self, String> {
        match id {
            "anthropic" => Ok(Self::Anthropic),
            "openai" => Ok(Self::OpenAi),
            "gemini" => Ok(Self::Gemini),
            "ollama" => Ok(Self::Ollama),
            "custom" => Ok(Self::Custom),
            _ => Err(format!("Unknown AI provider: {id}")),
        }
    }

    fn id(self) -> &'static str {
        match self {
            Self::Anthropic => "anthropic",
            Self::OpenAi => "openai",
            Self::Gemini => "gemini",
            Self::Ollama => "ollama",
            Self::Custom => "custom",
        }
    }

    /// Hosted providers can only be reached at their official API host.
    fn fixed_host(self) -> Option<&'static str> {
        match self {
            Self::Anthropic => Some("api.anthropic.com"),
            Self::OpenAi => Some("api.openai.com"),
            Self::Gemini => Some("generativelanguage.googleapis.com"),
            Self::Ollama | Self::Custom => None,
        }
    }
}

/// What is stored in the keychain (as JSON).
#[derive(Serialize, Deserialize, Default)]
struct StoredKey {
    key: String,
    /// Origin the key is bound to (Ollama / custom only).
    #[serde(default)]
    origin: Option<String>,
    /// Auth header style for custom endpoints: "bearer" or "api-key".
    #[serde(default)]
    auth: Option<String>,
}

#[derive(Serialize)]
pub struct AiResponse {
    status: u16,
    body: String,
}

fn entry(p: Provider) -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE, p.id()).map_err(|e| format!("The system keychain is unavailable: {e}"))
}

fn load_key(p: Provider) -> Result<Option<StoredKey>, String> {
    match entry(p)?.get_password() {
        Ok(raw) => Ok(Some(serde_json::from_str(&raw).unwrap_or(StoredKey {
            key: raw,
            ..StoredKey::default()
        }))),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Could not read the system keychain: {e}")),
    }
}

fn is_loopback(url: &Url) -> bool {
    match url.host() {
        Some(Host::Domain(d)) => d.eq_ignore_ascii_case("localhost"),
        Some(Host::Ipv4(ip)) => ip.is_loopback(),
        Some(Host::Ipv6(ip)) => ip.is_loopback(),
        None => false,
    }
}

fn parse_endpoint(raw: &str) -> Result<Url, String> {
    let url = Url::parse(raw.trim()).map_err(|e| format!("Invalid URL {raw}: {e}"))?;
    match url.scheme() {
        "https" | "http" if url.host().is_some() => Ok(url),
        _ => Err("Only http(s) endpoints are supported.".into()),
    }
}

/// Checks that `url` is a destination this provider's key may be sent to.
fn authorize(p: Provider, url: &Url, stored: Option<&StoredKey>) -> Result<(), String> {
    if let Some(host) = p.fixed_host() {
        let ok = url.scheme() == "https" && url.host_str() == Some(host) && url.port().is_none();
        return if ok {
            Ok(())
        } else {
            Err(format!("Blocked request to {url}: {} requests must go to https://{host}.", p.id()))
        };
    }
    let origin = url.origin().ascii_serialization();
    let bound = stored.and_then(|s| s.origin.as_deref()) == Some(origin.as_str());
    // A local Ollama needs no key, so loopback is always allowed for it.
    if bound || (p == Provider::Ollama && is_loopback(url)) {
        Ok(())
    } else {
        Err(format!(
            "The endpoint {origin} is not authorized. Save it in AI settings first."
        ))
    }
}

#[tauri::command]
pub async fn ai_set_key(
    provider: String,
    key: String,
    base_url: Option<String>,
    auth: Option<String>,
) -> Result<(), String> {
    let p = Provider::parse(&provider)?;
    let key = key.trim().to_string();
    let stored = if p.fixed_host().is_some() {
        if key.is_empty() {
            return Err("The API key is empty.".into());
        }
        StoredKey {
            key,
            ..StoredKey::default()
        }
    } else {
        let base = base_url.ok_or("A base URL is required for this provider.")?;
        let url = parse_endpoint(&base)?;
        StoredKey {
            key,
            origin: Some(url.origin().ascii_serialization()),
            auth: auth.filter(|a| a == "bearer" || a == "api-key"),
        }
    };
    let json = serde_json::to_string(&stored).map_err(|e| e.to_string())?;
    entry(p)?
        .set_password(&json)
        .map_err(|e| format!("Could not save to the system keychain: {e}"))
}

#[tauri::command]
pub async fn ai_has_key(provider: String) -> Result<bool, String> {
    let p = Provider::parse(&provider)?;
    Ok(load_key(p)?.map(|k| !k.key.is_empty()).unwrap_or(false))
}

#[tauri::command]
pub async fn ai_delete_key(provider: String) -> Result<(), String> {
    let p = Provider::parse(&provider)?;
    match entry(p)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Could not delete the key: {e}")),
    }
}

/// Sends a provider request with the stored key injected. The response body is
/// returned as text with its status code; the key itself never leaves Rust.
#[tauri::command]
pub async fn ai_request(
    state: State<'_, AiState>,
    provider: String,
    url: String,
    method: Option<String>,
    body: Option<String>,
    headers: Option<HashMap<String, String>>,
) -> Result<AiResponse, String> {
    let p = Provider::parse(&provider)?;
    let url = parse_endpoint(&url)?;
    let stored = load_key(p)?;
    authorize(p, &url, stored.as_ref())?;
    let key = stored.as_ref().map(|s| s.key.as_str()).unwrap_or("");

    let mut req = match method.as_deref().unwrap_or("POST") {
        "GET" => state.client.get(url),
        "POST" => state.client.post(url),
        other => return Err(format!("Unsupported method {other}")),
    };

    // Only a small set of non-auth headers may be supplied by the front end.
    if let Some(extra) = headers {
        for (name, value) in extra {
            if p == Provider::Anthropic && name.eq_ignore_ascii_case("anthropic-beta") {
                req = req.header("anthropic-beta", value);
            }
        }
    }

    let missing = || format!("Add your {} API key in AI settings.", p.id());
    req = match p {
        Provider::Anthropic => {
            if key.is_empty() {
                return Err(missing());
            }
            req.header("x-api-key", key)
                .header("anthropic-version", ANTHROPIC_VERSION)
        }
        Provider::OpenAi => {
            if key.is_empty() {
                return Err(missing());
            }
            req.bearer_auth(key)
        }
        Provider::Gemini => {
            if key.is_empty() {
                return Err(missing());
            }
            req.header("x-goog-api-key", key)
        }
        Provider::Ollama | Provider::Custom => {
            if key.is_empty() {
                req
            } else if stored.as_ref().and_then(|s| s.auth.as_deref()) == Some("api-key") {
                req.header("api-key", key)
            } else {
                req.bearer_auth(key)
            }
        }
    };

    if let Some(body) = body {
        req = req.header("content-type", "application/json").body(body);
    }

    let res = req.send().await.map_err(|e| {
        let e = e.without_url();
        if e.is_timeout() {
            "The request timed out.".to_string()
        } else if e.is_connect() {
            if p == Provider::Ollama {
                "Could not connect to Ollama. Is it running?".to_string()
            } else {
                format!("Could not connect: {e}")
            }
        } else {
            format!("Network error: {e}")
        }
    })?;
    let status = res.status().as_u16();
    let body = res
        .text()
        .await
        .map_err(|e| format!("Could not read the response: {}", e.without_url()))?;
    Ok(AiResponse { status, body })
}
