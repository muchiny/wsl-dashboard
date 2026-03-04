use thiserror::Error;

#[derive(Debug, Error)]
pub enum DomainError {
    #[error("profile not found: site={site}, id={id}")]
    ProfileNotFound { site: String, id: String },

    #[error("MCP call failed: {0}")]
    McpError(String),

    #[error("INSEE API error: {0}")]
    InseeError(String),

    #[error("database error: {0}")]
    DatabaseError(String),

    #[error("invalid input: {0}")]
    InvalidInput(String),

    #[error("{0}")]
    Other(String),
}
