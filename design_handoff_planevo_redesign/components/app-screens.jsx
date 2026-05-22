/* global React */
// Planevo — redesigned app screens. Single shared visual system matching the
// landing page (cream + ink, Instrument Serif + Geist, honey/sage/bruno).
// Mounted inside a DesignCanvas for side-by-side review.

const C = {
  cream: '#F2E8D2',
  cream2: '#E8DCC0',
  paper: '#FBF6EA',
  ink: '#1A140D',
  ink2: '#2A2118',
  inkSoft: '#4A3F32',
  inkFaint: '#8A7B66',
  bruno: '#8B5A2B',
  brunoDeep: '#6B4423',
  brunoLight: '#C99A5F',
  belly: '#E8C896',
  honey: '#D08741',
  honeyDeep: '#B96E2A',
  honeySoft: '#F5DCB8',
  sage: '#6B8B69',
  sageSoft: '#D8E2D6',
  rose: '#C56B5E',
  roseSoft: '#F5D5D0',
  blue: '#5B8DCF',
  blueSoft: '#D5E3F2',
  line: 'rgba(26,20,13,0.10)',
  lineStrong: 'rgba(26,20,13,0.16)',
};

const SERIF = "'Instrument Serif', 'Times New Roman', serif";
const SANS = "'Geist', system-ui, sans-serif";
const MONO = "'Geist Mono', ui-monospace, monospace";

// ============= Tiny Bruno mark =============
const BrunoMark = ({ size = 28, mood = 'normal' }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} style={{ flex: 'none' }}>
    <circle cx="14" cy="14" r="7" fill="#6B4423" />
    <circle cx="34" cy="14" r="7" fill="#6B4423" />
    <circle cx="14" cy="14" r="3.2" fill="#E8C896" />
    <circle cx="34" cy="14" r="3.2" fill="#E8C896" />
    <circle cx="24" cy="26" r="16" fill="#8B5A2B" />
    <ellipse cx="24" cy="30" rx="9" ry="7" fill="#E8C896" />
    <circle cx="19" cy="23" r="1.7" fill="#1A140D" />
    <circle cx="29" cy="23" r="1.7" fill="#1A140D" />
    <ellipse cx="24" cy="28" rx="1.8" ry="1.3" fill="#1A140D" />
    {mood === 'happy' && (
      <path d="M 21 32 Q 24 34 27 32" stroke="#1A140D" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    )}
  </svg>
);

// ============= Sidebar (shared across all screens) =============
const Sidebar = ({ active = 'dashboard' }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: IconGrid },
    { id: 'daily', label: 'Daily Plan', icon: IconList },
    { id: 'tasks', label: 'Tasks', icon: IconCheck },
    { id: 'calendar', label: 'Calendar', icon: IconCal },
  ];
  return (
    <aside style={sidebarStyles.root}>
      <div style={sidebarStyles.brand}>
        <BrunoMark size={32} />
        <span style={sidebarStyles.brandText}>
          <b style={{ fontWeight: 400 }}>Plan</b>
          <i>evo</i>
        </span>
      </div>

      <div style={sidebarStyles.eyebrow}>WORKSPACE</div>
      <nav style={sidebarStyles.nav}>
        {navItems.map((n) => {
          const isActive = n.id === active;
          return (
            <a key={n.id} style={{ ...sidebarStyles.navItem, ...(isActive ? sidebarStyles.navItemActive : {}) }}>
              <n.icon active={isActive} />
              <span>{n.label}</span>
              {isActive && <span style={sidebarStyles.navDot} />}
            </a>
          );
        })}
      </nav>

      <div style={sidebarStyles.brunoCard}>
        <div style={sidebarStyles.brunoCardHead}>
          <BrunoMark size={28} />
          <div>
            <div style={sidebarStyles.brunoCardName}>Bruno</div>
            <div style={sidebarStyles.brunoCardStatus}>
              <span style={sidebarStyles.brunoCardDot} /> ready when you are
            </div>
          </div>
        </div>
        <button style={sidebarStyles.brunoCta}>
          Ask Bruno <span style={{ opacity: 0.6 }}>⌘K</span>
        </button>
      </div>

      <div style={sidebarStyles.foot}>
        <a style={sidebarStyles.footLink}>
          <IconGear /> Settings
        </a>
        <div style={sidebarStyles.user}>
          <div style={sidebarStyles.avatar}>AT</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={sidebarStyles.userName}>Anthony T.</div>
            <div style={sidebarStyles.userPlan}>14 days · trial</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const sidebarStyles = {
  root: {
    width: 240,
    background: C.ink,
    color: C.paper,
    padding: 22,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    flexShrink: 0,
    fontFamily: SANS,
    position: 'relative',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 22,
    borderBottom: `1px solid rgba(251,246,234,0.08)`,
    marginBottom: 22,
  },
  brandText: {
    fontFamily: SERIF,
    fontSize: 24,
    letterSpacing: '-0.02em',
    lineHeight: 1,
  },
  eyebrow: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: '0.16em',
    color: 'rgba(251,246,234,0.4)',
    marginBottom: 10,
    paddingLeft: 6,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    marginBottom: 28,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 10,
    fontSize: 14,
    color: 'rgba(251,246,234,0.65)',
    fontWeight: 400,
    cursor: 'pointer',
    transition: 'background .15s',
    position: 'relative',
  },
  navItemActive: {
    background: 'rgba(208,135,65,0.12)',
    color: C.honey,
    fontWeight: 500,
  },
  navDot: {
    position: 'absolute',
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    background: C.honey,
  },
  brunoCard: {
    background: 'rgba(251,246,234,0.04)',
    border: '1px solid rgba(251,246,234,0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 'auto',
  },
  brunoCardHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  brunoCardName: {
    fontFamily: SERIF,
    fontSize: 18,
    lineHeight: 1,
  },
  brunoCardStatus: {
    fontSize: 11,
    color: 'rgba(251,246,234,0.5)',
    marginTop: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  brunoCardDot: {
    width: 6,
    height: 6,
    background: C.sage,
    borderRadius: 3,
    boxShadow: `0 0 0 3px rgba(107,139,105,0.25)`,
  },
  brunoCta: {
    width: '100%',
    background: C.paper,
    color: C.ink,
    border: 'none',
    padding: '9px 12px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: SANS,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  foot: {
    marginTop: 24,
    paddingTop: 18,
    borderTop: `1px solid rgba(251,246,234,0.08)`,
  },
  footLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 6px',
    fontSize: 13,
    color: 'rgba(251,246,234,0.55)',
    cursor: 'pointer',
    marginBottom: 8,
  },
  user: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 4px',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: C.honey,
    color: C.ink,
    fontSize: 12,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: MONO,
  },
  userName: {
    fontSize: 13,
    color: C.paper,
    fontWeight: 500,
  },
  userPlan: {
    fontSize: 11,
    color: 'rgba(251,246,234,0.4)',
    fontFamily: MONO,
    letterSpacing: '0.04em',
  },
};

