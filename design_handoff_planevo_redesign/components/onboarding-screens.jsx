/* global React */
// Planevo Onboarding — 8 screens with LIVE BRUNO reactions.
// Bruno idles, blinks, reacts to taps, types speech bubbles. CSS-only motion.

const { useState, useEffect, useRef } = React;

const OC = {
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
  line: 'rgba(26,20,13,0.10)',
  lineStrong: 'rgba(26,20,13,0.18)',
};

const OSERIF = "'Instrument Serif', 'Times New Roman', serif";
const OSANS = "'Geist', system-ui, sans-serif";
const OMONO = "'Geist Mono', ui-monospace, monospace";

// ============= INJECT ANIMATION CSS ONCE =============
if (typeof document !== 'undefined' && !document.getElementById('bruno-anim')) {
  const s = document.createElement('style');
  s.id = 'bruno-anim';
  s.textContent = `
    @keyframes bruno-idle {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50%      { transform: translateY(-4px) rotate(-0.6deg); }
    }
    @keyframes bruno-blink {
      0%, 92%, 100% { transform: scaleY(1); }
      94%, 98%      { transform: scaleY(0.08); }
    }
    @keyframes bruno-bounce-react {
      0%   { transform: translateY(0) scale(1); }
      20%  { transform: translateY(-18px) scale(1.06); }
      45%  { transform: translateY(0) scale(0.98); }
      65%  { transform: translateY(-7px) scale(1.02); }
      100% { transform: translateY(0) scale(1); }
    }
    @keyframes bruno-tilt {
      0%, 100% { transform: rotate(0); }
      50%      { transform: rotate(-7deg); }
    }
    @keyframes bruno-wave {
      0%, 100% { transform: rotate(-8deg); }
      50%      { transform: rotate(20deg); }
    }
    @keyframes bruno-peek {
      0%   { transform: translateX(60px) translateY(40px) scale(0.5); opacity: 0; }
      60%  { transform: translateX(-6px) translateY(0) scale(1.02); opacity: 1; }
      100% { transform: translateX(0) translateY(0) scale(1); opacity: 1; }
    }
    @keyframes bruno-pop {
      0%   { transform: scale(0) rotate(-12deg); opacity: 0; }
      60%  { transform: scale(1.1) rotate(3deg); opacity: 1; }
      100% { transform: scale(1) rotate(0); opacity: 1; }
    }
    @keyframes bubble-in {
      0%   { transform: translateY(8px) scale(0.92); opacity: 0; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    @keyframes blink-cursor {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }
    .bruno-host {
      display: inline-flex;
      animation: bruno-idle 3.4s ease-in-out infinite;
      transform-origin: center bottom;
      will-change: transform;
    }
    .bruno-host.react {
      animation: bruno-bounce-react 0.7s cubic-bezier(.34,1.56,.64,1);
    }
    .bruno-host.tilt {
      animation: bruno-tilt 1.6s ease-in-out infinite;
    }
    .bruno-host.peek {
      animation: bruno-peek 0.6s cubic-bezier(.34,1.56,.64,1);
    }
    .bruno-host.pop {
      animation: bruno-pop 0.6s cubic-bezier(.34,1.56,.64,1);
    }
    .bruno-eye {
      transform-origin: center;
      animation: bruno-blink 5s infinite;
    }
    .bruno-eye.right { animation-delay: 0.05s; }
    .bruno-arm-wave {
      transform-origin: 40px 130px;
      animation: bruno-wave 1.1s ease-in-out infinite;
    }
    .bubble-in {
      animation: bubble-in 0.35s cubic-bezier(.34,1.56,.64,1);
    }
    .typing-cursor {
      display: inline-block;
      width: 2px;
      height: 1em;
      background: currentColor;
      vertical-align: -2px;
      margin-left: 2px;
      animation: blink-cursor 0.8s steps(1) infinite;
    }
  `;
  document.head.appendChild(s);
}

