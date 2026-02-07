//! Trader Agent
//!
//! The "executor" of the swarm. Only activates when given explicit permission
//! from the Guardian (via ExecutionPermit pheromone). Executes the rebalance
//! trade and updates the simulated portfolio balance.

use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use tokio::time::{interval, Duration};
use tracing::{debug, info, warn};

use crate::agents::guardian::ExecutionPermit;
use crate::agents::Agent;
use crate::core::blackboard::{AgentMetrics, PortfolioState, TradeLogEntry};
use crate::core::physics::PheromoneType;
use crate::core::{Blackboard, Config};

/// Trade execution record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeRecord {
    pub trade_id: String,
    pub action: String,
    pub stocks_delta: f64,
    pub bonds_delta: f64,
    pub before_state: PortfolioState,
    pub after_state: PortfolioState,
    pub vix_at_execution: f64,
    pub timestamp: String,
}

pub struct TraderAgent {
    name: String,
    config: Arc<Config>,
    running: AtomicBool,
    active: AtomicBool,
    action_count: AtomicU64,
    /// Tracks the last consumed permit timestamp to prevent duplicate trades
    last_permit_timestamp: tokio::sync::RwLock<Option<String>>,
}

impl TraderAgent {
    pub fn new(config: Arc<Config>) -> Self {
        Self {
            name: "Trader".to_string(),
            config,
            running: AtomicBool::new(false),
            active: AtomicBool::new(false),
            action_count: AtomicU64::new(0),
            last_permit_timestamp: tokio::sync::RwLock::new(None),
        }
    }

    /// Get the number of trades executed
    pub fn trade_count(&self) -> u64 {
        self.action_count.load(Ordering::SeqCst)
    }
}

#[async_trait]
impl Agent for TraderAgent {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
        info!("🛑 Trader agent stopping...");
    }
    
    fn is_active(&self) -> bool {
        self.active.load(Ordering::SeqCst)
    }
    
    async fn run(&self, board: Arc<Blackboard>) -> Result<()> {
        self.running.store(true, Ordering::SeqCst);
        let sniff_interval = Duration::from_millis(self.config.agent.sniff_interval_ms);
        let mut ticker = interval(sniff_interval);
        
        info!("💰 Trader agent started (awaiting execution permits)");
        
        while self.running.load(Ordering::SeqCst) {
            ticker.tick().await;
            
            // Sniff for execution permit
            let permit: Option<ExecutionPermit> = board
                .sniff(PheromoneType::ExecutionPermit)
                .await?;
            
            if let Some(exec_permit) = permit {
                // Idempotency check: skip if we already consumed this permit
                {
                    let last = self.last_permit_timestamp.read().await;
                    if last.as_deref() == Some(&exec_permit.timestamp) {
                        debug!("Trader: Duplicate permit detected ({}), skipping.", exec_permit.timestamp);
                        continue;
                    }
                }
                
                // Record this permit as consumed
                {
                    let mut last = self.last_permit_timestamp.write().await;
                    *last = Some(exec_permit.timestamp.clone());
                }
                
                self.active.store(true, Ordering::SeqCst);
                
                info!(
                    "📜 Trader: Execution permit received! VIX={:.2} Action: {}",
                    exec_permit.vix_value,
                    exec_permit.drift_analysis.recommended_action
                );
                
                // Execute the trade (simulated)
                match self.execute_trade(&board, &exec_permit).await {
                    Ok(record) => {
                        info!(
                            "✅ TRADE EXECUTED: {} | Δ Stocks: ${:.2} | Δ Bonds: ${:.2}",
                            record.action,
                            record.stocks_delta,
                            record.bonds_delta
                        );
                        
                        // Deposit trade record for audit trail
                        board.deposit(PheromoneType::TradeExecuted, record.clone()).await?;
                        self.action_count.fetch_add(1, Ordering::SeqCst);
                        
                        // Log to persistent trade history
                        let log_entry = TradeLogEntry {
                            id: uuid::Uuid::new_v4().to_string(),
                            timestamp: chrono::Utc::now().to_rfc3339(),
                            action: record.action.clone(),
                            symbol: if record.stocks_delta.abs() > 0.01 {
                                self.config.portfolio.stocks_symbol.clone()
                            } else {
                                self.config.portfolio.bonds_symbol.clone()
                            },
                            amount: record.stocks_delta.abs(),
                            price: record.before_state.stocks_value / 100.0, // approximate per-share
                            portfolio_value: record.after_state.stocks_value + record.after_state.bonds_value,
                            drift_before: exec_permit.drift_analysis.drift_pct,
                            drift_after: 0.0, // Will improve when multi-asset is connected
                        };
                        let _ = board.log_trade(&log_entry).await;
                        
                        let _ = board.set_agent_metrics(&AgentMetrics {
                            name: "Trader".to_string(),
                            is_active: true,
                            action_count: self.action_count.load(Ordering::SeqCst),
                            last_action: format!("Executed: {}", record.action),
                            last_action_time: Some(chrono::Utc::now().to_rfc3339()),
                        }).await;
                    }
                    Err(e) => {
                        tracing::error!("Trader: Failed to execute trade: {}", e);
                        let _ = board.set_agent_metrics(&AgentMetrics {
                            name: "Trader".to_string(),
                            is_active: false,
                            action_count: self.action_count.load(Ordering::SeqCst),
                            last_action: format!("Error: {}", e),
                            last_action_time: Some(chrono::Utc::now().to_rfc3339()),
                        }).await;
                    }
                }
                
                self.active.store(false, Ordering::SeqCst);
            } else {
                debug!("Trader: No execution permit. Dormant.");
            }
        }
        
        Ok(())
    }
}

impl TraderAgent {
    async fn execute_trade(
        &self,
        board: &Blackboard,
        permit: &ExecutionPermit,
    ) -> Result<TradeRecord> {
        let before_state = board.get_portfolio_state().await?.unwrap_or_default();
        let target = board.get_target_allocation().await?;
        
        // Calculate the trade amounts to reach target allocation
        let total_value = before_state.total_value;
        let target_stocks_value = total_value * (target.stocks_pct / 100.0);
        let target_bonds_value = total_value * (target.bonds_pct / 100.0);
        
        let stocks_delta = target_stocks_value - before_state.stocks_value;
        let bonds_delta = target_bonds_value - before_state.bonds_value;
        
        let action = if stocks_delta > 0.0 {
            format!("BUY ${:.2} stocks, SELL ${:.2} bonds", stocks_delta.abs(), bonds_delta.abs())
        } else {
            format!("SELL ${:.2} stocks, BUY ${:.2} bonds", stocks_delta.abs(), bonds_delta.abs())
        };
        
        // Update portfolio state
        let after_state = PortfolioState {
            total_value,
            stocks_value: target_stocks_value,
            bonds_value: target_bonds_value,
            stocks_pct: target.stocks_pct,
            bonds_pct: target.bonds_pct,
            last_trade_time: Some(chrono::Utc::now().to_rfc3339()),
        };
        
        board.set_portfolio_state(&after_state).await?;
        
        let record = TradeRecord {
            trade_id: uuid::Uuid::new_v4().to_string(),
            action: action.clone(),
            stocks_delta,
            bonds_delta,
            before_state,
            after_state,
            vix_at_execution: permit.vix_value,
            timestamp: chrono::Utc::now().to_rfc3339(),
        };
        
        Ok(record)
    }
}
