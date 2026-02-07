import { motion } from 'framer-motion'
import { Eye, Brain, Shield, Banknote, ChevronRight } from 'lucide-react'
import type { PheromoneStatus, AgentMetric } from '../hooks/useWebSocket'

interface Props {
    pheromones: PheromoneStatus[]
    agentMetrics: AgentMetric[]
}

interface AgentInfo {
    name: string
    icon: React.ReactNode
    listenTo: string
    emits: string
    description: string
    color: string        // accent color for the node ring
    bgGlow: string       // soft glow behind active nodes
}

const agents: AgentInfo[] = [
    {
        name: 'Sensor',
        icon: <Eye className="w-5 h-5" />,
        listenTo: 'External API',
        emits: 'Price Freshness',
        description: 'Ingests market data',
        color: 'rgb(74, 222, 128)',     // green
        bgGlow: 'rgba(74, 222, 128, 0.15)',
    },
    {
        name: 'Analyst',
        icon: <Brain className="w-5 h-5" />,
        listenTo: 'Price Freshness',
        emits: 'Rebalance Opportunity',
        description: 'Calculates drift',
        color: 'rgb(96, 165, 250)',     // blue
        bgGlow: 'rgba(96, 165, 250, 0.15)',
    },
    {
        name: 'Guardian',
        icon: <Shield className="w-5 h-5" />,
        listenTo: 'Rebalance Opportunity',
        emits: 'Execution Permit',
        description: 'VIX circuit breaker',
        color: 'rgb(251, 191, 36)',     // amber
        bgGlow: 'rgba(251, 191, 36, 0.15)',
    },
    {
        name: 'Trader',
        icon: <Banknote className="w-5 h-5" />,
        listenTo: 'Execution Permit',
        emits: 'Trade Executed',
        description: 'Executes trades',
        color: 'rgb(244, 114, 182)',    // pink
        bgGlow: 'rgba(244, 114, 182, 0.15)',
    },
]

// Animated packet that travels along the connector
function DataPacket({ active, color, delay }: { active: boolean; color: string; delay: number }) {
    if (!active) return null
    return (
        <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full z-10"
            style={{
                backgroundColor: color,
                boxShadow: `0 0 6px ${color}, 0 0 12px ${color}`,
            }}
            initial={{ left: '0%', opacity: 0 }}
            animate={{ left: '100%', opacity: [0, 1, 1, 0] }}
            transition={{
                duration: 1.8,
                repeat: Infinity,
                delay,
                ease: 'linear',
            }}
        />
    )
}

export function AgentStatus({ pheromones, agentMetrics }: Props) {
    const isActive = (name: string, listenTo: string) => {
        const metric = agentMetrics.find(m => m.name === name)
        if (metric) return metric.is_active
        if (listenTo === 'External API') return true
        const pheromone = pheromones.find(p => p.name === listenTo)
        return pheromone?.is_active ?? false
    }

    const getMetric = (name: string) => agentMetrics.find(m => m.name === name)

    return (
        <div className="space-y-2">
            {/* Network flow — horizontal pipeline */}
            <div className="flex items-center justify-between gap-0 py-3 px-1">
                {agents.map((agent, index) => {
                    const active = isActive(agent.name, agent.listenTo)
                    const metric = getMetric(agent.name)
                    const isLast = index === agents.length - 1

                    return (
                        <div key={agent.name} className="flex items-center flex-1 min-w-0">
                            {/* Node */}
                            <motion.div
                                className="relative flex flex-col items-center group shrink-0"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: index * 0.12, type: 'spring', stiffness: 200 }}
                            >
                                {/* Glow ring behind the node */}
                                {active && (
                                    <motion.div
                                        className="absolute inset-0 m-auto rounded-full"
                                        style={{
                                            width: 52,
                                            height: 52,
                                            background: `radial-gradient(circle, ${agent.bgGlow} 0%, transparent 70%)`,
                                        }}
                                        animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.3, 0.6] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                    />
                                )}

                                {/* Hexagonal node */}
                                <div
                                    className={`relative w-11 h-11 rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${active
                                            ? 'bg-white/10 backdrop-blur-sm'
                                            : 'bg-white/5 border-white/10 text-zinc-500'
                                        }`}
                                    style={active ? {
                                        borderColor: agent.color,
                                        color: agent.color,
                                        boxShadow: `0 0 12px ${agent.bgGlow}`,
                                    } : {}}
                                >
                                    {agent.icon}

                                    {/* Ping indicator */}
                                    {active && (
                                        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                            <span
                                                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                                style={{ backgroundColor: agent.color }}
                                            />
                                            <span
                                                className="relative inline-flex rounded-full h-2.5 w-2.5"
                                                style={{ backgroundColor: agent.color }}
                                            />
                                        </span>
                                    )}
                                </div>

                                {/* Agent label beneath the node */}
                                <div className="mt-2 text-center">
                                    <div className="text-[11px] font-display font-semibold text-white tracking-wide leading-none">
                                        {agent.name}
                                    </div>
                                    {metric && metric.action_count > 0 && (
                                        <div
                                            className="text-[9px] font-mono mt-0.5 leading-none"
                                            style={{ color: agent.color }}
                                        >
                                            {metric.action_count} ops
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Connector line to next node */}
                            {!isLast && (
                                <div className="flex-1 mx-1 relative h-[2px] min-w-[12px]">
                                    {/* Base line */}
                                    <div className={`absolute inset-0 rounded-full transition-colors duration-500 ${active ? 'bg-white/20' : 'bg-white/5'
                                        }`} />

                                    {/* Active glow line */}
                                    {active && (
                                        <motion.div
                                            className="absolute inset-0 rounded-full"
                                            style={{ backgroundColor: `${agent.color}33` }}
                                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    )}

                                    {/* Chevron in the middle */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                                        <ChevronRight
                                            className={`w-3 h-3 transition-colors duration-300 ${active ? 'text-white/40' : 'text-white/10'
                                                }`}
                                        />
                                    </div>

                                    {/* Animated data packets */}
                                    <DataPacket active={active} color={agent.color} delay={0} />
                                    <DataPacket active={active} color={agent.color} delay={0.9} />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Pheromone label flow */}
            <div className="flex items-center gap-0 px-1">
                {agents.map((agent, index) => {
                    const active = isActive(agent.name, agent.listenTo)
                    const isLast = index === agents.length - 1
                    return (
                        <div key={`label-${agent.name}`} className="flex items-center flex-1 min-w-0">
                            <div className="shrink-0 w-11 flex justify-center">
                                <span className={`text-[8px] font-mono truncate block text-center max-w-[52px] ${active ? 'text-swarm-muted' : 'text-white/10'
                                    }`}>
                                    {agent.emits.split(' ').map(w => w[0]).join('')}
                                </span>
                            </div>
                            {!isLast && <div className="flex-1 mx-1" />}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
