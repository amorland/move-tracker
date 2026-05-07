import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  CalendarCheck,
  CarFront,
  CheckCircle2,
  Construction,
  House,
  Landmark,
} from 'lucide-react';

export type AreaIconKey =
  | 'key_dates'
  | 'events'
  | 'tasks'
  | 'move'
  | 'drive'
  | 'home_purchase'
  | 'home_setup'
  | 'home_updates'
  | 'loan';

type AreaIconVisual = {
  label: string;
  Icon: LucideIcon;
  background: string;
  border: string;
  color: string;
};

const AREA_ICON_VISUALS: Record<AreaIconKey, AreaIconVisual> = {
  key_dates: {
    label: 'Key Dates',
    Icon: Calendar,
    background: 'var(--color-gold-soft)',
    border: 'var(--color-gold)',
    color: 'var(--color-gold)',
  },
  events: {
    label: 'Events',
    Icon: CalendarCheck,
    background: 'var(--color-surface-muted)',
    border: 'var(--color-border-strong)',
    color: 'var(--color-secondary)',
  },
  tasks: {
    label: 'Tasks',
    Icon: CheckCircle2,
    background: 'var(--color-sage-soft)',
    border: 'var(--color-sage)',
    color: 'var(--color-sage)',
  },
  move: {
    label: 'Move',
    Icon: CheckCircle2,
    background: 'var(--color-sage-soft)',
    border: 'var(--color-sage)',
    color: 'var(--color-sage)',
  },
  drive: {
    label: 'Drive',
    Icon: CarFront,
    background: 'var(--color-blue-soft)',
    border: 'var(--color-blue)',
    color: 'var(--color-blue)',
  },
  home_purchase: {
    label: 'Home Purchase',
    Icon: House,
    background: 'var(--color-accent-soft)',
    border: 'var(--color-accent)',
    color: 'var(--color-accent-dark)',
  },
  home_setup: {
    label: 'Home Setup',
    Icon: House,
    background: 'var(--color-accent-soft)',
    border: 'var(--color-accent)',
    color: 'var(--color-accent-dark)',
  },
  home_updates: {
    label: 'Home Updates',
    Icon: Construction,
    background: 'var(--color-gold-soft)',
    border: 'var(--color-gold)',
    color: 'var(--color-gold)',
  },
  loan: {
    label: 'Loan',
    Icon: Landmark,
    background: 'var(--color-blue-soft)',
    border: 'var(--color-blue)',
    color: 'var(--color-blue)',
  },
};

export function getAreaIconVisual(area: AreaIconKey) {
  return AREA_ICON_VISUALS[area];
}

export default function AreaIcon({
  area,
  size = 12,
  color,
}: {
  area: AreaIconKey;
  size?: number;
  color?: string;
}) {
  const { Icon, color: defaultColor } = getAreaIconVisual(area);
  return <Icon size={size} color={color ?? defaultColor} />;
}
