import { useWebSocket } from './hooks/useWebSocket'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { MetricCard } from './components/layout/MetricCard'
import { PheromoneMonitor } from './components/PheromoneMonitor'
import { AgentStatus } from './components/AgentStatus'
import { ControlPanel } from './components/controls/ControlPanel'
import { PortfolioBalance } from './components/PortfolioBalance'
import { EventLog } from './components/EventLog'
import { TradeHistory } from './components/TradeHistory'
import { Activity, Wallet, Cpu, History } from 'lucide-react'

function App() {
    const {
        pheromones,
        portfolio,
        connected,
        events,
        agentMetrics,
        pheromoneHistory,
        tradeHistory,
        setAllocation,
        reset,

    } = useWebSocket()

    // Sidebar content (Control Panel)
    const sidebar = (
        <ControlPanel
            stocksPct={portfolio?.stocks_pct ?? 60}
            onSetAllocation={setAllocation}
            onReset={reset}
        />
    )

    return (
        <DashboardLayout sidebarContent={sidebar} connected={connected}>
            {/* Main Grid: 3 Columns on large screens, stack on mobile */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 auto-rows-min">

                {/* Column 1: System Health (Pheromones + Agents) */}
                <div className="space-y-6">
                    <MetricCard title="System Health" icon={<Activity className="w-5 h-5" />}>
                        <PheromoneMonitor pheromones={pheromones} history={pheromoneHistory} />
                    </MetricCard>

                    <MetricCard title="Swarm Intelligence" icon={<Cpu className="w-5 h-5" />}>
                        <AgentStatus pheromones={pheromones} agentMetrics={agentMetrics} />
                    </MetricCard>
                </div>

                {/* Column 2: Portfolio & Performance */}
                <div className="space-y-6">
                    <MetricCard title="Portfolio Status" icon={<Wallet className="w-5 h-5" />}>
                        <PortfolioBalance portfolio={portfolio} />
                    </MetricCard>

                    <MetricCard title="Trade History" icon={<History className="w-5 h-5" />}>
                        <TradeHistory trades={tradeHistory} />
                    </MetricCard>
                </div>

                {/* Column 3: Events & Logs */}
                <div className="xl:col-span-1 h-full min-h-[500px]">
                    <MetricCard title="Event Stream" className="h-[calc(100vh-8rem)] sticky top-24 overflow-hidden flex flex-col" icon={<Activity className="w-5 h-5" />}>
                        <EventLog events={events} />
                    </MetricCard>
                </div>

            </div>
        </DashboardLayout>
    )
}

export default App
