import type { LucideIcon } from 'lucide-react'
import {
  Award,
  BarChart3,
  BookOpen,
  Bookmark,
  Briefcase,
  Calendar,
  Camera,
  CheckSquare,
  Clipboard,
  Clock,
  Code,
  Coffee,
  Database,
  File,
  FileText,
  Flag,
  Folder,
  Gem,
  Globe,
  Hash,
  Heart,
  Home,
  Image,
  Key,
  Lightbulb,
  Link,
  List,
  Lock,
  Mail,
  Map,
  MessageSquare,
  Music,
  Palette,
  PenLine,
  PieChart,
  Pin,
  Rocket,
  Shield,
  Star,
  Tag,
  Target,
  Terminal,
  Trophy,
  Video,
  Wrench,
  Zap
} from 'lucide-react'

export const LUCIDE_ICON_PREFIX = 'lucide:'

const LUCIDE_ICONS: Record<string, LucideIcon> = {
  FileText,
  File,
  Folder,
  BookOpen,
  Bookmark,
  Briefcase,
  Star,
  Heart,
  Pin,
  Lightbulb,
  Target,
  Rocket,
  Zap,
  Coffee,
  Calendar,
  Clock,
  Map,
  Globe,
  Home,
  Mail,
  MessageSquare,
  Image,
  Camera,
  Music,
  Video,
  Code,
  Terminal,
  Database,
  BarChart3,
  PieChart,
  Clipboard,
  CheckSquare,
  List,
  Hash,
  Link,
  Lock,
  Key,
  Shield,
  Flag,
  Tag,
  Award,
  Trophy,
  Gem,
  Wrench,
  Palette,
  PenLine
}

export function isLucideDocIcon(icon: string | null): boolean {
  return icon != null && icon.startsWith(LUCIDE_ICON_PREFIX)
}

export function getLucideDocIcon(icon: string): LucideIcon | null {
  if (!isLucideDocIcon(icon)) return null
  return LUCIDE_ICONS[icon.slice(LUCIDE_ICON_PREFIX.length)] ?? null
}

interface DocIconProps {
  icon: string | null
  size?: number
  color?: string
}

export function DocIcon({ icon, size = 16, color = 'var(--text-muted)' }: DocIconProps): React.JSX.Element | null {
  if (!icon) return null
  const Lucide = getLucideDocIcon(icon)
  if (Lucide) {
    return <Lucide size={size} style={{ color, flexShrink: 0 }} />
  }
  return <span style={{ fontSize: size, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
}

export { LUCIDE_ICONS }
