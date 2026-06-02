'use client';

import { useEffect, useState, useCallback } from 'react';
import { Play, Square, RefreshCw, MapPin, Clock, DollarSign, Users, Activity, Settings2, Loader2, AlertTriangle, CheckCircle2, Zap, Mail, MessageCircle, Search, Target, TrendingUp, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

interface PipelineState {
  status: 'idle' | 'running' | 'error' | 'paused';
  lastScrapeAt: string | null;
  lastEnrichAt: string | null;
  lastNurtureAt: string | null;
  totalLeadsSourced: number;
  totalCostIncurred: number;
  nextScrapeAt: string | null;
  error: string | null;
  cycleCount: number;
  uptime: number;
}

interface PipelineConfig {
  enabled: boolean;
  scrapeIntervalHours: number;
  enrichEnabled: boolean;
  nurtureEnabled: boolean;
  defaultSource: string;
  defaultLocation: string;
  defaultQuery: string;
  maxLeadsPerScrape: number;
  preferredModel: string;
  preferredProvider: string;
}

interface Lead {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  phone?: string;
  status: string;
  pipelineStage: string;
  temperature?: string;
  score: number;
  personaType: string;
  notes: string;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  agentType: string;
  status: string;
  output: string;
  createdAt: string;
  metadata?: { label?: string; cost?: number };
}

export default function AutomationHub() {
  const [state, setState] = useState<PipelineState | null>(null);
  const [config, setConfig] = useState<PipelineConfig | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState('disconnected');
  const [useEmailScrape, setUseEmailScrape] = useState(true);

  const loadStatus = useCallback(async () => {
    try {
      const [pipelineRes, leadsRes, activityRes, waRes] = await Promise.all([
        fetch('/api/pipeline'),
        fetch('/api/leads'),
        fetch('/api/agents/run?recent=1').catch(() => null),
        fetch('/api/whatsapp?action=status').catch(() => null),
      ]);
      if (pipelineRes.ok) {
        const data = await pipelineRes.json();
        setState(data.state);
        setConfig(data.config);
      }
      if (leadsRes.ok) setLeads(await leadsRes.json());
      if (activityRes && activityRes.ok) {
        const data = await activityRes.json();
        if (Array.isArray(data)) setActivity(data.slice(0, 20));
        else if (data.results) setActivity(data.results.slice(0, 20));
      }
      if (waRes && waRes.ok) {
        const data = await waRes.json();
        setWhatsappStatus(data.status || 'disconnected');
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const doAction = async (action: string, extra?: Record<string, unknown>) => {
    setActionLoading(action);
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (data.state) setState(data.state);
      if (data.config) setConfig(data.config);
    } catch {} finally { setActionLoading(null); }
  };

  const runScrape = async () => {
    setActionLoading('scrape');
    try {
      await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tick' }),
      });
      await loadStatus();
    } catch {} finally { setActionLoading(null); }
  };

  const stageCounts = {
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    qualified: leads.filter((l) => l.status === 'qualified').length,
    booked: leads.filter((l) => l.status === 'appointment_scheduled').length,
  };

  const isRunning = state?.status === 'running';
  const isEnabled = config?.enabled;
  const emailLeads = leads.filter((l) => l.email).length;
  const phoneLeads = leads.filter((l) => l.phone).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        <span className="ml-2 text-surface-500">Loading automation hub...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-surface-900">Automation Hub</h2>
          <p className="text-sm text-surface-500 mt-1">
            Scrape Google Maps &rarr; find emails &rarr; send email sequences &rarr; WhatsApp follow-up &rarr; auto-book
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={runScrape}
            disabled={actionLoading === 'scrape' || isRunning}
            className="inline-flex items-center gap-2 rounded-lg border border-surface-200 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 transition-all disabled:opacity-50"
          >
            {actionLoading === 'scrape' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Run Scrape Now
          </button>
          <button
            onClick={() => doAction(isEnabled ? 'stop' : 'start')}
            disabled={actionLoading !== null}
            className={clsx(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-50',
              isEnabled ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
            )}
          >
            {actionLoading === 'start' || actionLoading === 'stop' ? <Loader2 className="h-4 w-4 animate-spin" /> : isEnabled ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isEnabled ? 'Stop Pipeline' : 'Start Pipeline'}
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className={clsx('flex h-10 w-10 items-center justify-center rounded-lg', isEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-surface-100 text-surface-400')}>
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Pipeline</p>
              <p className={clsx('text-sm font-semibold', isEnabled ? 'text-emerald-600' : 'text-surface-500')}>
                {isRunning ? 'Running...' : isEnabled ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Total Leads</p>
              <p className="text-sm font-semibold text-surface-900">{leads.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-surface-500">With Email</p>
              <p className="text-sm font-semibold text-surface-900">{emailLeads}/{leads.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className={clsx('flex h-10 w-10 items-center justify-center rounded-lg', whatsappStatus === 'connected' ? 'bg-green-50 text-green-600' : 'bg-surface-100 text-surface-400')}>
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-surface-500">WhatsApp</p>
              <p className={clsx('text-sm font-semibold', whatsappStatus === 'connected' ? 'text-green-600' : 'text-surface-500')}>
                {whatsappStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Funnel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Lead Pipeline */}
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary-600" />
              Lead Pipeline
            </h3>
            <div className="space-y-2">
              <StageBar label="New" count={stageCounts.new} color="bg-surface-300" max={leads.length || 1} />
              <StageBar label="Contacted" count={stageCounts.contacted} color="bg-blue-400" max={leads.length || 1} />
              <StageBar label="Qualified" count={stageCounts.qualified} color="bg-amber-400" max={leads.length || 1} />
              <StageBar label="Booked" count={stageCounts.booked} color="bg-emerald-400" max={leads.length || 1} />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary-600" />
              Recent Activity
            </h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {activity.length === 0 && (
                <p className="text-xs text-surface-400 py-4 text-center">No activity yet. Run a scrape to get started.</p>
              )}
              {activity.map((item) => {
                let label = item.metadata?.label || item.agentType + ' - ' + item.status;
                return (
                  <div key={item.id} className="flex items-center gap-2 text-xs text-surface-600 py-1.5 border-b border-surface-100 last:border-0">
                    <div className={clsx('h-1.5 w-1.5 rounded-full flex-shrink-0', item.status === 'completed' ? 'bg-emerald-400' : item.status === 'error' ? 'bg-red-400' : 'bg-amber-400')} />
                    <span className="truncate flex-1">{label}</span>
                    <span className="text-surface-400 flex-shrink-0">{formatTimeAgo(item.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Pipeline Status */}
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary-600" />
              Pipeline Status
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-surface-500">Status</span><span className={clsx('font-medium', isEnabled ? 'text-emerald-600' : 'text-surface-500')}>{isEnabled ? 'Active' : 'Paused'}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Leads Sourced</span><span className="font-medium">{state?.totalLeadsSourced || 0}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Cycles Run</span><span className="font-medium">{state?.cycleCount || 0}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Total Cost</span><span className="font-medium">${(state?.totalCostIncurred || 0).toFixed(4)}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Uptime</span><span className="font-medium">{formatUptime(state?.uptime || 0)}</span></div>
              {state?.nextScrapeAt && (
                <div className="flex justify-between"><span className="text-surface-500">Next Scrape</span><span className="font-medium">{formatTime(state.nextScrapeAt)}</span></div>
              )}
              {state?.error && (
                <div className="flex items-center gap-1 text-red-600 mt-2 p-2 bg-red-50 rounded">
                  <AlertTriangle className="h-3 w-3" />
                  {state.error}
                </div>
              )}
            </div>
          </div>

          {/* Config quick edit */}
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary-600" />
              Quick Config
            </h3>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-surface-500">Search Query</label>
                <input
                  type="text"
                  defaultValue={config?.defaultQuery || ''}
                  onBlur={(e) => doAction('config', { config: { defaultQuery: e.target.value } })}
                  className="w-full rounded border border-surface-200 px-2 py-1 text-xs mt-0.5"
                  placeholder="wellness center"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500">Location</label>
                <input
                  type="text"
                  defaultValue={config?.defaultLocation || ''}
                  onBlur={(e) => doAction('config', { config: { defaultLocation: e.target.value } })}
                  className="w-full rounded border border-surface-200 px-2 py-1 text-xs mt-0.5"
                  placeholder="California"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500">Max Leads per Scrape</label>
                <input
                  type="number"
                  defaultValue={config?.maxLeadsPerScrape || 10}
                  onBlur={(e) => doAction('config', { config: { maxLeadsPerScrape: parseInt(e.target.value) || 10 } })}
                  className="w-full rounded border border-surface-200 px-2 py-1 text-xs mt-0.5"
                  min={1}
                  max={50}
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="email-scrape"
                  checked={useEmailScrape}
                  onChange={(e) => setUseEmailScrape(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="email-scrape" className="text-xs text-surface-600">Scrape websites for emails</label>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-surface-900 mb-3">Quick Links</h3>
            <div className="space-y-1">
              <a href="/leads" className="flex items-center gap-2 text-xs text-primary-600 hover:text-primary-700 py-1">
                <Users className="h-3 w-3" /> View All Leads
              </a>
              <a href="/settings" className="flex items-center gap-2 text-xs text-primary-600 hover:text-primary-700 py-1">
                <Settings2 className="h-3 w-3" /> Settings (Email, WhatsApp, API Keys)
              </a>
              <a href="/agents/playground" className="flex items-center gap-2 text-xs text-primary-600 hover:text-primary-700 py-1">
                <ExternalLink className="h-3 w-3" /> Agent Playground
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Leads table (compact) */}
      {leads.length > 0 && (
        <div className="rounded-xl border border-surface-200 bg-white overflow-hidden">
          <div className="p-4 border-b border-surface-100">
            <h3 className="text-sm font-semibold text-surface-900">Leads ({leads.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface-50 text-surface-500">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-4 py-2 font-medium">Company</th>
                  <th className="text-left px-4 py-2 font-medium">Email</th>
                  <th className="text-left px-4 py-2 font-medium">Phone</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {leads.slice(0, 20).map((lead) => (
                  <tr key={lead.id} className="hover:bg-surface-50">
                    <td className="px-4 py-2 font-medium text-surface-900">{lead.name}</td>
                    <td className="px-4 py-2 text-surface-600">{lead.company}</td>
                    <td className="px-4 py-2 text-surface-600">{lead.email || '-'}</td>
                    <td className="px-4 py-2 text-surface-600">{lead.phone || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={clsx(
                        'inline-block px-2 py-0.5 rounded text-xs font-medium',
                        lead.status === 'new' && 'bg-surface-100 text-surface-600',
                        lead.status === 'contacted' && 'bg-blue-50 text-blue-600',
                        lead.status === 'qualified' && 'bg-amber-50 text-amber-600',
                        lead.status === 'appointment_scheduled' && 'bg-emerald-50 text-emerald-600',
                      )}>{lead.status}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={clsx('font-medium', lead.score >= 70 ? 'text-emerald-600' : lead.score >= 40 ? 'text-amber-600' : 'text-surface-500')}>{lead.score}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StageBar({ label, count, color, max }: { label: string; count: number; color: string; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-surface-600">{label}</span>
        <span className="text-surface-400">{count}</span>
      </div>
      <div className="h-2 w-full bg-surface-100 rounded-full overflow-hidden">
        <div className={'h-full rounded-full transition-all ' + color} style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

function formatTime(iso: string | null): string {
  if (!iso) return 'N/A';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'now';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? hours + 'h ' + minutes + 'm' : minutes + 'm';
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? hours + 'h ' + minutes + 'm' : minutes + 'm';
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}