// ============= Icons (simple line) =============
function IconGrid({ active }) {
  const stroke = active ? C.honey : 'rgba(251,246,234,0.65)';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="5" rx="1.2" stroke={stroke} strokeWidth="1.4" />
      <rect x="9" y="2" width="5" height="5" rx="1.2" stroke={stroke} strokeWidth="1.4" />
      <rect x="2" y="9" width="5" height="5" rx="1.2" stroke={stroke} strokeWidth="1.4" />
      <rect x="9" y="9" width="5" height="5" rx="1.2" stroke={stroke} strokeWidth="1.4" />
    </svg>
  );
}
function IconList({ active }) {
  const stroke = active ? C.honey : 'rgba(251,246,234,0.65)';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 4h10M3 8h10M3 12h6" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function IconCheck({ active }) {
  const stroke = active ? C.honey : 'rgba(251,246,234,0.65)';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="2.5" stroke={stroke} strokeWidth="1.4" />
      <path d="M5 8l2 2 4-4" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCal({ active }) {
  const stroke = active ? C.honey : 'rgba(251,246,234,0.65)';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3.5" width="12" height="10.5" rx="1.8" stroke={stroke} strokeWidth="1.4" />
      <path d="M2 6.5h12M5.5 2v2M10.5 2v2" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function IconGear() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2" stroke="rgba(251,246,234,0.55)" strokeWidth="1.3" />
      <path d="M8 2v1.5M8 12.5V14M14 8h-1.5M3.5 8H2M12.24 3.76l-1.06 1.06M4.82 11.18l-1.06 1.06M12.24 12.24l-1.06-1.06M4.82 4.82L3.76 3.76" stroke="rgba(251,246,234,0.55)" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// ============= Shared bits =============
const SourcePill = ({ kind, label, count, status = 'synced' }) => {
  const colorMap = {
    canvas: { dot: C.rose, soft: C.roseSoft },
    cal: { dot: C.blue, soft: C.blueSoft },
    task: { dot: C.honey, soft: C.honeySoft },
    project: { dot: C.sage, soft: C.sageSoft },
  };
  const c = colorMap[kind] || colorMap.task;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '8px 14px 8px 12px',
      borderRadius: 999,
      background: C.paper,
      border: `1px solid ${C.line}`,
      fontSize: 13,
      fontFamily: SANS,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: c.dot }} />
      <span style={{ color: C.ink, fontWeight: 500 }}>{label}</span>
      {count != null && (
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.inkSoft }}>
          {count}
        </span>
      )}
      {status === 'synced' && (
        <span style={{ fontFamily: MONO, fontSize: 10, color: C.sage, letterSpacing: '0.06em' }}>· SYNCED</span>
      )}
    </div>
  );
};

const PageHeader = ({ eyebrow, title, sub, right }) => (
  <div style={{
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 28,
    borderBottom: `1px solid ${C.line}`,
    marginBottom: 32,
    gap: 24,
  }}>
    <div>
      {eyebrow && (
        <div style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: '0.18em',
          color: C.brunoDeep,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}>{eyebrow}</div>
      )}
      <h1 style={{
        fontFamily: SERIF,
        fontSize: 56,
        lineHeight: 0.96,
        letterSpacing: '-0.025em',
        color: C.ink,
        margin: 0,
        fontWeight: 400,
      }}>{title}</h1>
      {sub && (
        <p style={{
          fontFamily: SANS,
          fontSize: 15,
          color: C.inkSoft,
          margin: '12px 0 0',
        }}>{sub}</p>
      )}
    </div>
    {right}
  </div>
);

// ============= 1) DASHBOARD =============
function DashboardScreen() {
  return (
    <div style={pageStyles.shell} data-screen-label="Dashboard">
      <Sidebar active="dashboard" />
      <main style={pageStyles.main}>
        <div style={pageStyles.contentInner}>

          <PageHeader
            eyebrow="MONDAY · MAY 18 · 6:15 PM"
            title={<>Good evening, <em style={{ color: C.honeyDeep }}>Anthony.</em></>}
            sub="Three things on your plate. Bruno already moved the heavy one to tomorrow morning."
            right={
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <SourcePill kind="canvas" label="Canvas" count="3 due" />
                <SourcePill kind="cal" label="Calendar" count="4 today" />
              </div>
            }
          />

          {/* TODAY'S PLAN — hero card */}
          <div style={dash.heroCard}>
            <div style={dash.heroLeft}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <BrunoMark size={36} mood="happy" />
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', color: 'rgba(251,246,234,0.5)' }}>BRUNO · 2 MIN AGO</div>
                  <div style={{ fontFamily: SERIF, fontSize: 22, color: C.paper, marginTop: 4, fontStyle: 'italic' }}>Tonight is for the light stuff.</div>
                </div>
              </div>
              <h2 style={dash.heroTitle}>
                Your <em style={{ color: C.honey, fontStyle: 'italic' }}>next move</em><br/>is a 25-minute read.
              </h2>
              <p style={dash.heroSub}>
                You've been at it since 9am. Bruno parked the Calc problem set on tomorrow's morning block — that's when you're sharpest anyway.
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                <button style={dash.heroBtn}>Start focus block <span style={{ marginLeft: 6 }}>→</span></button>
                <button style={dash.heroBtnGhost}>See full plan</button>
              </div>
            </div>

            <div style={dash.heroRight}>
              <div style={dash.timeBlock}>
                <div style={dash.tbHead}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.inkSoft, letterSpacing: '0.1em' }}>NOW · 6:15 PM</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.sage, letterSpacing: '0.1em' }}>● FOCUS</span>
                </div>
                <div style={dash.tbTitle}>Read &amp; outline — History Ch. 7</div>
                <div style={dash.tbMeta}>
                  <span style={{ color: C.rose }}>●</span> Canvas · due Thu &nbsp;·&nbsp; 25 min &nbsp;·&nbsp; low energy ok
                </div>
                <div style={dash.tbProgress}>
                  <div style={{ ...dash.tbProgressFill, width: '38%' }} />
                </div>
                <div style={dash.tbFootRow}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.inkSoft, letterSpacing: '0.06em' }}>9 MIN IN · 16 LEFT</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.honeyDeep, letterSpacing: '0.06em' }}>BRUNO: NEXT IS A STRETCH</span>
                </div>
              </div>

              <div style={dash.upNext}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: C.inkSoft, letterSpacing: '0.16em', marginBottom: 10 }}>UP NEXT TODAY</div>
                <div style={dash.upRow}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.inkSoft }}>7:00</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Quick stretch · phone away</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.honeyDeep }}>10m</span>
                </div>
                <div style={dash.upRow}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.inkSoft }}>7:30</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Dinner break</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.inkSoft }}>45m</span>
                </div>
                <div style={dash.upRow}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.inkSoft }}>8:30</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Outline essay intro</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.inkSoft }}>30m</span>
                </div>
              </div>
            </div>
          </div>

          {/* STATS ROW */}
          <div style={dash.stats}>
            <Stat label="Done today" big="4" sub="of 6 planned" tone="sage" />
            <Stat label="Focus time" big="2h 14m" sub="3 sessions" tone="honey" />
            <Stat label="Open tasks" big="9" sub="3 due this week" tone="ink" />
            <Stat label="Streak" big="11d" sub="longest: 17 days" tone="bruno" />
          </div>

          {/* DETAIL ROW */}
          <div style={dash.detail}>
            <div style={dash.detailCard}>
              <div style={dash.detailHead}>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: C.inkSoft, letterSpacing: '0.16em', marginBottom: 6 }}>THIS WEEK</div>
                  <div style={{ fontFamily: SERIF, fontSize: 22, color: C.ink }}>What's <em>coming up.</em></div>
                </div>
                <a style={dash.linkBtn}>See all →</a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  { d: 'TUE', t: 'Calc PS8 · final due', src: 'canvas', h: 'High focus · 90m' },
                  { d: 'WED', t: 'Lab report draft', src: 'canvas', h: 'Medium · 60m' },
                  { d: 'THU', t: 'History essay · final', src: 'canvas', h: 'High · 2h block' },
                  { d: 'FRI', t: 'Office hours · Dr. Marin', src: 'cal', h: '11 AM · 30m' },
                ].map((row, i) => (
                  <div key={i} style={dash.weekRow}>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.inkSoft, letterSpacing: '0.1em', minWidth: 40 }}>{row.d}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{row.t}</div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: C.inkSoft, marginTop: 3 }}>
                        <span style={{ color: row.src === 'canvas' ? C.rose : C.blue }}>●</span> {row.h}
                      </div>
                    </div>
                    <button style={dash.miniBtn}>Move</button>
                  </div>
                ))}
              </div>
            </div>

            <div style={dash.brunoSays}>
              <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', color: C.honey, marginBottom: 14 }}>BRUNO NOTICED</div>
              <p style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1.2, color: C.paper, margin: 0 }}>
                Your Tuesday <em style={{ color: C.honey }}>mornings</em> are your most productive — 73% of deep work happens before noon.
              </p>
              <p style={{ fontSize: 13, color: 'rgba(251,246,234,0.6)', marginTop: 14, lineHeight: 1.55 }}>
                I'll keep scheduling your hardest work then. Anything else you want me to learn?
              </p>
              <button style={dash.brunoBtn}>Open chat with Bruno</button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function Stat({ label, big, sub, tone }) {
  const tones = {
    sage: { dot: C.sage },
    honey: { dot: C.honey },
    ink: { dot: C.ink },
    bruno: { dot: C.bruno },
  };
  const t = tones[tone] || tones.ink;
  return (
    <div style={dash.stat}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ width: 7, height: 7, borderRadius: 4, background: t.dot }} />
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', color: C.inkSoft, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 44, lineHeight: 1, letterSpacing: '-0.02em', color: C.ink }}>{big}</div>
      <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 6, fontFamily: MONO, letterSpacing: '0.04em' }}>{sub}</div>
    </div>
  );
}

