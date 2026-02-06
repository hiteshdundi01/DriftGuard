//! Sensor Agent
//! 
//! The "eyes" of the swarm. Ingests real market data from Alpha Vantage
//! and deposits Price_Freshness pheromones for the Analyst to detect.

use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use tokio::time::{interval, Duration};
use tracing::{debug, error, info, warn};

use crate::agents::Agent;
use crate::core::physics::PheromoneType;
use crate::core::{Blackboard, Config};
use crate::market::MarketDataProvider;

/// Market data payload deposited by Sensor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketSnapshot {
    pub stocks_symbol: String,
    pub stocks_price: f64,
    pub bonds_symbol: String,
    pub bonds_price: f64,
    pub timestamp: String,
}

pub struct SensorAgent {
    name: String,
    config: Arc<Config>,
    market: Arc<dyn MarketDataProvider>,
    running: AtomicBool,
    active: AtomicBool,
    action_count: AtomicU64,
}

impl SensorAgent {
    pub fn new(config: Arc<Config>, market: Arc<dyn MarketDataProvider>) -> Self {
        Self {
            name: "Sensor".to_string(),
            config,
            market,
            running: AtomicBool::new(false),
            active: AtomicBool::new(false),
            action_count: AtomicU64::new(0),
        }
    }
}

#[async_trait]
impl Agent for SensorAgent {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
        info!("🛑 Sensor agent stopping...");
    }
    
    fn is_active(&self) -> bool {
        self.active.load(Ordering::SeqCst)
    }
    
    async fn run(&self, board: Arc<Blackboard>) -> Result<()> {
        self.running.store(true, Ordering::SeqCst);
        let poll_interval = Duration::from_millis(self.config.market.poll_interval_ms);
        let mut ticker = interval(poll_interval);
        
        info!("👁️ Sensor agent started (polling every {}ms)", self.config.market.poll_interval_ms);
        
        while self.running.load(Ordering::SeqCst) {
            ticker.tick().await;
            
            self.active.store(true, Ordering::SeqCst);
            
            // Fetch market data
            match self.fetch_and_deposit(&board).await {
                Ok(_) => {
                    self.action_count.fetch_add(1, Ordering::SeqCst);
                    debug!("Sensor: Successfully deposited market data");
                }
                Err(e) => {
                    error!("Sensor: Failed to fetch market data: {}", e);
                    // Don't deposit anything - pheromone will decay naturally
                    // This is the "antifragile" behavior!
                }
            }
            
            self.active.store(false, Ordering::SeqCst);
        }
        
        Ok(())
    }
}

impl SensorAgent {
    async fn fetch_and_deposit(&self, board: &Blackboard) -> Result<()> {
        // Get current prices
        let stocks_price = self.market.get_price(&self.config.portfolio.stocks_symbol).await?;
        let bonds_price = self.market.get_price(&self.config.portfolio.bonds_symbol).await?;
        
        let snapshot = MarketSnapshot {
            stocks_symbol: self.config.portfolio.stocks_symbol.clone(),
            stocks_price,
            bonds_symbol: self.config.portfolio.bonds_symbol.clone(),
            bonds_price,
            timestamp: chrono::Utc::now().to_rfc3339(),
        };
        
        info!(
            "📊 Market data: {} = ${:.2}, {} = ${:.2}",
            snapshot.stocks_symbol,
            snapshot.stocks_price,
            snapshot.bonds_symbol,
            snapshot.bonds_price
        );
        
        // Deposit pheromone for Analyst
        board.deposit(PheromoneType::PriceFreshness, snapshot).await?;
        
        Ok(())
    }
}
