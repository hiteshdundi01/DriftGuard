import { useState, useEffect, useCallback, useRef } from 'react'

export interface PheromoneStatus {
    name: string
    intensity: number
    threshold: number
    is_active: boolean
}

export interface PortfolioState {
    total_value: number
    stocks_value: number
    bonds_value: number
    stocks_pct: number
    bonds_pct: number
    last_trade_time: string | null
}

export interface SwarmState {
    pheromones: PheromoneStatus[]
    portfolio: PortfolioState | null
    connected: boolean
    events: SwarmEvent[]
}

export interface SwarmEvent {
    id: string
    type: string
    pheromone: string
    intensity: number
    timestamp: Date
}

export interface AgentMetric {
    name: string
    is_active: boolean
    action_count: number
    last_action: string
    last_action_time: string | null
}

export interface PheromoneHistory {
    name: string
    readings: number[]
}

export interface TradeLogEntry {
    id: string
    timestamp: string
    action: string
    symbol: string
    amount: number
    price: number
    portfolio_value: number
    drift_before: number
    drift_after: number
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws'

export function useWebSocket() {
    const [state, setState] = useState<SwarmState>({
        pheromones: [],
        portfolio: null,
        connected: false,
        events: [],
    })

    const [agentMetrics, setAgentMetrics] = useState<AgentMetric[]>([])
    const [pheromoneHistory, setPheromoneHistory] = useState<Map<string, number[]>>(new Map())
    const [tradeHistory, setTradeHistory] = useState<TradeLogEntry[]>([])

    const wsRef = useRef<WebSocket | null>(null)
    const reconnectTimeoutRef = useRef<number | null>(null)

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return

        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onopen = () => {
            console.log('WebSocket connected')
            setState(prev => ({ ...prev, connected: true }))
        }

        ws.onclose = () => {
            console.log('WebSocket disconnected')
            setState(prev => ({ ...prev, connected: false }))
            // Attempt to reconnect after 2 seconds
            reconnectTimeoutRef.current = window.setTimeout(connect, 2000)
        }

        ws.onerror = (error) => {
            console.error('WebSocket error:', error)
        }

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)

                if (data.type === 'pheromone_update') {
                    setState(prev => ({
                        ...prev,
                        pheromones: data.pheromones,
                    }))
                    // Track pheromone history for sparklines
                    setPheromoneHistory(prev => {
                        const next = new Map(prev)
                        for (const p of data.pheromones as PheromoneStatus[]) {
                            const history = next.get(p.name) || []
                            next.set(p.name, [...history.slice(-19), p.intensity])
                        }
                        return next
                    })
                } else if (data.type === 'portfolio_update') {
                    setState(prev => ({
                        ...prev,
                        portfolio: data.portfolio,
                    }))
                } else if (data.type === 'agent_metrics') {
                    setAgentMetrics(data.agents)
                } else if (data.type === 'trade_history') {
                    setTradeHistory(data.trades)
                } else if (data.type === 'event') {
                    const newEvent: SwarmEvent = {
                        id: crypto.randomUUID(),
                        type: data.event_type,
                        pheromone: data.pheromone,
                        intensity: data.intensity,
                        timestamp: new Date(),
                    }
                    setState(prev => ({
                        ...prev,
                        events: [newEvent, ...prev.events].slice(0, 50), // Keep last 50 events
                    }))
                }
            } catch (e) {
                console.error('Failed to parse message:', e)
            }
        }
    }, [])

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
        }
        wsRef.current?.close()
    }, [])

    const setAllocation = useCallback((stocksPct: number, bondsPct: number) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'set_allocation',
                stocks_pct: stocksPct,
                bonds_pct: bondsPct,
            }))
        }
    }, [])

    const reset = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'reset' }))
        }
    }, [])

    useEffect(() => {
        connect()
        return () => disconnect()
    }, [connect, disconnect])

    return {
        ...state,
        agentMetrics,
        pheromoneHistory: Array.from(pheromoneHistory.entries()).map(([name, readings]) => ({ name, readings })),
        tradeHistory,
        setAllocation,
        reset,
        reconnect: connect,
    }
}