const pageStyles = {
  shell: {
    width: 1440,
    height: '100%',
    minHeight: 940,
    background: C.cream,
    display: 'flex',
    fontFamily: SANS,
    color: C.ink,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  contentInner: {
    padding: '40px 56px',
    height: '100%',
    overflow: 'hidden',
  },
};

// Helper to make sidebar full-height when content is taller
const SidebarTall = (props) => <Sidebar {...props} />;

const dash = {
  heroCard: {
    background: C.ink,
    color: C.paper,
    borderRadius: 22,
    padding: 36,
    display: 'grid',
    gridTemplateColumns: '1.1fr 1fr',
    gap: 36,
    marginBottom: 24,
    minHeight: 280,
  },
  heroLeft: {},
  heroTitle: {
    fontFamily: SERIF,
    fontSize: 48,
    lineHeight: 1,
    letterSpacing: '-0.025em',
    fontWeight: 400,
    margin: '0 0 16px',
  },
  heroSub: {
    fontSize: 15,
    color: 'rgba(251,246,234,0.7)',
    lineHeight: 1.55,
    margin: 0,
    maxWidth: 420,
  },
  heroBtn: {
    background: C.honey,
    color: C.ink,
    border: 'none',
    padding: '13px 22px',
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: SANS,
  },
  heroBtnGhost: {
    background: 'transparent',
    color: C.paper,
    border: `1px solid rgba(251,246,234,0.18)`,
    padding: '13px 22px',
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: SANS,
  },
  heroRight: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  timeBlock: {
    background: C.paper,
    color: C.ink,
    borderRadius: 14,
    padding: 20,
  },
  tbHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tbTitle: {
    fontFamily: SERIF,
    fontSize: 20,
    letterSpacing: '-0.01em',
    marginBottom: 8,
  },
  tbMeta: {
    fontSize: 12,
    color: C.inkSoft,
    fontFamily: MONO,
    letterSpacing: '0.02em',
    marginBottom: 14,
  },
  tbProgress: {
    height: 6,
    background: C.cream2,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  tbProgressFill: {
    height: '100%',
    background: C.honey,
    borderRadius: 3,
  },
  tbFootRow: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  upNext: {
    background: 'rgba(251,246,234,0.05)',
    border: '1px solid rgba(251,246,234,0.08)',
    borderRadius: 14,
    padding: 16,
  },
  upRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '8px 4px',
    borderTop: `1px solid rgba(251,246,234,0.06)`,
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14,
    marginBottom: 24,
  },
  stat: {
    background: C.paper,
    borderRadius: 16,
    padding: 22,
    border: `1px solid ${C.line}`,
  },
  detail: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    gap: 14,
  },
  detailCard: {
    background: C.paper,
    borderRadius: 16,
    padding: 24,
    border: `1px solid ${C.line}`,
  },
  detailHead: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  weekRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '12px 4px',
    borderTop: `1px solid ${C.line}`,
  },
  miniBtn: {
    background: 'transparent',
    color: C.ink,
    border: `1px solid ${C.lineStrong}`,
    padding: '6px 12px',
    borderRadius: 999,
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: SANS,
  },
  linkBtn: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: '0.1em',
    color: C.honeyDeep,
    cursor: 'pointer',
  },
  brunoSays: {
    background: C.brunoDeep,
    color: C.paper,
    borderRadius: 16,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
  },
  brunoBtn: {
    marginTop: 'auto',
    background: C.honey,
    color: C.ink,
    border: 'none',
    padding: '12px 16px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: SANS,
  },
};

