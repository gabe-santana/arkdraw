//! AI assistant backend (bring-your-own-key).
//!
//! API keys are stored in the OS keychain and never handed back to the
//! webview. The front end builds provider requests without credentials and
//! asks `ai_request` to send them; this module injects the auth header and only
//! talks to the provider's own host — Amazon Bedrock: its regional runtime
//! host; Azure: the user's Azure resource the key was saved for; Ollama and
//! custom OpenAI-compatible endpoints: the origin the user saved the key for.

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
    XAi,
    DeepSeek,
    Mistral,
    OpenRouter,
    Groq,
    Moonshot,
    Qwen,
    ZAi,
    Together,
    Fireworks,
    Cerebras,
    Azure,
    Bedrock,
    Vertex,
    Cloudflare,
    Ollama,
    Custom,
}

impl Provider {
    fn parse(id: &str) -> Result<Self, String> {
        match id {
            "anthropic" => Ok(Self::Anthropic),
            "openai" => Ok(Self::OpenAi),
            "gemini" => Ok(Self::Gemini),
            "xai" => Ok(Self::XAi),
            "deepseek" => Ok(Self::DeepSeek),
            "mistral" => Ok(Self::Mistral),
            "openrouter" => Ok(Self::OpenRouter),
            "groq" => Ok(Self::Groq),
            "moonshot" => Ok(Self::Moonshot),
            "qwen" => Ok(Self::Qwen),
            "zai" => Ok(Self::ZAi),
            "together" => Ok(Self::Together),
            "fireworks" => Ok(Self::Fireworks),
            "cerebras" => Ok(Self::Cerebras),
            "azure" => Ok(Self::Azure),
            "bedrock" => Ok(Self::Bedrock),
            "vertex" => Ok(Self::Vertex),
            "cloudflare" => Ok(Self::Cloudflare),
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
            Self::XAi => "xai",
            Self::DeepSeek => "deepseek",
            Self::Mistral => "mistral",
            Self::OpenRouter => "openrouter",
            Self::Groq => "groq",
            Self::Moonshot => "moonshot",
            Self::Qwen => "qwen",
            Self::ZAi => "zai",
            Self::Together => "together",
            Self::Fireworks => "fireworks",
            Self::Cerebras => "cerebras",
            Self::Azure => "azure",
            Self::Bedrock => "bedrock",
            Self::Vertex => "vertex",
            Self::Cloudflare => "cloudflare",
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
            Self::XAi => Some("api.x.ai"),
            Self::DeepSeek => Some("api.deepseek.com"),
            Self::Mistral => Some("api.mistral.ai"),
            Self::OpenRouter => Some("openrouter.ai"),
            Self::Groq => Some("api.groq.com"),
            Self::Moonshot => Some("api.moonshot.ai"),
            Self::Qwen => Some("dashscope-intl.aliyuncs.com"),
            Self::ZAi => Some("api.z.ai"),
            Self::Together => Some("api.together.xyz"),
            Self::Fireworks => Some("api.fireworks.ai"),
            Self::Cerebras => Some("api.cerebras.ai"),
            Self::Vertex => Some("aiplatform.googleapis.com"),
            Self::Cloudflare => Some("api.cloudflare.com"),
            Self::Azure | Self::Bedrock | Self::Ollama | Self::Custom => None,
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

/// Azure resource hosts the Azure provider may talk to (`<resource>.<suffix>`).
const AZURE_HOST_SUFFIXES: [&str; 3] = [".openai.azure.com", ".services.ai.azure.com", ".cognitiveservices.azure.com"];

fn is_azure_resource(url: &Url) -> bool {
    url.scheme() == "https"
        && url.port().is_none()
        && matches!(url.host(), Some(Host::Domain(d)) if AZURE_HOST_SUFFIXES.iter().any(|s| d.len() > s.len() && d.ends_with(s)))
}

/// An AWS region name: `us-east-1`, `ap-southeast-2`, `us-gov-west-1`…
fn is_aws_region(region: &str) -> bool {
    let parts: Vec<&str> = region.split('-').collect();
    parts.len() >= 3
        && parts[0].len() == 2
        && parts[0].bytes().all(|b| b.is_ascii_lowercase())
        && parts[1..parts.len() - 1].iter().all(|p| !p.is_empty() && p.bytes().all(|b| b.is_ascii_lowercase()))
        && matches!(parts[parts.len() - 1].as_bytes(), [d] if d.is_ascii_digit())
}

/// `https://bedrock-runtime.<region>.amazonaws.com`, the only place a Bedrock key goes.
fn is_bedrock_runtime(url: &Url) -> bool {
    url.scheme() == "https"
        && url.port().is_none()
        && url
            .host_str()
            .and_then(|h| h.strip_prefix("bedrock-runtime."))
            .and_then(|h| h.strip_suffix(".amazonaws.com"))
            .is_some_and(is_aws_region)
}

/// Checks that `url` is a destination this provider's key may be sent to.
fn authorize(p: Provider, url: &Url, stored: Option<&StoredKey>) -> Result<(), String> {
    if p == Provider::Bedrock {
        return if is_bedrock_runtime(url) {
            Ok(())
        } else {
            Err(format!("Blocked request to {url}: Bedrock requests must go to https://bedrock-runtime.<region>.amazonaws.com."))
        };
    }
    if p == Provider::Azure && !is_azure_resource(url) {
        return Err(format!("Blocked request to {url}: Azure requests must go to your Azure resource endpoint."));
    }
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
    let stored = if p.fixed_host().is_some() || p == Provider::Bedrock {
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
        if p == Provider::Azure && !is_azure_resource(&url) {
            return Err("Use your Azure resource endpoint, e.g. https://<resource>.services.ai.azure.com.".into());
        }
        if p == Provider::Azure && key.is_empty() {
            return Err("The API key is empty.".into());
        }
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
        Provider::OpenAi
        | Provider::XAi
        | Provider::DeepSeek
        | Provider::Mistral
        | Provider::OpenRouter
        | Provider::Groq
        | Provider::Moonshot
        | Provider::Qwen
        | Provider::ZAi
        | Provider::Together
        | Provider::Fireworks
        | Provider::Cerebras
        | Provider::Bedrock
        | Provider::Cloudflare => {
            if key.is_empty() {
                return Err(missing());
            }
            req.bearer_auth(key)
        }
        Provider::Gemini | Provider::Vertex => {
            if key.is_empty() {
                return Err(missing());
            }
            req.header("x-goog-api-key", key)
        }
        Provider::Azure | Provider::Ollama | Provider::Custom => {
            if key.is_empty() && p == Provider::Azure {
                return Err(missing());
            } else if key.is_empty() {
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

#[cfg(test)]
mod tests {
    use super::*;

    fn url(s: &str) -> Url {
        Url::parse(s).unwrap()
    }

    #[test]
    fn bedrock_only_reaches_regional_runtime_hosts() {
        assert!(is_bedrock_runtime(&url("https://bedrock-runtime.us-east-1.amazonaws.com/model/x/converse")));
        assert!(is_bedrock_runtime(&url("https://bedrock-runtime.us-gov-west-1.amazonaws.com/")));
        assert!(!is_bedrock_runtime(&url("http://bedrock-runtime.us-east-1.amazonaws.com/")));
        assert!(!is_bedrock_runtime(&url("https://bedrock-runtime.evil.com.amazonaws.com/")));
        assert!(!is_bedrock_runtime(&url("https://bedrock-runtime.us-east-1.amazonaws.com.evil.com/")));
        assert!(!is_bedrock_runtime(&url("https://bedrock.us-east-1.amazonaws.com/")));
        assert!(!is_bedrock_runtime(&url("https://bedrock-runtime.us-east-1.amazonaws.com:8443/")));
    }

    #[test]
    fn azure_only_reaches_azure_resources() {
        assert!(is_azure_resource(&url("https://my.services.ai.azure.com/openai/v1/chat/completions")));
        assert!(is_azure_resource(&url("https://my.openai.azure.com/openai/v1/models")));
        assert!(is_azure_resource(&url("https://my.cognitiveservices.azure.com/")));
        assert!(!is_azure_resource(&url("https://openai.azure.com/")));
        assert!(!is_azure_resource(&url("https://my.openai.azure.com.evil.com/")));
        assert!(!is_azure_resource(&url("http://my.openai.azure.com/")));
    }

    #[test]
    fn azure_keys_stay_on_the_saved_resource() {
        let stored = StoredKey { key: "k".into(), origin: Some("https://mine.openai.azure.com".into()), auth: None };
        assert!(authorize(Provider::Azure, &url("https://mine.openai.azure.com/openai/v1/models"), Some(&stored)).is_ok());
        assert!(authorize(Provider::Azure, &url("https://other.openai.azure.com/openai/v1/models"), Some(&stored)).is_err());
    }
}
