import { useState, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, X, Github, Hexagon } from 'lucide-react'

interface Props {
    children: ReactNode
    sidebarContent: ReactNode
    connected: boolean
}

export function DashboardLayout({ children, sidebarContent, connected }: Props) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    return (
        <div className="min-h-screen bg-swarm-bg grid-pattern font-sans text-swarm-text overflow-x-hidden selection:bg-drift-500/30">
            {/* Top Navigation Bar */}
            <header className="fixed top-0 left-0 right-0 h-16 glass-panel border-b-0 border-b-white/5 z-40 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <motion.div
                        animate={{ rotate: connected ? 0 : 360 }}
                        transition={{ duration: 4, repeat: connected ? 0 : Infinity, ease: 'linear' }}
                        className={`text-drift-400 ${!connected && 'opacity-50'}`}
                    >
                        <Hexagon className="w-8 h-8 fill-drift-500/10 stroke-[1.5]" />
                    </motion.div>
                    <div>
                        <h1 className="text-xl font-display font-bold text-white tracking-tight">
                            DriftGuard <span className="text-drift-400 text-xs align-top opacity-50 font-mono">v1.2</span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-drift-400 animate-pulse' : 'bg-swarm-danger'}`} />
                        <span className="text-xs font-mono text-swarm-muted uppercase tracking-wider">
                            {connected ? 'System Online' : 'Reconnecting'}
                        </span>
                    </div>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors text-swarm-muted hover:text-white"
                    >
                        <Settings className="w-5 h-5" />
                    </button>

                    <a
                        href="https://github.com/hiteshdundi01/DriftGuard"
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 hover:bg-white/5 rounded-full transition-colors text-swarm-muted hover:text-white"
                    >
                        <Github className="w-5 h-5" />
                    </a>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="pt-24 pb-12 px-6 max-w-[1600px] mx-auto">
                {children}
            </main>

            {/* Settings Drawer */}
            <AnimatePresence>
                {isSettingsOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSettingsOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-full max-w-sm glass-panel border-l border-white/10 z-50 shadow-2xl overflow-y-auto"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-display font-bold text-white">System Controls</h2>
                                    <button
                                        onClick={() => setIsSettingsOpen(false)}
                                        className="p-2 hover:bg-white/5 rounded-full text-swarm-muted hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                {sidebarContent}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