// ============= 2) DAILY PLAN =============
function DailyPlanScreen() {
  return (
    <div style={pageStyles.shell} data-screen-label="Daily Plan">
      <Sidebar active="daily" />
      <main style={pageStyles.main}>
        <div style={pageStyles.contentInner}>
          <PageHeader
            eyebrow="DAILY PLAN · MONDAY MAY 18"
            title={<>Today, <em style={{ color: C.honeyDeep }}>at a glance.</em></>}
            sub="Generated 7:02 AM · Bruno read 23 items from your sources and built a focused plan."
            right={
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={dp.btnGhost}>Refresh sources</button>
                <button style={dp.btnDark}>Regenerate plan</button>
              </div>
            }
          />

          <div style={dp.body}>
            {/* TIMELINE */}
            <div style={dp.timelineCard}>
              <div style={dp.timelineHead}>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: C.inkSoft, letterSpacing: '0.16em', marginBottom: 4 }}>YOUR DAY · 6 BLOCKS</div>
                  <div style={{ fontFamily: SERIF, fontSize: 24 }}>9:00 AM <em style={{ color: C.honeyDeep }}>—</em> 9:30 PM</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={dp.chipActive}>Day</button>
                  <button style={dp.chip}>Week</button>
                </div>
              </div>

              <div style={dp.timeline}>
                {[
                  { t: '09:00', dur: '90m', title: 'Calculus II — Problem Set 8', src: 'canvas', tag: 'DEEP WORK · MORNING SHARP', done: true },
                  { t: '10:30', dur: '10m', title: 'Stretch · phone away', src: 'task', tag: 'BRUNO: DON\'T SKIP' },
                  { t: '11:00', dur: '60m', title: 'Bio lab w/ Dr. Marin', src: 'cal', tag: 'CALENDAR · ROOM 204', now: true },
                  { t: '14:00', dur: '45m', title: 'Walk + coffee with Sam', src: 'task', tag: '+ ADDED BY BRUNO · RECOVERY' },
                  { t: '15:00', dur: '90m', title: 'History essay — read & outline', src: 'canvas', tag: 'SOFT START · 45M READ' },
                  { t: '16:30', dur: '60m', title: 'Gym — pull day', src: 'cal', tag: 'CALENDAR · KEEPS YOU GOING' },
                ].map((row, i) => (
                  <div key={i} style={{
                    ...dp.tRow,
                    background: row.now ? 'rgba(208,135,65,0.10)' : 'transparent',
                    border: row.now ? `1px solid rgba(208,135,65,0.35)` : `1px solid transparent`,
                  }}>
                    <div style={{ minWidth: 70 }}>
                      <div style={{ fontFamily: MONO, fontSize: 12, color: row.now ? C.honeyDeep : C.ink, fontWeight: 600 }}>{row.t}</div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: C.inkSoft, marginTop: 2 }}>{row.dur}</div>
                    </div>
                    <div style={{
                      width: 4, borderRadius: 2, alignSelf: 'stretch',
                      background: row.src === 'canvas' ? C.rose : row.src === 'cal' ? C.blue : C.honey,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 15, fontWeight: 500,
                        textDecoration: row.done ? 'line-through' : 'none',
                        color: row.done ? C.inkSoft : C.ink,
                      }}>{row.title}</div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: C.inkSoft, marginTop: 4, letterSpacing: '0.06em' }}>{row.tag}</div>
                    </div>
                    {row.now && <div style={dp.nowPill}>● NOW</div>}
                    {row.done && <div style={{ fontFamily: MONO, fontSize: 10, color: C.sage, letterSpacing: '0.1em' }}>✓ DONE</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* SIDE COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={dp.energy}>
                <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', color: C.inkSoft, marginBottom: 12 }}>YOUR ENERGY · MONDAY</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <button style={dp.energyBtn}>Low</button>
                  <button style={dp.energyBtnActive}>Medium</button>
                  <button style={dp.energyBtn}>High</button>
                </div>
                <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.5 }}>
                  Bruno will keep the morning block heavy and add a recovery walk at 2 PM.
                </div>
              </div>

              <div style={dp.sources}>
                <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', color: C.inkSoft, marginBottom: 14 }}>SOURCES PULLED</div>
                {[
                  { icon: 'C', name: 'Canvas LMS', count: '8 deadlines', color: C.rose },
                  { icon: 'G', name: 'Google Calendar', count: '6 events', color: C.blue },
                  { icon: 'T', name: 'Tasks & reminders', count: '9 items', color: C.honey },
                ].map((s, i) => (
                  <div key={i} style={dp.srcRow}>
                    <div style={{ ...dp.srcIco, background: s.color }}>{s.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: C.inkSoft, fontFamily: MONO, marginTop: 2 }}>{s.count}</div>
                    </div>
                    <div style={{ fontSize: 10, fontFamily: MONO, color: C.sage, letterSpacing: '0.06em' }}>✓ 2M AGO</div>
                  </div>
                ))}
              </div>

              <div style={dp.brunoNote}>
                <BrunoMark size={26} />
                <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.55, color: 'rgba(251,246,234,0.78)' }}>
                  Your morning was clean. I shifted the essay to <span style={{ color: C.honey, fontWeight: 500 }}>tomorrow 9:30 AM</span> after the lab ran long. Tap if you want it back today.
                </div>
                <button style={dp.brunoNoteBtn}>Keep tomorrow morning</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const dp = {
  body: {
    display: 'grid',
    gridTemplateColumns: '1.7fr 1fr',
    gap: 16,
  },
  btnDark: {
    background: C.ink, color: C.paper, border: 'none',
    padding: '11px 18px', borderRadius: 999, fontSize: 13, fontWeight: 500,
    cursor: 'pointer', fontFamily: SANS,
  },
  btnGhost: {
    background: 'transparent', color: C.ink, border: `1px solid ${C.lineStrong}`,
    padding: '11px 18px', borderRadius: 999, fontSize: 13, fontWeight: 500,
    cursor: 'pointer', fontFamily: SANS,
  },
  timelineCard: {
    background: C.paper, borderRadius: 18, padding: 24,
    border: `1px solid ${C.line}`,
  },
  timelineHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    marginBottom: 22,
  },
  chip: {
    background: 'transparent', color: C.inkSoft,
    border: `1px solid ${C.line}`,
    padding: '6px 14px', borderRadius: 999, fontSize: 12,
    fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase',
    cursor: 'pointer',
  },
  chipActive: {
    background: C.ink, color: C.paper, border: 'none',
    padding: '6px 14px', borderRadius: 999, fontSize: 12,
    fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase',
    cursor: 'pointer',
  },
  timeline: { display: 'flex', flexDirection: 'column', gap: 6 },
  tRow: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '14px 16px', borderRadius: 12,
  },
  nowPill: {
    background: C.honey, color: C.ink, padding: '4px 10px', borderRadius: 6,
    fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em',
  },
  energy: {
    background: C.paper, borderRadius: 14, padding: 20,
    border: `1px solid ${C.line}`,
  },
  energyBtn: {
    flex: 1, background: 'transparent', color: C.ink,
    border: `1px solid ${C.line}`, padding: '8px 4px',
    borderRadius: 8, fontSize: 12, fontFamily: MONO,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    cursor: 'pointer',
  },
  energyBtnActive: {
    flex: 1, background: C.ink, color: C.paper,
    border: 'none', padding: '8px 4px',
    borderRadius: 8, fontSize: 12, fontFamily: MONO,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    cursor: 'pointer',
  },
  sources: {
    background: C.paper, borderRadius: 14, padding: 20,
    border: `1px solid ${C.line}`,
  },
  srcRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 0',
    borderTop: `1px solid ${C.line}`,
  },
  srcIco: {
    width: 26, height: 26, borderRadius: 7,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: C.paper, fontFamily: MONO, fontSize: 12, fontWeight: 600,
  },
  brunoNote: {
    background: C.brunoDeep, color: C.paper,
    borderRadius: 14, padding: 18,
  },
  brunoNoteBtn: {
    marginTop: 14, width: '100%',
    background: 'rgba(208,135,65,0.18)', color: C.honey,
    border: `1px solid rgba(208,135,65,0.35)`,
    padding: '9px 12px', borderRadius: 8,
    fontSize: 12, fontFamily: SANS, fontWeight: 500,
    cursor: 'pointer',
  },
};

