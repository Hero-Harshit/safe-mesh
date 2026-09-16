import React from 'react';

interface FeatureCardProps {
  title: string;
  icon: string;
  onClick: () => void;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ title, icon, onClick }) => {
  return (
    <button className="feature-card" onClick={onClick} type="button">
      <span className="feature-card-icon">{icon}</span>
      <span className="feature-card-title">{title}</span>
    </button>
  );
};
