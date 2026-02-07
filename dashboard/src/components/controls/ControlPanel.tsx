import { useState } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, Save, AlertTriangle } from 'lucide-react'

interface Props {
    stocksPct: number
    onSetAllocation: (stocks: number, bonds: number) => void
    onReset: () => void
}

export function ControlPanel({ stocksPct, onSetAllocation, onReset }: Props) {
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
        <div className="space-y-8">
            {/* Portfolio Configuration Section */}
            <div>
                <h3 className="text-sm font-mono text-drift-400 uppercase tracking-wider mb-4">Target Allocation</h3>

                <div className="bg-white/5 rounded-xl p-4 border border-white/5 mb-6">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs text-swarm-muted">Stocks / Bonds</span>
                        <span className="text-lg font-mono font-medium text-white">
                            {localStocks}/{100 - localStocks}
                        </span>
                    </div>

                    {/* Styled Range Input */}
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={localStocks}
                        onChange={(e) => handleStocksChange(Number(e.target.value))}
                        className="w-full h-2 bg-swarm-bg rounded-lg appearance-none cursor-pointer accent-drift-500 hover:accent-drift-400 transition-colors"
                    />

                    <div className="flex justify-between text-[10px] text-swarm-muted mt-2 font-mono uppercase">
                        <span>Conservative</span>
                        <span>Aggressive</span>
                    </div>
                </div>

                {/* Presets */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                    {[
                        { label: '80/20', stocks: 80 },
                        { label: '60/40', stocks: 60 },
                        { label: '40/60', stocks: 40 },
                        { label: '20/80', stocks: 20 },
                    ].map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => handleStocksChange(preset.stocks)}
                            className={`px-2 py-2 text-xs font-mono rounded-lg transition-all border border-transparent ${localStocks === preset.stocks
                                ? 'bg-drift-500/20 text-drift-300 border-drift-500/30'
                                : 'bg-white/5 text-swarm-muted hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                {isDirty && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={handleApply}
                        className="w-full py-3 bg-drift-600 hover:bg-drift-500 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-drift-600/20"
                    >
                        <Save className="w-4 h-4" />
                        Update Strategy
                    </motion.button>
                )}
            </div>

            <div className="h-px bg-white/10" />

            {/* System Actions */}
            <div>
                <h3 className="text-sm font-mono text-swarm-muted uppercase tracking-wider mb-4">Danger Zone</h3>

                <div className="space-y-3">
                    <button
                        onClick={onReset}
                        className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all flex items-start gap-3 group text-left"
                    >
                        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                        <div>
                            <span className="block font-medium mb-1 group-hover:underline">Simulate System Outage</span>
                            <span className="text-xs opacity-70 leading-relaxed block">
                                Resets all pheromones to zero to test agent dormancy and recovery.
                            </span>
                        </div>
                    </button>

                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-swarm-muted hover:text-white transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Restart Dashboard
                    </button>
                </div>
            </div>

            <div className="mt-auto pt-10 text-center">
                <p className="text-xs text-swarm-muted opacity-50 font-mono">
                    DriftGuard Swarm OS <br />
                    Build 2026.02.06
                </p>
            </div>
        </div>
    )
}
