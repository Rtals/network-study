import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 16, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const ChevronLeft = (p: IconProps) => <Icon {...p}><path d="M15 6l-6 6 6 6" /></Icon>
export const ChevronRight = (p: IconProps) => <Icon {...p}><path d="M9 6l6 6-6 6" /></Icon>
export const ChevronDown = (p: IconProps) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>
export const RotateCcw = (p: IconProps) => (
  <Icon {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></Icon>
)
export const PanelLeft = (p: IconProps) => (
  <Icon {...p} strokeWidth={2}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></Icon>
)
export const ListChecks = (p: IconProps) => (
  <Icon {...p} strokeWidth={2}><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" /></Icon>
)
export const Notebook = (p: IconProps) => (
  <Icon {...p} strokeWidth={2}><path d="M4 4h12l4 4v12H4z" /><path d="M8 12h8M8 16h5" /></Icon>
)
export const FileText = (p: IconProps) => (
  <Icon {...p} strokeWidth={2}><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /></Icon>
)
export const AlertTriangle = (p: IconProps) => (
  <Icon {...p}><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.5" /></Icon>
)
export const LogList = (p: IconProps) => (
  <Icon {...p} strokeWidth={2}><path d="M4 6h16M4 12h16M4 18h10" /></Icon>
)
export const Activity = (p: IconProps) => <Icon {...p}><path d="M3 12h4l3-8 4 16 3-8h4" /></Icon>
export const X =(p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>
export const BookOpen = (p: IconProps) => (
  <Icon {...p} strokeWidth={2}><path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2z" /><path d="M22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z" /></Icon>
)

export const Play = ({ size = 16, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
    <path d="M8 5v14l11-7z" />
  </svg>
)
export const Pause = ({ size = 16, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
)
/** 네 방향 화살표: 끌어서 이동 */
export const Move = (p: IconProps) => (
  <Icon {...p}><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" /></Icon>
)
export const Lightbulb = (p: IconProps) => (
  <Icon {...p}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" /></Icon>
)
