import { motion } from 'framer-motion'
import { Eye, Brain, Shield, Banknote } from 'lucide-react'
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
}

const agents: AgentInfo[] = [
    {
        name: 'Sensor',
        icon: <Eye className="w-6 h-6" />,
        listenTo: 'External API',
        emits: 'Price Freshness',
        description: 'Ingests market data',
    },
    {
        name: 'Analyst',
        icon: <Brain className="w-6 h-6" />,
        listenTo: 'Price Freshness',
        emits: 'Rebalance Opportunity',
        description: 'Calculates drift',
    },
    {
        name: 'Guardian',
        icon: <Shield className="w-6 h-6" />,
        listenTo: 'Rebalance Opportunity',
        emits: 'Execution Permit',
        description: 'VIX circuit breaker',
    },
    {
        name: 'Trader',
        icon: <Banknote className="w-6 h-6" />,
        listenTo: 'Execution Permit',
        emits: 'Trade Executed',
        description: 'Executes trades',
    },
]

export function AgentStatus({ pheromones, agentMetrics }: Props) {
    const isActive = (name: string, listenTo: string) => {
        // Prefer server-driven metrics if available
        const metric = agentMetrics.find(m => m.name === name)
        if (metric) return metric.is_active
        // Fallback to pheromone-based detection
        if (listenTo === 'External API') return true
        const pheromone = pheromones.find(p => p.name === listenTo)
        return pheromone?.is_active ?? false
    }

    const getMetric = (name: string) => agentMetrics.find(m => m.name === name)

    return (
        <div className="space-y-3">
            {agents.map((agent, index) => {
                const active = isActive(agent.name, agent.listenTo)
                const metric = getMetric(agent.name)

                return (
                    <motion.div
                        key={agent.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`group flex items-center gap-4 p-3 rounded-xl border transition-all duration-300 relative overflow-hidden ${active
                            ? 'bg-drift-900/10 border-drift-500/20'
                            : 'bg-white/5 border-white/5'
                            }`}
                    >
                        {/* Active Glow Background */}
                        {active && (
                            <motion.div
                                layoutId={`glow-${agent.name}`}
                                className="absolute inset-0 bg-drift-500/5 blur-xl" // Soften the glow
                            />
                        )}

                        {/* Agent icon */}
                        <div className={`relative p-2 rounded-lg transition-colors ${active ? 'bg-drift-500/20 text-drift-400' : 'bg-white/5 text-swarm-muted'
                            }`}>
                            {agent.icon}
                        </div>

                        {/* Agent info */}
                        <div className="relative flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-display font-medium text-white tracking-wide">{agent.name}</span>
                                {active && (
                                    <span className="flex h-2 w-2 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-drift-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-drift-500"></span>
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-swarm-muted truncate max-w-[120px]">
                                    {agent.description}
                                </span>
                                {metric && metric.action_count > 0 && (
                                    <span className="px-1.5 py-0.5 bg-white/5 text-drift-300 rounded text-[10px] font-mono border border-white/5">
                                        OPs: {metric.action_count}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Status (Pulse) */}
                        <div className="relative">
                            <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-drift-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-swarm-border'}`} />
                        </div>
                    </motion.div>
                )
            })}
        </div>
    )
}
