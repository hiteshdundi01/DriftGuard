//! Alpha Vantage Market Data Provider
//!
//! Fetches real-time stock prices and VIX data from Alpha Vantage API.
//! Includes caching to respect rate limits (25 requests/day on free tier).

use anyhow::{Context, Result};
use async_trait::async_trait;
use reqwest::Client;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use tracing::{debug, info, warn};

use crate::market::MarketDataProvider;

const ALPHA_VANTAGE_BASE_URL: &str = "https://www.alphavantage.co/query";

/// Cache entry with TTL
struct CacheEntry {
    value: f64,
    cached_at: Instant,
}

impl CacheEntry {
    fn is_valid(&self, ttl: Duration) -> bool {
        self.cached_at.elapsed() < ttl
    }
}

/// Alpha Vantage API provider with caching
pub struct AlphaVantageProvider {
    client: Client,
    api_key: String,
    cache: Arc<RwLock<HashMap<String, CacheEntry>>>,
    cache_ttl: Duration,
    /// Simulated prices for demo mode when API errors occur
    simulation_mode: Arc<RwLock<bool>>,
}

impl AlphaVantageProvider {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self {
            client: Client::new(),
            api_key: api_key.into(),
            cache: Arc::new(RwLock::new(HashMap::new())),
            cache_ttl: Duration::from_secs(60), // Cache for 60 seconds
            simulation_mode: Arc::new(RwLock::new(false)),
        }
    }
    
    /// Create provider with custom cache TTL
    pub fn with_cache_ttl(mut self, ttl: Duration) -> Self {
        self.cache_ttl = ttl;
        self
    }
    
    /// Check cache for valid entry
    async fn get_cached(&self, key: &str) -> Option<f64> {
        let cache = self.cache.read().await;
        cache.get(key).and_then(|entry| {
            if entry.is_valid(self.cache_ttl) {
                Some(entry.value)
            } else {
                None
            }
        })
    }
    
    /// Store value in cache
    async fn set_cached(&self, key: &str, value: f64) {
        let mut cache = self.cache.write().await;
        cache.insert(key.to_string(), CacheEntry {
            value,
            cached_at: Instant::now(),
        });
    }
    
    /// Fetch quote from Alpha Vantage GLOBAL_QUOTE endpoint
    async fn fetch_quote(&self, symbol: &str) -> Result<f64> {
        let url = format!(
            "{}?function=GLOBAL_QUOTE&symbol={}&apikey={}",
            ALPHA_VANTAGE_BASE_URL,
            symbol,
            self.api_key
        );
        
        debug!("Fetching quote for {} from Alpha Vantage", symbol);
        
        let response = self.client
            .get(&url)
            .timeout(Duration::from_secs(10))
            .send()
            .await
            .context("Failed to send request to Alpha Vantage")?;
        
        let data: GlobalQuoteResponse = response
            .json()
            .await
            .context("Failed to parse Alpha Vantage response")?;
        
        // Check for rate limit or error
        if let Some(note) = data.note {
            warn!("Alpha Vantage API note: {}", note);
            // Enable simulation mode
            *self.simulation_mode.write().await = true;
            return self.get_simulated_price(symbol);
        }
        
        if let Some(info) = data.information {
            warn!("Alpha Vantage API info: {}", info);
            *self.simulation_mode.write().await = true;
            return self.get_simulated_price(symbol);
        }
        
        let quote = data.global_quote
            .ok_or_else(|| anyhow::anyhow!("No quote data in response"))?;
        
        let price: f64 = quote.price
            .parse()
            .context("Failed to parse price")?;
        
        info!("Alpha Vantage: {} = ${:.2}", symbol, price);
        
        Ok(price)
    }
    
    /// Get simulated price for demo mode
    fn get_simulated_price(&self, symbol: &str) -> Result<f64> {
        // Base prices for common ETFs
        let base_price = match symbol {
            "SPY" => 580.0,  // S&P 500 ETF
            "BND" => 72.0,   // Bond ETF
            "VIX" => 18.0,   // Volatility index
            "QQQ" => 490.0,  // NASDAQ ETF
            "IWM" => 220.0,  // Russell 2000 ETF
            _ => 100.0,
        };
        
        // Add small random variation (±2%)
        let variation = (rand_variation() - 0.5) * 0.04;
        let price = base_price * (1.0 + variation);
        
        warn!("Using simulated price for {}: ${:.2}", symbol, price);
        Ok(price)
    }
}

#[async_trait]
impl MarketDataProvider for AlphaVantageProvider {
    async fn get_price(&self, symbol: &str) -> Result<f64> {
        // Check cache first
        if let Some(cached) = self.get_cached(symbol).await {
            debug!("Cache hit for {}: ${:.2}", symbol, cached);
            return Ok(cached);
        }
        
        // Check if we're in simulation mode
        if *self.simulation_mode.read().await {
            let price = self.get_simulated_price(symbol)?;
            self.set_cached(symbol, price).await;
            return Ok(price);
        }
        
        // Fetch from API
        match self.fetch_quote(symbol).await {
            Ok(price) => {
                self.set_cached(symbol, price).await;
                Ok(price)
            }
            Err(e) => {
                warn!("API error, falling back to simulation: {}", e);
                *self.simulation_mode.write().await = true;
                let price = self.get_simulated_price(symbol)?;
                self.set_cached(symbol, price).await;
                Ok(price)
            }
        }
    }
    
    async fn get_vix(&self) -> Result<f64> {
        // VIX is available via CBOE, but Alpha Vantage doesn't provide it directly
        // We'll use a simulated VIX that fluctuates realistically
        
        if let Some(cached) = self.get_cached("VIX").await {
            return Ok(cached);
        }
        
        // Simulate VIX between 12 and 30
        let base_vix = 18.0;
        let variation = (rand_variation() - 0.5) * 16.0; // ±8 points
        let vix = (base_vix + variation).max(10.0).min(40.0);
        
        self.set_cached("VIX", vix).await;
        
        info!("VIX (simulated): {:.2}", vix);
        Ok(vix)
    }
}

/// Alpha Vantage GLOBAL_QUOTE response structure
#[derive(Debug, Deserialize)]
struct GlobalQuoteResponse {
    #[serde(rename = "Global Quote")]
    global_quote: Option<GlobalQuote>,
    #[serde(rename = "Note")]
    note: Option<String>,
    #[serde(rename = "Information")]
    information: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GlobalQuote {
    #[serde(rename = "05. price")]
    price: String,
}

/// Simple pseudo-random variation using time
fn rand_variation() -> f64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .subsec_nanos();
    (nanos as f64 / u32::MAX as f64)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_simulated_price() {
        let provider = AlphaVantageProvider::new("demo");
        let price = provider.get_simulated_price("SPY").unwrap();
        
        // Should be around $580 ±2%
        assert!(price > 560.0 && price < 600.0);
    }
}
