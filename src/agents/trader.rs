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
use tracing::{debug, info};

use crate::agents::guardian::ExecutionPermit;
use crate::agents::Agent;
use crate::core::blackboard::PortfolioState;
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
}

impl TraderAgent {
    pub fn new(config: Arc<Config>) -> Self {
        Self {
            name: "Trader".to_string(),
            config,
            running: AtomicBool::new(false),
            active: AtomicBool::new(false),
            action_count: AtomicU64::new(0),
        }
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
                        board.deposit(PheromoneType::TradeExecuted, record).await?;
                        self.action_count.fetch_add(1, Ordering::SeqCst);
                    }
                    Err(e) => {
                        tracing::error!("Trader: Failed to execute trade: {}", e);
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
