/**
 * Score calculation utilities for Business Owner Score (BO Score)
 */

const PILLARS = [
  {
    id: 'biz',
    icon: '🏢',
    name: 'Business Health',
    short: 'Business',
    weight: 250,
    color: '#0EA5E9',
    outcome: 'How well is your business performing as a system?',
    kpis: [
      { l: 'Revenue vs Target', s: 'Are you hitting your monthly revenue number?' },
      { l: 'Gross Margin %', s: 'Is the business profitable per rupee earned?' },
      { l: 'Cash Runway', s: 'Months the business survives without new revenue' },
      { l: 'Systems Coverage', s: '% of recurring work that runs without the founder' },
      { l: 'Growth Rate', s: 'Is the business bigger than it was 90 days ago?' },
    ],
  },
  {
    id: 'ppl',
    icon: '👥',
    name: 'People',
    short: 'People',
    weight: 175,
    color: '#10B981',
    outcome: 'How well are you leading and developing your team?',
    kpis: [
      { l: 'Team Retention Rate', s: 'Are your best people choosing to stay?' },
      { l: 'Role Clarity Index', s: 'Does every team member know their KRA and KPI?' },
      { l: 'Captain Readiness', s: 'How many HODs can run their area without you?' },
      { l: 'Hiring Cycle Speed', s: 'How fast do you fill a critical open role?' },
      { l: 'Team Satisfaction', s: 'Would your team recommend working here to a friend?' },
    ],
  },
  {
    id: 'cli',
    icon: '🤝',
    name: 'Client',
    short: 'Client',
    weight: 175,
    color: '#F59E0B',
    outcome: 'How well are you serving and retaining the people who pay you?',
    kpis: [
      { l: 'Client Satisfaction Score', s: 'What do clients say after every project is complete?' },
      { l: 'On-Time Delivery Rate', s: '% of projects delivered on or before the deadline' },
      { l: 'Repeat Business Rate', s: '% of clients who come back for more work' },
      { l: 'Referral Rate', s: '% of new clients who come from existing client referrals' },
      { l: 'Zero-Chase Rate', s: '% of clients who never had to follow up for an update' },
    ],
  },
  {
    id: 'ven',
    icon: '📦',
    name: 'Vendor',
    short: 'Vendor',
    weight: 125,
    color: '#8B5CF6',
    outcome: 'How well are you managing the people who make your delivery possible?',
    kpis: [
      { l: 'Payment On Time Rate', s: '% of vendor invoices paid within agreed terms' },
      { l: 'Vendor Retention Rate', s: 'Are your best vendors still choosing to work with you?' },
      { l: 'PO Compliance', s: '% of vendor work that begins with a confirmed PO' },
      { l: 'Vendor Quality Score', s: '% of vendor deliveries that meet your standard first time' },
      { l: 'Negotiation Margin', s: 'How close is actual cost to budgeted cost per project?' },
    ],
  },
  {
    id: 'gov',
    icon: '🏛️',
    name: 'Governance',
    short: 'Govt',
    weight: 125,
    color: '#64748B',
    outcome: 'How clean is your relationship with compliance and financial institutions?',
    kpis: [
      { l: 'GST Filing On Time', s: 'Filed before due date — every month without exception' },
      { l: 'TDS Compliance', s: 'All deductions deposited correctly and on time' },
      { l: 'ITR Filed On Time', s: 'Personal and business returns filed without extensions' },
      { l: 'Credit Score Health', s: 'Your business and personal credit health (CIBIL)' },
      { l: 'Audit Readiness', s: 'Can your books be audited tomorrow without panic?' },
    ],
  },
];

const SCORE_COLORS = ['', '#EF4444', '#F97316', '#9CA3AF', '#22C55E', '#3B82F6'];
const SCORE_LABELS = ['', 'Critical', 'Needs Work', 'Average', 'Good', 'Excellent'];

function getColor(pct) {
  if (pct >= 0.8) return '#22C55E';
  if (pct >= 0.6) return '#3B82F6';
  if (pct >= 0.4) return '#F97316';
  if (pct > 0) return '#EF4444';
  return '#9CA3AF';
}

