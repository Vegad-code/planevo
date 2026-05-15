import React, { useState } from 'react';

const brand = {
  50: '#f4f6f2', 100: '#e9ede5', 200: '#d3dbcb', 300: '#a7c091',
  400: '#82a56f', 500: '#5d8a66', 600: '#4a6e52', 700: '#3b5842',
  800: '#2d4332', 900: '#223326',
};
const surface = {
  50: '#fbfbfb', 100: '#f8f9f5', 200: '#e9ede5', 300: '#d3dbcb',
  400: '#949a8e', 500: '#626570', 600: '#4a4d55', 700: '#3a3d45',
  800: '#2c2e35', 900: '#1a1b1e',
};
const accent = { 500: '#c8b38c' };
const error = '#a34e35';

function App() {
  const [activeScreen, setActiveScreen] = useState('plan');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showFullPlan, setShowFullPlan] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [energyLevel, setEnergyLevel] = useState('medium');
  const [chatMessages, setChatMessages] = useState([
    { id: 'w', role: 'ollie', content: "Hey! I'm Ollie, your planning co-pilot. Ask me to reschedule a task, break down an assignment, or just chat about your day." }
  ]);
  const [chatInput, setChatInput] = useState('');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  const dayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

  const mockSchedule = [
    { title: 'CS 301 — Lecture Notes Review', time: '9:00 AM', duration: '45 min' },
    { title: 'Linear Algebra Problem Set', time: '10:00 AM', duration: '60 min' },
    { title: 'Break & Walk', time: '11:00 AM', duration: '15 min' },
    { title: 'History Essay Draft', time: '11:30 AM', duration: '90 min' },
    { title: 'Lunch', time: '1:00 PM', duration: '45 min' },
  ];

  const mockTasks = [
    { id: '1', title: 'Submit CS 301 Lab Report', priority: 'high' },
    { id: '2', title: 'Read Ch. 7 — Macro Economics', priority: 'medium' },
    { id: '3', title: 'Review pull request for team project', priority: 'low' },
    { id: '4', title: 'Schedule advisor meeting', priority: 'medium' },
  ];

  const sendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: chatInput.trim() };
    const ollieMsg = { id: `o-${Date.now()}`, role: 'ollie', content: "I'm thinking about that... The full Ollie AI chat will be connected via the Plan Pilot API. For now, your messages are saved and synced!" };
    setChatMessages(prev => [...prev, userMsg, ollieMsg]);
    setChatInput('');
  };

  if (!isLoggedIn) {
    return (
      <div style={styles.page}>
        <div style={styles.titleArea}>
          <h1 style={styles.pageTitle}>Plan Pilot Mobile</h1>
          <p style={styles.pageSubtitle}>Expo React Native — Interactive Preview</p>
        </div>
        <div style={styles.phoneFrame}>
          <div style={styles.phoneNotch} />
          <div style={styles.phoneScreen}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 28 }}>
              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: brand[500], display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <span style={{ color: '#fff', fontSize: 22, fontWeight: 900, letterSpacing: -1 }}>PP</span>
                </div>
                <h2 style={{ color: surface[800], fontSize: 28, fontWeight: 900, letterSpacing: -1.5, textTransform: 'uppercase', margin: '0 0 6px' }}>Plan Pilot</h2>
                <p style={{ color: surface[500], fontSize: 15, fontWeight: 500, margin: 0 }}>{greeting}. Welcome back.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={styles.inputWrap}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={surface[400]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  <input data-testid="auth-email-input" style={styles.input} placeholder="Email" defaultValue="demo@planpilot.co" />
                </div>
                <div style={styles.inputWrap}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={surface[400]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input data-testid="auth-password-input" style={styles.input} placeholder="Password" type="password" defaultValue="password123" />
                </div>
                <button data-testid="auth-submit-button" style={styles.ctaBtn} onClick={() => setIsLoggedIn(true)}>
                  <span>Sign In</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
              </div>
              <p style={{ textAlign: 'center', marginTop: 24, color: surface[500], fontSize: 14 }}>
                New to Plan Pilot? <span style={{ color: brand[500], fontWeight: 700, cursor: 'pointer' }}>Create account</span>
              </p>
            </div>
          </div>
        </div>
        <FileTree />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.titleArea}>
        <h1 style={styles.pageTitle}>Plan Pilot Mobile</h1>
        <p style={styles.pageSubtitle}>Expo React Native — Interactive Preview</p>
        <div style={styles.screenSelector}>
          {['plan', 'chat', 'settings'].map(s => (
            <button key={s} onClick={() => setActiveScreen(s)} style={{
              ...styles.screenTab,
              background: activeScreen === s ? brand[600] : 'transparent',
              color: activeScreen === s ? '#fff' : surface[400],
              borderColor: activeScreen === s ? brand[600] : surface[700],
            }}>
              {s === 'plan' ? '📋 Daily Plan' : s === 'chat' ? '💬 Ollie Chat' : '⚙️ Settings'}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.phoneFrame}>
        <div style={styles.phoneNotch} />
        <div style={styles.phoneScreen}>

          {/* DAILY PLAN SCREEN */}
          {activeScreen === 'plan' && (
            <div style={styles.screenScroll} data-testid="daily-plan-screen">
              <div style={styles.screenPadding}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }} data-testid="daily-plan-header">
                  <div>
                    <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1.2, lineHeight: '30px', color: surface[800] }}>
                      {greeting},<br/>{firstName || 'Pilot'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 2, color: surface[400] }}>{dayStr}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: surface[800] }}>{dateStr.split(', ').slice(0, 2).join(', ')}</div>
                  </div>
                </div>

                {/* Connection Chips */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }} data-testid="connection-chips">
                  <Chip label="Canvas" detail="3 due" connected />
                  <Chip label="Calendar" detail="Synced" connected />
                </div>

                {/* Hero Card */}
                <div style={styles.heroCard} data-testid="next-action-hero">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={brand[500]} stroke={brand[500]} strokeWidth="2"><path d="M12 3l1.4 5.4H19l-4.5 3.3 1.7 5.3-4.2-3-4.2 3 1.7-5.3L5 8.4h5.6z"/></svg>
                    <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.5, color: brand[500] }}>NO PLAN YET FOR TODAY</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, marginBottom: 6, lineHeight: '30px', color: surface[800] }}>Ready to focus?</div>
                  <p style={{ fontSize: 14, fontWeight: 500, lineHeight: '20px', marginBottom: 16, color: surface[500], margin: '0 0 16px' }}>Tell Ollie how you're feeling and you'll have a plan in seconds.</p>

                  {/* Energy Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18 }} data-testid="energy-selector">
                    <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.5, color: surface[400], marginRight: 4 }}>ENERGY:</span>
                    {['low', 'medium', 'high'].map(e => (
                      <button key={e} onClick={() => setEnergyLevel(e)} data-testid={`energy-${e}`} style={{
                        display: 'flex', alignItems: 'center', gap: 4, border: `1.5px solid ${energyLevel === e ? surface[800] : surface[200]}`,
                        borderRadius: 100, padding: '6px 12px', background: energyLevel === e ? surface[800] : 'transparent', cursor: 'pointer',
                      }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill={energyLevel === e ? '#fff' : 'none'} stroke={energyLevel === e ? '#fff' : surface[400]} strokeWidth="2.5"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, color: energyLevel === e ? '#fff' : surface[400] }}>{e.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>

                  <button style={styles.ctaBtn} data-testid="generate-plan-btn">
                    <span>Generate Today's Plan</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </button>
                </div>

                {/* Full Plan Expander */}
                <button onClick={() => setShowFullPlan(!showFullPlan)} style={styles.expanderBtn} data-testid="full-day-toggle">
                  <span>VIEW TODAY'S FULL PLAN ({mockSchedule.length} BLOCKS)</span>
                  <span style={{ transform: showFullPlan ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▾</span>
                </button>
                {showFullPlan && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }} data-testid="full-day-list">
                    {mockSchedule.map((b, i) => (
                      <div key={i} style={styles.blockItem} data-testid={`full-day-block-${i}`}>
                        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, width: 70, color: surface[400], flexShrink: 0 }}>{b.time}</span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: surface[800], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: surface[400], flexShrink: 0 }}>{b.duration}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Stats */}
                <div style={{ display: 'flex', gap: 8, margin: '20px 0' }} data-testid="dashboard-stats">
                  <StatCard label="Due today" value="4" testid="stat-due-today" />
                  <StatCard label="Done today" value="2" testid="stat-done-today" />
                  <StatCard label="Open" value="6" testid="stat-open-tasks" />
                </div>

                {/* Tasks Expander */}
                <button onClick={() => setShowTasks(!showTasks)} style={styles.expanderBtn} data-testid="today-tasks-toggle">
                  <span>TODAY'S TASKS ({mockTasks.length})</span>
                  <span style={{ transform: showTasks ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▾</span>
                </button>
                {showTasks && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }} data-testid="today-tasks-list">
                    {mockTasks.map(t => (
                      <div key={t.id} style={styles.blockItem} data-testid={`task-row-${t.id}`}>
                        <div data-testid={`task-complete-${t.id}`} style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${surface[300]}`, flexShrink: 0, cursor: 'pointer' }} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: surface[800] }}>{t.title}</span>
                        {(t.priority === 'high' || t.priority === 'critical') && <div style={{ width: 7, height: 7, borderRadius: 4, background: error }} />}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ height: 20 }} />
              </div>
            </div>
          )}

          {/* CHAT SCREEN */}
          {activeScreen === 'chat' && (
            <div style={{ ...styles.screenScroll, display: 'flex', flexDirection: 'column' }} data-testid="ollie-chat-screen">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: brand[500], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.5, color: surface[800] }}>Ollie</div>
                  <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 1.5, color: surface[400] }}>YOUR PLANNING CO-PILOT</div>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {chatMessages.map(m => (
                  <div key={m.id} style={{
                    maxWidth: '85%', borderRadius: 16, padding: 14,
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    background: m.role === 'user' ? brand[600] : surface[100],
                    borderBottomRightRadius: m.role === 'user' ? 4 : 16,
                    borderBottomLeftRadius: m.role === 'ollie' ? 4 : 16,
                  }} data-testid={`chat-message-${m.id}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: 1.5, color: m.role === 'user' ? 'rgba(255,255,255,0.7)' : surface[400] }}>
                        {m.role === 'user' ? 'YOU' : 'OLLIE'}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, lineHeight: '20px', color: m.role === 'user' ? '#fff' : surface[800] }}>{m.content}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, padding: '12px 16px', borderTop: `1px solid ${surface[200]}`, background: '#fff' }}>
                <input data-testid="chat-input" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                  style={{ flex: 1, minHeight: 42, borderRadius: 14, padding: '10px 16px', fontSize: 14, fontWeight: 500, background: surface[100], border: 'none', outline: 'none', color: surface[800] }}
                  placeholder="Ask Ollie anything..." />
                <button data-testid="chat-send-button" onClick={sendChat} style={{ width: 42, height: 42, borderRadius: 12, background: chatInput.trim() ? brand[600] : surface[200], border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </button>
              </div>
            </div>
          )}

          {/* SETTINGS SCREEN */}
          {activeScreen === 'settings' && (
            <div style={styles.screenScroll} data-testid="settings-screen">
              <div style={styles.screenPadding}>
                <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1.2, marginBottom: 20, color: surface[800] }}>Settings</div>

                {/* Profile Card */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, border: `1.5px solid ${surface[200]}`, borderRadius: 18, padding: 18, marginBottom: 8, background: '#fff' }} data-testid="settings-profile">
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: brand[100], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={brand[600]} strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: surface[800] }}>Demo User</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: surface[400] }}>demo@planpilot.co</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: `1px solid ${brand[300]}`, borderRadius: 100, padding: '3px 8px', marginTop: 4, background: brand[50] }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill={brand[600]} stroke={brand[600]} strokeWidth="2.5"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                      <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: 1, color: brand[600] }}>TRIAL</span>
                    </div>
                  </div>
                </div>

                <SectionTitle>CONNECTIONS</SectionTitle>
                <div style={styles.settingsSection}>
                  <SettingsRow label="Canvas LMS" detail="Connected" connected testid="settings-canvas" icon="grad" />
                  <div style={{ height: 1, background: surface[200], margin: '0 16px' }} />
                  <SettingsRow label="Google Calendar" detail="Synced" connected testid="settings-calendar" icon="cal" />
                </div>

                <SectionTitle>PREFERENCES</SectionTitle>
                <div style={styles.settingsSection}>
                  <SettingsRow label="Energy Preference" detail="Medium" icon="zap" testid="settings-energy" />
                  <div style={{ height: 1, background: surface[200], margin: '0 16px' }} />
                  <SettingsRow label="Notifications" detail="" icon="bell" testid="settings-notifications" toggle />
                  <div style={{ height: 1, background: surface[200], margin: '0 16px' }} />
                  <SettingsRow label="Dark Mode" detail="System" icon="moon" testid="settings-dark-mode" />
                </div>

                <SectionTitle>ACCOUNT</SectionTitle>
                <div style={styles.settingsSection}>
                  <SettingsRow label="Privacy & Security" detail="" icon="shield" testid="settings-privacy" />
                </div>

                <button onClick={() => setIsLoggedIn(false)} style={styles.signOutBtn} data-testid="settings-sign-out">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={error} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  <span>Sign Out</span>
                </button>

                <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 500, color: surface[400], marginTop: 16 }}>Plan Pilot Mobile v1.0.0</div>
                <div style={{ height: 20 }} />
              </div>
            </div>
          )}

          {/* Tab Bar */}
          <div style={styles.tabBar}>
            {[
              { key: 'plan', label: 'Plan', icon: 'M8 2v4M16 2v4M3 10h18M21 8v13a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h14a2 2 0 012 2z' },
              { key: 'chat', label: 'Ollie', icon: 'M7.9 20A9 9 0 104 16.1L2 22z' },
              { key: 'settings', label: 'Settings', icon: 'M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveScreen(tab.key)} data-testid={`tab-${tab.key}`} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke={activeScreen === tab.key ? brand[600] : surface[400]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={tab.icon} />
                  {tab.key === 'settings' && <circle cx="12" cy="12" r="3" />}
                </svg>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
                  color: activeScreen === tab.key ? brand[600] : surface[400] }}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <FileTree />
    </div>
  );
}

