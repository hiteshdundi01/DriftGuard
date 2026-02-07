//! Analyst Agent
//! 
//! The "brain" of the swarm. Sniffs for fresh price data, calculates
//! portfolio drift, and deposits Rebalance_Opportunity if drift exceeds threshold.

use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use tokio::time::{interval, Duration};
use tracing::{debug, info, warn};

use crate::agents::sensor::MarketSnapshot;
use crate::agents::Agent;
use crate::core::blackboard::{AgentMetrics, PortfolioState};
use crate::core::physics::PheromoneType;
use crate::core::{Blackboard, Config};

/// Drift analysis payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriftAnalysis {
    pub current_stocks_pct: f64,
    pub current_bonds_pct: f64,
    pub target_stocks_pct: f64,
    pub target_bonds_pct: f64,
    pub drift_pct: f64,
    pub recommended_action: String,
    pub market_snapshot: MarketSnapshot,
}

pub struct AnalystAgent {
    name: String,
    config: Arc<Config>,
    running: AtomicBool,
    active: AtomicBool,
    action_count: AtomicU64,
}

impl AnalystAgent {
    pub fn new(config: Arc<Config>) -> Self {
        Self {
            name: "Analyst".to_string(),
            config,
            running: AtomicBool::new(false),
            active: AtomicBool::new(false),
            action_count: AtomicU64::new(0),
        }
    }

    /// Get the number of drift analyses performed
    pub fn action_count(&self) -> u64 {
        self.action_count.load(Ordering::SeqCst)
    }
}

#[async_trait]
impl Agent for AnalystAgent {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
        info!("🛑 Analyst agent stopping...");
    }
    
    fn is_active(&self) -> bool {
        self.active.load(Ordering::SeqCst)
    }
    
    async fn run(&self, board: Arc<Blackboard>) -> Result<()> {
        self.running.store(true, Ordering::SeqCst);
        let sniff_interval = Duration::from_millis(self.config.agent.sniff_interval_ms);
        let mut ticker = interval(sniff_interval);
        
        info!("🧠 Analyst agent started (sniffing every {}ms)", self.config.agent.sniff_interval_ms);
        
        while self.running.load(Ordering::SeqCst) {
            ticker.tick().await;
            
            // Sniff for fresh market data
            let market_data: Option<MarketSnapshot> = board
                .sniff(PheromoneType::PriceFreshness)
                .await?;
            
            if let Some(snapshot) = market_data {
                self.active.store(true, Ordering::SeqCst);
                
                // Get current portfolio state
                let portfolio = board.get_portfolio_state().await?.unwrap_or_default();
                let target = board.get_target_allocation().await?;
                
                // Calculate drift
                let drift = (portfolio.stocks_pct - target.stocks_pct).abs();
                
                info!(
                    "📈 Analyst: Current allocation {:.1}%/{:.1}% vs Target {:.1}%/{:.1}% = Drift {:.1}%",
                    portfolio.stocks_pct,
                    portfolio.bonds_pct,
                    target.stocks_pct,
                    target.bonds_pct,
                    drift
                );
                
                if drift > self.config.portfolio.drift_threshold {
                    let action = if portfolio.stocks_pct > target.stocks_pct {
                        "SELL stocks, BUY bonds"
                    } else {
                        "BUY stocks, SELL bonds"
                    };
                    
                    warn!(
                        "⚠️ Analyst: Drift {:.1}% exceeds threshold {:.1}%! Recommending: {}",
                        drift,
                        self.config.portfolio.drift_threshold,
                        action
                    );
                    
                    let analysis = DriftAnalysis {
                        current_stocks_pct: portfolio.stocks_pct,
                        current_bonds_pct: portfolio.bonds_pct,
                        target_stocks_pct: target.stocks_pct,
                        target_bonds_pct: target.bonds_pct,
                        drift_pct: drift,
                        recommended_action: action.to_string(),
                        market_snapshot: snapshot,
                    };
                    
                    // Deposit opportunity for Guardian
                    board.deposit(PheromoneType::RebalanceOpportunity, analysis).await?;
                    self.action_count.fetch_add(1, Ordering::SeqCst);
                    
                    let _ = board.set_agent_metrics(&AgentMetrics {
                        name: "Analyst".to_string(),
                        is_active: true,
                        action_count: self.action_count.load(Ordering::SeqCst),
                        last_action: format!("Drift {:.1}% — {}", drift, action),
                        last_action_time: Some(chrono::Utc::now().to_rfc3339()),
                    }).await;
                } else {
                    debug!("Analyst: Drift {:.1}% within threshold, no action needed", drift);
                    let _ = board.set_agent_metrics(&AgentMetrics {
                        name: "Analyst".to_string(),
                        is_active: true,
                        action_count: self.action_count.load(Ordering::SeqCst),
                        last_action: format!("Drift {:.1}% within threshold", drift),
                        last_action_time: Some(chrono::Utc::now().to_rfc3339()),
                    }).await;
                }
                
                self.active.store(false, Ordering::SeqCst);
            } else {
                // No fresh data - pheromone has decayed or sensor is down
                // This is safe failure! We simply don't act.
                debug!("Analyst: No fresh market data. Dormant.");
            }
        }
        
        Ok(())
    }
}
