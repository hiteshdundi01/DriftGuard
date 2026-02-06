import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'
import type { SwarmEvent } from '../hooks/useWebSocket'

interface Props {
    events: SwarmEvent[]
}

const eventColors: Record<string, string> = {
    'Deposited': 'text-drift-400',
    'Sniffed': 'text-blue-400',
    'Decayed': 'text-orange-400',
}

export function EventLog({ events }: Props) {
    return (
        <div className="bg-swarm-card rounded-xl border border-swarm-border p-6 h-full">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-drift-400" />
                Event Log
            </h2>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {events.length === 0 ? (
                    <div className="text-zinc-500 text-center py-4 text-sm">
                        No events yet...
                    </div>
                ) : (
                    events.map((event, index) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className="flex items-center gap-3 text-sm py-2 border-b border-swarm-border/50"
                        >
                            <span className="text-xs text-zinc-600 font-mono w-16">
                                {event.timestamp.toLocaleTimeString()}
                            </span>
                            <span className={`font-medium ${eventColors[event.type] || 'text-zinc-400'}`}>
                                {event.type}
                            </span>
                            <span className="text-zinc-400 truncate flex-1">
                                {event.pheromone}
                            </span>
                            <span className="text-zinc-500 font-mono text-xs">
                                {(event.intensity * 100).toFixed(0)}%
                            </span>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    )
}
