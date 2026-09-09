// data.js
export const PILLARS = [
  {
    id: 'biz', icon: '🏢', color: 'var(--p1)', name: 'Business Health',
    short: 'Business', weight: 250, outcome: 'How well is your business performing as a system?',
    kpis: [
      { l: 'Revenue vs Target', s: 'Are you hitting your monthly revenue number?' },
      { l: 'Gross Margin %', s: 'Is the business profitable per rupee earned?' },
      { l: 'Cash Runway', s: 'Months the business survives without new revenue' },
      { l: 'Systems Coverage', s: '% of recurring work that runs without the founder' },
      { l: 'Growth Rate', s: 'Is the business bigger than it was 90 days ago?' },
    ]
  },
  {
    id: 'ppl', icon: '👥', color: 'var(--p2)', name: 'People',
    short: 'People', weight: 175, outcome: 'How well are you leading and developing your team?',
    kpis: [
      { l: 'Team Retention Rate', s: 'Are your best people choosing to stay?' },
      { l: 'Role Clarity Index', s: 'Does every team member know their KRA and KPI?' },
      { l: 'Captain Readiness', s: 'How many HODs can run their area without you?' },
      { l: 'Hiring Cycle Speed', s: 'How fast do you fill a critical open role?' },
      { l: 'Team Satisfaction', s: 'Would your team recommend working here to a friend?' },
    ]
  },
  {
    id: 'cli', icon: '🤝', color: 'var(--p3)', name: 'Client',
    short: 'Client', weight: 175, outcome: 'How well are you serving and retaining the people who pay you?',
    kpis: [
      { l: 'Client Satisfaction Score', s: 'What do clients say after every project is complete?' },
      { l: 'On-Time Delivery Rate', s: '% of projects delivered on or before the deadline' },
      { l: 'Repeat Business Rate', s: '% of clients who come back for more work' },
      { l: 'Referral Rate', s: '% of new clients who come from existing client referrals' },
      { l: 'Zero-Chase Rate', s: '% of clients who never had to follow up for an update' },
    ]
  },
  {
    id: 'ven', icon: '📦', color: 'var(--p4)', name: 'Vendor',
    short: 'Vendor', weight: 125, outcome: 'How well are you managing the people who make your delivery possible?',
    kpis: [
      { l: 'Payment On Time Rate', s: '% of vendor invoices paid within agreed terms' },
      { l: 'Vendor Retention Rate', s: 'Are your best vendors still choosing to work with you?' },
      { l: 'PO Compliance', s: '% of vendor work that begins with a confirmed PO' },
      { l: 'Vendor Quality Score', s: '% of vendor deliveries that meet your standard first time' },
      { l: 'Negotiation Margin', s: 'How close is actual cost to budgeted cost per project?' },
    ]
  },
  {
    id: 'gov', icon: '🏛️', color: 'var(--p5)', name: 'Governance',
    short: 'Govt', weight: 125, outcome: 'How clean is your relationship with compliance and financial institutions?',
    kpis: [
      { l: 'GST Filing On Time', s: 'Filed before due date — every month without exception' },
      { l: 'TDS Compliance', s: 'All deductions deposited correctly and on time' },
      { l: 'ITR Filed On Time', s: 'Personal and business returns filed without extensions' },
      { l: 'Credit Score Health', s: 'Your business and personal credit health (CIBIL)' },
      { l: 'Audit Readiness', s: 'Can your books be audited tomorrow without panic?' },
    ]
  }
];

export const SCORE_COLORS = ['', '#EF4444', '#F97316', '#9CA3AF', '#22C55E', '#3B82F6'];
export const SCORE_LABELS = ['', 'Critical', 'Needs Work', 'Average', 'Good', 'Excellent'];