function getRating(t) {
  if (t >= 750) {
    return {
      label: 'Excellent',
      color: '#22C55E',
      badgeBg: '#DCFCE7',
      borderColor: '#86EFAC',
      desc: 'Business running like a system. Building a legacy.',
    };
  }
  if (t >= 600) {
    return {
      label: 'Strong',
      color: '#3B82F6',
      badgeBg: '#DBEAFE',
      borderColor: '#93C5FD',
      desc: 'Solid foundations. Clear gaps to close.',
    };
  }
  if (t >= 450) {
    return {
      label: 'Average',
      color: '#F97316',
      badgeBg: '#FFEDD5',
      borderColor: '#FDBA74',
      desc: 'Works but fragile. Fix gaps.',
    };
  }
  if (t >= 300) {
    return {
      label: 'Needs Work',
      color: '#EF4444',
      badgeBg: '#FEE2E2',
      borderColor: '#FCA5A5',
      desc: 'Visible risk in at least 2 pillars.',
    };
  }
  if (t > 0) {
    return {
      label: 'Critical',
      color: '#9B1C1C',
      badgeBg: '#FEE2E2',
      borderColor: '#F87171',
      desc: 'Stop growing. Stabilise first.',
    };
  }
  return {
    label: 'Start Scoring',
    color: '#9CA3AF',
    badgeBg: '#F3F4F6',
    borderColor: '#E5E7EB',
    desc: 'Score each pillar to see your Business Owner Score',
  };
}

/**
 * Calculates full scores, percentages, pillar breakdown, and priority areas
 * @param {Object|Map} rawScores
 */
function calculateScores(rawScores = {}) {
  let scoresObj = {};
  if (rawScores instanceof Map) {
    scoresObj = Object.fromEntries(rawScores);
  } else if (rawScores && typeof rawScores.toObject === 'function') {
    scoresObj = rawScores.toObject();
  } else if (rawScores && typeof rawScores === 'object') {
    scoresObj = rawScores;
  }

  let grandTotal = 0;
  let scoredKpiCount = 0;

  const pillarResults = PILLARS.map((p) => {
    let raw = 0;
    let pillarScoredCount = 0;

    const kpis = p.kpis.map((kpi, idx) => {
      const val = Number(scoresObj[`${p.id}_${idx}`]) || 0;
      if (val > 0) {
        scoredKpiCount++;
        pillarScoredCount++;
      }
      raw += val;
      return {
        label: kpi.l,
        sub: kpi.s,
        score: val,
        scoreLabel: SCORE_LABELS[val] || 'Not Scored',
        scoreColor: SCORE_COLORS[val] || '#9CA3AF',
      };
    });

    const maxRaw = p.kpis.length * 5; // 25
    const weighted = maxRaw ? Math.round((raw / maxRaw) * p.weight) : 0;
    const pct = p.weight ? weighted / p.weight : 0;
    const color = getColor(pct);

    grandTotal += weighted;

    return {
      id: p.id,
      name: p.name,
      short: p.short,
      icon: p.icon,
      color: p.color,
      scoreColor: color,
      weight: p.weight,
      raw,
      maxRaw,
      weighted,
      pct,
      percentage: Math.round(pct * 100),
      outcome: p.outcome,
      pillarScoredCount,
      kpis,
    };
  });

  const rating = getRating(grandTotal);

  // Priority Focus Areas: lowest percentage among scored pillars, top 3
  const priorityPillars = [...pillarResults]
    .filter((p) => p.weighted > 0)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

  return {
    grandTotal,
    maxTotal: 850,
    percentage: Math.round((grandTotal / 850) * 100),
    rating,
    pillarResults,
    priorityPillars,
    scoredKpiCount,
    totalKpis: 25,
  };
}

module.exports = {
  PILLARS,
  SCORE_COLORS,
  SCORE_LABELS,
  getColor,
  getRating,
  calculateScores,
};
