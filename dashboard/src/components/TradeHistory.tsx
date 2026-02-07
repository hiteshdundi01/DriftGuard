import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { TradeLogEntry } from '../hooks/useWebSocket'

interface Props {
    trades: TradeLogEntry[]
}

export function TradeHistory({ trades }: Props) {
    return (
        <div className="h-full">
            {trades.length === 0 ? (
                <div className="text-swarm-muted text-center py-8 text-sm font-mono border-2 border-dashed border-white/5 rounded-xl">
                    // AWAITING EXECUTION
                </div>
            ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {trades.map((trade, index) => {
                        const isBuy = trade.action.toLowerCase().includes('buy')
                        return (
                            <motion.div
                                key={trade.id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                            >
                                <div className={`p-2 rounded-lg ${isBuy ? 'bg-drift-500/10 text-drift-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {isBuy ? (
                                        <TrendingUp className="w-4 h-4" />
                                    ) : (
                                        <TrendingDown className="w-4 h-4" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-display font-medium ${isBuy ? 'text-drift-400' : 'text-red-400'}`}>
                                            {trade.action}
                                        </span>
                                        <span className="text-xs font-mono text-swarm-muted px-1.5 py-0.5 rounded bg-white/5">
                                            {trade.symbol}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-swarm-muted mt-0.5 font-mono">
                                        <span>${trade.amount.toFixed(2)}</span>
                                        <span>Δ {trade.drift_before.toFixed(2)}%</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-mono text-zinc-300 block">
                                        ${trade.portfolio_value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </span>
                                    <span className="text-[10px] text-swarm-muted">
                                        {new Date(trade.timestamp).toLocaleTimeString()}
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