const firstName = 'Pilot';

function Chip({ label, detail, connected }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      border: `1.5px solid ${connected ? brand[300] : surface[200]}`,
      borderRadius: 100, padding: '6px 10px',
      background: connected ? `${brand[500]}10` : '#fff',
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: connected ? brand[600] : surface[500] }}>{label}</span>
      <span style={{
        borderRadius: 100, padding: '2px 6px', fontSize: 10, fontWeight: 800,
        background: connected ? `${brand[500]}20` : surface[200] + '30',
        color: connected ? brand[600] : surface[400],
      }}>{connected ? '✓' : '+'} {detail}</span>
    </div>
  );
}

function StatCard({ label, value, testid }) {
  return (
    <div style={{ flex: 1, border: `1.5px solid ${surface[200]}`, borderRadius: 14, padding: 14, background: '#fff' }} data-testid={testid}>
      <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 1.5, color: surface[400], marginBottom: 8 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -1, color: surface[800] }}>{value}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.5, color: surface[400], marginTop: 20, marginBottom: 8, marginLeft: 4 }}>{children}</div>;
}

function SettingsRow({ label, detail, connected, icon, testid, toggle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }} data-testid={testid}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={brand[500]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {icon === 'grad' && <><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 4 3 6 3s6-1 6-3v-5"/></>}
          {icon === 'cal' && <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>}
          {icon === 'zap' && <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>}
          {icon === 'bell' && <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>}
          {icon === 'moon' && <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>}
          {icon === 'shield' && <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>}
        </svg>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: surface[800] }}>{label}</div>
          {detail && <div style={{ fontSize: 11, fontWeight: 500, marginTop: 1, color: connected ? brand[500] : surface[400] }}>{detail}</div>}
        </div>
      </div>
      {toggle ? (
        <div style={{ width: 44, height: 24, borderRadius: 12, background: surface[200], position: 'relative' }}>
          <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 2, left: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
        </div>
      ) : connected !== undefined ? (
        <div style={{ width: 8, height: 8, borderRadius: 4, background: connected ? brand[500] : surface[200] }} />
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={surface[400]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      )}
    </div>
  );
}

