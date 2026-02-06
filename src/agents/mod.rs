//! Agent Module
//! 
//! Implements the four agents of the DriftGuard swarm:
//! - Sensor: Ingests market data, deposits Price_Freshness
//! - Analyst: Calculates drift, deposits Rebalance_Opportunity
//! - Guardian: Checks volatility, deposits Execution_Permit
//! - Trader: Executes trades

pub mod sensor;
pub mod analyst;
pub mod guardian;
pub mod trader;

use async_trait::async_trait;
use std::sync::Arc;

pub use sensor::SensorAgent;
pub use analyst::AnalystAgent;
pub use guardian::GuardianAgent;
pub use trader::TraderAgent;

use crate::core::Blackboard;

/// Base trait for all stigmergic agents
/// 
/// Agents follow a simple pattern:
/// 1. Sniff the environment for relevant pheromones
/// 2. If pheromone is above threshold, process the data
/// 3. Deposit new pheromones for downstream agents
/// 4. Sleep and repeat
#[async_trait]
pub trait Agent: Send + Sync {
    /// Human-readable name for logging
    fn name(&self) -> &str;
    
    /// Main processing loop
    async fn run(&self, board: Arc<Blackboard>) -> anyhow::Result<()>;
    
    /// Stop the agent gracefully
    fn stop(&self);
    
    /// Check if agent is currently active (processing)
    fn is_active(&self) -> bool;
}

/// Status of an agent for dashboard display
#[derive(Debug, Clone, serde::Serialize)]
pub struct AgentStatus {
    pub name: String,
    pub is_active: bool,
    pub last_action: String,
    pub action_count: u64,
}
