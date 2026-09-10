import React, { useState, useEffect } from 'react';
import { PILLARS, SCORE_COLORS, SCORE_LABELS } from './data';

const defaultOpenPillars = PILLARS.reduce((acc, p) => {
  acc[p.id] = true;
  return acc;
}, {});

export default function Dashboard({ setView }) {
  const [scores, setScores] = useState({});
  const [history, setHistory] = useState([]);
  const [activeAnalysisId, setActiveAnalysisId] = useState(null); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [openPillars, setOpenPillars] = useState(defaultOpenPillars);
  const [saveStatus, setSaveStatus] = useState(null);
  const [viewMode, setViewMode] = useState('input');

  const fetchHistory = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      if (setView) setView('login');
      return;
    }

    try {
      const response = await fetch('/api/analysis', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      } else {
        localStorage.removeItem('token');
        if (setView) setView('login');
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // AUTOMATIC SAVE/UPDATE ON "SHOW SCORE" CLICK
  const handleShowScoreAndSave = async () => {
    setSaveStatus('Saving...');
    const token = localStorage.getItem('token');
    const isNewRecord = !activeAnalysisId; 
    
    try {
      let response;
      if (!isNewRecord) {
        response = await fetch(`/api/analysis/${activeAnalysisId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ scores })
        });
      } else {
        const currentDateTime = new Date().toLocaleString('en-IN', { 
          dateStyle: 'medium', timeStyle: 'short' 
        });

        response = await fetch('/api/analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ name: `Analysis on ${currentDateTime}`, scores })
        });
      }

      if (response.ok) {
        const savedData = await response.json();
        if (isNewRecord) {
          setActiveAnalysisId(savedData._id); 
        }
        fetchHistory(); 
        setSaveStatus(null);
        setViewMode('results'); 
        
        // Auto-scroll to the top of the page smoothly
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10);
      } else {
        setSaveStatus('Error Saving');
      }
    } catch (error) {
      setSaveStatus('Error Saving');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`/api/analysis/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        if (activeAnalysisId === id) startNewAnalysis(); 
        fetchHistory(); 
      }
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const loadAnalysis = (record) => {
    setScores(record.scores || {});
    setActiveAnalysisId(record._id);
    setViewMode('results'); 
    
    // Auto-scroll to the top of the page smoothly
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10);
  };

  const startNewAnalysis = () => {
    setScores({});
    setActiveAnalysisId(null);
    setViewMode('input');
    setOpenPillars(defaultOpenPillars); 
  };

  const handleReset = () => {
    if (window.confirm('Clear everything and start a new blank analysis?')) {
      startNewAnalysis(); 
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    if (setView) setView('login');
  };

  const setScore = (pid, idx, val) => {
    const key = `${pid}_${idx}`;
    setScores(prev => {
      const newScores = { ...prev };
      if (newScores[key] === val) delete newScores[key];
      else newScores[key] = val;
      return newScores;
    });
  };

  const togglePillar = (id) => {
    setOpenPillars(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- SCORE CALCULATIONS ---
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
    if (t >= 750) return { label: 'Excellent', color: '#22C55E', desc: 'Business running like a system. Building a legacy.' };
    if (t >= 600) return { label: 'Strong', color: '#3B82F6', desc: 'Solid foundations. Clear gaps to close.' };
    if (t >= 450) return { label: 'Average', color: '#F97316', desc: 'Works but fragile. Fix gaps.' };
    if (t >= 300) return { label: 'Needs Work', color: '#EF4444', desc: 'Visible risk in at least 2 pillars.' };
    if (t > 0) return { label: 'Critical', color: '#9B1C1C', desc: 'Stop growing. Stabilise first.' };
    return { label: 'Start Scoring', color: 'var(--text-soft)', desc: 'Score each pillar to see your Business Owner Score' };
  };

  const calculateRecordTotal = (recordScores) => {
    if (!recordScores) return 0;
    return PILLARS.reduce((sum, p) => {
      const raw = p.kpis.reduce((s, _, i) => s + (recordScores[`${p.id}_${i}`] || 0), 0);
      const max = p.kpis.length * 5;
      const weighted = max ? Math.round((raw / max) * p.weight) : 0;
      return sum + weighted;
    }, 0);
  };

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-soft)' }}>Loading Dashboard...</div>;

  const t = grandTotal();
  const r = getRating(t);
  const pct = t / 850;
  const circ = 2 * Math.PI * 82;
  const dashOffset = circ * (1 - (t ? pct : 0));

  const activeRecord = history.find(h => h._id === activeAnalysisId);
  const activeName = activeRecord ? activeRecord.name : "";

  const btnStyle = { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-soft)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', transition: 'all 0.2s' };

  return (
    <>
      <div className="header">
        {/* CLICKABLE LOGO + BRAND CONTAINER */}
        <div 
          onClick={startNewAnalysis} 
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          title="Click to reset and start a new analysis"
        >
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ height: '22px', objectFit: 'contain' }} 
          />
          <div className="brand">WOWOS FAST TRACK</div>
        </div>

        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '12px' }}>{activeName}</span>
          <button onClick={() => setViewMode('history')} style={btnStyle}>History</button>
          <button onClick={handleLogout} style={btnStyle}>Logout</button>
        </div>
      </div>

      {viewMode === 'results' && (
        <div className="hero">
          <div className="dial-wrap">
            <svg width="200" height="200" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="12" />
              <circle cx="100" cy="100" r="82" fill="none" stroke={t ? r.color : "var(--gold)"} strokeWidth="12" strokeDasharray={circ} strokeDashoffset={dashOffset} strokeLinecap="round" transform="rotate(-90 100 100)" style={{ transition: 'stroke-dashoffset .6s ease, stroke .4s' }} />
            </svg>
            <div className="dial-center">
              <div className="dial-num" style={{ color: t ? r.color : 'var(--text-soft)' }}>{t || '—'}</div>
              <div className="dial-max">out of 850</div>
            </div>
          </div>
          <div className="dial-rating" style={{ color: r.color }}>{r.label}</div>
          <div className="dial-desc">{r.desc}</div>
        </div>
      )}

      <div className="content" style={{ paddingTop: '30px' }}>
        
        {viewMode === 'input' && (
           <div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,.08)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--gold)', borderRadius: '2px', width: `${(scoredCount() / 25) * 100}%`, transition: 'width .3s' }}></div>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-soft)', flexShrink: 0 }}>{scoredCount()}/25 scored</span>
             </div>

             {PILLARS.map(p => {
               const w = pillarWeighted(p);
               const col = w ? getColor(w / p.weight) : 'var(--text-soft)';
               const isOpen = openPillars[p.id];
               return (
                 <div className="pillar-card" key={p.id}>
                   <div className="pillar-head" onClick={() => togglePillar(p.id)}>
                     <div className="pillar-color-bar" style={{ background: p.color }}></div>
                     <div className="pillar-icon">{p.icon}</div>
                     <div className="pillar-info">
                       <div className="pillar-name">{p.name}</div>
                     </div>
                     <div className="pillar-score-wrap">
                       <div className="pillar-score" style={{ color: col }}>{w || '—'}</div>
                     </div>
                     <div className={`pillar-chevron ${isOpen ? 'open' : ''}`}>▾</div>
                   </div>
                   {isOpen && (
                     <div className="kpi-section">
                       {p.kpis.map((kpi, idx) => {
                         const val = scores[`${p.id}_${idx}`] || 0;
                         return (
                           <div className="kpi-item" key={idx}>
                             <div>
                               <div className="kpi-label">{kpi.l}</div>
                               <div className="kpi-sub">{kpi.s}</div>
                             </div>
                             {[1, 2, 3, 4, 5].map(n => (
                               <button key={n} className={`score-btn ${val === n ? 'sel' : ''}`} style={val === n ? { background: SCORE_COLORS[n] } : {}} onClick={() => setScore(p.id, idx, n)}>{n}</button>
                             ))}
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

        {viewMode === 'results' && (
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
          </div>
        )}

        {viewMode === 'history' && (
          <div>
            <h3 style={{ color: '#F5F0E8', marginBottom: '20px', fontSize: '18px' }}>Your Saved Records</h3>
            {history.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-soft)', marginTop: '20px' }}>No saved analysis yet.</p>
            ) : (
              history.map(record => {
                const recordTotal = calculateRecordTotal(record.scores);
                const recordColor = getRating(recordTotal).color;
                
                return (
                  <div className="history-card" key={record._id} style={activeAnalysisId === record._id ? { border: '1px solid var(--gold)' } : {}}>
                    <div className="history-info">
                      <span className="history-name">{record.name}</span>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: recordColor, marginTop: '2px' }}>
                        Score: {recordTotal} <span style={{ color: 'var(--text-soft)', fontWeight: 'normal', fontSize: '11px' }}>/ 850</span>
                      </span>
                      {activeAnalysisId === record._id && <span style={{ fontSize: '10px', color: 'var(--gold)', marginTop: '4px' }}>Currently Loaded</span>}
                    </div>
                    <div className="history-actions">
                      <button className="btn-action" onClick={() => loadAnalysis(record)}>View</button>
                      <button className="btn-action del" onClick={() => handleDelete(record._id)}>Delete</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="bottom-bar">
        {viewMode === 'input' && (
           <>
             <button className="btn-reset" onClick={handleReset}>Clear Screen</button>
             <button 
               className="btn-save" 
               onClick={handleShowScoreAndSave}
               disabled={saveStatus === 'Saving...'}
             >
               {saveStatus || 'Show Score'}
             </button>
           </>
        )}

        {/* RESULTS VIEW BUTTONS */}
        {viewMode === 'results' && (
           <>
             <button 
               className="btn-save" 
               style={{ color:' #fff', border: '1px solid var(--border)', flex: 1 }} 
               onClick={startNewAnalysis}
             >
               New Score Calculation
             </button>
             <button 
               className="btn-reset" 
               style={{ border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', flex: 1 }} 
               onClick={() => activeAnalysisId && handleDelete(activeAnalysisId)}
             >
               Delete
             </button>
           </>
        )}

        {/* HISTORY VIEW BUTTONS */}
        {viewMode === 'history' && (
           <button 
             className="btn-save" 
             style={{ width: '100%', color: '#F5F0E8', border: '1px solid var(--border)' }} 
             onClick={startNewAnalysis}
           >
             New Score Calculation
           </button>
        )}
      </div>
    </>
  );
}