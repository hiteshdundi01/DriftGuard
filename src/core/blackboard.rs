//! Stigmergic Blackboard
//! 
//! Redis-backed shared environment for agent coordination. Agents never 
//! communicate directly - they only interact with this shared "blackboard"
//! by depositing and sniffing pheromones.
//!
//! This implements the core stigmergic pattern: indirect coordination
//! through environmental signals.

use anyhow::{Context, Result};
use redis::aio::ConnectionManager;
use redis::AsyncCommands;
use serde::{de::DeserializeOwned, Serialize};
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::{debug, info, trace, warn};

use crate::core::physics::{Pheromone, PheromonePayload, PheromoneType};
use crate::core::Config;

/// Event emitted when pheromone state changes
#[derive(Debug, Clone)]
pub struct PheromoneEvent {
    pub pheromone_type: String,
    pub intensity: f64,
    pub action: PheromoneAction,
}

#[derive(Debug, Clone)]
pub enum PheromoneAction {
    Deposited,
    Sniffed,
    Decayed,
}

/// The shared environment for stigmergic coordination
pub struct Blackboard {
    /// Redis connection manager (handles reconnection)
    redis: ConnectionManager,
    
    /// Configuration for decay rates and thresholds
    config: Arc<Config>,
    
    /// Broadcast channel for real-time updates (for dashboard)
    event_tx: broadcast::Sender<PheromoneEvent>,
}

impl Blackboard {
    /// Create a new blackboard connected to Redis
    pub async fn new(redis_url: &str, config: Arc<Config>) -> Result<Self> {
        let client = redis::Client::open(redis_url)
            .context("Failed to create Redis client")?;
        
        let redis = ConnectionManager::new(client)
            .await
            .context("Failed to connect to Redis")?;
        
        // Create broadcast channel for dashboard updates
        let (event_tx, _) = broadcast::channel(100);
        
        info!("Blackboard connected to Redis at {}", redis_url);
        
        Ok(Self {
            redis,
            config,
            event_tx,
        })
    }
    
    /// Deposit a pheromone with associated data
    /// 
    /// Agents call this to signal information to other agents
    pub async fn deposit<T: Serialize + Clone>(
        &self,
        pheromone_type: PheromoneType,
        data: T,
    ) -> Result<()> {
        let decay_rate = match pheromone_type {
            PheromoneType::PriceFreshness => self.config.pheromones.price_freshness_decay,
            PheromoneType::RebalanceOpportunity => self.config.pheromones.rebalance_opportunity_decay,
            PheromoneType::ExecutionPermit => self.config.pheromones.execution_permit_decay,
            PheromoneType::TradeExecuted => self.config.pheromones.trade_executed_decay,
        };
        
        let pheromone = Pheromone::with_decay(pheromone_type.label(), decay_rate);
        let payload = PheromonePayload::new(data, pheromone.clone());
        
        let serialized = serde_json::to_string(&payload)?;
        
        let mut conn = self.redis.clone();
        conn.set::<_, _, ()>(pheromone_type.key(), &serialized).await?;
        
        let intensity = pheromone.current_intensity();
        info!(
            "📤 DEPOSIT [{}] intensity={:.2} half-life={:.1}s",
            pheromone_type.label(),
            intensity,
            pheromone.half_life()
        );
        
        // Notify dashboard
        let _ = self.event_tx.send(PheromoneEvent {
            pheromone_type: pheromone_type.label().to_string(),
            intensity,
            action: PheromoneAction::Deposited,
        });
        
        Ok(())
    }
    
    /// Sniff for a pheromone - returns data only if pheromone is above threshold
    /// 
    /// This is the "olfactory activation" - agents only wake up when they
    /// detect a sufficiently strong signal
    pub async fn sniff<T: DeserializeOwned + Clone>(
        &self,
        pheromone_type: PheromoneType,
    ) -> Result<Option<T>> {
        let threshold = match pheromone_type {
            PheromoneType::PriceFreshness => self.config.thresholds.price_freshness,
            PheromoneType::RebalanceOpportunity => self.config.thresholds.rebalance_opportunity,
            PheromoneType::ExecutionPermit => self.config.thresholds.execution_permit,
            PheromoneType::TradeExecuted => self.config.thresholds.trade_executed,
        };
        
        let mut conn = self.redis.clone();
        let raw: Option<String> = conn.get(pheromone_type.key()).await?;
        
        let Some(serialized) = raw else {
            trace!("👃 SNIFF [{}] - no pheromone found", pheromone_type.label());
            return Ok(None);
        };
        
        let payload: PheromonePayload<T> = serde_json::from_str(&serialized)?;
        let intensity = payload.intensity();
        
        if payload.is_fresh(threshold) {
            debug!(
                "👃 SNIFF [{}] intensity={:.2} (threshold={:.2}) ✓ ACTIVE",
                pheromone_type.label(),
                intensity,
                threshold
            );
            
            let _ = self.event_tx.send(PheromoneEvent {
                pheromone_type: pheromone_type.label().to_string(),
                intensity,
                action: PheromoneAction::Sniffed,
            });
            
            Ok(Some(payload.data))
        } else {
            debug!(
                "👃 SNIFF [{}] intensity={:.2} (threshold={:.2}) ✗ DECAYED",
                pheromone_type.label(),
                intensity,
                threshold
            );
            
            let _ = self.event_tx.send(PheromoneEvent {
                pheromone_type: pheromone_type.label().to_string(),
                intensity,
                action: PheromoneAction::Decayed,
            });
            
            Ok(None)
        }
    }
    
