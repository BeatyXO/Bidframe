import type { ReactNode } from 'react'

export function StatusPill({ children, tone = 'purple' }: { children: ReactNode; tone?: 'purple' | 'green' | 'amber' | 'slate' | 'red' }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}
