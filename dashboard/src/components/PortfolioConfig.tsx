import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, RotateCcw, Save } from 'lucide-react'

interface Props {
    stocksPct: number
    bondsPct: number
    onSetAllocation: (stocks: number, bonds: number) => void
    onReset: () => void
}

export function PortfolioConfig({ stocksPct, bondsPct, onSetAllocation, onReset }: Props) {
    const [localStocks, setLocalStocks] = useState(stocksPct)
    const [isDirty, setIsDirty] = useState(false)

    const handleStocksChange = (value: number) => {
        setLocalStocks(value)
        setIsDirty(true)
    }

    const handleApply = () => {
        onSetAllocation(localStocks, 100 - localStocks)
        setIsDirty(false)
    }

    return (
        <div className="bg-swarm-card rounded-xl border border-swarm-border p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-drift-400" />
                    Portfolio Config
                </h2>
                <button
                    onClick={onReset}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Reset portfolio"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>

            {/* Allocation slider */}
            <div className="space-y-6">
                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-zinc-400">Target Allocation</span>
                        <span className="font-mono text-white">
                            {localStocks}% / {100 - localStocks}%
                        </span>
                    </div>

                    {/* Visual allocation bar */}
                    <div className="relative h-8 rounded-lg overflow-hidden bg-zinc-800 mb-4">
                        <motion.div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-drift-600 to-drift-500"
                            animate={{ width: `${localStocks}%` }}
                            transition={{ duration: 0.2 }}
                        />
                        <motion.div
                            className="absolute top-0 right-0 h-full bg-gradient-to-l from-blue-600 to-blue-500"
                            animate={{ width: `${100 - localStocks}%` }}
                            transition={{ duration: 0.2 }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center gap-4 text-xs font-medium text-white">
                            <span>📈 Stocks</span>
                            <span className="text-zinc-400">|</span>
                            <span>📊 Bonds</span>
                        </div>
                    </div>

                    {/* Slider */}
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={localStocks}
                        onChange={(e) => handleStocksChange(Number(e.target.value))}
                        className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-drift-500"
                    />

                    <div className="flex justify-between text-xs text-zinc-500 mt-1">
                        <span>100% Bonds</span>
                        <span>50/50</span>
                        <span>100% Stocks</span>
                    </div>
                </div>

                {/* Quick presets */}
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { label: '80/20', stocks: 80 },
                        { label: '60/40', stocks: 60 },
                        { label: '40/60', stocks: 40 },
                        { label: '20/80', stocks: 20 },
                    ].map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => handleStocksChange(preset.stocks)}
                            className={`px-3 py-2 text-sm rounded-lg transition-all ${localStocks === preset.stocks
                                    ? 'bg-drift-600 text-white'
                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                {/* Apply button */}
                {isDirty && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={handleApply}
                        className="w-full py-3 bg-drift-600 hover:bg-drift-500 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        Apply New Allocation
                    </motion.button>
                )}
            </div>

            {/* Info */}
            <div className="mt-4 pt-4 border-t border-swarm-border">
                <p className="text-xs text-zinc-500">
                    When portfolio drifts &gt;5% from target, the swarm will rebalance
                    (if volatility permits).
                </p>
            </div>
        </div>
    )
}
