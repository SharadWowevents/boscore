import React, { useState, useEffect } from 'react';
import { PILLARS, SCORE_COLORS, SCORE_LABELS } from './data';

export default function Dashboard({ setView }) {
  const [scores, setScores] = useState({});
  const [history, setHistory] = useState([]);
  const [activeAnalysisId, setActiveAnalysisId] = useState(null); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('score');
  const [openPillars, setOpenPillars] = useState({});
  const [saveStatus, setSaveStatus] = useState(null);

  // Fetch all history on mount
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
        // THE FIX: The auto-load logic has been completely removed from here.
        // It will no longer hijack your screen after you save a new record.
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

  // Save (Create or Update)
  const handleSave = async () => {
    setSaveStatus('Saving...');
    const token = localStorage.getItem('token');
    
    // Capture if this is a new record before we make the API call
    const isNewRecord = !activeAnalysisId; 
    
    try {
      let response;
      if (!isNewRecord) {
        // UPDATE existing record
        response = await fetch(`/api/analysis/${activeAnalysisId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ scores })
        });
      } else {
        // CREATE new record
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
        setSaveStatus('✓ Score Saved');
        
        // Refresh history list in the background
        fetchHistory(); 
        
        if (isNewRecord) {
          // Clear the board and reset the active ID so it becomes a blank template again
          startNewAnalysis(); 
        }

      } else {
        setSaveStatus('Error Saving');
      }
    } catch (error) {
      setSaveStatus('Error Saving');
    }

    setTimeout(() => setSaveStatus(null), 2000);
  };

  // Delete Record
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`/api/analysis/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        if (activeAnalysisId === id) {
          startNewAnalysis(); 
        }
        fetchHistory(); 
      }
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  // Load a historical record into the editor
  const loadAnalysis = (record) => {
    setScores(record.scores || {});
    setActiveAnalysisId(record._id);
    setCurrentTab('score');
  };

  // Start fresh
  const startNewAnalysis = () => {
    setScores({});
    setActiveAnalysisId(null);
    setCurrentTab('score');
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
    setOpenPillars(prev => ({ ...prev, [pid]: true }));
  };

  const togglePillar = (id) => {
    setOpenPillars(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
    if (t >= 750) return { label: 'Excellent', color: '#22C55E', desc: 'Business running like a system.' };
    if (t >= 600) return { label: 'Strong', color: '#3B82F6', desc: 'Solid foundations. Keep building.' };
    if (t >= 450) return { label: 'Average', color: '#F97316', desc: 'Works but fragile.' };
    if (t >= 300) return { label: 'Needs Work', color: '#EF4444', desc: 'Visible risk. Fix before scaling.' };
    if (t > 0) return { label: 'Critical', color: '#9B1C1C', desc: 'Stop growing. Stabilise first.' };
    return { label: 'Start Scoring', color: 'var(--text-soft)', desc: 'Score each pillar to see your Business Owner Score' };
  };

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-soft)' }}>Loading Dashboard...</div>;

  const t = grandTotal();
  const r = getRating(t);
  const pct = t / 850;
  const circ = 2 * Math.PI * 82;
  const dashOffset = circ * (1 - (t ? pct : 0));

  const activeRecord = history.find(h => h._id === activeAnalysisId);
  const activeName = activeRecord ? activeRecord.name : "Unsaved New Analysis";

  return (
    <>
      <div className="header">
        <div className="brand">WOWOS FAST TRACK</div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span>{activeName}</span>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-soft)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>Logout</button>
        </div>
      </div>

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
      </div>

      <div className="tabs">
        <button className={`tab ${currentTab === 'score' ? 'active' : ''}`} onClick={() => setCurrentTab('score')}>Score Pillars</button>
        <button className={`tab ${currentTab === 'summary' ? 'active' : ''}`} onClick={() => setCurrentTab('summary')}>Summary View</button>
        <button className={`tab ${currentTab === 'history' ? 'active' : ''}`} onClick={() => setCurrentTab('history')}>History</button>
      </div>

      <div className="content">
        {currentTab === 'score' && (
           <div>
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
                             <div><div className="kpi-label">{kpi.l}</div></div>
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

        {currentTab === 'summary' && (
           <div className="guide-card">
              <div className="guide-title">Summary ready. Switch tabs to view your breakdown.</div>
           </div>
        )}

        {currentTab === 'history' && (
          <div>
            {history.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-soft)', marginTop: '20px' }}>No saved analysis yet.</p>
            ) : (
              history.map(record => (
                <div className="history-card" key={record._id} style={activeAnalysisId === record._id ? { border: '1px solid var(--gold)' } : {}}>
                  <div className="history-info">
                    <span className="history-name">{record.name}</span>
                    {activeAnalysisId === record._id && <span style={{ fontSize: '10px', color: 'var(--gold)' }}>Currently Editing</span>}
                  </div>
                  <div className="history-actions">
                    <button className="btn-action" onClick={() => loadAnalysis(record)}>Load</button>
                    <button className="btn-action del" onClick={() => handleDelete(record._id)}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="bottom-bar">
        <button className="btn-reset" onClick={handleReset}>Clear Screen</button>
        <button 
          className={`btn-save ${saveStatus === '✓ Score Saved' ? 'saved' : ''}`} 
          onClick={handleSave} 
          style={saveStatus === '✓ Score Saved' ? { background: '#22C55E' } : {}}
          disabled={saveStatus === 'Saving...'}
        >
          {saveStatus || (activeAnalysisId ? 'Update Score' : 'Save Score')}
        </button>
      </div>
    </>
  );
}