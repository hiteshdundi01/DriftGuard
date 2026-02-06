//! Market Data Module
//!
//! Provides real-time market data from Alpha Vantage API.
//! Includes stock prices and VIX volatility index.

pub mod alpha_vantage;

use anyhow::Result;
use async_trait::async_trait;

pub use alpha_vantage::AlphaVantageProvider;

/// Trait for market data providers
#[async_trait]
pub trait MarketDataProvider: Send + Sync {
    /// Get current price for a symbol (e.g., "SPY", "BND")
    async fn get_price(&self, symbol: &str) -> Result<f64>;
    
    /// Get current VIX (CBOE Volatility Index)
    async fn get_vix(&self) -> Result<f64>;
}