// ============= Bruno character (animated) =============
function Bruno({ size = 110, mood = 'normal', wave = false, react = 0, className = '' }) {
  const hostRef = useRef(null);
  const [reactKey, setReactKey] = useState(0);

  // Trigger reaction animation each time `react` changes
  useEffect(() => {
    if (react === 0) return;
    setReactKey((k) => k + 1);
  }, [react]);

  return (
    <div
      ref={hostRef}
      key={reactKey}
      className={`bruno-host ${className} ${react ? 'react' : ''}`}
      style={{ width: size, height: size * 1.1 }}
    >
      <svg viewBox="0 0 200 220" width={size} height={size * 1.1}>
        {/* shadow */}
        <ellipse cx="100" cy="210" rx="55" ry="5" fill="rgba(0,0,0,0.10)"/>

        {/* ears */}
        <circle cx="48" cy="42" r="22" fill={OC.brunoDeep}/>
        <circle cx="152" cy="42" r="22" fill={OC.brunoDeep}/>
        <circle cx="48" cy="44" r="10" fill={OC.brunoLight}/>
        <circle cx="152" cy="44" r="10" fill={OC.brunoLight}/>

        {/* body */}
        <ellipse cx="100" cy="160" rx="68" ry="58" fill={OC.bruno}/>
        <ellipse cx="100" cy="170" rx="42" ry="40" fill={OC.belly}/>

        {/* head */}
        <circle cx="100" cy="80" r="56" fill={OC.bruno}/>

        {/* muzzle */}
        <ellipse cx="100" cy="92" rx="30" ry="22" fill={OC.belly}/>

        {/* eyes — mood dependent */}
        {mood === 'sleepy' ? (
          <>
            <path d="M 72 72 Q 80 76 88 72" stroke={OC.ink} strokeWidth="2.6" fill="none" strokeLinecap="round"/>
            <path d="M 112 72 Q 120 76 128 72" stroke={OC.ink} strokeWidth="2.6" fill="none" strokeLinecap="round"/>
          </>
        ) : mood === 'thinking' ? (
          <>
            <circle className="bruno-eye" cx="80" cy="70" r="4.5" fill={OC.ink}/>
            <circle className="bruno-eye right" cx="124" cy="68" r="4.5" fill={OC.ink}/>
            <circle cx="81.5" cy="68.5" r="1.5" fill={OC.paper}/>
            <circle cx="125.5" cy="66.5" r="1.5" fill={OC.paper}/>
          </>
        ) : mood === 'happy' ? (
          <>
            <path d="M 74 72 Q 80 66 86 72" stroke={OC.ink} strokeWidth="3" fill="none" strokeLinecap="round"/>
            <path d="M 114 72 Q 120 66 126 72" stroke={OC.ink} strokeWidth="3" fill="none" strokeLinecap="round"/>
          </>
        ) : mood === 'curious' ? (
          <>
            <circle className="bruno-eye" cx="80" cy="74" r="5.5" fill={OC.ink}/>
            <circle className="bruno-eye right" cx="120" cy="74" r="5.5" fill={OC.ink}/>
            <circle cx="82" cy="72" r="1.8" fill={OC.paper}/>
            <circle cx="122" cy="72" r="1.8" fill={OC.paper}/>
          </>
        ) : (
          <>
            <circle className="bruno-eye" cx="80" cy="72" r="4.5" fill={OC.ink}/>
            <circle className="bruno-eye right" cx="120" cy="72" r="4.5" fill={OC.ink}/>
            <circle cx="81.5" cy="70.5" r="1.5" fill={OC.paper}/>
            <circle cx="121.5" cy="70.5" r="1.5" fill={OC.paper}/>
          </>
        )}

        {/* nose */}
        <ellipse cx="100" cy="86" rx="5" ry="3.5" fill={OC.ink}/>

        {/* mouth — mood dependent */}
        {mood === 'happy' || mood === 'celebrating' ? (
          <path d="M 84 98 Q 100 114 116 98" stroke={OC.ink} strokeWidth="2.8" fill={OC.brunoDeep} strokeLinejoin="round"/>
        ) : mood === 'thinking' ? (
          <path d="M 92 102 Q 100 100 108 102" stroke={OC.ink} strokeWidth="2.4" fill="none" strokeLinecap="round"/>
        ) : mood === 'curious' ? (
          <circle cx="100" cy="102" r="3" fill={OC.ink}/>
        ) : (
          <path d="M 90 100 Q 100 106 110 100" stroke={OC.ink} strokeWidth="2.4" fill="none" strokeLinecap="round"/>
        )}

        {/* cheek blushes for celebrating */}
        {mood === 'celebrating' && (
          <>
            <ellipse cx="70" cy="92" rx="6" ry="3" fill={OC.rose} opacity="0.4"/>
            <ellipse cx="130" cy="92" rx="6" ry="3" fill={OC.rose} opacity="0.4"/>
          </>
        )}

        {/* wave paw */}
        {wave && (
          <g className="bruno-arm-wave">
            <ellipse cx="42" cy="130" rx="14" ry="16" fill={OC.bruno} transform="rotate(-20 42 130)"/>
            <circle cx="38" cy="118" r="5" fill={OC.belly}/>
          </g>
        )}

        {/* thinking spark */}
        {mood === 'thinking' && (
          <g>
            <circle cx="148" cy="40" r="3" fill={OC.honey} opacity="0.8"/>
            <circle cx="160" cy="28" r="2" fill={OC.honey} opacity="0.6"/>
          </g>
        )}
      </svg>
    </div>
  );
}

