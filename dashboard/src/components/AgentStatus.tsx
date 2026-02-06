import { motion } from 'framer-motion'
import { Eye, Brain, Shield, Banknote } from 'lucide-react'
import type { PheromoneStatus } from '../hooks/useWebSocket'

interface Props {
    pheromones: PheromoneStatus[]
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

export function AgentStatus({ pheromones }: Props) {
    const isActive = (listenTo: string) => {
        if (listenTo === 'External API') return true // Sensor always listens
        const pheromone = pheromones.find(p => p.name === listenTo)
        return pheromone?.is_active ?? false
    }

    return (
        <div className="bg-swarm-card rounded-xl border border-swarm-border p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                🐝 Agent Swarm
            </h2>

            <div className="space-y-3">
                {agents.map((agent, index) => {
                    const active = isActive(agent.listenTo)

                    return (
                        <motion.div
                            key={agent.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-300 ${active
                                    ? 'bg-drift-900/30 border-drift-700/50'
                                    : 'bg-zinc-900/30 border-zinc-800/50'
                                }`}
                        >
                            {/* Agent icon */}
                            <div className={`p-2 rounded-lg ${active ? 'bg-drift-600/20 text-drift-400' : 'bg-zinc-800 text-zinc-500'
                                }`}>
                                {agent.icon}
                            </div>

                            {/* Agent info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-white">{agent.name}</span>
                                    {active && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="px-2 py-0.5 text-xs bg-drift-600/20 text-drift-400 rounded-full"
                                        >
                                            ACTIVE
                                        </motion.span>
                                    )}
                                </div>
                                <p className="text-sm text-zinc-500 truncate">{agent.description}</p>
                            </div>

                            {/* Status indicator */}
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${active ? 'bg-drift-400 animate-pulse' : 'bg-zinc-600'
                                    }`} />
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {/* Signal flow visualization */}
            <div className="mt-6 pt-4 border-t border-swarm-border">
                <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                    <span>API</span>
                    <span className="text-drift-400">→</span>
                    <span>Sensor</span>
                    <span className="text-drift-400">→</span>
                    <span>Analyst</span>
                    <span className="text-drift-400">→</span>
                    <span>Guardian</span>
                    <span className="text-drift-400">→</span>
                    <span>Trader</span>
                </div>
                <p className="text-center text-xs text-zinc-600 mt-2">
                    Stigmergic signal chain
                </p>
            </div>
        </div>
    )
}
