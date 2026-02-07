import { motion } from 'framer-motion'
import { History, TrendingUp, TrendingDown } from 'lucide-react'
import type { TradeLogEntry } from '../hooks/useWebSocket'

interface Props {
    trades: TradeLogEntry[]
}

export function TradeHistory({ trades }: Props) {
    return (
        <div className="bg-swarm-card rounded-xl border border-swarm-border p-6">
            <div className="flex items-center gap-3 mb-4">
                <History className="w-5 h-5 text-drift-400" />
                <h2 className="text-lg font-semibold text-white">Trade History</h2>
                {trades.length > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-zinc-800 text-zinc-400 rounded-full">
                        {trades.length}
                    </span>
                )}
            </div>

            {trades.length === 0 ? (
                <div className="text-zinc-500 text-center py-8 text-sm">
                    No trades executed yet
                </div>
            ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {trades.map((trade, index) => {
                        const isBuy = trade.action.toLowerCase().includes('buy')
                        return (
                            <motion.div
                                key={trade.id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50"
                            >
                                <div className={`p-1.5 rounded ${isBuy ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                                    {isBuy ? (
                                        <TrendingUp className="w-4 h-4 text-green-400" />
                                    ) : (
                                        <TrendingDown className="w-4 h-4 text-red-400" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-medium ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
                                            {trade.action}
                                        </span>
                                        <span className="text-xs text-zinc-500">
                                            {trade.symbol}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                                        <span>${trade.amount.toFixed(2)}</span>
                                        <span>Drift: {trade.drift_before.toFixed(1)}%</span>
                                        <span className="text-zinc-600">
                                            {new Date(trade.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-mono text-zinc-300">
                                        ${trade.portfolio_value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
