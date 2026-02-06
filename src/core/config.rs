//! Configuration Management
//! 
//! Loads settings from config.toml including pheromone decay rates,
//! portfolio allocations, and market data parameters.

use anyhow::Result;
use serde::Deserialize;
use std::path::Path;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub pheromones: PheromoneConfig,
    pub thresholds: ThresholdConfig,
    pub portfolio: PortfolioConfig,
    pub market: MarketConfig,
    pub agent: AgentConfig,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PheromoneConfig {
    pub price_freshness_decay: f64,
    pub rebalance_opportunity_decay: f64,
    pub execution_permit_decay: f64,
    pub trade_executed_decay: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ThresholdConfig {
    pub price_freshness: f64,
    pub rebalance_opportunity: f64,
    pub execution_permit: f64,
    pub trade_executed: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PortfolioConfig {
    pub stocks_symbol: String,
    pub bonds_symbol: String,
    pub default_stocks_pct: f64,
    pub default_bonds_pct: f64,
    pub drift_threshold: f64,
    pub initial_balance: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MarketConfig {
    pub poll_interval_ms: u64,
    pub vix_high_threshold: f64,
    pub vix_low_threshold: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AgentConfig {
    pub sniff_interval_ms: u64,
}

impl Config {
    /// Load configuration from file
    pub fn load(path: impl AsRef<Path>) -> Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let config: Config = toml::from_str(&content)?;
        Ok(config)
    }
    
    /// Load from default location (config.toml in project root)
    pub fn load_default() -> Result<Self> {
        Self::load("config.toml")
    }
    
    /// Get decay rate for a pheromone type
    pub fn decay_rate(&self, pheromone_type: &str) -> f64 {
        match pheromone_type {
            "price_freshness" => self.pheromones.price_freshness_decay,
            "rebalance_opportunity" => self.pheromones.rebalance_opportunity_decay,
            "execution_permit" => self.pheromones.execution_permit_decay,
            "trade_executed" => self.pheromones.trade_executed_decay,
            _ => 0.3, // Default decay rate
        }
    }
    
    /// Get activation threshold for a pheromone type
    pub fn threshold(&self, pheromone_type: &str) -> f64 {
        match pheromone_type {
            "price_freshness" => self.thresholds.price_freshness,
            "rebalance_opportunity" => self.thresholds.rebalance_opportunity,
            "execution_permit" => self.thresholds.execution_permit,
            "trade_executed" => self.thresholds.trade_executed,
            _ => 0.5, // Default threshold
        }
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            pheromones: PheromoneConfig {
                price_freshness_decay: 0.3,
                rebalance_opportunity_decay: 0.2,
                execution_permit_decay: 0.5,
                trade_executed_decay: 0.1,
            },
            thresholds: ThresholdConfig {
                price_freshness: 0.7,
                rebalance_opportunity: 0.6,
                execution_permit: 0.5,
                trade_executed: 0.3,
            },
            portfolio: PortfolioConfig {
                stocks_symbol: "SPY".to_string(),
                bonds_symbol: "BND".to_string(),
                default_stocks_pct: 60.0,
                default_bonds_pct: 40.0,
                drift_threshold: 5.0,
                initial_balance: 100000.0,
            },
            market: MarketConfig {
                poll_interval_ms: 5000,
                vix_high_threshold: 25.0,
                vix_low_threshold: 15.0,
            },
            agent: AgentConfig {
                sniff_interval_ms: 500,
            },
        }
    }
}
