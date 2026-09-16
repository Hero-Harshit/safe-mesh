import { useState, useCallback, useEffect } from 'react';
import Header from '../components/Header';
import FeatureCard from '../components/FeatureCard';
import StatusMessage from '../components/StatusMessage';

const CARDS = [
  { title: 'Emergency',          icon: '🚨', message: 'Emergency module coming soon.'          },
  { title: 'Safe Route',         icon: '🗺️', message: 'Safe Route module coming soon.'         },
  { title: 'Emergency Contacts', icon: '👥', message: 'Emergency Contacts module coming soon.' },
  { title: '112',                icon: '📞', message: '112 integration coming soon.'            },
  { title: 'Nearby Guardian',    icon: '🛡️', message: 'Nearby Guardian module coming soon.'    },
  { title: 'Settings',           icon: '⚙️', message: 'Settings coming soon.'                  },
] as const;

export default function Home({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <>
      <Header />
      <main className="features-grid" aria-label="SafeHelp features">
        {CARDS.map(({ title, icon, message }) => (
          <FeatureCard
            key={title}
            title={title}
            icon={icon}
            onClick={() => {
              if (title === 'Nearby Guardian') {
                onNavigate('nearby_guardian');
              } else {
                showToast(message);
              }
            }}
          />
        ))}
      </main>
      <StatusMessage message={toast} />
    </>
  );
}
