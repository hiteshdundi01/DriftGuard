//! WebSocket Handler
//!
//! Handles WebSocket connections from the React dashboard.
//! Provides real-time pheromone intensity and agent status updates.

use anyhow::Result;
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::{error, info};
use warp::ws::{Message, WebSocket};
use warp::Filter;

use crate::core::blackboard::{PheromoneEvent, PortfolioState, TargetAllocation};
use crate::core::physics::PheromoneType;
use crate::core::Blackboard;

/// Message sent to dashboard
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type")]
pub enum DashboardMessage {
    #[serde(rename = "pheromone_update")]
    PheromoneUpdate {
        pheromones: Vec<PheromoneStatus>,
    },
    #[serde(rename = "portfolio_update")]
    PortfolioUpdate {
        portfolio: PortfolioState,
    },
    #[serde(rename = "event")]
    Event {
        event_type: String,
        pheromone: String,
        intensity: f64,
    },
}

#[derive(Debug, Clone, Serialize)]
pub struct PheromoneStatus {
    pub name: String,
    pub intensity: f64,
    pub threshold: f64,
    pub is_active: bool,
}

/// Message received from dashboard
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    #[serde(rename = "set_allocation")]
    SetAllocation { stocks_pct: f64, bonds_pct: f64 },
    #[serde(rename = "get_status")]
    GetStatus,
    #[serde(rename = "reset")]
    Reset,
}

/// Start the WebSocket server
pub async fn start_websocket_server(
    port: u16,
    board: Arc<Blackboard>,
) -> Result<()> {
    let board_filter = warp::any().map(move || board.clone());
    
    // WebSocket route
    let ws_route = warp::path("ws")
        .and(warp::ws())
        .and(board_filter.clone())
        .map(|ws: warp::ws::Ws, board: Arc<Blackboard>| {
            ws.on_upgrade(move |socket| handle_websocket(socket, board))
        });
    
    // Health check route
    let health = warp::path("health")
        .map(|| warp::reply::json(&serde_json::json!({"status": "ok"})));
    
    // CORS for development
    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST"])
        .allow_headers(vec!["content-type"]);
    
    let routes = ws_route.or(health).with(cors);
    
    info!("🌐 WebSocket server starting on port {}", port);
    
    warp::serve(routes)
        .run(([0, 0, 0, 0], port))
        .await;
    
    Ok(())
}

/// Handle individual WebSocket connection
async fn handle_websocket(ws: WebSocket, board: Arc<Blackboard>) {
    let (mut tx, mut rx) = ws.split();
    
    info!("📱 Dashboard connected");
    
    // Subscribe to pheromone events
    let mut event_rx = board.subscribe();
    
    // Send initial state
    if let Ok(status) = get_pheromone_status(&board).await {
        let msg = DashboardMessage::PheromoneUpdate { pheromones: status };
        if let Ok(json) = serde_json::to_string(&msg) {
            let _ = tx.send(Message::text(json)).await;
        }
    }
    
    if let Ok(Some(portfolio)) = board.get_portfolio_state().await {
        let msg = DashboardMessage::PortfolioUpdate { portfolio };
        if let Ok(json) = serde_json::to_string(&msg) {
            let _ = tx.send(Message::text(json)).await;
        }
    }
    
    // Spawn task to handle incoming messages
    let board_clone = board.clone();
    let incoming = tokio::spawn(async move {
        while let Some(result) = rx.next().await {
            match result {
                Ok(msg) => {
                    if let Ok(text) = msg.to_str() {
                        if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(text) {
                            handle_client_message(&board_clone, client_msg).await;
                        }
                    }
                }
                Err(e) => {
                    error!("WebSocket receive error: {}", e);
                    break;
                }
            }
        }
    });
    
    // Spawn task to broadcast events
    let outgoing = tokio::spawn(async move {
        // Periodic status updates
        let mut interval = tokio::time::interval(tokio::time::Duration::from_millis(500));
        
        loop {
            tokio::select! {
                _ = interval.tick() => {
                    // Send pheromone status
                    if let Ok(status) = get_pheromone_status(&board).await {
                        let msg = DashboardMessage::PheromoneUpdate { pheromones: status };
                        if let Ok(json) = serde_json::to_string(&msg) {
                            if tx.send(Message::text(json)).await.is_err() {
                                break;
                            }
                        }
                    }
                    
                    // Send portfolio status
                    if let Ok(Some(portfolio)) = board.get_portfolio_state().await {
                        let msg = DashboardMessage::PortfolioUpdate { portfolio };
                        if let Ok(json) = serde_json::to_string(&msg) {
                            if tx.send(Message::text(json)).await.is_err() {
                                break;
                            }
                        }
                    }
                }
                
                event = event_rx.recv() => {
                    if let Ok(evt) = event {
                        let msg = DashboardMessage::Event {
                            event_type: format!("{:?}", evt.action),
                            pheromone: evt.pheromone_type,
                            intensity: evt.intensity,
                        };
                        if let Ok(json) = serde_json::to_string(&msg) {
                            if tx.send(Message::text(json)).await.is_err() {
                                break;
                            }
                        }
                    }
                }
            }
        }
    });
    
    // Wait for either task to finish
    tokio::select! {
        _ = incoming => {}
        _ = outgoing => {}
    }
    
    info!("📱 Dashboard disconnected");
}

/// Get current pheromone status for all types
async fn get_pheromone_status(board: &Blackboard) -> Result<Vec<PheromoneStatus>> {
    let types = [
        (PheromoneType::PriceFreshness, 0.7),
        (PheromoneType::RebalanceOpportunity, 0.6),
        (PheromoneType::ExecutionPermit, 0.5),
        (PheromoneType::TradeExecuted, 0.3),
    ];
    
    let mut statuses = Vec::new();
    
    for (ptype, threshold) in types {
        let intensity = board.get_intensity(ptype).await?;
        statuses.push(PheromoneStatus {
            name: ptype.label().to_string(),
            intensity,
            threshold,
            is_active: intensity > threshold,
        });
    }
    
    Ok(statuses)
}

/// Handle message from dashboard client
async fn handle_client_message(board: &Blackboard, msg: ClientMessage) {
    match msg {
        ClientMessage::SetAllocation { stocks_pct, bonds_pct } => {
            info!("📊 Dashboard setting allocation: {}% / {}%", stocks_pct, bonds_pct);
            if let Err(e) = board.set_target_allocation(stocks_pct, bonds_pct).await {
                error!("Failed to set allocation: {}", e);
            }
        }
        ClientMessage::GetStatus => {
            // Status is sent automatically by the broadcast loop
        }
        ClientMessage::Reset => {
            info!("🔄 Dashboard requested reset");
            if let Err(e) = board.clear_all().await {
                error!("Failed to reset: {}", e);
            }
            // Reset portfolio to initial state
            let initial = PortfolioState::default();
            if let Err(e) = board.set_portfolio_state(&initial).await {
                error!("Failed to reset portfolio: {}", e);
            }
        }
    }
}
