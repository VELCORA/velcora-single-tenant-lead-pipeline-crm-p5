import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  ChevronDown,
  Clock3,
  Command,
  Mail,
  MessageSquareText,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Stage = 'new' | 'qualified' | 'proposal' | 'won' | 'lost';
type Priority = 'hot' | 'warm' | 'cold';
type Lead = {
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
};
type Notification = {
  id: string;
  lead_id: string | null;
  type: 'new_lead' | 'follow_up' | 'email' | 'stage_change';
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
};
type Activity = { id: string; lead_id: string; type: string; content: string; created_at: string };
type Tab = 'overview' | 'pipeline' | 'intake';

const stages: { key: Stage; label: string; color: string }[] = [
  { key: 'new', label: 'New leads', color: 'blue' },
  { key: 'qualified', label: 'Qualified', color: 'amber' },
  { key: 'proposal', label: 'Proposal', color: 'violet' },
  { key: 'won', label: 'Won', color: 'emerald' },
];

const formatTime = (value: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
const formatEyebrow = () => new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()).toUpperCase();
const initials = (name: string) => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNewLead, setShowNewLead] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? null;
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  const filteredLeads = useMemo(() => leads.filter((lead) => `${lead.name} ${lead.company} ${lead.email}`.toLowerCase().includes(search.toLowerCase())), [leads, search]);
  const qualifiedCount = leads.filter((lead) => lead.stage === 'qualified' || lead.stage === 'proposal').length;
  const winRate = leads.length ? Math.round((leads.filter((lead) => lead.stage === 'won').length / leads.length) * 100) : 0;

  const refresh = async () => {
    setLoading(true);
    const [leadResult, notificationResult, activityResult] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(12),
      supabase.from('lead_activities').select('*').order('created_at', { ascending: false }),
    ]);
    if (leadResult.error || notificationResult.error || activityResult.error) setError('We could not load the workspace. Please refresh and try again.');
    setLeads((leadResult.data as Lead[]) ?? []);
    setNotifications((notificationResult.data as Notification[]) ?? []);
    setActivities((activityResult.data as Activity[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  const updateStage = async (lead: Lead, stage: Stage) => {
    const { error: updateError } = await supabase.from('leads').update({ stage, updated_at: new Date().toISOString() }).eq('id', lead.id);
    if (updateError) { setError('That stage change could not be saved.'); return; }
    await supabase.from('lead_activities').insert({ lead_id: lead.id, type: 'stage_change', content: `Moved from ${lead.stage} to ${stage}` });
    await supabase.from('notifications').insert({ lead_id: lead.id, type: 'stage_change', title: 'Pipeline updated', content: `${lead.name} is now in ${stage}.` });
    await refresh();
    notify(`Moved ${lead.name} to ${stage}.`);
  };

  const addNote = async (lead: Lead, note: string) => {
    if (!note.trim()) return;
    const { error: noteError } = await supabase.from('lead_activities').insert({ lead_id: lead.id, type: 'note', content: note.trim() });
    if (noteError) { setError('The note could not be saved.'); return; }
    await refresh();
    notify('Note added to the timeline.');
  };

  const openEmail = async (lead: Lead) => {
    window.location.href = `mailto:${lead.email}?subject=${encodeURIComponent(`Following up with ${lead.company}`)}&body=${encodeURIComponent(`Hi ${lead.name.split(' ')[0]},\n\nThanks for reaching out. I would love to continue the conversation.\n\nBest,\nThe Velgora team`)}`;
    await supabase.from('leads').update({ email_status: 'sent', last_contacted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', lead.id);
    await supabase.from('lead_activities').insert({ lead_id: lead.id, type: 'email', content: `Follow-up email drafted for ${lead.email}` });
    await supabase.from('notifications').insert({ lead_id: lead.id, type: 'email', title: 'Follow-up ready', content: `Email draft created for ${lead.name}.` });
    await refresh();
  };

  const markNotificationsRead = async () => {
    if (!unreadCount) return;
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><img src="/assets/logo.png" alt="Velgora logo" /><div><strong>velgora</strong><span>Lead operations</span></div></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list">
          <button className={activeTab === 'overview' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('overview')}><Command size={17} /> Overview</button>
          <button className={activeTab === 'pipeline' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('pipeline')}><Target size={17} /> Pipeline <span className="nav-count">{leads.length}</span></button>
          <button className={activeTab === 'intake' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('intake')}><Plus size={17} /> Add a lead</button>
        </nav>
        <div className="sidebar-bottom"><div className="live-indicator"><span /> Live workspace</div><p>Capture demand, qualify conversations, and keep every follow-up moving.</p><div className="profile"><div className="avatar small">JD</div><div><strong>Jordan Davis</strong><span>Sales owner</span></div><MoreHorizontal size={17} /></div></div>
      </aside>
      <main className="main-content">
        <header className="topbar"><div className="mobile-brand"><img src="/assets/logo.png" alt="" /> velgora</div><div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{activeTab === 'overview' ? 'Overview' : activeTab === 'pipeline' ? 'Pipeline' : 'Lead intake'}</strong></div><div className="top-actions"><div className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search leads..." /><kbd>⌘ K</kbd></div><button className="icon-button" onClick={() => { setShowNotifications((open) => !open); void markNotificationsRead(); }} aria-label="Notifications"><Bell size={18} />{unreadCount > 0 && <span className="notification-dot">{unreadCount}</span>}</button><button className="primary-button compact" onClick={() => setShowNewLead(true)}><Plus size={16} /> New lead</button></div></header>
        {showNotifications && <div className="notification-popover"><div className="popover-heading"><strong>Notifications</strong><button onClick={() => setShowNotifications(false)}><X size={16} /></button></div>{notifications.length === 0 ? <div className="empty-mini">No activity yet.</div> : notifications.slice(0, 5).map((notification) => <div className="notification-row" key={notification.id}><div className={`notification-icon ${notification.type}`}><Bell size={14} /></div><div><strong>{notification.title}</strong><p>{notification.content}</p><span>{formatTime(notification.created_at)}</span></div></div>)}</div>}
        {error && <div className="error-banner">{error}<button onClick={() => setError('')}><X size={15} /></button></div>}
        {activeTab === 'overview' && <Overview leads={leads} qualifiedCount={qualifiedCount} winRate={winRate} loading={loading} onSelect={(id) => { setSelectedLeadId(id); setActiveTab('pipeline'); }} onAdd={() => setShowNewLead(true)} />}
        {activeTab === 'pipeline' && <Pipeline leads={filteredLeads} selectedLead={selectedLead} activities={activities} search={search} onSelect={setSelectedLeadId} onStage={updateStage} onEmail={openEmail} onNote={addNote} />}
        {activeTab === 'intake' && <Intake onCreated={async (id) => { await refresh(); setSelectedLeadId(id); setActiveTab('pipeline'); notify('Lead captured and added to the pipeline.'); }} />}
      </main>
      {showNewLead && <div className="modal-backdrop" onMouseDown={() => setShowNewLead(false)}><div className="modal-card" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">CAPTURE DEMAND</span><h2>Add a new lead</h2></div><button onClick={() => setShowNewLead(false)} className="close-button"><X size={18} /></button></div><Intake compact onCreated={async (id) => { setShowNewLead(false); await refresh(); setSelectedLeadId(id); setActiveTab('pipeline'); notify('Lead captured and added to the pipeline.'); }} /></div></div>}
      {toast && <div className="toast"><Check size={16} /> {toast}</div>}
    </div>
  );
}

function Overview({ leads, qualifiedCount, winRate, loading, onSelect, onAdd }: { leads: Lead[]; qualifiedCount: number; winRate: number; loading: boolean; onSelect: (id: string) => void; onAdd: () => void }) {
  const recentLeads = leads.slice(0, 5);
  const hotLeads = leads.filter((lead) => lead.priority === 'hot');
  return <div className="page"><div className="page-heading"><div><span className="eyebrow">{formatEyebrow()}</span><h1>Good morning, Jordan <span className="heading-mark">✦</span></h1><p>Here’s what’s happening across your revenue engine today.</p></div><button className="primary-button" onClick={onAdd}><Plus size={17} /> Capture a lead</button></div><div className="stat-grid"><Stat icon={<TrendingUp size={18} />} label="Total leads" value={leads.length.toString()} detail="All captured demand" color="blue" /><Stat icon={<Target size={18} />} label="Qualified" value={qualifiedCount.toString()} detail="Ready for sales" color="amber" /><Stat icon={<Sparkles size={18} />} label="Hot opportunities" value={hotLeads.length.toString()} detail="Need attention now" color="orange" /><Stat icon={<ArrowUpRight size={18} />} label="Win rate" value={`${winRate}%`} detail="Across all opportunities" color="green" /></div><div className="dashboard-grid"><section className="panel recent-panel"><div className="panel-heading"><div><h2>Recent leads</h2><p>New conversations entering your pipeline.</p></div><button className="text-button" onClick={() => onAdd()}>View all <ArrowUpRight size={14} /></button></div>{loading ? <LoadingRows /> : recentLeads.length === 0 ? <EmptyState onAdd={onAdd} /> : <div className="lead-list">{recentLeads.map((lead) => <LeadRow lead={lead} key={lead.id} onClick={() => onSelect(lead.id)} />)}</div>}</section><section className="panel activity-panel"><div className="panel-heading"><div><h2>Today’s focus</h2><p>Prioritized follow-up queue.</p></div><Clock3 size={18} className="muted-icon" /></div>{hotLeads.length === 0 ? <div className="focus-empty"><div className="soft-icon"><Target size={20} /></div><strong>Your focus list is clear</strong><span>Hot leads will show up here automatically.</span></div> : <div className="focus-list">{hotLeads.slice(0, 4).map((lead) => <button className="focus-row" key={lead.id} onClick={() => onSelect(lead.id)}><div className="avatar">{initials(lead.name)}</div><div><strong>{lead.name}</strong><span>{lead.company} · Score {lead.score}</span></div><ArrowUpRight size={15} /></button>)}</div>}<div className="insight-card"><Sparkles size={17} /><div><strong>Qualification insight</strong><p>{leads.length ? `${Math.round((qualifiedCount / leads.length) * 100)}% of your leads are currently sales-ready.` : 'Start capturing leads to unlock qualification insights.'}</p></div></div></section></div><section className="workflow-strip"><div className="workflow-intro"><span className="eyebrow">THE FLOW</span><h2>From first touch to closed won.</h2><p>One simple place to move every opportunity forward.</p></div>{['Capture', 'Qualify', 'Convert'].map((item, index) => <div className="workflow-step" key={item}><div className="workflow-number">0{index + 1}</div><div><strong>{item}</strong><span>{index === 0 ? 'Bring every inquiry in' : index === 1 ? 'Prioritize the right fit' : 'Keep momentum alive'}</span></div></div>)}</section></div>;
}

function Stat({ icon, label, value, detail, color }: { icon: React.ReactNode; label: string; value: string; detail: string; color: string }) { return <div className="stat-card"><div className={`stat-icon ${color}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>; }
function LoadingRows() { return <div className="loading-rows">{[1, 2, 3].map((row) => <div className="skeleton-row" key={row}><span /><div><i /><i /></div></div>)}</div>; }
function EmptyState({ onAdd }: { onAdd: () => void }) { return <div className="empty-state"><div className="empty-orb"><Plus size={22} /></div><strong>No leads yet</strong><span>Your next opportunity starts with a conversation.</span><button className="text-button" onClick={onAdd}>Capture your first lead <ArrowUpRight size={14} /></button></div>; }
function LeadRow({ lead, onClick }: { lead: Lead; onClick: () => void }) { return <button className="lead-row" onClick={onClick}><div className="avatar">{initials(lead.name)}</div><div className="lead-main"><strong>{lead.name}</strong><span>{lead.role || 'Contact'} at {lead.company}</span></div><div className="lead-source"><span>{lead.source}</span><small>{formatTime(lead.created_at)}</small></div><div className={`score-pill ${lead.priority}`}><span />{lead.score}</div><ChevronDown size={16} className="row-chevron" /></button>; }

function Pipeline({ leads, selectedLead, activities, search, onSelect, onStage, onEmail, onNote }: { leads: Lead[]; selectedLead: Lead | null; activities: Activity[]; search: string; onSelect: (id: string) => void; onStage: (lead: Lead, stage: Stage) => void; onEmail: (lead: Lead) => void; onNote: (lead: Lead, note: string) => void }) {
  const [note, setNote] = useState('');
  return <div className="page"><div className="page-heading pipeline-heading"><div><span className="eyebrow">REVENUE PIPELINE</span><h1>Move good conversations forward.</h1><p>Review, qualify, and keep every opportunity in motion.</p></div><div className="pipeline-total"><strong>{leads.length}</strong><span>{search ? 'matching leads' : 'total leads'}</span></div></div><div className="pipeline-layout"><div className="board-wrap"><div className="board">{stages.map((stage) => <div className="stage-column" key={stage.key}><div className="stage-heading"><div><span className={`stage-dot ${stage.color}`} /> <strong>{stage.label}</strong></div><span>{leads.filter((lead) => lead.stage === stage.key).length}</span></div><div className="stage-cards">{leads.filter((lead) => lead.stage === stage.key).map((lead) => <button className={`pipeline-card ${selectedLead?.id === lead.id ? 'selected' : ''}`} key={lead.id} onClick={() => onSelect(lead.id)}><div className="card-top"><div className="avatar small">{initials(lead.name)}</div><span className={`priority-dot ${lead.priority}`} /></div><strong>{lead.name}</strong><span className="company-name"><Building2 size={13} />{lead.company}</span><div className="card-bottom"><span className={`score-pill ${lead.priority}`}><span />{lead.score} fit</span><span>{formatTime(lead.created_at).split(',')[0]}</span></div></button>)}{leads.filter((lead) => lead.stage === stage.key).length === 0 && <div className="column-empty">No leads here</div>}</div></div>)}</div></div><aside className="lead-detail">{selectedLead ? <><div className="detail-top"><div><span className="eyebrow">LEAD DETAILS</span><h2>{selectedLead.name}</h2><p>{selectedLead.role || 'Contact'} at {selectedLead.company}</p></div><button className="close-button" onClick={() => onSelect('')}><X size={17} /></button></div><div className="detail-actions"><button className="primary-button full" onClick={() => onEmail(selectedLead)}><Mail size={16} /> Draft follow-up email</button><a className="secondary-button" href={`tel:${selectedLead.phone}`}><Phone size={16} /> Call lead</a></div><div className="detail-section"><span className="detail-label">QUALIFICATION</span><div className="qualification-score"><div><strong>{selectedLead.score}</strong><span>/ 100 fit score</span></div><div className={`priority-badge ${selectedLead.priority}`}>{selectedLead.priority} priority</div></div><div className="progress-track"><span style={{ width: `${selectedLead.score}%` }} /></div></div><div className="detail-section"><span className="detail-label">MOVE STAGE</span><div className="stage-select-wrap"><select value={selectedLead.stage} onChange={(event) => void onStage(selectedLead, event.target.value as Stage)}>{stages.map((stage) => <option value={stage.key} key={stage.key}>{stage.label}</option>)}<option value="lost">Lost</option></select><ChevronDown size={15} /></div></div><div className="detail-section contact-info"><span className="detail-label">CONTACT</span><a href={`mailto:${selectedLead.email}`}><Mail size={14} /> {selectedLead.email}</a>{selectedLead.phone && <a href={`tel:${selectedLead.phone}`}><Phone size={14} /> {selectedLead.phone}</a>}</div><div className="detail-section"><span className="detail-label">TIMELINE</span><div className="timeline">{activities.filter((activity) => activity.lead_id === selectedLead.id).slice(0, 5).map((activity) => <div className="timeline-item" key={activity.id}><div className="timeline-line"><span /></div><div><strong>{activity.type.replace('_', ' ')}</strong><p>{activity.content}</p><small>{formatTime(activity.created_at)}</small></div></div>)}{activities.filter((activity) => activity.lead_id === selectedLead.id).length === 0 && <span className="muted-copy">No activity recorded yet.</span>}</div><div className="note-box"><MessageSquareText size={15} /><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note..." onKeyDown={(event) => { if (event.key === 'Enter') { void onNote(selectedLead, note); setNote(''); } }} /><button onClick={() => { void onNote(selectedLead, note); setNote(''); }}><Send size={14} /></button></div></div></> : <div className="detail-empty"><div className="soft-icon"><UserRound size={21} /></div><strong>Select a lead</strong><span>Choose a card to see its details, timeline, and next actions.</span></div>}</aside></div></div>;
}

function Intake({ onCreated, compact = false }: { onCreated: (id: string) => Promise<void>; compact?: boolean }) {
  const [form, setForm] = useState({ name: '', email: '', company: '', role: '', phone: '', source: 'Website', message: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const change = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setFormError('');
    const email = form.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFormError('Please enter a valid work email.'); setSaving(false); return; }
    const cleaned = { ...form, name: form.name.trim(), email, company: form.company.trim(), role: form.role.trim(), phone: form.phone.trim(), message: form.message.trim().slice(0, 2000) };
    const score = Math.min(98, 42 + (cleaned.company ? 18 : 0) + (cleaned.role ? 12 : 0) + (cleaned.message.length > 40 ? 16 : 0) + (cleaned.phone ? 10 : 0));
    const priority: Priority = score >= 75 ? 'hot' : score >= 55 ? 'warm' : 'cold';
    const { data, error: insertError } = await supabase.from('leads').insert({ ...cleaned, score, priority, email_status: 'queued', next_follow_up_at: new Date(Date.now() + 86400000).toISOString() }).select('id').maybeSingle();
    if (insertError || !data) { setFormError('This lead could not be saved. Please check the details and try again.'); setSaving(false); return; }
    await supabase.from('lead_activities').insert({ lead_id: data.id, type: 'created', content: `Lead captured from ${cleaned.source}` });
    await supabase.from('lead_activities').insert({ lead_id: data.id, type: 'qualification', content: `Scored ${score}/100 · ${priority} priority` });
    await supabase.from('notifications').insert({ lead_id: data.id, type: 'new_lead', title: 'New lead captured', content: `${cleaned.name} from ${cleaned.company} is ready for review.` });
    setForm({ name: '', email: '', company: '', role: '', phone: '', source: 'Website', message: '' }); setSaving(false); await onCreated(data.id);
  };
  return <div className={compact ? 'intake compact-intake' : 'page intake-page'}>{!compact && <div className="page-heading"><div><span className="eyebrow">LEAD INTAKE</span><h1>Turn interest into an opportunity.</h1><p>Capture the details your team needs to make the next conversation count.</p></div><div className="intake-badge"><Sparkles size={16} /> Auto-qualification on</div></div>}<form className="intake-card" onSubmit={submit}><div className="form-intro"><div className="form-icon"><Target size={20} /></div><div><h2>New lead details</h2><p>We’ll automatically score this lead and create a follow-up task.</p></div></div><div className="form-grid"><label>Full name<input required value={form.name} onChange={(event) => change('name', event.target.value)} placeholder="e.g. Alex Morgan" /></label><label>Work email<input required type="email" value={form.email} onChange={(event) => change('email', event.target.value)} placeholder="alex@company.com" /></label><label>Company<input required value={form.company} onChange={(event) => change('company', event.target.value)} placeholder="Company name" /></label><label>Role <span className="optional">optional</span><input value={form.role} onChange={(event) => change('role', event.target.value)} placeholder="e.g. Head of Growth" /></label><label>Phone <span className="optional">optional</span><input value={form.phone} onChange={(event) => change('phone', event.target.value)} placeholder="+1 555 000 0000" /></label><label>Source<select value={form.source} onChange={(event) => change('source', event.target.value)}><option>Website</option><option>Referral</option><option>LinkedIn</option><option>Event</option><option>Outbound</option></select></label><label className="full-field">What are they looking for? <span className="optional">optional</span><textarea value={form.message} onChange={(event) => change('message', event.target.value)} placeholder="Capture the problem, timeline, or anything useful for the first conversation..." rows={compact ? 3 : 4} /></label></div>{formError && <div className="form-error">{formError}</div>}<div className="form-footer"><span><Check size={15} /> Saved to your CRM instantly</span><button className="primary-button" disabled={saving}>{saving ? 'Saving lead...' : 'Create lead'} <ArrowUpRight size={16} /></button></div></form></div>;
}

export default App;
