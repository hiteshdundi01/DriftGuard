import { motion } from 'framer-motion'
import { Target } from 'lucide-react'

interface Props {
    currentStocksPct: number
    currentBondsPct: number
    targetStocksPct: number
}

// Radial gauge showing how far current allocation drifts from target
export function DriftChart({ currentStocksPct, currentBondsPct, targetStocksPct }: Props) {
    const targetBondsPct = 100 - targetStocksPct
    const driftPct = Math.abs(currentStocksPct - targetStocksPct)

    // Determine severity color
    const getSeverity = (drift: number) => {
        if (drift <= 2) return { label: 'ALIGNED', color: 'rgb(74, 222, 128)', bg: 'rgba(74, 222, 128, 0.1)', ring: 'rgba(74, 222, 128, 0.3)' }
        if (drift <= 5) return { label: 'MINOR DRIFT', color: 'rgb(251, 191, 36)', bg: 'rgba(251, 191, 36, 0.1)', ring: 'rgba(251, 191, 36, 0.3)' }
        if (drift <= 10) return { label: 'MODERATE DRIFT', color: 'rgb(251, 146, 60)', bg: 'rgba(251, 146, 60, 0.1)', ring: 'rgba(251, 146, 60, 0.3)' }
        return { label: 'CRITICAL DRIFT', color: 'rgb(248, 113, 113)', bg: 'rgba(248, 113, 113, 0.1)', ring: 'rgba(248, 113, 113, 0.3)' }
    }

    const severity = getSeverity(driftPct)

    // SVG gauge parameters
    const size = 140
    const strokeWidth = 8
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const center = size / 2

    // Current allocation arc (how much of full circle stocks occupy)
    const stocksArc = (currentStocksPct / 100) * circumference
    const bondsArc = (currentBondsPct / 100) * circumference

    // Target marker angle
    const targetAngle = (targetStocksPct / 100) * 360 - 90 // -90 to start from top

    // Marker position
    const markerX = center + radius * Math.cos((targetAngle * Math.PI) / 180)
    const markerY = center + radius * Math.sin((targetAngle * Math.PI) / 180)

    return (
        <div className="flex flex-col items-center">
            {/* Radial gauge */}
            <div className="relative" style={{ width: size, height: size }}>
                {/* Soft glow behind gauge */}
                <motion.div
                    className="absolute inset-4 rounded-full"
                    style={{ background: `radial-gradient(circle, ${severity.bg} 0%, transparent 70%)` }}
                    animate={{ opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity }}
                />

                <svg width={size} height={size} className="transform -rotate-90">
                    {/* Background track */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth={strokeWidth}
                    />

                    {/* Stocks arc (green) */}
                    <motion.circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="rgb(74, 222, 128)"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${stocksArc} ${circumference - stocksArc}`}
                        strokeDashoffset={0}
                        strokeLinecap="round"
                        initial={{ strokeDasharray: `0 ${circumference}` }}
                        animate={{ strokeDasharray: `${stocksArc} ${circumference - stocksArc}` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{ filter: 'drop-shadow(0 0 4px rgba(74, 222, 128, 0.5))' }}
                    />

                    {/* Bonds arc (blue) */}
                    <motion.circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="rgb(96, 165, 250)"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${bondsArc} ${circumference - bondsArc}`}
                        strokeDashoffset={-stocksArc}
                        strokeLinecap="round"
                        initial={{ strokeDasharray: `0 ${circumference}` }}
                        animate={{ strokeDasharray: `${bondsArc} ${circumference - bondsArc}` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                        style={{ filter: 'drop-shadow(0 0 4px rgba(96, 165, 250, 0.3))' }}
                    />

                    {/* Target marker */}
                    <motion.circle
                        cx={markerX}
                        cy={markerY}
                        r={5}
                        fill="white"
                        stroke={severity.color}
                        strokeWidth={2}
                        initial={{ opacity: 0, r: 0 }}
                        animate={{ opacity: 1, r: 5 }}
                        transition={{ delay: 0.5 }}
                        style={{ filter: `drop-shadow(0 0 6px ${severity.ring})` }}
                    />
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.div
                        className="text-2xl font-display font-bold"
                        style={{ color: severity.color }}
                        key={driftPct.toFixed(1)}
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                    >
                        {driftPct.toFixed(1)}%
                    </motion.div>
                    <span className="text-[9px] font-mono text-swarm-muted uppercase">drift</span>
                </div>
            </div>

            {/* Status label */}
            <motion.div
                className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono border"
                style={{
                    color: severity.color,
                    backgroundColor: severity.bg,
                    borderColor: severity.ring,
                }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <Target className="w-3 h-3" />
                {severity.label}
            </motion.div>

            {/* Current vs Target comparison */}
            <div className="w-full mt-4 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-swarm-muted">Stocks</span>
                    <div className="flex items-center gap-2">
                        <span className="text-drift-400">{currentStocksPct.toFixed(1)}%</span>
                        <span className="text-white/20">→</span>
                        <span className="text-white/40">{targetStocksPct}%</span>
                    </div>
                </div>
                {/* Visual drift bar for stocks */}
                <div className="relative h-1.5 rounded-full bg-white/5">
                    <motion.div
                        className="absolute top-0 left-0 h-full rounded-full bg-drift-500"
                        animate={{ width: `${currentStocksPct}%` }}
                        transition={{ duration: 0.5 }}
                    />
                    {/* Target tick */}
                    <div
                        className="absolute top-[-2px] h-[calc(100%+4px)] w-[2px] bg-white/50 rounded-full"
                        style={{ left: `${targetStocksPct}%` }}
                    />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-swarm-muted">Bonds</span>
                    <div className="flex items-center gap-2">
                        <span className="text-blue-400">{currentBondsPct.toFixed(1)}%</span>
                        <span className="text-white/20">→</span>
                        <span className="text-white/40">{targetBondsPct}%</span>
                    </div>
                </div>
                {/* Visual drift bar for bonds */}
                <div className="relative h-1.5 rounded-full bg-white/5">
                    <motion.div
                        className="absolute top-0 left-0 h-full rounded-full bg-blue-500"
                        animate={{ width: `${currentBondsPct}%` }}
                        transition={{ duration: 0.5 }}
                    />
                    <div
                        className="absolute top-[-2px] h-[calc(100%+4px)] w-[2px] bg-white/50 rounded-full"
                        style={{ left: `${targetBondsPct}%` }}
                    />
                </div>
            </div>
        </div>
    )
}
