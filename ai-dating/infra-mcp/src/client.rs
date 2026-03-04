use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use thiserror::Error;
use tracing::debug;

#[derive(Debug, Error)]
pub enum McpClientError {
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("JSON-RPC error {code}: {message}")]
    JsonRpc { code: i64, message: String },
    #[error("invalid response: {0}")]
    InvalidResponse(String),
}

#[derive(Debug, Serialize)]
struct JsonRpcRequest<'a> {
    jsonrpc: &'a str,
    id: u64,
    method: &'a str,
    params: Value,
}

#[derive(Debug, Deserialize)]
struct JsonRpcResponse {
    result: Option<Value>,
    error: Option<JsonRpcErrorObj>,
}

#[derive(Debug, Deserialize)]
struct JsonRpcErrorObj {
    code: i64,
    message: String,
}

/// Generic MCP client that speaks JSON-RPC 2.0 over HTTP.
#[derive(Clone)]
pub struct McpClient {
    base_url: String,
    auth_token: Option<String>,
    http: Client,
}

impl McpClient {
    pub fn new(base_url: impl Into<String>, auth_token: Option<String>) -> Self {
        Self {
            base_url: base_url.into(),
            auth_token,
            http: Client::new(),
        }
    }

    /// Call a tool on the MCP server.
    pub async fn call_tool(
        &self,
        tool_name: &str,
        params: Value,
    ) -> Result<Value, McpClientError> {
        let req = JsonRpcRequest {
            jsonrpc: "2.0",
            id: 1,
            method: tool_name,
            params,
        };

        debug!(tool = tool_name, url = %self.base_url, "MCP call_tool");

        let mut http_req = self.http.post(&self.base_url).json(&req);

        if let Some(ref token) = self.auth_token {
            http_req = http_req.bearer_auth(token);
        }

        let resp: JsonRpcResponse = http_req
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        if let Some(err) = resp.error {
            return Err(McpClientError::JsonRpc {
                code: err.code,
                message: err.message,
            });
        }

        resp.result
            .ok_or_else(|| McpClientError::InvalidResponse("missing result field".into()))
    }
}