// ============= Bruno spot frame (card around character) =============
function BrunoSpot({ size = 110, mood = 'normal', wave, react, key: kk }) {
  return (
    <div style={{
      width: size + 56, height: size * 1.1 + 40,
      background: OC.paper,
      border: `1px solid ${OC.line}`,
      borderRadius: 24,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      <Bruno size={size} mood={mood} wave={wave} react={react} />
    </div>
  );
}

// ============= Speech bubble (animates in / typewriter) =============
function BrunoBubble({ text, align = 'left', tone = 'cream' }) {
  const [shown, setShown] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setShown('');
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, 22);
    return () => clearInterval(id);
  }, [text]);

  const styles = tone === 'dark' ? {
    bg: OC.brunoDeep, fg: OC.paper, sub: OC.honey, border: 'transparent',
  } : {
    bg: OC.paper, fg: OC.ink, sub: OC.brunoDeep, border: OC.honey,
  };

  return (
    <div
      key={text}
      className="bubble-in"
      style={{
        background: styles.bg,
        color: styles.fg,
        borderLeft: tone === 'cream' ? `3px solid ${styles.border}` : 'none',
        border: tone === 'cream' ? `1px solid ${OC.line}` : 'none',
        borderLeftWidth: tone === 'cream' ? 3 : 0,
        borderLeftColor: tone === 'cream' ? styles.border : 'transparent',
        borderLeftStyle: tone === 'cream' ? 'solid' : 'none',
        borderRadius: 14,
        padding: '14px 18px',
        fontFamily: OSERIF,
        fontStyle: 'italic',
        fontSize: 17,
        lineHeight: 1.4,
        minHeight: 48,
      }}
    >
      {shown}
      {!done && <span className="typing-cursor" />}
      {done && (
        <div style={{
          marginTop: 6, fontFamily: OMONO, fontSize: 10,
          color: styles.sub, letterSpacing: '0.1em',
          fontStyle: 'normal',
        }}>— BRUNO</div>
      )}
    </div>
  );
}

// ============= Onboard chrome =============
function OnboardChrome({ step, total = 8 }) {
  return (
    <div style={chrome.root}>
      <div style={chrome.topRow}>
        <button style={chrome.backBtn}>
          <span style={{ fontSize: 16 }}>←</span> Back
        </button>
        <div style={chrome.stepText}>
          <span style={{ fontFamily: OMONO, fontSize: 11, letterSpacing: '0.16em', color: OC.inkSoft }}>
            STEP {String(step).padStart(2, '0')} <span style={{ opacity: 0.5 }}>/ {String(total).padStart(2, '0')}</span>
          </span>
        </div>
      </div>
      <div style={chrome.progressTrack}>
        <div style={{ ...chrome.progressFill, width: `${(step / total) * 100}%` }} />
      </div>
    </div>
  );
}

const chrome = {
  root: { padding: '24px 32px 0', position: 'relative', zIndex: 2 },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  backBtn: {
    background: 'transparent', border: 'none',
    fontFamily: OSANS, fontSize: 14, color: OC.inkSoft,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 10px 6px 0',
  },
  stepText: { textAlign: 'right' },
  progressTrack: {
    height: 4, background: 'rgba(26,20,13,0.08)',
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', background: OC.honey,
    borderRadius: 2,
    transition: 'width .6s ease',
  },
};

// ============= Title block =============
function TitleBlock({ eyebrow, title, sub, align = 'center' }) {
  return (
    <div style={{ textAlign: align, maxWidth: 600, margin: align === 'center' ? '0 auto 24px' : '0 0 24px' }}>
      {eyebrow && (
        <div style={{
          fontFamily: OMONO, fontSize: 11, letterSpacing: '0.18em',
          color: OC.brunoDeep, marginBottom: 14,
          textTransform: 'uppercase',
        }}>{eyebrow}</div>
      )}
      <h1 style={{
        fontFamily: OSERIF, fontSize: 46, lineHeight: 1.04,
        letterSpacing: '-0.02em', margin: 0, fontWeight: 400,
        color: OC.ink, textWrap: 'balance',
      }}>{title}</h1>
      {sub && (
        <p style={{
          fontFamily: OSANS, fontSize: 16,
          color: OC.inkSoft, lineHeight: 1.55,
          margin: '18px 0 0',
          textWrap: 'pretty',
        }}>{sub}</p>
      )}
    </div>
  );
}

// ============= CTA Bar =============
function CTABar({ primaryLabel = 'Continue', helper, onPress }) {
  return (
    <div style={cta.root}>
      <button style={cta.primary} onClick={onPress}>
        {primaryLabel} <span style={{ marginLeft: 6 }}>→</span>
      </button>
      {helper && <div style={cta.helper}>{helper}</div>}
    </div>
  );
}

const cta = {
  root: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 14, marginTop: 'auto',
    paddingTop: 24,
  },
  primary: {
    background: OC.honey, color: OC.ink, border: 'none',
    padding: '16px 32px', borderRadius: 999,
    fontFamily: OSANS, fontSize: 15, fontWeight: 500,
    cursor: 'pointer', minWidth: 280,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: `0 1px 0 ${OC.honeyDeep}`,
    transition: 'transform .15s ease, box-shadow .15s',
  },
  helper: {
    fontFamily: OMONO, fontSize: 11, color: OC.inkSoft,
    letterSpacing: '0.1em', textTransform: 'uppercase',
  },
};

