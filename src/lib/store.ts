export type Stage = 'new' | 'qualified' | 'proposal' | 'won' | 'lost';
export type Priority = 'hot' | 'warm' | 'cold';

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  phone: string;
  source: string;
  message: string;
  stage: Stage;
  score: number;
  priority: Priority;
  owner: string;
  email_status: 'queued' | 'sent' | 'failed' | 'not_sent';
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
  next_follow_up_at: string | null;
}

export interface Notification {
  id: string;
  lead_id: string | null;
  type: 'new_lead' | 'follow_up' | 'email' | 'stage_change';
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Activity {
  id: string;
  lead_id: string;
  type: string;
  content: string;
  created_at: string;
}

const KEYS = {
  leads: 'velcora.leads',
  notifications: 'velcora.notifications',
  activities: 'velcora.activities',
};

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const read = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
};

const write = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};

export const store = {
  getLeads: (): Lead[] => read<Lead>(KEYS.leads),
  getNotifications: (): Notification[] => read<Notification>(KEYS.notifications),
  getActivities: (): Activity[] => read<Activity>(KEYS.activities),
  addLead: (lead: Lead): void => {
    write(KEYS.leads, [lead, ...read<Lead>(KEYS.leads)]);
  },
  updateLead: (id: string, patch: Partial<Lead>): void => {
    write(
      KEYS.leads,
      read<Lead>(KEYS.leads).map((lead) => (lead.id === id ? { ...lead, ...patch } : lead))
    );
  },
  addActivity: (activity: Omit<Activity, 'id' | 'created_at'>): void => {
    write(KEYS.activities, [
      { id: uid(), created_at: new Date().toISOString(), ...activity },
      ...read<Activity>(KEYS.activities),
    ]);
  },
  addNotification: (notification: Omit<Notification, 'id' | 'created_at'>): void => {
    write(KEYS.notifications, [
      { id: uid(), created_at: new Date().toISOString(), ...notification },
      ...read<Notification>(KEYS.notifications),
    ]);
  },
  markAllRead: (): void => {
    write(
      KEYS.notifications,
      read<Notification>(KEYS.notifications).map((notification) => ({ ...notification, is_read: true }))
    );
  },
};
