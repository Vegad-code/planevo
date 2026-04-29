'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, GoogleLogo, CheckCircle, Warning, PlugsConnected, MagnifyingGlass } from '@phosphor-icons/react';
import { testCanvasConnectionAction } from '@/lib/canvas/actions';

export default function Integrations() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [canvasUrl, setCanvasUrl] = useState('');
  const [canvasToken, setCanvasToken] = useState('');
  const [morningTime, setMorningTime] = useState('07:00');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean, message: string } | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
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
  }, []);

  const handleSaveCanvas = async () => {
    if (!canvasUrl.startsWith('https://')) {
      setMessage({ type: 'error', text: 'Canvas URL must start with https://' });
      return;
    }
    
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('users')
      .update({
        canvas_url: canvasUrl,
        canvas_token: canvasToken,
        preferred_morning_time: morningTime
      })
      .eq('id', user.id);

    if (error) {
      setMessage({ type: 'error', text: 'Failed to update integrations' });
    } else {
      setMessage({ type: 'success', text: 'University settings updated' });
      setTimeout(() => setMessage(null), 3000);
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
      setTestResult({ success: true, message: 'Connection successful! Ollie can see your courses.' });
    } else {
      setTestResult({ success: false, message: 'Connection failed. Check your URL and Token.' });
    }
    setTesting(false);
  };

  if (loading) return <div className="animate-pulse h-48 bg-surface-200 border-2 border-surface-900" />;

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 border-2 font-black uppercase text-xs ${
          message.type === 'success' 
            ? 'bg-green-100 border-green-600 text-green-700' 
            : 'bg-red-100 border-red-600 text-red-700'
        }`}>
          {message.text}
        </div>
      )}
      <Card className="bg-surface-100 border-2 border-surface-900 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap weight="bold" className="size-6 text-accent-600" />
            <CardTitle className="font-bold uppercase text-xl">University Sync</CardTitle>
          </div>
          <CardDescription className="text-surface-600 font-medium">
            Connect your academic accounts to power your Morning Briefing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Morning Briefing Time */}
          <div className="space-y-2">
            <Label htmlFor="morning-time" className="text-xs font-black uppercase">Preferred Briefing Time</Label>
            <Input
              id="morning-time"
              type="time"
              value={morningTime}
              onChange={(e) => setMorningTime(e.target.value)}
              className="max-w-[200px]"
            />
            <p className="text-[10px] text-surface-500 font-bold uppercase">When Ollie should prepare your flight plan.</p>
          </div>

          <hr className="border-t-2 border-surface-900" />

          {/* Canvas Integration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-black uppercase flex items-center gap-2">
                Canvas LMS
              </Label>
              {profile?.canvas_token ? (
                <span className="flex items-center gap-1 text-[10px] font-black text-green-600 uppercase">
                  <CheckCircle weight="fill" /> Connected
                </span>
              ) : (
                <span className="text-[10px] font-black text-surface-400 uppercase">Not Connected</span>
              )}
            </div>
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="canvas-url" className="text-[10px] font-black uppercase text-surface-500">Canvas Instance URL</Label>
                <Input
                  id="canvas-url"
                  placeholder="https://canvas.youruniversity.edu"
                  value={canvasUrl}
                  onChange={(e) => setCanvasUrl(e.target.value)}
                  className="border-2 border-surface-900 focus:ring-accent-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="canvas-token" className="text-[10px] font-black uppercase text-surface-500">Access Token</Label>
                <div className="relative">
                  <Input
                    id="canvas-token"
                    type="password"
                    placeholder="e.g. 7~randomcharacters..."
                    value={canvasToken}
                    onChange={(e) => setCanvasToken(e.target.value)}
                    className="border-2 border-surface-900 focus:ring-accent-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleTestConnection}
                disabled={testing || !canvasUrl || !canvasToken}
                variant="outline"
                className="flex-1 border-2 border-surface-900 font-black uppercase text-[10px] h-10 hover:bg-surface-200"
              >
                {testing ? 'Testing...' : (
                  <span className="flex items-center gap-2">
                    <PlugsConnected weight="bold" /> Test Connection
                  </span>
                )}
              </Button>
              <Button
                onClick={() => setShowTutorial(!showTutorial)}
                variant="ghost"
                className="flex-1 text-[10px] font-black uppercase h-10 hover:bg-surface-200"
              >
                <span className="flex items-center gap-2">
                  <MagnifyingGlass weight="bold" /> {showTutorial ? 'Hide Tutorial' : 'How to Setup'}
                </span>
              </Button>
            </div>

            {testResult && (
              <div className={`p-3 border-2 text-[10px] font-bold uppercase ${
                testResult.success ? 'bg-green-100 border-green-600 text-green-700' : 'bg-red-100 border-red-600 text-red-700'
              }`}>
                {testResult.message}
              </div>
            )}

            {/* Tutorial Section */}
            {showTutorial && (
              <div className="mt-4 p-4 bg-surface-200 border-2 border-surface-900 border-dashed animate-in fade-in slide-in-from-top-2">
                <h4 className="text-[10px] font-black uppercase mb-3 flex items-center gap-1">
                  <Warning weight="bold" className="text-accent-600" /> Canvas Setup Guide:
                </h4>
                <ol className="text-[10px] font-bold text-surface-700 space-y-2 list-decimal ml-4 uppercase leading-relaxed">
                  <li>Log in to your <span className="text-surface-900">Canvas</span> dashboard.</li>
                  <li>In the global navigation (sidebar), click <span className="text-surface-900">Account</span>.</li>
                  <li>Select <span className="text-surface-900">Settings</span> from the menu.</li>
                  <li>Scroll down to the <span className="text-surface-900">Approved Integrations</span> section.</li>
                  <li>Click the <span className="text-surface-900">+ New Access Token</span> button.</li>
                  <li>Give it a name like "Plan Pilot" and click <span className="text-surface-900">Generate Token</span>.</li>
                  <li><span className="text-accent-600">IMPORTANT:</span> Copy the token immediately. You won't be able to see it again!</li>
                </ol>
                <div className="mt-4 p-2 bg-surface-900 text-surface-100 text-[9px] font-bold uppercase rounded">
                  💡 Tip: The URL is usually the same one you use to log in (e.g., https://canvas.harvard.edu)
                </div>
              </div>
            )}
          </div>

          <Button 
            onClick={handleSaveCanvas} 
            disabled={saving}
            className="w-full bg-surface-900 text-surface-100 hover:bg-surface-800 font-black uppercase tracking-tight"
          >
            {saving ? 'Saving...' : 'Save University Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Google Classroom (Placeholder for now) */}
      <Card className="bg-surface-100 border-2 border-surface-900 shadow-md opacity-60">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GoogleLogo weight="bold" className="size-5 text-accent-600" />
              <CardTitle className="font-bold uppercase text-sm">Google Classroom</CardTitle>
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-surface-900 text-surface-100">Coming Soon</span>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
