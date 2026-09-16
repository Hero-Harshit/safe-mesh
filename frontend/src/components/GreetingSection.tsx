import React from 'react';

export const GreetingSection: React.FC = () => {
  return (
    <section className="greeting-section" aria-label="Greeting">
      <h1 className="greeting-title">Stay safe.</h1>
      <p className="greeting-subtitle">Everything you need, one tap away.</p>
    </section>
  );
};

export default GreetingSection;
