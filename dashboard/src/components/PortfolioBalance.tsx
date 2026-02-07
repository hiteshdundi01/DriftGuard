import { motion } from 'framer-motion'
import { TrendingUp, Clock } from 'lucide-react'
import type { PortfolioState } from '../hooks/useWebSocket'

interface Props {
    portfolio: PortfolioState | null
}

export function PortfolioBalance({ portfolio }: Props) {
    if (!portfolio) {
        return (
            <div className="text-swarm-muted text-center py-8 font-mono text-sm animate-pulse">
                // CONNECTING TO BROKER...
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
        <div>
            {/* Total value */}
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="text-center mb-8 relative"
            >
                <div className="absolute inset-0 bg-drift-500/10 blur-3xl rounded-full" />
                <div className="relative">
                    <div className="text-4xl font-display font-bold text-white mb-1 tracking-tight">
                        {formatCurrency(portfolio.total_value)}
                    </div>
                    <div className="text-xs font-mono text-swarm-muted uppercase tracking-wider">Total Net Worth</div>
                </div>
            </motion.div>

            {/* Allocation breakdown */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Stocks */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-12 h-12" />
                    </div>

                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-drift-400"></span>
                            <span className="text-xs font-mono text-swarm-muted uppercase">Stocks</span>
                        </div>
                        <div className="text-xl font-display font-medium text-white">
                            {formatCurrency(portfolio.stocks_value)}
                        </div>
                        <div className="text-sm font-mono text-drift-400">
                            {portfolio.stocks_pct.toFixed(1)}%
                        </div>
                    </div>
                </div>

                {/* Bonds */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <div className="w-12 h-12 rounded-full border-4 border-white/10" />
                    </div>

                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                            <span className="text-xs font-mono text-swarm-muted uppercase">Bonds</span>
                        </div>
                        <div className="text-xl font-display font-medium text-white">
                            {formatCurrency(portfolio.bonds_value)}
                        </div>
                        <div className="text-sm font-mono text-blue-400">
                            {portfolio.bonds_pct.toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Visual pie representation (Bar) */}
            <div className="relative h-2 rounded-full overflow-hidden bg-white/5 mb-4">
                <motion.div
                    className="absolute top-0 left-0 h-full bg-drift-500"
                    animate={{ width: `${portfolio.stocks_pct}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{ boxShadow: '0 0 10px rgba(34, 197, 94, 0.5)' }}
                />
                <motion.div
                    className="absolute top-0 right-0 h-full bg-blue-500"
                    animate={{ width: `${portfolio.bonds_pct}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                />
            </div>

            {/* Last trade */}
            <div className="flex items-center justify-between text-xs text-swarm-muted border-t border-white/5 pt-3 mt-4">
                <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last Rebalance
                </span>
                <span className="font-mono text-zinc-400">
                    {formatTime(portfolio.last_trade_time)}
                </span>
            </div>
        </div>
    )
}
