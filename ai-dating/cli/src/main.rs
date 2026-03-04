use std::sync::Arc;

use clap::{Parser, Subcommand};
use tracing::info;

use app_usecases::analyze_match::AnalyzeMatchUseCase;
use app_usecases::dashboard::GetDashboardStatsUseCase;
use app_usecases::sync_profiles::SyncProfilesUseCase;
use core_domain::entities::{DatingSite, UserPreferences};
use infra_mcp::inmemory::{
    InMemoryDatingRepository, InMemoryMatchHistoryRepository, InMemoryRegionStatsRepository,
};

#[derive(Parser)]
#[command(name = "dating-ia", about = "AI Dating analysis CLI")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Analyze a specific match
    Analyze {
        #[arg(long)]
        site: String,
        #[arg(long)]
        match_id: String,
    },
    /// Sync profiles from a dating site
    Sync {
        #[arg(long)]
        site: String,
        #[arg(long, default_value = "50")]
        limit: usize,
    },
    /// Show dashboard statistics
    Dashboard,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let _ = dotenvy::dotenv();
    let cli = Cli::parse();

    // Build in-memory repos (swap for real impls via config in production)
    let dating_repo = Arc::new(InMemoryDatingRepository::new());
    let region_repo = Arc::new(InMemoryRegionStatsRepository::new());
    let history_repo = Arc::new(InMemoryMatchHistoryRepository::new());

    match cli.command {
        Commands::Analyze { site, match_id } => {
            let site: DatingSite = site
                .parse()
                .map_err(|e: String| anyhow::anyhow!(e))?;

            let uc = AnalyzeMatchUseCase::new(
                dating_repo,
                region_repo,
                history_repo,
            );

            let prefs = UserPreferences::default();
            let analysis = uc.execute(site, &match_id, &prefs).await?;

            println!("\n=== Match Analysis ===");
            println!("Profile: {} ({})", analysis.profile.display_name, analysis.profile.site);
            println!("Score: {:.2} (confidence: {:.2})", analysis.score.value, analysis.score.confidence);
            println!("Summary: {}", analysis.score.summary);
            println!("Advice: {}", analysis.advice);

            if let Some(ref stats) = analysis.region_stats {
                println!("\nRegion: {} ({})", stats.name, stats.code.as_str());
                if let Some(pop) = stats.population {
                    println!("  Population: {pop}");
                }
                if let Some(income) = stats.median_income {
                    println!("  Median income: {income:.0}€");
                }
                if let Some(rate) = stats.unemployment_rate {
                    println!("  Unemployment: {:.1}%", rate * 100.0);
                }
            }
        }
        Commands::Sync { site, limit } => {
            let site: DatingSite = site
                .parse()
                .map_err(|e: String| anyhow::anyhow!(e))?;

            let uc = SyncProfilesUseCase::new(dating_repo);
            let profiles = uc.execute(site, limit).await?;

            info!(count = profiles.len(), "profiles synced");
            for p in &profiles {
                println!("  - {} ({}, age {:?})", p.display_name, p.site, p.age);
            }
        }
        Commands::Dashboard => {
            let uc = GetDashboardStatsUseCase::new(history_repo);
            let stats = uc.execute().await?;

            println!("\n=== Dashboard ===");
            println!("Total analyses: {}", stats.total_analyses);
            println!("Average score: {:.2}", stats.average_score);

            if !stats.by_site.is_empty() {
                println!("\nBy site:");
                for (site, s) in &stats.by_site {
                    println!("  {site}: {} matches, avg score {:.2}", s.count, s.average_score);
                }
            }

            if !stats.by_region.is_empty() {
                println!("\nBy region:");
                for (code, r) in &stats.by_region {
                    println!(
                        "  {} ({}): {} matches, avg score {:.2}",
                        r.region_name, code, r.count, r.average_score
                    );
                }
            }
        }
    }

    Ok(())
}
