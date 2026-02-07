import { motion } from 'framer-motion'
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
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-1">
                {events.length === 0 ? (
                    <div className="text-swarm-muted text-center py-4 text-xs font-mono">
                        // NO EVENTS DETECTED
                    </div>
                ) : (
                    events.map((event) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 }} // Faster transition
                            className="flex items-center gap-3 text-xs py-2 border-b border-white/5 font-mono hover:bg-white/5 transition-colors px-2 rounded"
                        >
                            <span className="text-swarm-muted w-14 shrink-0">
                                {event.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className={`font-bold w-20 shrink-0 ${eventColors[event.type] || 'text-zinc-400'}`}>
                                {event.type.toUpperCase()}
                            </span>
                            <span className="text-zinc-300 truncate flex-1">
                                {event.pheromone}
                            </span>
                            <span className="text-swarm-muted">
                                {(event.intensity * 100).toFixed(0)}%
                            </span>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    )
}