// ============= Screen frame =============
function ScreenFrame({ step, total, children, label }) {
  return (
    <div style={screen.root} data-screen-label={label}>
      <OnboardChrome step={step} total={total} />
      <div style={screen.content}>{children}</div>
      <div style={screen.brandFoot}>
        <span style={{ fontFamily: OMONO, fontSize: 10, color: OC.inkFaint, letterSpacing: '0.16em' }}>
          🔒 SECURE · PLANEVO
        </span>
      </div>
    </div>
  );
}

const screen = {
  root: {
    width: 720, height: 960,
    background: OC.cream,
    display: 'flex', flexDirection: 'column',
    fontFamily: OSANS, color: OC.ink,
    position: 'relative', overflow: 'hidden',
  },
  content: {
    flex: 1, padding: '24px 48px 20px',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  brandFoot: { padding: '14px 32px 20px', display: 'flex', justifyContent: 'center' },
};

// ============= 01 · WELCOME (Bruno waves continuously) =============
function Onboard01() {
  return (
    <ScreenFrame step={1} total={8} label="01 Welcome">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{
          background: OC.paper, border: `1px solid ${OC.line}`,
          borderRadius: 28, padding: '24px 32px',
          marginBottom: 24,
        }}>
          <Bruno size={140} mood="happy" wave />
        </div>
        <TitleBlock
          eyebrow="WELCOME"
          title={<>Hi, I'm <em style={{ color: OC.honeyDeep }}>Bruno.</em><br/>Want me to plan your week?</>}
          sub="60 seconds of setup. Then I read your school, your calendar, and your to-dos — and quietly build your day every morning."
        />
      </div>
      <div style={ob01.signupCard}>
        <div style={{ fontFamily: OMONO, fontSize: 10, letterSpacing: '0.18em', color: OC.inkSoft, marginBottom: 14 }}>START FREE · 14 DAYS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button style={ob01.googleBtn}>
            <span style={ob01.gIcon}>G</span> Continue with Google
          </button>
          <button style={ob01.emailBtn}>Continue with email</button>
        </div>
        <div style={{ fontSize: 11, color: OC.inkSoft, marginTop: 14, textAlign: 'center', lineHeight: 1.5 }}>
          By continuing you agree to our <u>Terms</u> and <u>Privacy</u>.
        </div>
      </div>
    </ScreenFrame>
  );
}
const ob01 = {
  signupCard: {
    background: OC.paper, borderRadius: 20,
    border: `1px solid ${OC.line}`, padding: 22,
  },
  googleBtn: {
    background: OC.ink, color: OC.paper, border: 'none',
    padding: '14px 18px', borderRadius: 999,
    fontFamily: OSANS, fontSize: 14, fontWeight: 500,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  gIcon: {
    width: 22, height: 22, borderRadius: '50%',
    background: OC.paper, color: OC.ink,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 13, fontFamily: OMONO,
  },
  emailBtn: {
    background: 'transparent', color: OC.ink,
    border: `1px solid ${OC.lineStrong}`,
    padding: '14px 18px', borderRadius: 999,
    fontFamily: OSANS, fontSize: 14, fontWeight: 500,
    cursor: 'pointer',
  },
};

// ============= 02 · IDENTITY (Bruno reacts on each select) =============
function Onboard02() {
  const [picked, setPicked] = useState({ 0: true, 2: true });
  const [reactBump, setReactBump] = useState(0);
  const opts = [
    "I plan the perfect week, then real life happens by Tuesday.",
    "I keep moving deadlines and feel a little worse each time.",
    "I open my planner, see red badges, and close it again.",
    "I waste real time deciding what to work on first.",
    "I'm great at the work — I'm bad at the logistics.",
  ];
  const count = Object.values(picked).filter(Boolean).length;

  const toggle = (i) => {
    setPicked((p) => ({ ...p, [i]: !p[i] }));
    setReactBump((r) => r + 1);
  };

  return (
    <ScreenFrame step={2} total={8} label="02 Identity">
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
        <Bruno size={72} mood="curious" react={reactBump} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: OMONO, fontSize: 11, letterSpacing: '0.18em', color: OC.brunoDeep, marginBottom: 8 }}>
            HONESTLY · NO WRONG ANSWERS
          </div>
          <h1 style={{
            fontFamily: OSERIF, fontSize: 38, lineHeight: 1.05,
            letterSpacing: '-0.02em', margin: 0, fontWeight: 400,
          }}>
            Which of these sound <em style={{ color: OC.honeyDeep }}>familiar?</em>
          </h1>
        </div>
      </div>
      <p style={{ fontSize: 15, color: OC.inkSoft, margin: '0 0 16px', lineHeight: 1.55 }}>
        Pick all that apply — I use these to figure out what's actually getting in your way.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {opts.map((o, i) => {
          const on = !!picked[i];
          return (
            <label key={i} onClick={() => toggle(i)} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px', background: OC.paper,
              border: on ? `2px solid ${OC.honey}` : `1px solid ${OC.line}`,
              borderRadius: 14, cursor: 'pointer',
              transition: 'border-color .15s, transform .12s',
              transform: on ? 'translateX(2px)' : 'translateX(0)',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: on ? OC.honey : 'transparent',
                border: on ? 'none' : `1.5px solid ${OC.lineStrong}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'background .15s',
              }}>
                {on && <span style={{ color: OC.ink, fontSize: 13, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ fontSize: 15, lineHeight: 1.4 }}>{o}</span>
            </label>
          );
        })}
      </div>

      <div style={{ marginTop: 14 }}>
        <BrunoBubble
          tone="dark"
          text={count === 0
            ? "Tap whichever ones ring true — no judgement."
            : count >= 3
              ? "Oof — you're not lazy, that's a system problem. I can fix that."
              : "Got it. You're not alone, by the way."}
        />
      </div>
      <CTABar primaryLabel="That's me · continue" helper={`${count} SELECTED`} />
    </ScreenFrame>
  );
}

// ============= 03 · NAME (Bruno tilts while typing) =============
function Onboard03() {
  const [name, setName] = useState('Anthony');
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef(null);

  const onChange = (v) => {
    setName(v);
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 700);
  };

  return (
    <ScreenFrame step={3} total={8} label="03 Name">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <Bruno size={120} mood={typing ? 'thinking' : 'happy'} className={typing ? 'tilt' : ''} />
        <div style={{ marginTop: 24 }}>
          <TitleBlock
            eyebrow="GOOD · YOU'RE EXACTLY WHO I'M FOR"
            title={<>What should I <em style={{ color: OC.honeyDeep }}>call</em> you?</>}
            sub="I'll use this when I check in. No formal titles — just whatever your friends call you."
          />
        </div>
        <div style={{ width: '100%', maxWidth: 500, marginTop: 8 }}>
          <input
            value={name}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your name…"
            style={ob03.input}
          />
          <div style={{ marginTop: 14 }}>
            <BrunoBubble
              text={name.trim() ? `Hey ${name.trim()} — nice to meet you. I'll keep things light unless you tell me otherwise.` : "Whenever you're ready."}
            />
          </div>
        </div>
      </div>
      <CTABar primaryLabel="Continue · 5 more steps" />
    </ScreenFrame>
  );
}

const ob03 = {
  input: {
    width: '100%',
    background: OC.paper,
    border: `2px solid ${OC.honey}`,
    borderRadius: 14,
    padding: '16px 20px',
    fontFamily: OSERIF, fontSize: 26,
    color: OC.ink, outline: 'none',
    letterSpacing: '-0.01em',
    boxSizing: 'border-box',
  },
};

// ============= 04 · ENERGY (Bruno changes mood per selection) =============
function Onboard04() {
  const [pick, setPick] = useState('morning');
  const [bump, setBump] = useState(0);
  const opts = [
    { id: 'morning',   label: 'Morning',           desc: 'I think clearest before 11 AM',           hours: '6 — 11',   ico: '☀️', mood: 'happy' },
    { id: 'afternoon', label: 'Afternoon',         desc: 'I hit my stride after lunch',             hours: '12 — 5',   ico: '🥪', mood: 'normal' },
    { id: 'night',     label: 'Night',             desc: 'My brain wakes up after 9 PM',            hours: '9 — 1',    ico: '🌙', mood: 'sleepy' },
    { id: 'chaos',     label: 'Honestly, it varies', desc: 'It changes day to day — Bruno adapts', hours: 'all day',  ico: '🎲', mood: 'curious' },
  ];
  const currentMood = opts.find(o => o.id === pick)?.mood || 'normal';

  const select = (id) => {
    setPick(id);
    setBump((b) => b + 1);
  };

  return (
    <ScreenFrame step={4} total={8} label="04 Energy">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 18 }}>
        <Bruno size={80} mood={currentMood} react={bump} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: OMONO, fontSize: 11, letterSpacing: '0.18em', color: OC.brunoDeep, marginBottom: 8 }}>
            QUICK ONE
          </div>
          <h1 style={{
            fontFamily: OSERIF, fontSize: 38, lineHeight: 1.05,
            letterSpacing: '-0.02em', margin: 0, fontWeight: 400,
          }}>
            When does your brain <em style={{ color: OC.honeyDeep }}>actually</em> work?
          </h1>
          <p style={{ fontSize: 14, color: OC.inkSoft, margin: '10px 0 0', lineHeight: 1.5 }}>
            Not when you wish it did — when it really does. I'll put hard work in those windows.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
        {opts.map((o) => {
          const on = pick === o.id;
          return (
            <div key={o.id} onClick={() => select(o.id)} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '16px 20px', background: OC.paper,
              border: on ? `2px solid ${OC.honey}` : `1px solid ${OC.line}`,
              borderRadius: 14, cursor: 'pointer',
              transition: 'border-color .15s, transform .12s',
              transform: on ? 'scale(1.01)' : 'scale(1)',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: on ? OC.honeySoft : OC.cream,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>{o.ico}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: OSERIF, fontSize: 22, letterSpacing: '-0.01em' }}>{o.label}</div>
                <div style={{ fontSize: 12, color: OC.inkSoft, marginTop: 2 }}>{o.desc}</div>
              </div>
              <div style={{ fontFamily: OMONO, fontSize: 11, color: on ? OC.honeyDeep : OC.inkSoft, letterSpacing: '0.08em' }}>
                {o.hours}
              </div>
            </div>
          );
        })}
      </div>
      <CTABar primaryLabel="Continue" helper="Bruno picks the rest" />
    </ScreenFrame>
  );
}

