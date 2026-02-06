//! DriftGuard Core Module
//! 
//! Provides the fundamental building blocks for stigmergic swarm intelligence:
//! - Pheromone: Time-decaying signals for indirect agent coordination
//! - Blackboard: Redis-backed shared environment for agent communication
//! - Config: Centralized configuration management

pub mod physics;
pub mod blackboard;
pub mod config;

pub use physics::Pheromone;
pub use blackboard::Blackboard;
pub use config::Config;