    /// Get current intensity of a pheromone (for dashboard visualization)
    pub async fn get_intensity(&self, pheromone_type: PheromoneType) -> Result<f64> {
        let mut conn = self.redis.clone();
        let raw: Option<String> = conn.get(pheromone_type.key()).await?;
        
        let Some(serialized) = raw else {
            return Ok(0.0);
        };
        
        // Parse just to get the pheromone, ignore data type
        let payload: PheromonePayload<serde_json::Value> = serde_json::from_str(&serialized)?;
        Ok(payload.intensity())
    }
    
    /// Get all pheromone intensities (for dashboard)
    pub async fn get_all_intensities(&self) -> Result<Vec<(String, f64)>> {
        let types = [
            PheromoneType::PriceFreshness,
            PheromoneType::RebalanceOpportunity,
            PheromoneType::ExecutionPermit,
            PheromoneType::TradeExecuted,
        ];
        
        let mut result = Vec::new();
        for ptype in types {
            let intensity = self.get_intensity(ptype).await?;
            result.push((ptype.label().to_string(), intensity));
        }
        
        Ok(result)
    }
    
    /// Subscribe to pheromone events (for dashboard WebSocket)
    pub fn subscribe(&self) -> broadcast::Receiver<PheromoneEvent> {
        self.event_tx.subscribe()
    }
    
    /// Store portfolio state
    pub async fn set_portfolio_state(&self, state: &PortfolioState) -> Result<()> {
        let mut conn = self.redis.clone();
        let serialized = serde_json::to_string(state)?;
        conn.set::<_, _, ()>("state:portfolio", &serialized).await?;
        Ok(())
    }
    
    /// Get portfolio state
    pub async fn get_portfolio_state(&self) -> Result<Option<PortfolioState>> {
        let mut conn = self.redis.clone();
        let raw: Option<String> = conn.get("state:portfolio").await?;
        
        match raw {
            Some(s) => Ok(Some(serde_json::from_str(&s)?)),
            None => Ok(None),
        }
    }
    
    /// Store target allocation (from UI)
    pub async fn set_target_allocation(&self, stocks_pct: f64, bonds_pct: f64) -> Result<()> {
        let mut conn = self.redis.clone();
        let allocation = TargetAllocation { stocks_pct, bonds_pct };
        let serialized = serde_json::to_string(&allocation)?;
        conn.set::<_, _, ()>("config:target_allocation", &serialized).await?;
        info!("Target allocation updated: {}% stocks, {}% bonds", stocks_pct, bonds_pct);
        Ok(())
    }
    
    /// Get target allocation
    pub async fn get_target_allocation(&self) -> Result<TargetAllocation> {
        let mut conn = self.redis.clone();
        let raw: Option<String> = conn.get("config:target_allocation").await?;
        
        match raw {
            Some(s) => Ok(serde_json::from_str(&s)?),
            None => Ok(TargetAllocation {
                stocks_pct: self.config.portfolio.default_stocks_pct,
                bonds_pct: self.config.portfolio.default_bonds_pct,
            }),
        }
    }
    
    /// Clear all pheromones (for testing/reset)
    pub async fn clear_all(&self) -> Result<()> {
        let mut conn = self.redis.clone();
        let types = [
            PheromoneType::PriceFreshness,
            PheromoneType::RebalanceOpportunity,
            PheromoneType::ExecutionPermit,
            PheromoneType::TradeExecuted,
        ];
        
        for ptype in types {
            conn.del::<_, ()>(ptype.key()).await?;
        }
        
        warn!("🧹 All pheromones cleared");
        Ok(())
    }
}

/// Portfolio state stored in Redis
#[derive(Debug, Clone, Serialize, serde::Deserialize)]
pub struct PortfolioState {
    pub total_value: f64,
    pub stocks_value: f64,
    pub bonds_value: f64,
    pub stocks_pct: f64,
    pub bonds_pct: f64,
    pub last_trade_time: Option<String>,
}

/// Target allocation set via UI
#[derive(Debug, Clone, Serialize, serde::Deserialize)]
pub struct TargetAllocation {
    pub stocks_pct: f64,
    pub bonds_pct: f64,
}

impl Default for PortfolioState {
    fn default() -> Self {
        Self {
            total_value: 100000.0,
            stocks_value: 60000.0,
            bonds_value: 40000.0,
            stocks_pct: 60.0,
            bonds_pct: 40.0,
            last_trade_time: None,
        }
    }
}
