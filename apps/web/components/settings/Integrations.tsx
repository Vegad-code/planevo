'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, CalendarBlank, GithubLogo, Kanban, Lightning, CheckCircle, PlugsConnected, LockKey, X, MagnifyingGlass, Notebook, Hash } from '@phosphor-icons/react';
import { testCanvasConnectionAction } from '@/lib/canvas/actions';
import { INTEGRATION_REGISTRY, IntegrationDefinition } from '@/lib/integrations/registry';
import { motion, AnimatePresence } from 'framer-motion';

const iconMap: Record<string, React.ElementType> = {
  GraduationCap: GraduationCap,
  CalendarBlank: CalendarBlank,
  GithubLogo: GithubLogo,
  Kanban: Kanban,
  Lightning: Lightning,
  Notebook: Notebook,
  Hash: Hash
};

export default function Integrations() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  
  // Connection states
  const [canvasUrl, setCanvasUrl] = useState('');
  const [canvasToken, setCanvasToken] = useState('');
  const [morningTime, setMorningTime] = useState('07:00');
  
  // UI States
  const [activeConfig, setActiveConfig] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean, message: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await (supabase as any)
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setProfile(data);
          setCanvasUrl(data.canvas_url || '');
          setCanvasToken(data.canvas_token || '');
          setMorningTime(data.preferred_morning_time?.substring(0, 5) || '07:00');
        }
      }
      setLoading(false);
    }
    getProfile();
  }, [supabase]);

  const handleSaveCanvas = async () => {
    if (!canvasUrl.startsWith('https://')) {
      setTestResult({ success: false, message: 'Canvas URL must start with https://' });
      return;
    }
    
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await (supabase as any)
      .from('users')
      .update({
        canvas_url: canvasUrl,
        canvas_token: canvasToken
      })
      .eq('id', user.id);

    if (error) {
      setTestResult({ success: false, message: 'Failed to save Canvas settings.' });
    } else {
      setTestResult({ success: true, message: 'Canvas settings saved. Sources active.' });
      setProfile({ ...profile, canvas_token: canvasToken, canvas_url: canvasUrl });
      setTimeout(() => {
        setActiveConfig(null);
        setTestResult(null);
      }, 2000);
    }
    setSaving(false);
  };

  const handleSaveMorningTime = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await (supabase as any).from('users').update({ preferred_morning_time: morningTime }).eq('id', user.id);
    }
    setSaving(false);
  };

  const handleTestConnection = async () => {
    if (!canvasUrl || !canvasToken) {
      setTestResult({ success: false, message: 'Please provide both URL and Token' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    
    const isOk = await testCanvasConnectionAction(canvasUrl, canvasToken);
    
    if (isOk) {
      setTestResult({ success: true, message: 'Connection verified! Data syncing.' });
    } else {
      setTestResult({ success: false, message: 'Connection failed. Check your URL and Token.' });
    }
    setTesting(false);
  };

  const handleSyncGoogle = async () => {
    setSyncing(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/integrations/google/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message });
      } else {
        setTestResult({ success: false, message: data.error || 'Sync failed' });
      }
    } catch {
      setTestResult({ success: false, message: 'Sync failure. Try again.' });
    } finally {
      setSyncing(false);
    }
  };

  // Compute live registry status based on profile
  const liveRegistry = INTEGRATION_REGISTRY.map(integration => {
    let currentStatus = integration.status;
    if (integration.id === 'canvas' && profile?.canvas_token) {
      currentStatus = 'connected';
    }
    if (integration.id === 'google_calendar' && profile?.google_calendar_connected) {
      currentStatus = 'connected';
    }
    return { ...integration, status: currentStatus };
  });

  const academicSensors = liveRegistry.filter(i => i.category === 'Academic');
  const proSensors = liveRegistry.filter(i => i.category === 'Professional' || i.category === 'Automation');

  if (!mounted || loading) return <div className="animate-pulse h-64 bg-surface-200 border-2 border-surface-900 rounded-3xl" />;

  const renderSensorCard = (integration: IntegrationDefinition) => {
    const Icon = iconMap[integration.icon] || PlugsConnected;
    const isConnected = integration.status === 'connected';
    const isComingSoon = integration.status === 'coming_soon';
    
    return (
      <motion.div 
        key={integration.id}
        whileHover={!isComingSoon ? { scale: 1.02, y: -4 } : {}}
        className={`relative p-6 border-2 border-surface-900 rounded-2xl transition-all ${
          isConnected 
            ? 'bg-brand-300 shadow-[6px_6px_0_0_var(--surface-900)]' 
            : isComingSoon 
              ? 'bg-surface-100 opacity-60 grayscale cursor-not-allowed'
              : 'bg-surface-100 hover:shadow-[6px_6px_0_0_var(--surface-900)] cursor-pointer'
        }`}
        onClick={() => {
          if (!isComingSoon) {
            setActiveConfig(activeConfig === integration.id ? null : integration.id);
          }
        }}
      >
        <div className="flex justify-between items-start mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 border-surface-900 ${isConnected ? 'bg-surface-100' : 'bg-surface-200'}`}>
            <Icon weight={isConnected ? "fill" : "bold"} className="w-6 h-6 text-surface-900" />
          </div>
          {isConnected && (
            <div className="bg-success text-surface-900 border-2 border-surface-900 text-[10px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1 shadow-[2px_2px_0_0_var(--surface-900)]">
              <CheckCircle weight="fill" /> Active
            </div>
          )}
          {isComingSoon && (
            <div className="bg-surface-900 text-surface-100 text-[10px] font-black uppercase px-2 py-1 rounded-full">
              Soon
            </div>
          )}
          {integration.premiumOnly && !isComingSoon && (
            <div className="bg-accent-500 text-surface-900 border-2 border-surface-900 text-[10px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1">
              <LockKey weight="bold" /> Premium
            </div>
          )}
        </div>
        
        <h3 className="text-lg font-black text-surface-900 uppercase tracking-tight mb-2">{integration.name}</h3>
        <p className="text-xs font-bold text-surface-600 leading-relaxed">{integration.description}</p>
      </motion.div>
    );
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-surface-900 uppercase tracking-tighter mb-2">Integration Hub</h2>
        <p className="text-surface-600 font-bold max-w-2xl">
          Connect your tools to Ollie. The more sources you link, the more accurately your Daily Plan can be constructed.
        </p>
      </div>

      {/* Global Settings */}
      <div className="bg-surface-100 p-6 border-2 border-surface-900 shadow-[6px_6px_0_0_var(--surface-900)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-surface-900 uppercase tracking-tight">Schedule Refresh Time</h3>
          <p className="text-xs font-bold text-surface-600">When should Ollie pull from sources and build your plan?</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="time"
            value={morningTime}
            onChange={(e) => setMorningTime(e.target.value)}
            className="w-32 border-2 border-surface-900 font-black text-center"
          />
          <Button onClick={handleSaveMorningTime} disabled={saving} variant="default" size="sm" className="uppercase font-black tracking-widest text-[10px]">
            {saving ? 'Saving...' : 'Lock Time'}
          </Button>
        </div>
      </div>

      <hr className="border-t-2 border-surface-900" />

      {/* Academic Sources */}
      <div className="space-y-6">
        <h3 className="text-xl font-black text-surface-900 uppercase tracking-tight flex items-center gap-2">
          <div className="w-3 h-3 bg-brand-500 border-2 border-surface-900 rounded-full" />
          Academic Sources
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {academicSensors.map(renderSensorCard)}
        </div>
      </div>

      {/* Configuration Panel (Slides down when Canvas is clicked) */}
      <AnimatePresence>
        {activeConfig === 'canvas' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-200 p-8 border-2 border-surface-900 shadow-[8px_8px_0_0_var(--surface-900)] rounded-3xl mt-2 relative">
              <button 
                onClick={() => setActiveConfig(null)}
                className="absolute top-4 right-4 text-surface-500 hover:text-surface-900 transition-colors"
              >
                <X weight="bold" className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <GraduationCap weight="fill" className="w-8 h-8 text-surface-900" />
                <h3 className="text-2xl font-black text-surface-900 uppercase tracking-tighter">Canvas LMS Configuration</h3>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="canvas-url" className="text-xs font-black uppercase text-surface-600">Canvas Instance URL</Label>
                    <Input
                      id="canvas-url"
                      placeholder="https://canvas.youruniversity.edu"
                      value={canvasUrl}
                      onChange={(e) => setCanvasUrl(e.target.value)}
                      className="border-2 border-surface-900 focus:ring-accent-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="canvas-token" className="text-xs font-black uppercase text-surface-600">Access Token</Label>
                    <Input
                      id="canvas-token"
                      type="password"
                      placeholder="Paste your generated token..."
                      value={canvasToken}
                      onChange={(e) => setCanvasToken(e.target.value)}
                      className="border-2 border-surface-900 focus:ring-accent-500"
                    />
                  </div>

                  {testResult && (
                    <div className={`p-4 border-2 font-black uppercase text-xs rounded-xl ${
                      testResult.success ? 'bg-success text-surface-900 border-surface-900' : 'bg-error text-surface-100 border-surface-900'
                    }`}>
                      {testResult.message}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button 
                      onClick={handleTestConnection}
                      disabled={testing || !canvasUrl || !canvasToken}
                      variant="outline"
                      className="flex-1 uppercase font-black tracking-widest text-[10px]"
                    >
                      {testing ? 'Pinging...' : 'Test Connection'}
                    </Button>
                    <Button 
                      onClick={handleSaveCanvas} 
                      disabled={saving}
                      className="flex-1 uppercase font-black tracking-widest text-[10px]"
                    >
                      {saving ? 'Locking...' : 'Lock Config'}
                    </Button>
                  </div>
                </div>

                <div className="bg-surface-100 border-2 border-surface-900 p-6 rounded-xl relative">
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-accent-500 border-2 border-surface-900 rounded-full flex items-center justify-center">
                    <MagnifyingGlass weight="bold" className="text-surface-900" />
                  </div>
                  <h4 className="font-black uppercase text-surface-900 mb-3 text-sm">Where to find your token:</h4>
                  <ol className="text-xs font-bold text-surface-600 space-y-3 list-decimal ml-4">
                    <li>Log in to your Canvas dashboard.</li>
                    <li>Click <strong className="text-surface-900">Account</strong> in the sidebar.</li>
                    <li>Go to <strong className="text-surface-900">Settings</strong>.</li>
                    <li>Scroll down to <strong className="text-surface-900">Approved Integrations</strong>.</li>
                    <li>Click <strong className="text-surface-900">+ New Access Token</strong>.</li>
                    <li>Name it &quot;Plan Pilot&quot; and copy the token immediately.</li>
                  </ol>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Google Calendar OAuth Config */}
        {activeConfig === 'google_calendar' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-900 text-surface-100 p-8 border-4 border-surface-900 shadow-[8px_8px_0_0_var(--accent-500)] rounded-3xl mt-2 relative">
              <button 
                onClick={() => setActiveConfig(null)}
                className="absolute top-4 right-4 text-surface-500 hover:text-white transition-colors"
              >
                <X weight="bold" className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <CalendarBlank weight="fill" className="w-8 h-8 text-accent-500" />
                <h3 className="text-2xl font-black uppercase tracking-tighter text-white">
                  Google Calendar Link
                </h3>
              </div>
              
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1 space-y-4">
                  <p className="text-sm font-bold text-surface-400 leading-relaxed">
                    Grant Plan Pilot access to your Google Calendar to automatically sync your classes, deadlines, and personal schedule. 
                  </p>
                  <ul className="text-[10px] font-bold text-surface-500 space-y-2 uppercase">
                    <li className="flex items-center gap-2"><CheckCircle className="text-accent-500" /> Read-only access to primary calendar</li>
                    <li className="flex items-center gap-2"><CheckCircle className="text-accent-500" /> Automatic schedule ingestion</li>
                    <li className="flex items-center gap-2"><CheckCircle className="text-accent-500" /> Secure encrypted storage</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3 w-full md:w-64">
                  {profile?.google_calendar_connected ? (
                    <div className="bg-surface-800 border-2 border-surface-700 p-4 rounded-xl text-center">
                      <div className="flex items-center justify-center gap-2 text-success mb-2 font-black uppercase text-xs">
                        <CheckCircle weight="fill" /> Linked Successfully
                      </div>
                      <div className="space-y-2">
                        <Button 
                          className="w-full bg-surface-900 text-white font-black uppercase text-[10px] tracking-widest border-2 border-surface-900"
                          disabled={syncing}
                          onClick={handleSyncGoogle}
                        >
                          {syncing ? 'PULLING DATA...' : 'SYNC DATA NOW'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full border-2 border-surface-700 text-[10px] font-black uppercase text-error hover:bg-error hover:text-white transition-all"
                          onClick={async () => {
                            const { error } = await (supabase as any).from('users').update({ 
                              google_calendar_connected: false,
                              google_calendar_refresh_token: null 
                            }).eq('id', (profile as any).id);
                            if (!error) setProfile({ ...profile, google_calendar_connected: false });
                          }}
                        >
                          Disconnect Integration
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      className="w-full bg-accent-500 hover:bg-accent-400 text-surface-900 font-black uppercase tracking-widest py-8 text-sm border-2 border-surface-900 shadow-[4px_4px_0_0_#ffffff]"
                      onClick={() => {
                        const redirectTo = `${window.location.origin}/api/auth/callback/google-calendar`;
                        supabase.auth.signInWithOAuth({
                          provider: 'google',
                          options: {
                            redirectTo,
                            scopes: 'https://www.googleapis.com/auth/calendar.readonly',
                            queryParams: {
                              access_type: 'offline',
                              prompt: 'consent'
                            }
                          }
                        });
                      }}
                    >
                      Connect Calendar
                    </Button>
                  )}
                </div>
              </div>

              {testResult && activeConfig === 'google_calendar' && (
                <div className={`mt-6 p-4 border-2 font-black uppercase text-xs rounded-xl ${
                  testResult.success ? 'bg-success text-surface-900 border-surface-900' : 'bg-error text-surface-100 border-surface-900'
                }`}>
                  {testResult.message}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Signal Config (Notion, Slack, Monday) removed as they are coming soon */}
      </AnimatePresence>

      <hr className="border-t-2 border-surface-900" />

      {/* Professional & Automation Sensors */}
      <div className="space-y-6 opacity-80">
        <div className="flex justify-between items-end">
          <h3 className="text-xl font-black text-surface-900 uppercase tracking-tight flex items-center gap-2">
            <div className="w-3 h-3 bg-accent-500 border-2 border-surface-900 rounded-full" />
            Professional Sources
          </h3>
          <span className="bg-surface-900 text-surface-100 text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-[2px_2px_0_0_var(--accent-500)]">
            Premium Tier
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proSensors.map(renderSensorCard)}
        </div>
      </div>
      
    </div>
  );
}