// ============= 3) TASKS =============
function TasksScreen() {
  const tasks = {
    today: [
      { title: 'Calculus II — Problem Set 8', src: 'canvas', due: 'Mon · today', est: '90m', tag: 'high', done: true },
      { title: 'Read History Ch. 7 + outline', src: 'canvas', due: 'Thu', est: '45m', tag: 'medium' },
      { title: 'Reply to Dr. Marin re: lab', src: 'task', due: 'Today', est: '10m', tag: 'low' },
    ],
    week: [
      { title: 'Lab report — Bio 201', src: 'canvas', due: 'Wed', est: '60m', tag: 'medium' },
      { title: 'History essay — first draft', src: 'canvas', due: 'Thu', est: '2h', tag: 'high', moved: true },
      { title: 'Plan spring break trip', src: 'task', due: 'Fri', est: '30m', tag: 'low' },
      { title: 'Refill prescription', src: 'task', due: 'Sat', est: '15m', tag: 'low' },
    ],
    later: [
      { title: 'Midterm 1 prep — Calc', src: 'canvas', due: 'May 28', est: '4h', tag: 'high' },
      { title: 'Internship app · Acme Co.', src: 'task', due: 'Jun 2', est: '90m', tag: 'high' },
    ],
  };

  return (
    <div style={pageStyles.shell} data-screen-label="Tasks">
      <Sidebar active="tasks" />
      <main style={pageStyles.main}>
        <div style={pageStyles.contentInner}>
          <PageHeader
            eyebrow="TASKS · ALL SOURCES"
            title={<>Everything <em style={{ color: C.honeyDeep }}>on your plate.</em></>}
            sub="11 open · 3 due this week. Bruno keeps the urgent stuff up top so you don't have to scan."
            right={
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={tk.consistency}>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: C.inkSoft, letterSpacing: '0.1em' }}>CONSISTENCY</div>
                    <div style={{ fontFamily: SERIF, fontSize: 22, color: C.sage }}>73%</div>
                  </div>
                  <div style={{ width: 1, alignSelf: 'stretch', background: C.line, margin: '0 14px' }} />
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: C.inkSoft, letterSpacing: '0.1em' }}>STREAK</div>
                    <div style={{ fontFamily: SERIF, fontSize: 22, color: C.honeyDeep }}>11d</div>
                  </div>
                </div>
                <button style={tk.addBtn}>+ Add task</button>
              </div>
            }
          />

          {/* Filter bar */}
          <div style={tk.filters}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={tk.filterActive}>All · 11</button>
              <button style={tk.filter}>Canvas · 5</button>
              <button style={tk.filter}>Calendar · 4</button>
              <button style={tk.filter}>Personal · 2</button>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.inkSoft, letterSpacing: '0.1em' }}>SORT</span>
              <button style={tk.filter}>Bruno priority ↓</button>
            </div>
          </div>

          {/* Bruno banner */}
          <div style={tk.brunoBanner}>
            <BrunoMark size={32} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', color: 'rgba(251,246,234,0.5)', marginBottom: 4 }}>BRUNO ·  AUTO-SORTED</div>
              <div style={{ fontFamily: SERIF, fontSize: 18, color: C.paper }}>
                Your <em style={{ color: C.honey }}>History essay</em> moved up — Thursday creeps up faster than you think.
              </div>
            </div>
            <button style={tk.brunoBannerBtn}>Why?</button>
          </div>

          {/* Task groups */}
          <div style={tk.groups}>
            <TaskGroup title="Today" count={tasks.today.length} note="Bruno scheduled these" tasks={tasks.today} />
            <TaskGroup title="This week" count={tasks.week.length} note="Due in next 7 days" tasks={tasks.week} />
            <TaskGroup title="Later" count={tasks.later.length} note="Bruno will surface these closer to deadline" tasks={tasks.later} />
          </div>
        </div>
      </main>
    </div>
  );
}

function TaskGroup({ title, count, note, tasks }) {
  return (
    <div style={tk.group}>
      <div style={tk.groupHead}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h3 style={{ fontFamily: SERIF, fontSize: 22, margin: 0, letterSpacing: '-0.01em' }}>{title}</h3>
          <span style={{ fontFamily: MONO, fontSize: 11, color: C.inkSoft, letterSpacing: '0.06em' }}>{count}</span>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 10, color: C.inkSoft, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{note}</span>
      </div>
      <div>
        {tasks.map((t, i) => <TaskRow key={i} t={t} />)}
      </div>
    </div>
  );
}