// ============= 05 · CONNECT CANVAS (Bruno peeks in confident) =============
function Onboard05() {
  return (
    <ScreenFrame step={5} total={8} label="05 Canvas">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 18 }}>
        <Bruno size={80} mood="curious" className="peek" />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: OMONO, fontSize: 11, letterSpacing: '0.18em', color: OC.brunoDeep, marginBottom: 8 }}>
            THE WOW MOMENT · 30 SECONDS
          </div>
          <h1 style={{
            fontFamily: OSERIF, fontSize: 38, lineHeight: 1.05,
            letterSpacing: '-0.02em', margin: 0, fontWeight: 400,
          }}>
            Let me read your <em style={{ color: OC.honeyDeep }}>Canvas.</em>
          </h1>
          <p style={{ fontSize: 14, color: OC.inkSoft, margin: '10px 0 0', lineHeight: 1.5 }}>
            I'll pull deadlines, quizzes, and class times — that's it. Never your essays, grades, or private docs.
          </p>
        </div>
      </div>

      <div style={ob05.card}>
        <div style={ob05.row}>
          <div style={{ ...ob05.ico, background: OC.rose }}>C</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Canvas LMS</div>
            <div style={{ fontSize: 12, color: OC.inkSoft, marginTop: 2, fontFamily: OMONO }}>nyu.instructure.com</div>
          </div>
          <button style={ob05.connectBtn}>Connect →</button>
        </div>

        <div style={{ marginTop: 22, padding: '16px 18px', background: OC.cream, borderRadius: 12 }}>
          <div style={{ fontFamily: OMONO, fontSize: 10, letterSpacing: '0.16em', color: OC.inkSoft, marginBottom: 12 }}>I'LL READ</div>
          <div style={ob05.permRow}><span style={ob05.checkSage}>✓</span> Course names &amp; assignment titles</div>
          <div style={ob05.permRow}><span style={ob05.checkSage}>✓</span> Due dates &amp; times</div>
          <div style={ob05.permRow}><span style={ob05.checkSage}>✓</span> Class schedule</div>
          <div style={{ fontFamily: OMONO, fontSize: 10, letterSpacing: '0.16em', color: OC.inkSoft, margin: '14px 0 12px' }}>I WON'T READ</div>
          <div style={ob05.permRowOff}><span style={ob05.crossRose}>×</span> Essays, submissions, or grades</div>
          <div style={ob05.permRowOff}><span style={ob05.crossRose}>×</span> Messages or discussion posts</div>
        </div>
      </div>
      <div style={ob05.skip}>
        <button style={ob05.skipBtn}>I'll connect later</button>
      </div>
      <CTABar primaryLabel="Connect Canvas · 30s" helper="Encrypted in transit & at rest" />
    </ScreenFrame>
  );
}

