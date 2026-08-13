import { beforeEach, describe, expect, it } from 'vitest';
import { store, type Lead } from './store';

const mk = (id: string): Lead => ({
  id,
  name: `Lead ${id}`,
  email: `${id}@example.com`,
  company: 'Acme',
  role: 'Buyer',
  phone: '',
  source: 'Website',
  message: '',
  stage: 'new',
  score: 50,
  priority: 'warm',
  owner: '',
  email_status: 'queued',
  last_contacted_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  next_follow_up_at: null,
});

beforeEach(() => {
  (globalThis as any).localStorage.clear();
});

describe('store', () => {
  it('starts empty and adds leads', () => {
    expect(store.getLeads()).toHaveLength(0);
    store.addLead(mk('1'));
    expect(store.getLeads()).toHaveLength(1);
    expect(store.getLeads()[0].id).toBe('1');
  });

  it('prepends newest lead first', () => {
    store.addLead(mk('1'));
    store.addLead(mk('2'));
    expect(store.getLeads().map((l) => l.id)).toEqual(['2', '1']);
  });

  it('updates a lead by id', () => {
    store.addLead(mk('1'));
    store.updateLead('1', { stage: 'won', score: 90 });
    const lead = store.getLeads()[0];
    expect(lead.stage).toBe('won');
    expect(lead.score).toBe(90);
  });

  it('does nothing when updating an unknown id', () => {
    store.addLead(mk('1'));
    store.updateLead('999', { stage: 'lost' });
    expect(store.getLeads()).toHaveLength(1);
    expect(store.getLeads()[0].stage).toBe('new');
  });

  it('adds activities and notifications', () => {
    store.addActivity({ lead_id: '1', type: 'note', content: 'call back' });
    store.addNotification({ lead_id: '1', type: 'new_lead', title: 'New', content: 'c', is_read: false });
    expect(store.getActivities()).toHaveLength(1);
    expect(store.getNotifications()).toHaveLength(1);
    expect(store.getNotifications()[0].is_read).toBe(false);
  });

  it('marks all notifications read', () => {
    store.addNotification({ lead_id: '1', type: 'new_lead', title: 'New', content: 'c', is_read: false });
    store.markAllRead();
    expect(store.getNotifications()[0].is_read).toBe(true);
  });

  it('persists data in localStorage', () => {
    store.addLead(mk('1'));
    const raw = (globalThis as any).localStorage.getItem('velcora.leads');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw)).toHaveLength(1);
  });
});
