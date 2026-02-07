//! Pheromone Physics Engine
//! 
//! Implements the mathematical model for time-decaying signals that enable
//! stigmergic coordination between agents. Each pheromone follows an 
//! exponential decay curve: I(t) = I₀ × e^(-λt)
//!
//! This creates "antifragile" behavior: when data sources fail, pheromones
//! decay naturally, causing downstream agents to go dormant rather than
//! acting on stale data.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::time::Instant;

use crate::core::Config;

/// A time-decaying signal used for indirect agent coordination
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pheromone {
    /// Initial intensity when deposited (typically 1.0)
    pub initial_intensity: f64,
    
    /// Decay rate (λ) - higher values = faster decay
    /// Half-life = ln(2) / decay_rate ≈ 0.693 / decay_rate
    pub decay_rate: f64,
    
    /// Timestamp when this pheromone was created
    pub created_at: DateTime<Utc>,
    
    /// Human-readable label for logging
    pub label: String,
}

impl Pheromone {
    /// Create a new pheromone with specified intensity and decay rate
    pub fn new(label: impl Into<String>, intensity: f64, decay_rate: f64) -> Self {
        Self {
            initial_intensity: intensity,
            decay_rate,
            created_at: Utc::now(),
            label: label.into(),
        }
    }
    
    /// Create a pheromone with default intensity (1.0)
    pub fn with_decay(label: impl Into<String>, decay_rate: f64) -> Self {
        Self::new(label, 1.0, decay_rate)
    }
    
    /// Calculate current intensity using exponential decay
    /// I(t) = I₀ × e^(-λt)
    pub fn current_intensity(&self) -> f64 {
        let elapsed_secs = (Utc::now() - self.created_at).num_milliseconds() as f64 / 1000.0;
        let intensity = self.initial_intensity * (-self.decay_rate * elapsed_secs).exp();
        
        // Clamp to valid range
        intensity.max(0.0).min(1.0)
    }
    
    /// Check if pheromone is still "active" (above threshold)
    pub fn is_active(&self, threshold: f64) -> bool {
        self.current_intensity() > threshold
    }
    
    /// Calculate time remaining until pheromone drops below threshold
    /// Returns None if already below threshold
    pub fn time_until_inactive(&self, threshold: f64) -> Option<f64> {
        let current = self.current_intensity();
        if current <= threshold {
            return None;
        }
        
        // Solve for t: threshold = I₀ × e^(-λt)
        // t = -ln(threshold/I₀) / λ
        let elapsed = (Utc::now() - self.created_at).num_milliseconds() as f64 / 1000.0;
        let total_time = -(threshold / self.initial_intensity).ln() / self.decay_rate;
        
        Some((total_time - elapsed).max(0.0))
    }
    
    /// Get the half-life of this pheromone in seconds
    pub fn half_life(&self) -> f64 {
        0.693 / self.decay_rate
    }
    
    /// Get age of pheromone in seconds
    pub fn age_secs(&self) -> f64 {
        (Utc::now() - self.created_at).num_milliseconds() as f64 / 1000.0
    }
}

/// Pheromone payload - wraps data with its associated pheromone
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(bound(serialize = "T: Serialize", deserialize = "T: serde::de::DeserializeOwned"))]
pub struct PheromonePayload<T> {
    /// The actual data being signaled
    pub data: T,
    
    /// The time-decaying pheromone attached to this data
    pub pheromone: Pheromone,
}

impl<T> PheromonePayload<T> {
    pub fn new(data: T, pheromone: Pheromone) -> Self {
        Self { data, pheromone }
    }
    
    /// Check if the data is still fresh (pheromone above threshold)
    pub fn is_fresh(&self, threshold: f64) -> bool {
        self.pheromone.is_active(threshold)
    }
    
    /// Get current intensity
    pub fn intensity(&self) -> f64 {
        self.pheromone.current_intensity()
    }
}

/// Standard pheromone types used in DriftGuard
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum PheromoneType {
    /// Deposited by Sensor when fresh market data is available
    PriceFreshness,
    
    /// Deposited by Analyst when portfolio drift exceeds threshold
    RebalanceOpportunity,
    
    /// Deposited by Guardian when volatility is acceptable
    ExecutionPermit,
    
    /// Deposited by Trader after executing a trade
    TradeExecuted,
}

impl PheromoneType {
    /// All pheromone types for iteration
    pub const ALL: [PheromoneType; 4] = [
        PheromoneType::PriceFreshness,
        PheromoneType::RebalanceOpportunity,
        PheromoneType::ExecutionPermit,
        PheromoneType::TradeExecuted,
    ];

    /// Get the Redis key for this pheromone type
    pub fn key(&self) -> &'static str {
        match self {
            Self::PriceFreshness => "pheromone:price_freshness",
            Self::RebalanceOpportunity => "pheromone:rebalance_opportunity",
            Self::ExecutionPermit => "pheromone:execution_permit",
            Self::TradeExecuted => "pheromone:trade_executed",
        }
    }
    
    /// Get human-readable label
    pub fn label(&self) -> &'static str {
        match self {
            Self::PriceFreshness => "Price Freshness",
            Self::RebalanceOpportunity => "Rebalance Opportunity",
            Self::ExecutionPermit => "Execution Permit",
            Self::TradeExecuted => "Trade Executed",
        }
    }

    /// Get decay rate from config (centralized — single source of truth)
    pub fn decay_rate(&self, config: &Config) -> f64 {
        match self {
            Self::PriceFreshness => config.pheromones.price_freshness_decay,
            Self::RebalanceOpportunity => config.pheromones.rebalance_opportunity_decay,
            Self::ExecutionPermit => config.pheromones.execution_permit_decay,
            Self::TradeExecuted => config.pheromones.trade_executed_decay,
        }
    }

    /// Get activation threshold from config (centralized — single source of truth)
    pub fn threshold(&self, config: &Config) -> f64 {
        match self {
            Self::PriceFreshness => config.thresholds.price_freshness,
            Self::RebalanceOpportunity => config.thresholds.rebalance_opportunity,
            Self::ExecutionPermit => config.thresholds.execution_permit,
            Self::TradeExecuted => config.thresholds.trade_executed,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread::sleep;
    use std::time::Duration;
    
    #[test]
    fn test_pheromone_decay() {
        let pheromone = Pheromone::new("test", 1.0, 1.0); // decay_rate = 1.0
        
        // At t=0, intensity should be ~1.0
        assert!((pheromone.current_intensity() - 1.0).abs() < 0.01);
        
        // After ~0.7 seconds (half-life for λ=1), intensity should be ~0.5
        sleep(Duration::from_millis(700));
        let intensity = pheromone.current_intensity();
        assert!(intensity > 0.4 && intensity < 0.6, "Got intensity: {}", intensity);
    }
    
    #[test]
    fn test_threshold_activation() {
        let pheromone = Pheromone::new("test", 1.0, 2.0); // Fast decay
        
        assert!(pheromone.is_active(0.5));
        
        // Wait for decay
        sleep(Duration::from_millis(500));
        
        // Should be below 0.5 threshold now
        assert!(!pheromone.is_active(0.5));
    }
    
    #[test]
    fn test_half_life_calculation() {
        let pheromone = Pheromone::new("test", 1.0, 0.3);
        let half_life = pheromone.half_life();
        
        // Half-life should be ~2.31 seconds for decay_rate=0.3
        assert!((half_life - 2.31).abs() < 0.1);
    }
}