function FileTree() {
  return (
    <div style={styles.fileTreeContainer}>
      <h3 style={{ color: surface[400], fontSize: 11, fontWeight: 900, letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' }}>Project Structure</h3>
      <pre style={styles.fileTree}>{`apps/mobile/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx    ← Tab navigation
│   │   ├── index.tsx      ← Daily Plan screen
│   │   ├── chat.tsx       ← Ollie Chat screen
│   │   └── settings.tsx   ← Settings screen
│   ├── _layout.tsx        ← Root layout + AuthGate
│   ├── login.tsx          ← Login/Signup screen
│   └── +html.tsx          ← Web support
├── lib/
│   └── supabase.ts        ← Supabase client (SecureStore)
├── providers/
│   └── AuthProvider.tsx    ← Auth context
├── hooks/
│   └── useTheme.ts        ← Theme hook
├── constants/
│   └── Colors.ts          ← Forest Green design tokens
├── app.json               ← Expo config
├── metro.config.js        ← Monorepo resolution
└── .env                   ← Supabase credentials

packages/core/
├── src/
│   ├── index.ts           ← Shared exports
│   ├── types.ts           ← Database types
│   └── supabase-client.ts ← Mobile client factory
`}</pre>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 20px',
    gap: 32,
  },
  titleArea: {
    textAlign: 'center',
  },
  pageTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 900,
    letterSpacing: -1.5,
    margin: '0 0 4px',
  },
  pageSubtitle: {
    color: surface[400],
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.5,
    margin: 0,
  },
  screenSelector: {
    display: 'flex',
    gap: 8,
    marginTop: 20,
    justifyContent: 'center',
  },
  screenTab: {
    padding: '8px 16px',
    borderRadius: 100,
    border: '1.5px solid',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
    letterSpacing: 0.5,
    transition: 'all 0.2s',
  },
  phoneFrame: {
    width: 390,
    height: 844,
    borderRadius: 52,
    border: `3px solid ${surface[700]}`,
    background: surface[100],
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
  },
  phoneNotch: {
    width: 160,
    height: 34,
    borderRadius: '0 0 20px 20px',
    background: surface[900],
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
  },
  phoneScreen: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    paddingTop: 50,
  },
  screenScroll: {
    flex: 1,
    overflowY: 'auto',
  },
  screenPadding: {
    padding: '12px 20px',
  },
  heroCard: {
    border: `2px solid ${surface[800]}`,
    borderRadius: 20,
    padding: 24,
    background: `${brand[50]}66`,
    marginBottom: 16,
  },
  ctaBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    background: brand[600],
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    color: '#fff',
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  expanderBtn: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    background: 'none',
    border: 'none',
    padding: '8px 0',
    cursor: 'pointer',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.5,
    color: surface[400],
  },
  blockItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    borderRadius: 14,
    border: `1.5px solid ${surface[200]}`,
    background: '#fff',
  },
  settingsSection: {
    border: `1.5px solid ${surface[200]}`,
    borderRadius: 18,
    overflow: 'hidden',
    background: '#fff',
  },
  signOutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    border: `2px solid ${error}`,
    borderRadius: 14,
    padding: '14px 0',
    marginTop: 24,
    background: 'none',
    cursor: 'pointer',
    color: error,
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    width: '100%',
  },
  tabBar: {
    display: 'flex',
    borderTop: `1px solid ${surface[200]}`,
    background: '#fff',
    paddingTop: 8,
    paddingBottom: 28,
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    border: `2px solid ${surface[300]}`,
    borderRadius: 14,
    padding: '0 16px',
    height: 54,
    gap: 12,
    background: '#fff',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: 600,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: surface[800],
  },
  fileTreeContainer: {
    maxWidth: 480,
    width: '100%',
    background: surface[800],
    borderRadius: 16,
    padding: 20,
    border: `1px solid ${surface[700]}`,
  },
  fileTree: {
    color: brand[300],
    fontSize: 12,
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    lineHeight: '20px',
    margin: 0,
    whiteSpace: 'pre',
    overflowX: 'auto',
  },
};

export default App;
