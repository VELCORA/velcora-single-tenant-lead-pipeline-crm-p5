/*
# Create lead pipeline workspace

1. New Tables
- `leads`: shared lead records captured from the public intake form, including contact details, company context, qualification score, stage, owner, and email delivery state.
- `lead_activities`: timeline entries for qualification, calls, notes, and stage changes related to a lead.
- `notifications`: shared in-app notification inbox records for new leads, stage changes, and follow-up reminders.

2. Security
- Row Level Security is enabled on all tables.
- This is intentionally a no-login, single-tenant workspace, so anon and authenticated clients can manage the shared CRM records.

3. Important Notes
- `stage` starts at `new` and supports the full flow through `qualified`, `proposal`, `won`, and `lost`.
- `email_status` tracks whether the welcome/follow-up email is queued, sent, or failed.
- Foreign keys keep activities and notifications connected to their lead.
*/

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text NOT NULL,
  role text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'Website',
  message text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'qualified', 'proposal', 'won', 'lost')),
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  priority text NOT NULL DEFAULT 'warm' CHECK (priority IN ('hot', 'warm', 'cold')),
  owner text NOT NULL DEFAULT 'Unassigned',
  email_status text NOT NULL DEFAULT 'queued' CHECK (email_status IN ('queued', 'sent', 'failed', 'not_sent')),
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('created', 'note', 'email', 'call', 'stage_change', 'qualification')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('new_lead', 'follow_up', 'email', 'stage_change')),
  title text NOT NULL,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_stage_idx ON public.leads(stage);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS activities_lead_id_idx ON public.lead_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shared_select_leads" ON public.leads;
CREATE POLICY "shared_select_leads" ON public.leads FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_leads" ON public.leads;
CREATE POLICY "shared_insert_leads" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_leads" ON public.leads;
CREATE POLICY "shared_update_leads" ON public.leads FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_leads" ON public.leads;
CREATE POLICY "shared_delete_leads" ON public.leads FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_select_activities" ON public.lead_activities;
CREATE POLICY "shared_select_activities" ON public.lead_activities FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_activities" ON public.lead_activities;
CREATE POLICY "shared_insert_activities" ON public.lead_activities FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_activities" ON public.lead_activities;
CREATE POLICY "shared_update_activities" ON public.lead_activities FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_activities" ON public.lead_activities;
CREATE POLICY "shared_delete_activities" ON public.lead_activities FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_select_notifications" ON public.notifications;
CREATE POLICY "shared_select_notifications" ON public.notifications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_notifications" ON public.notifications;
CREATE POLICY "shared_insert_notifications" ON public.notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_notifications" ON public.notifications;
CREATE POLICY "shared_update_notifications" ON public.notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_notifications" ON public.notifications;
CREATE POLICY "shared_delete_notifications" ON public.notifications FOR DELETE TO anon, authenticated USING (true);
