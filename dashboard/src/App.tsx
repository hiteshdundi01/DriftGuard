import { motion } from 'framer-motion'
import {
    Wifi,
    WifiOff,
    Bug,
    RefreshCw
} from 'lucide-react'
import { useWebSocket } from './hooks/useWebSocket'
import { PheromoneMonitor } from './components/PheromoneMonitor'
import { AgentStatus } from './components/AgentStatus'
import { PortfolioConfig } from './components/PortfolioConfig'
import { PortfolioBalance } from './components/PortfolioBalance'
import { EventLog } from './components/EventLog'

function App() {
    const {
        pheromones,
        portfolio,
        connected,
        events,
        setAllocation,
        reset,
        reconnect
    } = useWebSocket()

    return (
        <div className="min-h-screen bg-swarm-bg grid-pattern">
            {/* Header */}
            <header className="border-b border-swarm-border bg-swarm-card/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <motion.div
                            animate={{ rotate: connected ? 0 : 360 }}
                            transition={{ duration: 2, repeat: connected ? 0 : Infinity, ease: 'linear' }}
                            className="text-2xl"
                        >
                            🐝
                        </motion.div>
                        <div>
                            <h1 className="text-xl font-bold text-white">DriftGuard</h1>
                            <p className="text-xs text-zinc-500">Stigmergic Portfolio Stabilizer</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Debug/Chaos button */}
                        <button
                            onClick={reset}
                            className="px-3 py-2 text-sm bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-lg flex items-center gap-2 transition-colors"
                            title="Reset all pheromones (simulate outage)"
                        >
                            <Bug className="w-4 h-4" />
                            Chaos Test
                        </button>

                        {/* Connection status */}
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${connected
                                ? 'bg-drift-900/30 text-drift-400'
                                : 'bg-red-900/30 text-red-400'
                            }`}>
                            {connected ? (
                                <>
                                    <Wifi className="w-4 h-4" />
                                    <span className="text-sm">Connected</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff className="w-4 h-4" />
                                    <span className="text-sm">Disconnected</span>
                                    <button
                                        onClick={reconnect}
                                        className="ml-2 p-1 hover:bg-red-800/50 rounded"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Top row - Key metrics */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Pheromone intensities */}
                    <div className="lg:col-span-2">
                        <PheromoneMonitor pheromones={pheromones} />
                    </div>

                    {/* Portfolio balance */}
                    <div>
                        <PortfolioBalance portfolio={portfolio} />
                    </div>
                </div>

                {/* Bottom row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Agent status */}
                    <div>
                        <AgentStatus pheromones={pheromones} />
                    </div>

                    {/* Portfolio config */}
                    <div>
                        <PortfolioConfig
                            stocksPct={portfolio?.stocks_pct ?? 60}
                            bondsPct={portfolio?.bonds_pct ?? 40}
                            onSetAllocation={setAllocation}
                            onReset={reset}
                        />
                    </div>

                    {/* Event log */}
                    <div>
                        <EventLog events={events} />
                    </div>
                </div>

                {/* Info footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 p-6 bg-swarm-card rounded-xl border border-swarm-border"
                >
                    <h3 className="text-lg font-semibold text-white mb-3">
                        🧪 How Stigmergic Swarm Intelligence Works
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-zinc-400">
                        <div>
                            <h4 className="font-medium text-drift-400 mb-2">Indirect Coordination</h4>
                            <p>
                                Agents never communicate directly. They deposit "pheromones"
                                (time-decaying signals) on a shared blackboard.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium text-drift-400 mb-2">Exponential Decay</h4>
                            <p>
                                Each pheromone follows I(t) = I₀ × e^(-λt). When data sources
                                fail, signals naturally evaporate.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium text-drift-400 mb-2">Antifragile Failure</h4>
                            <p>
                                When pheromones decay below threshold, downstream agents go
                                dormant — failing safely instead of acting on stale data.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    )
}

export default App
