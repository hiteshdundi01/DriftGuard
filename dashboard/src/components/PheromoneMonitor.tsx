import { motion } from 'framer-motion'
import { Activity, Zap, ZapOff } from 'lucide-react'
import type { PheromoneStatus } from '../hooks/useWebSocket'

interface Props {
    pheromones: PheromoneStatus[]
}

const pheromoneConfig: Record<string, { color: string; icon: string; description: string }> = {
    'Price Freshness': {
        color: '#22c55e',
        icon: '📊',
        description: 'Fresh market data available',
    },
    'Rebalance Opportunity': {
        color: '#eab308',
        icon: '⚖️',
        description: 'Drift detected, rebalance needed',
    },
    'Execution Permit': {
        color: '#3b82f6',
        icon: '✅',
        description: 'Volatility check passed',
    },
    'Trade Executed': {
        color: '#8b5cf6',
        icon: '💰',
        description: 'Trade completed',
    },
}

export function PheromoneMonitor({ pheromones }: Props) {
    return (
        <div className="bg-swarm-card rounded-xl border border-swarm-border p-6">
            <div className="flex items-center gap-3 mb-6">
                <Activity className="w-5 h-5 text-drift-400" />
                <h2 className="text-lg font-semibold text-white">Pheromone Monitor</h2>
            </div>

            <div className="space-y-4">
                {pheromones.length === 0 ? (
                    <div className="text-zinc-500 text-center py-8">
                        Waiting for connection...
                    </div>
                ) : (
                    pheromones.map((p) => {
                        const config = pheromoneConfig[p.name] || { color: '#888', icon: '🔵', description: '' }
                        const percentage = Math.round(p.intensity * 100)

                        return (
                            <div key={p.name} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{config.icon}</span>
                                        <span className="text-sm font-medium text-zinc-300">{p.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {p.is_active ? (
                                            <Zap className="w-4 h-4 text-drift-400" />
                                        ) : (
                                            <ZapOff className="w-4 h-4 text-zinc-600" />
                                        )}
                                        <span className={`text-sm font-mono ${p.is_active ? 'text-drift-400' : 'text-zinc-500'}`}>
                                            {percentage}%
                                        </span>
                                    </div>
                                </div>

                                {/* Intensity bar */}
                                <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
                                    {/* Threshold marker */}
                                    <div
                                        className="absolute top-0 bottom-0 w-0.5 bg-zinc-500 z-10"
                                        style={{ left: `${p.threshold * 100}%` }}
                                    />

                                    {/* Intensity fill */}
                                    <motion.div
                                        className="h-full rounded-full pheromone-bar"
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${percentage}%`,
                                            backgroundColor: p.is_active ? config.color : '#52525b',
                                        }}
                                        transition={{ duration: 0.3, ease: 'easeOut' }}
                                        style={{
                                            boxShadow: p.is_active ? `0 0 20px ${config.color}40` : 'none',
                                        }}
                                    />
                                </div>

                                <div className="flex justify-between text-xs text-zinc-500">
                                    <span>{config.description}</span>
                                    <span>Threshold: {Math.round(p.threshold * 100)}%</span>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-swarm-border">
                <p className="text-xs text-zinc-500">
                    Pheromones decay exponentially. When intensity drops below threshold,
                    downstream agents go dormant — this is <span className="text-drift-400">antifragile</span> behavior.
                </p>
            </div>
        </div>
    )
}
