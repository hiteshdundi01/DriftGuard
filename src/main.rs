//! DriftGuard: Stigmergic Portfolio Stabilizer
//!
//! A demonstration of antifragile swarm intelligence for automated
//! portfolio rebalancing. Agents communicate indirectly through
//! time-decaying pheromones on a shared blackboard.
//!
//! When data sources fail, pheromones decay naturally, causing
//! downstream agents to go dormant - failing safely rather than
//! acting on stale data.

pub mod core;
pub mod agents;
pub mod market;
pub mod server;

use anyhow::Result;
use std::sync::Arc;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

use crate::agents::{Agent, AnalystAgent, GuardianAgent, SensorAgent, TraderAgent};
use crate::core::blackboard::PortfolioState;
use crate::core::{Blackboard, Config};
use crate::market::AlphaVantageProvider;
use crate::server::start_websocket_server;

#[tokio::main]
async fn main() -> Result<()> {
    // Load environment variables
    dotenv::dotenv().ok();
    
    // Initialize logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::DEBUG)
        .with_target(true)
        .with_thread_ids(false)
        .with_file(false)
        .with_line_number(false)
        .pretty()
        .init();
    
    info!("🚀 DriftGuard: Stigmergic Portfolio Stabilizer");
    info!("================================================");
    
    // Load configuration
    let config = Arc::new(Config::load_default().unwrap_or_else(|e| {
        tracing::warn!("Failed to load config.toml: {}. Using defaults.", e);
        Config::default()
    }));
    
    // Get Redis URL and API key from environment
    let redis_url = std::env::var("REDIS_URL")
        .unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());
    let api_key = std::env::var("ALPHA_VANTAGE_API_KEY")
        .unwrap_or_else(|_| "demo".to_string());
    let ws_port: u16 = std::env::var("WS_PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .unwrap_or(8080);
    
    // Initialize blackboard (Redis connection)
    let board = Arc::new(Blackboard::new(&redis_url, config.clone()).await?);
    
    // Initialize portfolio state
    let initial_portfolio = PortfolioState {
        total_value: config.portfolio.initial_balance,
        stocks_value: config.portfolio.initial_balance * (config.portfolio.default_stocks_pct / 100.0),
        bonds_value: config.portfolio.initial_balance * (config.portfolio.default_bonds_pct / 100.0),
        stocks_pct: config.portfolio.default_stocks_pct,
        bonds_pct: config.portfolio.default_bonds_pct,
        last_trade_time: None,
    };
    board.set_portfolio_state(&initial_portfolio).await?;
    board.set_target_allocation(
        config.portfolio.default_stocks_pct,
        config.portfolio.default_bonds_pct,
    ).await?;
    
    info!("📊 Initial portfolio: ${:.2} ({:.0}% stocks / {:.0}% bonds)",
        initial_portfolio.total_value,
        initial_portfolio.stocks_pct,
        initial_portfolio.bonds_pct
    );
    
    // Initialize market data provider
    let market: Arc<dyn crate::market::MarketDataProvider> = Arc::new(
        AlphaVantageProvider::new(&api_key)
    );
    
    // Create agents
    let sensor = Arc::new(SensorAgent::new(config.clone(), market.clone()));
    let analyst = Arc::new(AnalystAgent::new(config.clone()));
    let guardian = Arc::new(GuardianAgent::new(config.clone(), market.clone()));
    let trader = Arc::new(TraderAgent::new(config.clone()));
    
    info!("🐝 Initializing agent swarm...");
    info!("  👁️  Sensor  - Ingests market data");
    info!("  🧠 Analyst - Calculates drift");
    info!("  🛡️  Guardian - Volatility circuit breaker");
    info!("  💰 Trader  - Executes trades");
    
    // Start WebSocket server for dashboard
    let ws_board = board.clone();
    tokio::spawn(async move {
        if let Err(e) = start_websocket_server(ws_port, ws_board).await {
            tracing::error!("WebSocket server error: {}", e);
        }
    });
    
    // Start all agents concurrently
    let sensor_board = board.clone();
    let sensor_handle = tokio::spawn(async move {
        sensor.run(sensor_board).await
    });
    
    let analyst_board = board.clone();
    let analyst_handle = tokio::spawn(async move {
        analyst.run(analyst_board).await
    });
    
    let guardian_board = board.clone();
    let guardian_handle = tokio::spawn(async move {
        guardian.run(guardian_board).await
    });
    
    let trader_board = board.clone();
    let trader_handle = tokio::spawn(async move {
        trader.run(trader_board).await
    });
    
    info!("================================================");
    info!("🌐 Dashboard WebSocket: ws://localhost:{}/ws", ws_port);
    info!("💚 Health check: http://localhost:{}/health", ws_port);
    info!("================================================");
    info!("Press Ctrl+C to stop the swarm");
    
    // Wait for shutdown signal
    tokio::signal::ctrl_c().await?;
    
    info!("🛑 Shutting down swarm...");
    
    // The agents will stop when their tasks are dropped
    drop(sensor_handle);
    drop(analyst_handle);
    drop(guardian_handle);
    drop(trader_handle);
    
    info!("👋 DriftGuard stopped");
    
    Ok(())
}
