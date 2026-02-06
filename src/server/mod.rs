//! WebSocket Server Module
//!
//! Provides real-time updates to the React dashboard via WebSocket.
//! Broadcasts pheromone intensity changes and agent status.

pub mod handler;

pub use handler::start_websocket_server;
