import { ReactNode } from 'react'

interface Props {
    title: string | ReactNode
    icon?: ReactNode
    children: ReactNode
    className?: string
    action?: ReactNode
}

export function MetricCard({ title, icon, children, className = '', action }: Props) {
    return (
        <div className={`glass-panel rounded-2xl p-6 ${className}`}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-display font-medium text-white flex items-center gap-3">
                    {icon && <span className="text-drift-400">{icon}</span>}
                    {title}
                </h2>
                {action}
            </div>
            {children}
        </div>
    )
}
