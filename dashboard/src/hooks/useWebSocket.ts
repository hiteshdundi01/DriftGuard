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

const WS_URL = 'ws://localhost:8080/ws'

export function useWebSocket() {
    const [state, setState] = useState<SwarmState>({
        pheromones: [],
        portfolio: null,
        connected: false,
        events: [],
    })

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
                } else if (data.type === 'portfolio_update') {
                    setState(prev => ({
                        ...prev,
                        portfolio: data.portfolio,
                    }))
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
        setAllocation,
        reset,
        reconnect: connect,
    }
}
