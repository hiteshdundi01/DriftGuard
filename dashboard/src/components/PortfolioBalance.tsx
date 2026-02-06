import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Wallet, Clock, PieChart } from 'lucide-react'
import type { PortfolioState } from '../hooks/useWebSocket'

interface Props {
    portfolio: PortfolioState | null
}

export function PortfolioBalance({ portfolio }: Props) {
    if (!portfolio) {
        return (
            <div className="bg-swarm-card rounded-xl border border-swarm-border p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-drift-400" />
                    Portfolio Balance
                </h2>
                <div className="text-zinc-500 text-center py-8">
                    Loading portfolio data...
                </div>
            </div>
        )
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value)
    }

    const formatTime = (isoString: string | null) => {
        if (!isoString) return 'Never'
        const date = new Date(isoString)
        return date.toLocaleTimeString()
    }

    return (
        <div className="bg-swarm-card rounded-xl border border-swarm-border p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-drift-400" />
                    Portfolio Balance
                </h2>
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Simulated
                </span>
            </div>

            {/* Total value */}
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="text-center mb-6"
            >
                <div className="text-3xl font-bold text-white mb-1">
                    {formatCurrency(portfolio.total_value)}
                </div>
                <div className="text-sm text-zinc-500">Total Portfolio Value</div>
            </motion.div>

            {/* Allocation breakdown */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Stocks */}
                <div className="bg-zinc-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-drift-400" />
                        <span className="text-sm text-zinc-400">Stocks (SPY)</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                        {formatCurrency(portfolio.stocks_value)}
                    </div>
                    <div className="text-sm text-drift-400">
                        {portfolio.stocks_pct.toFixed(1)}%
                    </div>
                </div>

                {/* Bonds */}
                <div className="bg-zinc-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-zinc-400">Bonds (BND)</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                        {formatCurrency(portfolio.bonds_value)}
                    </div>
                    <div className="text-sm text-blue-400">
                        {portfolio.bonds_pct.toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Visual pie representation */}
            <div className="relative h-4 rounded-full overflow-hidden bg-zinc-800">
                <motion.div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-drift-600 to-drift-400"
                    animate={{ width: `${portfolio.stocks_pct}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                />
            </div>

            <div className="flex justify-between text-xs text-zinc-500 mt-2">
                <span>Stocks</span>
                <span>Bonds</span>
            </div>

            {/* Last trade */}
            <div className="mt-4 pt-4 border-t border-swarm-border">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Last Trade</span>
                    <span className="text-zinc-300 font-mono">
                        {formatTime(portfolio.last_trade_time)}
                    </span>
                </div>
            </div>
        </div>
    )
}
