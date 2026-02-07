import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SwarmEvent } from '../hooks/useWebSocket'

interface Props {
    events: SwarmEvent[]
}

const EVENT_TYPES = ['Deposited', 'Sniffed', 'Decayed'] as const
type EventType = typeof EVENT_TYPES[number]

const eventConfig: Record<EventType, { color: string; bg: string; border: string }> = {
    'Deposited': {
        color: 'text-drift-400',
        bg: 'bg-drift-500/15',
        border: 'border-drift-500/40',
    },
    'Sniffed': {
        color: 'text-blue-400',
        bg: 'bg-blue-500/15',
        border: 'border-blue-500/40',
    },
    'Decayed': {
        color: 'text-orange-400',
        bg: 'bg-orange-500/15',
        border: 'border-orange-500/40',
    },
}

export function EventLog({ events }: Props) {
    const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())

    const toggleFilter = (type: string) => {
        setActiveFilters(prev => {
            const next = new Set(prev)
            if (next.has(type)) {
                next.delete(type)
            } else {
                next.add(type)
            }
            return next
        })
    }

    // If no filters active, show all. Otherwise, show only selected types.
    const filteredEvents = activeFilters.size === 0
        ? events
        : events.filter(e => activeFilters.has(e.type))

    const counts = EVENT_TYPES.reduce((acc, type) => {
        acc[type] = events.filter(e => e.type === type).length
        return acc
    }, {} as Record<string, number>)

    return (
        <div className="flex flex-col h-full">
            {/* Filter bar */}
            <div className="flex items-center gap-1.5 pb-3 mb-2 border-b border-white/5 shrink-0 flex-wrap">
                {EVENT_TYPES.map(type => {
                    const config = eventConfig[type]
                    const isActive = activeFilters.has(type)
                    return (
                        <button
                            key={type}
                            onClick={() => toggleFilter(type)}
                            className={`
                                flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono
                                border transition-all duration-200 cursor-pointer select-none
                                ${isActive
                                    ? `${config.bg} ${config.border} ${config.color}`
                                    : 'bg-white/5 border-white/5 text-swarm-muted hover:bg-white/10 hover:border-white/10'
                                }
                            `}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? config.bg.replace('/15', '') : 'bg-white/20'}`} />
                            {type}
                            <span className={`ml-0.5 text-[9px] ${isActive ? 'opacity-80' : 'opacity-40'}`}>
                                {counts[type] || 0}
                            </span>
                        </button>
                    )
                })}

                {activeFilters.size > 0 && (
                    <button
                        onClick={() => setActiveFilters(new Set())}
                        className="text-[9px] font-mono text-swarm-muted hover:text-white/70 transition-colors px-1.5 py-1 ml-auto cursor-pointer"
                    >
                        CLEAR
                    </button>
                )}
            </div>

            {/* Event list */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-0.5">
                    {filteredEvents.length === 0 ? (
                        <div className="text-swarm-muted text-center py-8 text-xs font-mono">
                            {activeFilters.size > 0
                                ? '// NO MATCHING EVENTS'
                                : '// NO EVENTS DETECTED'
                            }
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {filteredEvents.map((event) => {
                                const config = eventConfig[event.type as EventType] || {
                                    color: 'text-zinc-400',
                                    bg: 'bg-white/5',
                                    border: 'border-white/5',
                                }
                                return (
                                    <motion.div
                                        key={event.id}
                                        layout
                                        initial={{ opacity: 0, x: -10, height: 0 }}
                                        animate={{ opacity: 1, x: 0, height: 'auto' }}
                                        exit={{ opacity: 0, x: 10, height: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="flex items-center gap-3 text-xs py-2 border-b border-white/5 font-mono hover:bg-white/5 transition-colors px-2 rounded"
                                    >
                                        <span className="text-swarm-muted w-14 shrink-0">
                                            {event.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                        <span className={`font-bold w-20 shrink-0 ${config.color}`}>
                                            {event.type.toUpperCase()}
                                        </span>
                                        <span className="text-zinc-300 truncate flex-1">
                                            {event.pheromone}
                                        </span>
                                        <span className="text-swarm-muted">
                                            {(event.intensity * 100).toFixed(0)}%
                                        </span>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* Footer status bar */}
            <div className="flex items-center justify-between pt-2 mt-auto border-t border-white/5 shrink-0">
                <span className="text-[9px] font-mono text-swarm-muted">
                    {filteredEvents.length} / {events.length} events
                </span>
                {activeFilters.size > 0 && (
                    <span className="text-[9px] font-mono text-drift-400">
                        FILTERED
                    </span>
                )}
            </div>
        </div>
    )
}
