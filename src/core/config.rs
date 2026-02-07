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
    #[serde(default)]
    pub trade_log: TradeLogConfig,
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
    /// Multi-asset definitions (preferred)
    #[serde(default)]
    pub assets: Vec<AssetConfig>,
    
    /// Legacy 2-asset fallback
    #[serde(default = "default_spy")]
    pub stocks_symbol: String,
    #[serde(default = "default_bnd")]
    pub bonds_symbol: String,
    #[serde(default = "default_60")]
    pub default_stocks_pct: f64,
    #[serde(default = "default_40")]
    pub default_bonds_pct: f64,
    pub drift_threshold: f64,
    pub initial_balance: f64,
}

/// Individual asset configuration for multi-asset portfolios
#[derive(Debug, Clone, Deserialize, serde::Serialize)]
pub struct AssetConfig {
    pub symbol: String,
    #[serde(default)]
    pub name: String,
    pub target_pct: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MarketConfig {
    pub poll_interval_ms: u64,
    pub vix_high_threshold: f64,
    pub vix_low_threshold: f64,
    /// VIX data source: "simulation" or "cboe"
    #[serde(default = "default_vix_source")]
    pub vix_source: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AgentConfig {
    pub sniff_interval_ms: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TradeLogConfig {
    #[serde(default = "default_max_entries")]
    pub max_entries: usize,
}

fn default_spy() -> String { "SPY".to_string() }
fn default_bnd() -> String { "BND".to_string() }
fn default_60() -> f64 { 60.0 }
fn default_40() -> f64 { 40.0 }
fn default_vix_source() -> String { "simulation".to_string() }
fn default_max_entries() -> usize { 500 }

impl Default for TradeLogConfig {
    fn default() -> Self {
        Self { max_entries: 500 }
    }
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
    
    /// Get portfolio assets — returns multi-asset list or falls back to 2-asset legacy
    pub fn assets(&self) -> Vec<AssetConfig> {
        if !self.portfolio.assets.is_empty() {
            self.portfolio.assets.clone()
        } else {
            vec![
                AssetConfig {
                    symbol: self.portfolio.stocks_symbol.clone(),
                    name: "Stocks".to_string(),
                    target_pct: self.portfolio.default_stocks_pct,
                },
                AssetConfig {
                    symbol: self.portfolio.bonds_symbol.clone(),
                    name: "Bonds".to_string(),
                    target_pct: self.portfolio.default_bonds_pct,
                },
            ]
        }
    }
    
    /// Get decay rate for a pheromone type (deprecated: use PheromoneType::decay_rate())
    pub fn decay_rate(&self, pheromone_type: &str) -> f64 {
        match pheromone_type {
            "price_freshness" => self.pheromones.price_freshness_decay,
            "rebalance_opportunity" => self.pheromones.rebalance_opportunity_decay,
            "execution_permit" => self.pheromones.execution_permit_decay,
            "trade_executed" => self.pheromones.trade_executed_decay,
            _ => 0.3,
        }
    }
    
    /// Get activation threshold for a pheromone type (deprecated: use PheromoneType::threshold())
    pub fn threshold(&self, pheromone_type: &str) -> f64 {
        match pheromone_type {
            "price_freshness" => self.thresholds.price_freshness,
            "rebalance_opportunity" => self.thresholds.rebalance_opportunity,
            "execution_permit" => self.thresholds.execution_permit,
            "trade_executed" => self.thresholds.trade_executed,
            _ => 0.5,
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
                assets: vec![
                    AssetConfig {
                        symbol: "SPY".to_string(),
                        name: "S&P 500 ETF".to_string(),
                        target_pct: 60.0,
                    },
                    AssetConfig {
                        symbol: "BND".to_string(),
                        name: "Total Bond ETF".to_string(),
                        target_pct: 40.0,
                    },
                ],
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
                vix_source: "simulation".to_string(),
            },
            agent: AgentConfig {
                sniff_interval_ms: 500,
            },
            trade_log: TradeLogConfig::default(),
        }
    }
}
