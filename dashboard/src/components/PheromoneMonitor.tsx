import { motion } from 'framer-motion'
import { Zap, ZapOff } from 'lucide-react'
import type { PheromoneStatus } from '../hooks/useWebSocket'

interface Props {
    pheromones: PheromoneStatus[]
    history: { name: string; readings: number[] }[]
}

function Sparkline({ data, color, active }: { data: number[]; color: string; active: boolean }) {
    if (data.length < 2) return null
    const width = 100
    const height = 32
    const max = 1
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - (v / max) * height
        return `${x},${y}`
    }).join(' ')

    // Create fill area path
    const areaPoints = `${points} ${width},${height} 0,${height}`

    return (
        <svg width={width} height={height} className="overflow-visible">
            {/* Gradient definition */}
            <defs>
                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Area fill */}
            <motion.path
                d={`M ${areaPoints}`}
                fill={`url(#gradient-${color})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            />

            {/* Line */}
            <motion.polyline
                fill="none"
                stroke={active ? color : '#52525b'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5 }}
            />
        </svg>
    )
}

const pheromoneConfig: Record<string, { color: string; icon: string; description: string }> = {
    'Price Freshness': {
        color: '#4ade80', // drift-400
        icon: '📊',
        description: 'Market Data',
    },
    'Rebalance Opportunity': {
        color: '#facc15', // yellow-400
        icon: '⚖️',
        description: 'Drift Signal',
    },
    'Execution Permit': {
        color: '#60a5fa', // blue-400
        icon: '✅',
        description: 'VIX Check',
    },
    'Trade Executed': {
        color: '#a78bfa', // purple-400
        icon: '💰',
        description: 'Order Fill',
    },
}

export function PheromoneMonitor({ pheromones, history }: Props) {
    return (
        <div className="space-y-4">
            {pheromones.length === 0 ? (
                <div className="text-swarm-muted text-center py-8 font-mono text-sm">
                    // AWAITING SIGNAL...
                </div>
            ) : (
                pheromones.map((p) => {
                    const config = pheromoneConfig[p.name] || { color: '#888', icon: '🔵', description: '' }
                    const percentage = Math.round(p.intensity * 100)

                    return (
                        <div key={p.name} className="space-y-2">
                            <div className="flex items-end justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-swarm-muted uppercase tracking-wider">{config.description}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {p.is_active ? (
                                        <Zap className="w-3 h-3 text-drift-400 fill-drift-400" />
                                    ) : (
                                        <ZapOff className="w-3 h-3 text-swarm-muted" />
                                    )}
                                    <span className={`text-sm font-mono font-bold ${p.is_active ? 'text-white' : 'text-swarm-muted'}`}>
                                        {percentage}%
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
                                {/* Sparkline Background */}
                                <div className="absolute right-0 bottom-0 top-0 w-32 opacity-50 group-hover:opacity-80 transition-opacity">
                                    <Sparkline
                                        data={history.find(h => h.name === p.name)?.readings || []}
                                        color={config.color}
                                        active={p.is_active}
                                    />
                                </div>

                                {/* Label */}
                                <div className="relative z-10 font-display font-medium text-white flex items-center gap-2">
                                    <span className="text-lg">{config.icon}</span>
                                    {p.name}
                                </div>

                                {/* Intensity Bar (Bottom) */}
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                                    <motion.div
                                        className="h-full"
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${percentage}%`,
                                            backgroundColor: p.is_active ? config.color : '#52525b',
                                        }}
                                        transition={{ duration: 0.3, ease: 'easeOut' }}
                                        style={{
                                            boxShadow: p.is_active ? `0 0 10px ${config.color}` : 'none',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    )
}