const ob05 = {
  card: {
    background: OC.paper, borderRadius: 18,
    border: `1px solid ${OC.line}`,
    padding: 22, marginTop: 8,
  },
  row: { display: 'flex', alignItems: 'center', gap: 14, padding: '4px 0' },
  ico: {
    width: 38, height: 38, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: OC.paper, fontFamily: OMONO, fontSize: 16, fontWeight: 600,
  },
  connectBtn: {
    background: OC.ink, color: OC.paper, border: 'none',
    padding: '10px 18px', borderRadius: 8,
    fontSize: 13, fontFamily: OSANS, fontWeight: 500,
    cursor: 'pointer',
  },
  permRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 13 },
  permRowOff: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 13, color: OC.inkSoft },
  checkSage: { color: OC.sage, fontWeight: 700, fontSize: 14, width: 16, display: 'inline-block' },
  crossRose: { color: OC.rose, fontWeight: 700, fontSize: 14, width: 16, display: 'inline-block' },
  skip: { textAlign: 'center', marginTop: 14 },
  skipBtn: {
    background: 'transparent', border: 'none', color: OC.inkSoft,
    fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 6,
  },
};

// ============= 06 · CALENDAR (Bruno thinking, with bubble) =============
function Onboard06() {
  return (
    <ScreenFrame step={6} total={8} label="06 Calendar">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 18 }}>
        <Bruno size={80} mood="thinking" />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: OMONO, fontSize: 11, letterSpacing: '0.18em', color: OC.brunoDeep, marginBottom: 8 }}>
            ONE MORE · ALMOST THERE
          </div>
          <h1 style={{
            fontFamily: OSERIF, fontSize: 38, lineHeight: 1.05,
            letterSpacing: '-0.02em', margin: 0, fontWeight: 400,
          }}>
            Now your <em style={{ color: OC.honeyDeep }}>calendar.</em>
          </h1>
          <p style={{ fontSize: 14, color: OC.inkSoft, margin: '10px 0 0', lineHeight: 1.5 }}>
            So I don't schedule deep work over your bio lab. I read events, never meeting notes.
          </p>
        </div>
      </div>
      <div style={ob05.card}>
        <div style={ob05.row}>
          <div style={{ ...ob05.ico, background: OC.blue }}>G</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Google Calendar</div>
            <div style={{ fontSize: 12, color: OC.inkSoft, marginTop: 2, fontFamily: OMONO }}>anthony@nyu.edu</div>
          </div>
          <button style={ob05.connectBtn}>Connect →</button>
        </div>
        <div style={{ marginTop: 16, padding: '14px 16px', background: OC.cream, borderRadius: 12 }}>
          <div style={ob05.permRow}><span style={ob05.checkSage}>✓</span> Event titles &amp; times</div>
          <div style={ob05.permRow}><span style={ob05.checkSage}>✓</span> Recurring class blocks</div>
          <div style={ob05.permRowOff}><span style={ob05.crossRose}>×</span> Meeting notes or attachments</div>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <BrunoBubble
          tone="dark"
          text="I'll look for empty windows between your classes and slot in the right work — never on top of your calendar."
        />
      </div>
      <div style={ob05.skip}>
        <button style={ob05.skipBtn}>I'll connect later</button>
      </div>
      <CTABar primaryLabel="Connect Calendar · 20s" />
    </ScreenFrame>
  );
}

