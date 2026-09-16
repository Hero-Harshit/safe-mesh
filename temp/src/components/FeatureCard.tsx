interface FeatureCardProps {
  title: string;
  icon: string;
  onClick: () => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, icon, onClick }) => (
  <button
    className="feature-card"
    onClick={onClick}
    type="button"
    aria-label={title}
  >
    <span className="feature-card__icon" aria-hidden="true">{icon}</span>
    <span className="feature-card__title">{title}</span>
  </button>
);

export default FeatureCard;
