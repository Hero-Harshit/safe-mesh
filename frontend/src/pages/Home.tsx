import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { FeatureCard } from '../components/FeatureCard';
import { StatusMessage } from '../components/StatusMessage';

export default function Home() {
  const [activeMessage, setActiveMessage] = useState<string | null>(null);

  const showMessage = (msg: string) => {
    setActiveMessage(msg);
  };

  useEffect(() => {
    if (activeMessage) {
      const timer = setTimeout(() => {
        setActiveMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeMessage]);

  return (
    <>
      <Header />
      <main className="features-grid">
        <FeatureCard 
          title="Emergency" 
          icon="🚨" 
          onClick={() => showMessage("Emergency module coming soon.")} 
        />
        <FeatureCard 
          title="Safe Route" 
          icon="🗺️" 
          onClick={() => showMessage("Safe Route module coming soon.")} 
        />
        <FeatureCard 
          title="Contacts" 
          icon="👥" 
          onClick={() => showMessage("Emergency Contacts module coming soon.")} 
        />
        <FeatureCard 
          title="112" 
          icon="📞" 
          onClick={() => showMessage("112 integration coming soon.")} 
        />
        <FeatureCard 
          title="Nearby Guardian" 
          icon="🛡️" 
          onClick={() => showMessage("Nearby Guardian module coming soon.")} 
        />
        <FeatureCard 
          title="Settings" 
          icon="⚙️" 
          onClick={() => showMessage("Settings coming soon.")} 
        />
      </main>
      <StatusMessage message={activeMessage} />
    </>
  );
}