function TaskRow({ t }) {
  const tagColors = {
    high: { bg: C.roseSoft, fg: C.rose },
    medium: { bg: C.honeySoft, fg: C.honeyDeep },
    low: { bg: C.sageSoft, fg: C.sage },
  };
  const srcDot = { canvas: C.rose, cal: C.blue, task: C.honey }[t.src] || C.honey;
  const srcLabel = { canvas: 'Canvas', cal: 'Calendar', task: 'Personal' }[t.src] || 'Task';
  const tag = tagColors[t.tag] || tagColors.medium;

  return (
    <div style={{
      ...tk.row,
      opacity: t.done ? 0.55 : 1,
    }}>
      <div style={tk.check}>
        {t.done && <span style={{ color: C.sage, fontSize: 14 }}>✓</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 500,
          textDecoration: t.done ? 'line-through' : 'none',
        }}>{t.title}</div>
        <div style={{ display: 'flex', gap: 14, marginTop: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontFamily: MONO, color: C.inkSoft, letterSpacing: '0.04em' }}>
            <span style={{ color: srcDot }}>●</span> {srcLabel}
          </span>
          <span style={{ fontSize: 11, fontFamily: MONO, color: C.inkSoft, letterSpacing: '0.04em' }}>due · {t.due}</span>
          <span style={{ fontSize: 11, fontFamily: MONO, color: C.inkSoft, letterSpacing: '0.04em' }}>~{t.est}</span>
          {t.moved && (
            <span style={{ fontSize: 10, fontFamily: MONO, color: C.honeyDeep, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Moved by Bruno
            </span>
          )}
        </div>
      </div>
      <div style={{ ...tk.tag, background: tag.bg, color: tag.fg }}>
        {t.tag}
      </div>
      <button style={tk.rowAction}>···</button>
    </div>
  );
}

const tk = {
  consistency: {
    display: 'flex', alignItems: 'center',
    background: C.paper, borderRadius: 14,
    padding: '10px 16px', border: `1px solid ${C.line}`,
  },
  addBtn: {
    background: C.ink, color: C.paper, border: 'none',
    padding: '14px 22px', borderRadius: 999, fontSize: 14, fontWeight: 500,
    cursor: 'pointer', fontFamily: SANS,
  },
  filters: {
    display: 'flex', justifyContent: 'space-between',
    marginBottom: 18, padding: '0 4px',
  },
  filter: {
    background: 'transparent', color: C.ink,
    border: `1px solid ${C.line}`,
    padding: '7px 14px', borderRadius: 999, fontSize: 13,
    cursor: 'pointer', fontFamily: SANS,
  },
  filterActive: {
    background: C.ink, color: C.paper, border: 'none',
    padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500,
    cursor: 'pointer', fontFamily: SANS,
  },
  brunoBanner: {
    background: C.ink, color: C.paper,
    borderRadius: 14, padding: '18px 20px',
    display: 'flex', alignItems: 'center', gap: 16,
    marginBottom: 22,
  },
  brunoBannerBtn: {
    background: 'rgba(208,135,65,0.18)', color: C.honey,
    border: `1px solid rgba(208,135,65,0.32)`,
    padding: '8px 14px', borderRadius: 8,
    fontSize: 12, fontWeight: 500, fontFamily: SANS,
    cursor: 'pointer',
  },
  groups: { display: 'flex', flexDirection: 'column', gap: 22 },
  group: {
    background: C.paper, borderRadius: 16, padding: '20px 22px',
    border: `1px solid ${C.line}`,
  },
  groupHead: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
    paddingBottom: 10,
    borderBottom: `1px solid ${C.line}`,
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 4px',
    borderTop: `1px solid ${C.line}`,
  },
  check: {
    width: 22, height: 22, borderRadius: 6,
    border: `1.5px solid ${C.lineStrong}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  tag: {
    fontSize: 10, fontFamily: MONO, letterSpacing: '0.1em',
    textTransform: 'uppercase', padding: '4px 9px', borderRadius: 4,
    fontWeight: 500,
  },
  rowAction: {
    background: 'transparent', border: 'none',
    color: C.inkSoft, fontSize: 16, cursor: 'pointer',
    padding: '4px 8px',
  },
};

// ============= 4) CALENDAR =============
function CalendarScreen() {
  const hours = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM'];
  const events = [
    { day: 1, start: 9, dur: 1.5, title: 'Calculus PS8 · deep work', src: 'canvas', done: true },
    { day: 1, start: 11, dur: 1, title: 'Bio lab — Dr. Marin', src: 'cal' },
    { day: 1, start: 14, dur: 0.75, title: 'Walk + coffee', src: 'task', added: true },
    { day: 1, start: 15, dur: 1.5, title: 'History — read & outline', src: 'canvas' },
    { day: 1, start: 16.5, dur: 1, title: 'Gym · pull day', src: 'cal' },

    { day: 2, start: 9.5, dur: 2, title: 'History essay — first draft', src: 'canvas', moved: true },
    { day: 2, start: 12, dur: 0.75, title: 'Lunch + walk', src: 'task' },
    { day: 2, start: 14, dur: 1, title: 'Calc TA office hours', src: 'cal' },

    { day: 3, start: 10, dur: 1.5, title: 'Lab report draft', src: 'canvas' },
    { day: 3, start: 13, dur: 0.5, title: 'Stand-up · Acme intern', src: 'cal' },

    { day: 4, start: 11, dur: 1, title: 'Office hours · Dr. Marin', src: 'cal' },
    { day: 4, start: 14, dur: 1.5, title: 'History essay · revise', src: 'canvas' },

    { day: 5, start: 9, dur: 2, title: 'Midterm prep · session 1', src: 'canvas' },
    { day: 5, start: 13, dur: 0.5, title: 'Therapy · standing', src: 'cal' },
  ];

  return (
    <div style={pageStyles.shell} data-screen-label="Calendar">
      <Sidebar active="calendar" />
      <main style={pageStyles.main}>
        <div style={{ ...pageStyles.contentInner, padding: '40px 40px 0 56px' }}>
          <PageHeader
            eyebrow="CALENDAR · WEEK OF MAY 18"
            title={<>Your <em style={{ color: C.honeyDeep }}>week</em>, unified.</>}
            sub="Canvas, Google Calendar, and tasks Bruno is scheduling — all in one place."
            right={
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={cal.chip}>Day</button>
                <button style={cal.chipActive}>Week</button>
                <button style={cal.chip}>Month</button>
                <button style={cal.chip}>List</button>
              </div>
            }
          />

          <div style={cal.body}>
            {/* Week grid */}
            <div style={cal.grid}>
              <div style={cal.gridHead}>
                <div style={{ width: 56 }} />
                {['MON 18', 'TUE 19', 'WED 20', 'THU 21', 'FRI 22'].map((d, i) => (
                  <div key={i} style={{
                    flex: 1, textAlign: 'left', padding: '0 12px',
                    borderLeft: `1px solid ${C.line}`,
                  }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: C.inkSoft, letterSpacing: '0.1em' }}>{d.split(' ')[0]}</div>
                    <div style={{ fontFamily: SERIF, fontSize: 22, color: i === 0 ? C.honeyDeep : C.ink, marginTop: 2 }}>
                      {d.split(' ')[1]}
                    </div>
                  </div>
                ))}
              </div>

              <div style={cal.gridBody}>
                {/* hour labels */}
                <div style={cal.hours}>
                  {hours.map((h, i) => (
                    <div key={i} style={{ height: 60, position: 'relative' }}>
                      <span style={{
                        position: 'absolute', top: -7, right: 8,
                        fontFamily: MONO, fontSize: 10, color: C.inkSoft, letterSpacing: '0.06em',
                      }}>{h}</span>
                    </div>
                  ))}
                </div>

                {/* day columns */}
                {[1, 2, 3, 4, 5].map((d) => (
                  <div key={d} style={cal.dayCol}>
                    {hours.map((_, i) => (
                      <div key={i} style={cal.hourCell} />
                    ))}
                    {/* now line on Mon */}
                    {d === 1 && (
                      <div style={{
                        position: 'absolute',
                        top: (11.25 - 9) * 60,
                        left: 0, right: 0,
                        height: 2, background: C.honey,
                        zIndex: 4,
                      }}>
                        <div style={{
                          position: 'absolute', left: -5, top: -5,
                          width: 12, height: 12, borderRadius: 6,
                          background: C.honey,
                        }} />
                        <div style={{
                          position: 'absolute', left: -54, top: -8,
                          fontFamily: MONO, fontSize: 10,
                          color: C.honeyDeep, letterSpacing: '0.06em',
                          background: C.cream, padding: '2px 4px',
                        }}>NOW</div>
                      </div>
                    )}

                    {events.filter(e => e.day === d).map((e, i) => (
                      <CalEvent key={i} e={e} />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Backlog / Bruno side panel */}
            <div style={cal.side}>
              <div style={cal.sideCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', color: C.inkSoft, marginBottom: 4 }}>BACKLOG · UNSCHEDULED</div>
                    <div style={{ fontFamily: SERIF, fontSize: 22 }}>3 items <em style={{ color: C.honeyDeep }}>waiting.</em></div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 14, lineHeight: 1.5 }}>
                  Drag onto a day, or ask Bruno to slot them.
                </div>
                {[
                  { t: 'Spring break — research flights', est: '30m', src: 'task' },
                  { t: 'Refill prescription', est: '15m', src: 'task' },
                  { t: 'Internship app · Acme', est: '90m', src: 'task' },
                ].map((b, i) => (
                  <div key={i} style={cal.backlog}>
                    <span style={{ width: 4, height: 28, background: C.honey, borderRadius: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{b.t}</div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: C.inkSoft, marginTop: 2 }}>~{b.est}</div>
                    </div>
                    <div style={{ fontSize: 14, color: C.inkSoft, cursor: 'grab' }}>⋮⋮</div>
                  </div>
                ))}
              </div>

              <div style={cal.brunoSide}>
                <BrunoMark size={24} />
                <div style={{ marginTop: 10, fontFamily: SERIF, fontSize: 17, lineHeight: 1.25 }}>
                  Want me to schedule the backlog?
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(251,246,234,0.6)' }}>
                  I'll fit them around your existing blocks based on energy.
                </div>
                <button style={cal.brunoSideBtn}>Auto-schedule 3 items</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function CalEvent({ e }) {
  const colorMap = {
    canvas: { bg: '#FBE6E2', border: C.rose, text: '#7A2E25' },
    cal: { bg: '#DDE9F5', border: C.blue, text: '#234E80' },
    task: { bg: '#FAEBD4', border: C.honey, text: C.honeyDeep },
  };
  const c = colorMap[e.src] || colorMap.task;
  const top = (e.start - 9) * 60;
  const height = e.dur * 60 - 4;
  return (
    <div style={{
      position: 'absolute',
      top: top,
      left: 4, right: 4,
      height: height,
      background: c.bg,
      borderLeft: `3px solid ${c.border}`,
      borderRadius: 6,
      padding: '6px 8px',
      fontSize: 11,
      lineHeight: 1.25,
      color: c.text,
      overflow: 'hidden',
      textDecoration: e.done ? 'line-through' : 'none',
      opacity: e.done ? 0.6 : 1,
      zIndex: 3,
    }}>
      <div style={{ fontWeight: 600 }}>{e.title}</div>
      {e.added && (
        <div style={{ fontFamily: MONO, fontSize: 9, marginTop: 2, opacity: 0.7 }}>+ ADDED BY BRUNO</div>
      )}
      {e.moved && (
        <div style={{ fontFamily: MONO, fontSize: 9, marginTop: 2, opacity: 0.7 }}>MOVED FROM MON</div>
      )}
    </div>
  );
}

const cal = {
  body: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, height: 660 },
  chip: {
    background: 'transparent', color: C.inkSoft,
    border: `1px solid ${C.line}`, padding: '7px 14px',
    borderRadius: 999, fontSize: 12, fontFamily: MONO,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    cursor: 'pointer',
  },
  chipActive: {
    background: C.ink, color: C.paper, border: 'none',
    padding: '7px 14px', borderRadius: 999, fontSize: 12,
    fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase',
    cursor: 'pointer',
  },
  grid: {
    background: C.paper, borderRadius: 16,
    border: `1px solid ${C.line}`,
    overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },
  gridHead: {
    display: 'flex', borderBottom: `1px solid ${C.line}`,
    padding: '14px 0',
  },
  gridBody: { flex: 1, display: 'flex', overflow: 'hidden' },
  hours: { width: 56, paddingTop: 0, flexShrink: 0, borderRight: `1px solid ${C.line}` },
  dayCol: {
    flex: 1, position: 'relative',
    borderRight: `1px solid ${C.line}`,
  },
  hourCell: {
    height: 60,
    borderBottom: `1px solid ${C.line}`,
  },
  side: { display: 'flex', flexDirection: 'column', gap: 14 },
  sideCard: {
    background: C.paper, borderRadius: 14, padding: 18,
    border: `1px solid ${C.line}`,
  },
  backlog: {
    display: 'flex', gap: 10, alignItems: 'center',
    padding: '10px 0',
    borderTop: `1px solid ${C.line}`,
  },
  brunoSide: {
    background: C.brunoDeep, color: C.paper,
    borderRadius: 14, padding: 18,
  },
  brunoSideBtn: {
    marginTop: 14, width: '100%',
    background: C.honey, color: C.ink, border: 'none',
    padding: '10px 12px', borderRadius: 8,
    fontSize: 12, fontFamily: SANS, fontWeight: 500,
    cursor: 'pointer',
  },
};

// ============= 5) SETTINGS =============
function SettingsScreen() {
  const sections = [
    { id: 'profile', label: 'Profile' },
    { id: 'sources', label: 'Sources & Integrations', count: '3 / 7' },
    { id: 'bruno', label: 'Bruno preferences' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'membership', label: 'Membership', badge: 'Trial · 11d' },
    { id: 'data', label: 'Data & privacy' },
    { id: 'danger', label: 'Danger zone', danger: true },
  ];
  const active = 'sources';

  return (
    <div style={pageStyles.shell} data-screen-label="Settings">
      <Sidebar active="settings" />
      <main style={pageStyles.main}>
        <div style={{ ...pageStyles.contentInner, padding: '36px 48px' }}>
          <PageHeader
            eyebrow="SETTINGS · WORKSPACE"
            title={<>Make Planevo <em style={{ color: C.honeyDeep }}>yours.</em></>}
            sub="Tune what Bruno knows about your week, your tools, and how loud he should be."
            right={
              <div style={st.search}>
                <span style={{ color: C.inkSoft, fontSize: 13 }}>⌕</span>
                <input placeholder="Search settings…" style={st.searchInput} />
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.inkSoft, letterSpacing: '0.1em', border: `1px solid ${C.line}`, padding: '2px 6px', borderRadius: 4 }}>⌘ K</span>
              </div>
            }
          />

          <div style={st.body}>
            {/* Sub-nav column */}
            <aside style={st.subnav}>
              <div style={st.workspaceCard}>
                <div style={st.workspaceAv}>AT</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 18, letterSpacing: '-0.01em' }}>Anthony Tarek</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: C.inkSoft, letterSpacing: '0.06em', marginTop: 2 }}>anthony@nyu.edu · .EDU VERIFIED</div>
                </div>
              </div>

              <div style={st.subnavList}>
                {sections.map((s) => {
                  const isActive = s.id === active;
                  return (
                    <a key={s.id} style={{
                      ...st.subnavItem,
                      ...(isActive ? st.subnavItemActive : {}),
                      ...(s.danger ? { color: C.rose } : {}),
                    }}>
                      <span>{s.label}</span>
                      {s.count && <span style={st.subnavCount}>{s.count}</span>}
                      {s.badge && <span style={st.subnavBadge}>{s.badge}</span>}
                      {isActive && <span style={st.subnavMarker} />}
                    </a>
                  );
                })}
              </div>

              <div style={st.brunoFooter}>
                <BrunoMark size={24} />
                <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(251,246,234,0.7)', lineHeight: 1.5 }}>
                  Tip — connect Notion and I'll add your project deadlines too.
                </div>
              </div>
            </aside>

            {/* Content panel */}
            <div style={st.content}>
              <SectionHead
                title="Sources & Integrations"
                sub="The more sources you connect, the smarter Bruno's plan. We only read deadlines and events — never your private content."
              />

              {/* Connected academic */}
              <SettingsBlock
                eyebrow="ACADEMIC SOURCES"
                title={<>Your <em style={{ color: C.honeyDeep }}>school</em> stuff.</>}
                sub="Sync courses, deadlines, and class schedules."
              >
                <div style={st.intGrid}>
                  <IntegrationCard
                    icon="C"
                    color={C.rose}
                    name="Canvas LMS"
                    desc="Pulls assignments, quizzes, and due dates from your enrolled courses."
                    status="connected"
                    meta="8 courses · synced 2m ago"
                  />
                  <IntegrationCard
                    icon="G"
                    color={C.blue}
                    name="Google Calendar"
                    desc="Imports your classes, meetings, and personal events."
                    status="connected"
                    meta="anthony@nyu.edu · synced 2m ago"
                  />
                  <IntegrationCard
                    icon="B"
                    color={C.brunoDeep}
                    name="Blackboard"
                    desc="Alternative LMS sync for Bb schools."
                    status="available"
                  />
                </div>
              </SettingsBlock>

              {/* Productivity */}
              <SettingsBlock
                eyebrow="PRODUCTIVITY · PREMIUM"
                title={<>For when <em style={{ color: C.honeyDeep }}>work</em> creeps in.</>}
                sub="Bring in side-projects, internships, and team work. Available with the Builder plan."
              >
                <div style={st.intGrid}>
                  <IntegrationCard icon="N" color="#000" name="Notion" desc="Pull database deadlines and project pages." status="soon" />
                  <IntegrationCard icon="#" color="#4A154B" name="Slack" desc="Channel mentions and saved messages become tasks." status="soon" />
                  <IntegrationCard icon="L" color="#5e6ad2" name="Linear" desc="Bring in issues assigned to you." status="soon" />
                </div>
              </SettingsBlock>

              {/* Daily refresh row */}
              <SettingsBlock
                eyebrow="DAILY REFRESH"
                title={<>When should Bruno <em style={{ color: C.honeyDeep }}>build</em> your plan?</>}
                sub="Bruno re-reads all sources at this time each morning. You'll get a push notification when the new plan is ready."
              >
                <Row
                  label="Plan generation time"
                  desc="Bruno will read sources and write tomorrow's plan at this hour."
                  control={
                    <div style={st.timeRow}>
                      <button style={st.timeChip}>7:00 AM</button>
                      <button style={{ ...st.timeChip, ...st.timeChipActive }}>7:30 AM</button>
                      <button style={st.timeChip}>8:00 AM</button>
                      <button style={st.timeChip}>Custom</button>
                    </div>
                  }
                />
                <Row
                  label="Auto-rollover"
                  desc="When tasks slip, Bruno automatically reshuffles tomorrow — no shame, no red badges."
                  control={<Toggle on />}
                />
                <Row
                  label="Weekly review email"
                  desc="Quiet Sunday recap — what you finished, what you moved, what's coming."
                  control={<Toggle on />}
                  last
                />
              </SettingsBlock>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionHead({ title, sub }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{
        fontFamily: SERIF, fontSize: 36, letterSpacing: '-0.025em',
        margin: 0, fontWeight: 400, lineHeight: 1,
      }}>{title}</h2>
      <p style={{ fontSize: 14, color: C.inkSoft, margin: '10px 0 0', maxWidth: 620, lineHeight: 1.55 }}>{sub}</p>
    </div>
  );
}

function SettingsBlock({ eyebrow, title, sub, children }) {
  return (
    <section style={st.block}>
      <div style={st.blockHead}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', color: C.brunoDeep, marginBottom: 8 }}>{eyebrow}</div>
        <h3 style={{ fontFamily: SERIF, fontSize: 24, letterSpacing: '-0.015em', margin: 0, fontWeight: 400 }}>{title}</h3>
        {sub && <p style={{ fontSize: 13, color: C.inkSoft, margin: '8px 0 0', maxWidth: 560, lineHeight: 1.5 }}>{sub}</p>}
      </div>
      <div style={st.blockBody}>{children}</div>
    </section>
  );
}

function Row({ label, desc, control, last }) {
  return (
    <div style={{ ...st.row, ...(last ? { borderBottom: 'none' } : {}) }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 4, lineHeight: 1.5 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  );
}

function Toggle({ on }) {
  return (
    <div style={{
      width: 38, height: 22, borderRadius: 11,
      background: on ? C.sage : C.line,
      position: 'relative', cursor: 'pointer',
      transition: 'background .2s',
    }}>
      <div style={{
        position: 'absolute',
        top: 2, left: on ? 18 : 2,
        width: 18, height: 18, borderRadius: 9,
        background: C.paper,
        transition: 'left .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );
}

function IntegrationCard({ icon, color, name, desc, status, meta }) {
  const statusMap = {
    connected: { label: 'CONNECTED', bg: C.sageSoft, fg: C.sage },
    available: { label: 'AVAILABLE', bg: C.cream2, fg: C.inkSoft },
    soon: { label: 'COMING SOON', bg: C.cream2, fg: C.inkSoft },
  };
  const s = statusMap[status] || statusMap.available;
  const dim = status === 'soon';

  return (
    <div style={{
      ...st.intCard,
      opacity: dim ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ ...st.intIco, background: color }}>{icon}</div>
        <span style={{ ...st.intStatus, background: s.bg, color: s.fg }}>{s.label}</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{name}</div>
      <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 14, minHeight: 36 }}>{desc}</div>
      {meta && (
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.inkSoft, letterSpacing: '0.06em', marginBottom: 12 }}>{meta}</div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        {status === 'connected' ? (
          <>
            <button style={st.intBtnGhost}>Manage</button>
            <button style={st.intBtnDanger}>Disconnect</button>
          </>
        ) : status === 'available' ? (
          <button style={st.intBtnPrimary}>Connect →</button>
        ) : (
          <button style={st.intBtnGhost}>Notify me</button>
        )}
      </div>
    </div>
  );
}

const st = {
  search: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: C.paper, border: `1px solid ${C.line}`,
    borderRadius: 999, padding: '8px 14px 8px 16px',
    minWidth: 280,
  },
  searchInput: {
    border: 'none', background: 'transparent', outline: 'none',
    flex: 1, fontFamily: SANS, fontSize: 13, color: C.ink,
  },
  body: {
    display: 'grid',
    gridTemplateColumns: '260px 1fr',
    gap: 24,
  },
  subnav: {
    background: C.paper, borderRadius: 16,
    border: `1px solid ${C.line}`,
    padding: 14, height: 'fit-content',
    position: 'sticky', top: 24,
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  workspaceCard: {
    display: 'flex', gap: 12, padding: '10px 8px 14px',
    borderBottom: `1px solid ${C.line}`,
    alignItems: 'center',
  },
  workspaceAv: {
    width: 40, height: 40, borderRadius: 10,
    background: C.honey, color: C.ink,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: MONO, fontSize: 13, fontWeight: 600, flexShrink: 0,
  },
  subnavList: { display: 'flex', flexDirection: 'column', gap: 2 },
  subnavItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', borderRadius: 8,
    fontSize: 13, fontWeight: 500,
    color: C.ink, cursor: 'pointer',
    position: 'relative',
  },
  subnavItemActive: {
    background: C.cream, color: C.honeyDeep,
  },
  subnavMarker: {
    position: 'absolute', left: 0, top: '50%',
    transform: 'translateY(-50%)',
    width: 3, height: 16, background: C.honey, borderRadius: 2,
  },
  subnavCount: {
    marginLeft: 'auto', fontFamily: MONO, fontSize: 10,
    color: C.inkSoft, letterSpacing: '0.06em',
  },
  subnavBadge: {
    marginLeft: 'auto', fontFamily: MONO, fontSize: 9,
    background: C.honeySoft, color: C.honeyDeep,
    padding: '3px 7px', borderRadius: 4,
    letterSpacing: '0.06em', textTransform: 'uppercase',
  },
  brunoFooter: {
    background: C.brunoDeep, color: C.paper,
    borderRadius: 12, padding: 14,
    marginTop: 4,
  },
  content: {
    display: 'flex', flexDirection: 'column', gap: 24,
  },
  block: {
    background: C.paper, borderRadius: 18,
    border: `1px solid ${C.line}`,
    overflow: 'hidden',
  },
  blockHead: {
    padding: '22px 26px 20px',
    borderBottom: `1px solid ${C.line}`,
  },
  blockBody: { padding: '4px 26px 20px' },
  row: {
    display: 'flex', alignItems: 'center', gap: 24,
    padding: '18px 0',
    borderBottom: `1px solid ${C.line}`,
  },
  intGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    padding: '18px 0 8px',
  },
  intCard: {
    background: C.cream, borderRadius: 14,
    border: `1px solid ${C.line}`,
    padding: 18,
  },
  intIco: {
    width: 36, height: 36, borderRadius: 9,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: C.paper, fontFamily: MONO, fontSize: 16, fontWeight: 600,
  },
  intStatus: {
    fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em',
    padding: '4px 8px', borderRadius: 4, fontWeight: 600,
  },
  intBtnPrimary: {
    background: C.ink, color: C.paper, border: 'none',
    padding: '8px 14px', borderRadius: 8,
    fontSize: 12, fontFamily: SANS, fontWeight: 500,
    cursor: 'pointer',
  },
  intBtnGhost: {
    background: 'transparent', color: C.ink,
    border: `1px solid ${C.lineStrong}`,
    padding: '8px 14px', borderRadius: 8,
    fontSize: 12, fontFamily: SANS, fontWeight: 500,
    cursor: 'pointer',
  },
  intBtnDanger: {
    background: 'transparent', color: C.rose,
    border: 'none',
    padding: '8px 4px', borderRadius: 8,
    fontSize: 12, fontFamily: SANS, fontWeight: 500,
    cursor: 'pointer',
  },
  timeRow: { display: 'flex', gap: 6 },
  timeChip: {
    background: 'transparent', color: C.ink,
    border: `1px solid ${C.line}`,
    padding: '8px 14px', borderRadius: 999,
    fontSize: 12, fontFamily: MONO, letterSpacing: '0.04em',
    cursor: 'pointer',
  },
  timeChipActive: {
    background: C.ink, color: C.paper, border: 'none',
  },
};

// Expose
Object.assign(window, {
  DashboardScreen, DailyPlanScreen, TasksScreen, CalendarScreen, SettingsScreen,
});
