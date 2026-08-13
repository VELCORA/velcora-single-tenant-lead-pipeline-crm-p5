import type { Stage, Priority } from './store';

export const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: 'new', label: 'New leads', color: 'blue' },
  { key: 'qualified', label: 'Qualified', color: 'amber' },
  { key: 'proposal', label: 'Proposal', color: 'violet' },
  { key: 'won', label: 'Won', color: 'emerald' },
  { key: 'lost', label: 'Lost', color: 'rose' },
];

export const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const scoreLead = (lead: {
  company: string;
  role: string;
  message: string;
  phone: string;
}): number =>
  Math.min(
    98,
    42 +
      (lead.company ? 18 : 0) +
      (lead.role ? 12 : 0) +
      (lead.message.length > 40 ? 16 : 0) +
      (lead.phone ? 10 : 0)
  );

export const priorityFromScore = (score: number): Priority =>
  score >= 75 ? 'hot' : score >= 55 ? 'warm' : 'cold';

export const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const formatTime = (value: string): string =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(
    new Date(value)
  );

export const formatEyebrow = (): string =>
  new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    .format(new Date())
    .toUpperCase();
