import { useState, useEffect } from 'react';
import Home from './pages/Home';
import NearbyGuardianSetup from './pages/NearbyGuardianSetup';
import { initNativeBridge } from './services/native';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('home');

  useEffect(() => {
    initNativeBridge();
  }, []);

  return (
    <div className="app">
      {currentView === 'home' && <Home onNavigate={setCurrentView} />}
      {currentView === 'nearby_guardian' && <NearbyGuardianSetup onBack={() => setCurrentView('home')} />}
    </div>
  );
}
