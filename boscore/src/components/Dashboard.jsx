import React, { useState, useEffect } from 'react';
import { PILLARS, SCORE_COLORS, SCORE_LABELS } from './data';

// Accept setView as a prop so we can redirect to login if unauthorized or logged out
export default function Dashboard({ setView }) {
  const [scores, setScores] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('score');
  const [openPillars, setOpenPillars] = useState({});
  const [saveStatus, setSaveStatus] = useState('Save My Score');

  // Fetch initial scores from backend on component mount
  useEffect(() => {
    const fetchScores = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        if (setView) setView('login');
        return;
      }

      try {
        const response = await fetch('/api/scores', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setScores(data || {});
        } else {
          // If token is invalid/expired, log them out
          localStorage.removeItem('token');
          if (setView) setView('login');
        }
      } catch (error) {
        console.error("Error fetching scores:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScores();
  }, [setView]);

  // Calculations
  const pillarTotal = (p) => p.kpis.reduce((s, _, i) => s + (scores[`${p.id}_${i}`] || 0), 0);
  const pillarMax = (p) => p.kpis.length * 5;
  const pillarWeighted = (p) => {
    const raw = pillarTotal(p);
    const max = pillarMax(p);
    return max ? Math.round((raw / max) * p.weight) : 0;
  };
  const grandTotal = () => PILLARS.reduce((s, p) => s + pillarWeighted(p), 0);
  const scoredCount = () => Object.keys(scores).length;

  const getColor = (pct) => {
    if (pct >= .8) return '#22C55E';
    if (pct >= .6) return '#3B82F6';
    if (pct >= .4) return '#F97316';
    if (pct > 0) return '#EF4444';
    return 'var(--text-soft)';
  };

  const getRating = (t) => {
    if (t >= 750) return { label: 'Excellent', color: '#22C55E', desc: 'Business running like a system. You are building a legacy.' };
    if (t >= 600) return { label: 'Strong', color: '#3B82F6', desc: 'Solid foundations. Clear gaps to close. Keep building.' };
    if (t >= 450) return { label: 'Average', color: '#F97316', desc: 'Works but fragile. One crisis could expose the gaps.' };
    if (t >= 300) return { label: 'Needs Work', color: '#EF4444', desc: 'Visible risk in at least 2 pillars. Fix before scaling.' };
    if (t > 0) return { label: 'Critical', color: '#9B1C1C', desc: 'Stop growing. Stabilise first.' };
    return { label: 'Start Scoring', color: 'var(--text-soft)', desc: 'Score each pillar to see your Business Owner Score' };
  };

  const setScore = (pid, idx, val) => {
    const key = `${pid}_${idx}`;
    setScores(prev => {
      const newScores = { ...prev };
      if (newScores[key] === val) delete newScores[key];
      else newScores[key] = val;
      return newScores;
    });
    setOpenPillars(prev => ({ ...prev, [pid]: true }));
  };

  const handleReset = () => {
    if (window.confirm('Reset all scores? Make sure to click "Save" afterwards.')) {
      setScores({});
    }
  };

  // Push scores to the database
  const handleSave = async () => {
    setSaveStatus('Saving...');
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ scores })
      });

      if (response.ok) {
        setSaveStatus('✓ Score Saved');
      } else {
        setSaveStatus('Error Saving');
      }
    } catch (error) {
      console.error("Error saving score:", error);
      setSaveStatus('Error Saving');
    }

    setTimeout(() => setSaveStatus('Save My Score'), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    if (setView) setView('login');
  };

  const togglePillar = (id) => {
    setOpenPillars(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Prevent rendering math/UI until data is loaded
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-soft)' }}>
        Loading your scores...
      </div>
    );
  }

  // Hero Dial Math
  const t = grandTotal();
  const r = getRating(t);
  const pct = t / 850;
  const circ = 2 * Math.PI * 82;
  const dashOffset = circ * (1 - (t ? pct : 0));

  return (
    <>
      <div className="header">
        <div className="brand">WOWOS FAST TRACK</div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span>Business Owner Score</span>
          <button 
            onClick={handleLogout} 
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-soft)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* HERO DIAL */}
      <div className="hero">
        <div className="dial-wrap">
          <svg width="200" height="200" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="12" />
            <circle
              cx="100" cy="100" r="82" fill="none"
              stroke={t ? r.color : "var(--gold)"} strokeWidth="12"
              strokeDasharray={circ} strokeDashoffset={dashOffset}
              strokeLinecap="round" transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset .6s ease, stroke .4s' }}
            />
          </svg>
          <div className="dial-center">
            <div className="dial-num" style={{ color: t ? r.color : 'var(--text-soft)' }}>{t || '—'}</div>
            <div className="dial-max">out of 850</div>
          </div>
        </div>
        <div className="dial-rating" style={{ color: r.color }}>{r.label}</div>
        <div className="dial-desc">{r.desc}</div>
      </div>

      {/* PILLAR CHIPS */}
      <div className="pillar-row">
        {PILLARS.map(p => {
          const w = pillarWeighted(p);
          const pPct = w / p.weight;
          const col = w ? getColor(pPct) : 'var(--text-soft)';
          return (
            <div className="pillar-chip" key={p.id}>
              <div className="chip-icon">{p.icon}</div>
              <div className="chip-label">{p.short}</div>
              <div className="chip-score" style={{ color: col }}>{w || '—'}</div>
              <div className="chip-max" style={{ color: 'var(--text-soft)' }}>/{p.weight}</div>
            </div>
          );
        })}
      </div>

      {/* TABS */}
      <div className="tabs">
        <button className={`tab ${currentTab === 'score' ? 'active' : ''}`} onClick={() => setCurrentTab('score')}>Score Pillars</button>
        <button className={`tab ${currentTab === 'summary' ? 'active' : ''}`} onClick={() => setCurrentTab('summary')}>Summary View</button>
      </div>

      {/* CONTENT VIEWS */}
      <div className="content">
        {currentTab === 'score' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,.08)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--gold)', borderRadius: '2px', width: `${(scoredCount() / 25) * 100}%`, transition: 'width .3s' }}></div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-soft)', flexShrink: 0 }}>{scoredCount()}/25 scored</span>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-soft)' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: SCORE_COLORS[n] }}></div>
                  {n} {SCORE_LABELS[n]}
                </div>
              ))}
            </div>

            {PILLARS.map(p => {
              const w = pillarWeighted(p);
              const col = w ? getColor(w / p.weight) : 'var(--text-soft)';
              const isOpen = openPillars[p.id];
              const filled = p.kpis.filter((_, i) => scores[`${p.id}_${i}`]).length;

              return (
                <div className="pillar-card" key={p.id}>
                  <div className="pillar-head" onClick={() => togglePillar(p.id)}>
                    <div className="pillar-color-bar" style={{ background: p.color }}></div>
                    <div className="pillar-icon">{p.icon}</div>
                    <div className="pillar-info">
                      <div className="pillar-name">
                        {p.name}
                        {filled === 5 && <span style={{ fontSize: '9px', background: 'rgba(34,197,94,.15)', color: '#22C55E', padding: '1px 6px', borderRadius: '20px', marginLeft: '6px' }}>Complete</span>}
                      </div>
                      <div className="pillar-desc">{p.outcome}</div>
                    </div>
                    <div className="pillar-score-wrap">
                      <div className="pillar-score" style={{ color: col }}>
                        {w || '—'}<span style={{ fontSize: '11px', color: 'var(--text-soft)' }}>{w ? `/${p.weight}` : ''}</span>
                      </div>
                    </div>
                    <div className={`pillar-chevron ${isOpen ? 'open' : ''}`}>▾</div>
                  </div>
                  <div className="pillar-bar-wrap">
                    <div className="pillar-bar-bg">
                      <div className="pillar-bar-fill" style={{ width: `${(w / p.weight) * 100}%`, background: p.color }}></div>
                    </div>
                  </div>
                  
                  {isOpen && (
                    <div className="kpi-section">
                      <div className="kpi-head-row">
                        <div></div>
                        {[1, 2, 3, 4, 5].map(n => (
                          <div key={n} className="kpi-head-score" style={{ color: SCORE_COLORS[n] }}>{n}</div>
                        ))}
                      </div>
                      {p.kpis.map((kpi, idx) => {
                        const val = scores[`${p.id}_${idx}`] || 0;
                        return (
                          <div className="kpi-item" key={idx}>
                            <div>
                              <div className="kpi-label">{kpi.l}</div>
                              <div className="kpi-sub">{kpi.s}</div>
                            </div>
                            {[1, 2, 3, 4, 5].map(n => {
                              const sel = val === n;
                              return (
                                <button
                                  key={n}
                                  className={`score-btn ${sel ? 'sel' : ''}`}
                                  style={sel ? { background: SCORE_COLORS[n] } : {}}
                                  onClick={() => setScore(p.id, idx, n)}
                                >
                                  {n}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {currentTab === 'summary' && (
          <div>
            <div className="sum-grid">
              {PILLARS.map(p => {
                const w = pillarWeighted(p);
                const pPct = p.weight ? w / p.weight : 0;
                const col = w ? getColor(pPct) : 'var(--text-soft)';
                const filled = p.kpis.filter((_, i) => scores[`${p.id}_${i}`]).length;
                
                return (
                  <div className="sum-card" key={p.id}>
                    <div className="sum-top-stripe" style={{ background: p.color }}></div>
                    <div className="sum-icon">{p.icon}</div>
                    <div>
                      <span className="sum-score" style={{ color: col }}>{w || '—'}</span>
                      {w > 0 && <span className="sum-of"> /{p.weight}</span>}
                    </div>
                    <div className="sum-name">{p.name}</div>
                    <div className="sum-out">{p.outcome}</div>
                    <div className="sum-bar-bg">
                      <div className="sum-bar-fill" style={{ width: `${pPct * 100}%`, background: p.color }}></div>
                    </div>
                    <div className="sum-foot">
                      <span className="sum-foot-label">{filled}/5 scored</span>
                      <span className="sum-foot-pct" style={{ color: col }}>{w ? Math.round(pPct * 100) + '%' : '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PRIORITY FOCUS */}
            {(() => {
              const scoredPillars = PILLARS
                .filter(p => pillarWeighted(p) > 0)
                .map(p => ({ ...p, w: pillarWeighted(p), pct: pillarWeighted(p) / p.weight }))
                .sort((a, b) => a.pct - b.pct)
                .slice(0, 3);

              if (scoredPillars.length >= 2) {
                return (
                  <div className="priority-card">
                    <div className="priority-title">Priority Focus Areas</div>
                    {scoredPillars.map((p, i) => {
                      const col = getColor(p.pct);
                      return (
                        <div className="priority-row" key={p.id}>
                          <div className="priority-rank">{i + 1}</div>
                          <div className="priority-info">
                            <div className="priority-name">{p.icon} {p.name}</div>
                            <div className="priority-bar-bg">
                              <div className="priority-bar-fill" style={{ width: `${p.pct * 100}%`, background: col }}></div>
                            </div>
                          </div>
                          <div className="priority-pct" style={{ color: col }}>{p.w}/{p.weight}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return null;
            })()}

            {/* GUIDE CARD */}
            <div className="guide-card">
              <div className="guide-title">Score Guide</div>
              {[
                { r: '750 – 850', l: 'Excellent', d: 'Business running like a system. Building a legacy.', c: '#22C55E' },
                { r: '600 – 749', l: 'Strong', d: 'Solid foundations. Clear gaps to close.', c: '#3B82F6' },
                { r: '450 – 599', l: 'Average', d: 'Works but fragile. One crisis exposes the gaps.', c: '#F97316' },
                { r: '300 – 449', l: 'Needs Work', d: 'Risk in at least 2 pillars. Fix before scaling.', c: '#EF4444' },
                { r: '0 – 299', l: 'Critical', d: 'Stop growing. Stabilise the business first.', c: '#9B1C1C' },
              ].map((g, i) => (
                <div className="guide-row" key={i}>
                  <div className="guide-dot" style={{ background: g.c }}></div>
                  <div className="guide-range" style={{ color: g.c }}>{g.r}</div>
                  <div>
                    <div className="guide-label" style={{ color: g.c }}>{g.l}</div>
                    <div className="guide-desc">{g.d}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="footer-note">
              WOWOS Fast Track · Business Owner Score · wowos.in
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="bottom-bar">
        <button className="btn-reset" onClick={handleReset}>Reset</button>
        <button 
          className={`btn-save ${saveStatus !== 'Save My Score' ? 'saved' : ''}`} 
          onClick={handleSave}
          style={saveStatus !== 'Save My Score' ? { background: '#22C55E' } : {}}
        >
          {saveStatus}
        </button>
      </div>
    </>
  );
}