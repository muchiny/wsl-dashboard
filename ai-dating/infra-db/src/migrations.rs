/// SQL migration statements.
pub const CREATE_MATCHES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    site TEXT NOT NULL,
    profile_json JSONB NOT NULL,
    region_stats_json JSONB,
    score_value DOUBLE PRECISION NOT NULL,
    score_confidence DOUBLE PRECISION NOT NULL,
    score_summary TEXT NOT NULL,
    advice TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"#;

pub const CREATE_REGION_STATS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS region_stats (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    population BIGINT,
    median_income DOUBLE PRECISION,
    poverty_rate REAL,
    unemployment_rate REAL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"#;

/// Run all migrations on the given pool.
pub async fn run_migrations(pool: &sqlx::PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(CREATE_MATCHES_TABLE).execute(pool).await?;
    sqlx::query(CREATE_REGION_STATS_TABLE).execute(pool).await?;
    Ok(())
}
