import React from 'react';

interface Helpline {
  name: string;
  number: string;
  badge: string;
  icon: string;
  color: string;
}

const HELPLINES: Helpline[] = [
  {
    name: 'National Emergency',
    number: '112',
    badge: 'ALL-IN-ONE',
    icon: '🚨',
    color: '#ef4444',
  },
  {
    name: 'Women Safety',
    number: '1091',
    badge: '24x7 HELPLINE',
    icon: '🛡️',
    color: '#ec4899',
  },
  {
    name: 'Medical Ambulance',
    number: '108',
    badge: 'PARAMEDIC',
    icon: '🚑',
    color: '#06b6d4',
  },
  {
    name: 'Fire Department',
    number: '101',
    badge: 'FIRE & RESCUE',
    icon: '🚒',
    color: '#f97316',
  },
];

const QuickHelplines: React.FC = () => {
  return (
    <section className="quick-helplines-section" aria-label="One-touch emergency helplines">
      <div className="section-header-compact">
        <span className="section-icon">⚡</span>
        <h3 className="section-title-compact">INSTANT HELPLINES</h3>
        <span className="helpline-hint">Single tap to dial</span>
      </div>

      <div className="helplines-grid">
        {HELPLINES.map((h) => (
          <a
            key={h.number}
            href={`tel:${h.number}`}
            className="helpline-card"
            style={{ '--accent-color': h.color } as React.CSSProperties}
            aria-label={`Call ${h.name} at ${h.number}`}
          >
            <div className="helpline-top">
              <span className="helpline-icon">{h.icon}</span>
              <span className="helpline-number">{h.number}</span>
            </div>
            <div className="helpline-bottom">
              <span className="helpline-name">{h.name}</span>
              <span className="helpline-badge">{h.badge}</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

export default QuickHelplines;