// ============= 07 · FIRST PLAN (Bruno proud, pops in) =============
function Onboard07() {
  return (
    <ScreenFrame step={7} total={8} label="07 First plan">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 14 }}>
        <Bruno size={76} mood="happy" className="pop" />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: OMONO, fontSize: 11, letterSpacing: '0.18em', color: OC.brunoDeep, marginBottom: 8 }}>
            HERE'S WHAT I FOUND
          </div>
          <h1 style={{
            fontFamily: OSERIF, fontSize: 38, lineHeight: 1.05,
            letterSpacing: '-0.02em', margin: 0, fontWeight: 400,
          }}>
            Your first <em style={{ color: OC.honeyDeep }}>plan</em>, Anthony.
          </h1>
          <p style={{ fontSize: 13, color: OC.inkSoft, margin: '8px 0 0', lineHeight: 1.5 }}>
            23 items from Canvas + Calendar, built around your morning energy. You can edit anything.
          </p>
        </div>
      </div>

      <div style={ob07.summary}>
        <SummaryStat val="23" lbl="ITEMS READ" />
        <SummaryStat val="6" lbl="BLOCKS PLANNED" tone="honey" />
        <SummaryStat val="2h 30m" lbl="DEEP FOCUS" tone="sage" />
        <SummaryStat val="1" lbl="DUE THIS WEEK" tone="rose" />
      </div>

      <div style={ob07.planCard}>
        <div style={ob07.planHead}>
          <div style={{ fontFamily: OSERIF, fontSize: 20 }}>Tomorrow · <em style={{ color: OC.honeyDeep }}>Tue May 19</em></div>
          <div style={{ fontFamily: OMONO, fontSize: 10, color: OC.sage, letterSpacing: '0.1em' }}>● BRUNO BUILT THIS</div>
        </div>
        {[
          { t: '09:00', dur: '90m', tx: 'Calculus PS8 — your morning sharp', src: OC.rose, lbl: 'CANVAS · DUE WED' },
          { t: '10:30', dur: '15m', tx: 'Stretch — phone away', src: OC.honey, lbl: 'BRUNO RECOVERY' },
          { t: '11:00', dur: '60m', tx: 'Bio lab w/ Dr. Marin', src: OC.blue, lbl: 'CALENDAR' },
          { t: '14:00', dur: '60m', tx: 'History reading + outline', src: OC.rose, lbl: 'CANVAS · LIGHTER TIME' },
        ].map((r, i) => (
          <div key={i} style={ob07.planRow}>
            <div style={{ fontFamily: OMONO, fontSize: 11, color: OC.inkSoft, minWidth: 44 }}>{r.t}</div>
            <div style={{ width: 3, background: r.src, alignSelf: 'stretch', borderRadius: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.tx}</div>
              <div style={{ fontFamily: OMONO, fontSize: 9, color: OC.inkSoft, letterSpacing: '0.08em', marginTop: 2 }}>{r.lbl}</div>
            </div>
            <div style={{ fontFamily: OMONO, fontSize: 10, color: OC.inkSoft }}>{r.dur}</div>
          </div>
        ))}
      </div>
      <CTABar primaryLabel="Looks good — keep going" helper="You can edit later · always" />
    </ScreenFrame>
  );
}

