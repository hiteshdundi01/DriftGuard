//! Guardian Agent
//!
//! The "circuit breaker" of the swarm. Monitors market volatility (VIX)
//! and only permits trade execution when conditions are stable.
//! This is the key safety mechanism that prevents trading during high volatility.

use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use tokio::time::{interval, Duration};
use tracing::{debug, error, info, warn};

use crate::agents::analyst::DriftAnalysis;
use crate::agents::Agent;
use crate::core::physics::PheromoneType;
use crate::core::{Blackboard, Config};
use crate::market::MarketDataProvider;

/// Execution permit with volatility assessment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionPermit {
    pub vix_value: f64,
    pub volatility_status: String,
    pub drift_analysis: DriftAnalysis,
    pub timestamp: String,
}

pub struct GuardianAgent {
    name: String,
    config: Arc<Config>,
    market: Arc<dyn MarketDataProvider>,
    running: AtomicBool,
    active: AtomicBool,
    action_count: AtomicU64,
}

impl GuardianAgent {
    pub fn new(config: Arc<Config>, market: Arc<dyn MarketDataProvider>) -> Self {
        Self {
            name: "Guardian".to_string(),
            config,
            market,
            running: AtomicBool::new(false),
            active: AtomicBool::new(false),
            action_count: AtomicU64::new(0),
        }
    }
}

#[async_trait]
impl Agent for GuardianAgent {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
        info!("🛑 Guardian agent stopping...");
    }
    
    fn is_active(&self) -> bool {
        self.active.load(Ordering::SeqCst)
    }
    
    async fn run(&self, board: Arc<Blackboard>) -> Result<()> {
        self.running.store(true, Ordering::SeqCst);
        let sniff_interval = Duration::from_millis(self.config.agent.sniff_interval_ms);
        let mut ticker = interval(sniff_interval);
        
        info!("🛡️ Guardian agent started (VIX threshold: {} - {})",
            self.config.market.vix_low_threshold,
            self.config.market.vix_high_threshold
        );
        
        while self.running.load(Ordering::SeqCst) {
            ticker.tick().await;
            
            // Sniff for rebalance opportunity
            let analysis: Option<DriftAnalysis> = board
                .sniff(PheromoneType::RebalanceOpportunity)
                .await?;
            
            if let Some(drift_analysis) = analysis {
                self.active.store(true, Ordering::SeqCst);
                
                // Check market volatility
                match self.market.get_vix().await {
                    Ok(vix) => {
                        let volatility_status = if vix < self.config.market.vix_low_threshold {
                            "LOW"
                        } else if vix > self.config.market.vix_high_threshold {
                            "HIGH"
                        } else {
                            "MODERATE"
                        };
                        
                        info!(
                            "🌡️ Guardian: VIX = {:.2} ({})",
                            vix, volatility_status
                        );
                        
                        if vix <= self.config.market.vix_high_threshold {
                            // Volatility acceptable - permit execution
                            info!(
                                "✅ Guardian: Volatility acceptable! Issuing execution permit for: {}",
                                drift_analysis.recommended_action
                            );
                            
                            let permit = ExecutionPermit {
                                vix_value: vix,
                                volatility_status: volatility_status.to_string(),
                                drift_analysis,
                                timestamp: chrono::Utc::now().to_rfc3339(),
                            };
                            
                            board.deposit(PheromoneType::ExecutionPermit, permit).await?;
                            self.action_count.fetch_add(1, Ordering::SeqCst);
                        } else {
                            // High volatility - HALT the chain
                            warn!(
                                "🚫 Guardian: HIGH VOLATILITY! VIX {:.2} > threshold {}. Trade BLOCKED!",
                                vix,
                                self.config.market.vix_high_threshold
                            );
                            // Not depositing ExecutionPermit = Trader will never activate
                            // This is the "circuit breaker" behavior
                        }
                    }
                    Err(e) => {
                        error!("Guardian: Failed to fetch VIX: {}. Halting for safety.", e);
                        // When uncertain, don't trade - antifragile behavior
                    }
                }
                
                self.active.store(false, Ordering::SeqCst);
            } else {
                debug!("Guardian: No rebalance opportunity. Dormant.");
            }
        }
        
        Ok(())
    }
}