function SummaryStat({ val, lbl, tone }) {
  const colorMap = { honey: OC.honeyDeep, sage: OC.sage, rose: OC.rose };
  return (
    <div style={{
      background: OC.paper, borderRadius: 12,
      border: `1px solid ${OC.line}`,
      padding: '12px 14px', flex: 1,
    }}>
      <div style={{ fontFamily: OSERIF, fontSize: 26, color: colorMap[tone] || OC.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>{val}</div>
      <div style={{ fontFamily: OMONO, fontSize: 9, color: OC.inkSoft, letterSpacing: '0.12em', marginTop: 6 }}>{lbl}</div>
    </div>
  );
}

const ob07 = {
  summary: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 4, marginBottom: 14 },
  planCard: {
    background: OC.paper, borderRadius: 16,
    border: `1px solid ${OC.line}`, padding: 18,
  },
  planHead: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
    paddingBottom: 12, borderBottom: `1px solid ${OC.line}`,
  },
  planRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' },
};

// ============= 08 · TRIAL (Bruno celebrates) =============
function Onboard08() {
  return (
    <ScreenFrame step={8} total={8} label="08 Trial">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Bruno size={86} mood="celebrating" className="pop" />
        <div style={{ marginTop: 12 }}>
          <TitleBlock
            eyebrow="ONE LAST THING · 14 DAYS FREE"
            title={<>Keep Bruno <em style={{ color: OC.honeyDeep }}>on your side.</em></>}
            sub="14 days free. Then $9.99/mo — or $4.99 with your .edu email. Card on file so we keep planning the day you forget."
          />
        </div>
      </div>

      <div style={ob08.priceCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: OMONO, fontSize: 10, letterSpacing: '0.18em', color: OC.honey, marginBottom: 8 }}>PLANEVO · ALL OF IT</div>
            <div style={{ fontFamily: OSERIF, fontSize: 40, color: OC.paper, letterSpacing: '-0.025em', lineHeight: 1 }}>$0<span style={{ fontSize: 18, opacity: 0.6 }}> · 14 days</span></div>
            <div style={{ fontFamily: OMONO, fontSize: 11, color: 'rgba(251,246,234,0.5)', marginTop: 6, letterSpacing: '0.06em' }}>
              THEN $9.99/MO · CANCEL ANY TIME
            </div>
          </div>
          <div style={ob08.eduTag}>
            <div style={{ fontFamily: OMONO, fontSize: 9, letterSpacing: '0.12em', color: OC.honey }}>.EDU DETECTED</div>
            <div style={{ fontFamily: OSERIF, fontSize: 22, color: OC.paper, marginTop: 4 }}>$4.99<span style={{ fontSize: 12, opacity: 0.6 }}>/mo</span></div>
          </div>
        </div>
        <div style={ob08.perks}>
          {[
            'Daily Plan, written each morning',
            'No-Shame Rollover when life slips',
            'Unlimited Bruno chat & rescheduling',
            'iOS & Android · sync everywhere',
          ].map((p, i) => (
            <div key={i} style={ob08.perk}>
              <span style={{ color: OC.honey }}>✓</span> {p}
            </div>
          ))}
        </div>
      </div>

      <div style={ob08.tabs}>
        <button style={{ ...ob08.tab, ...ob08.tabActive }}>Monthly <span style={{ opacity: 0.6 }}>· $4.99</span></button>
        <button style={ob08.tab}>Annual <span style={ob08.saveTag}>SAVE 34%</span></button>
      </div>

      <CTABar primaryLabel="Start my 14 days free" helper="No charge until day 15 · email reminder" />
    </ScreenFrame>
  );
}

const ob08 = {
  priceCard: { background: OC.ink, color: OC.paper, borderRadius: 18, padding: 24 },
  eduTag: {
    background: 'rgba(208,135,65,0.12)',
    border: `1px solid rgba(208,135,65,0.3)`,
    borderRadius: 10, padding: '10px 14px', textAlign: 'right',
  },
  perks: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
    marginTop: 22, paddingTop: 18,
    borderTop: '1px solid rgba(251,246,234,0.1)',
  },
  perk: {
    fontSize: 12, color: 'rgba(251,246,234,0.75)',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  tabs: {
    display: 'flex', gap: 6, marginTop: 14,
    background: OC.paper, padding: 4,
    borderRadius: 999, border: `1px solid ${OC.line}`,
  },
  tab: {
    flex: 1, background: 'transparent', border: 'none',
    padding: '10px 14px', borderRadius: 999,
    fontFamily: OSANS, fontSize: 13, fontWeight: 500,
    cursor: 'pointer', color: OC.inkSoft,
  },
  tabActive: { background: OC.ink, color: OC.paper },
  saveTag: {
    background: OC.honey, color: OC.ink,
    padding: '2px 6px', borderRadius: 4,
    fontFamily: OMONO, fontSize: 9, marginLeft: 4,
  },
};

// Expose
Object.assign(window, {
  Onboard01, Onboard02, Onboard03, Onboard04,
  Onboard05, Onboard06, Onboard07, Onboard08,
});
