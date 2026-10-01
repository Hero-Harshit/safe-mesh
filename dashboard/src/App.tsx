import { useState, useEffect } from 'react'
import { Map as MapIcon, AlertTriangle, Activity, Users, X } from 'lucide-react'
import './App.css'
import LiveMap from './components/LiveMap'
import Analytics from './components/Analytics'
import IncidentsTab from './components/IncidentsTab'
import PersonnelTab from './components/PersonnelTab'
import type { Incident, IncidentEvent } from './components/LiveMap'
import { supabase } from './lib/supabase'

function App() {
  const [activeTab, setActiveTab] = useState('map')
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([])
  const [liveEvents, setLiveEvents] = useState<IncidentEvent[]>([])
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false)

  useEffect(() => {
    // 1. Fetch initial incidents
    const fetchRecent = async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) console.error("Error fetching incidents:", error)
      else if (data) setRecentIncidents(data)
    }
    
    fetchRecent()

    // 2. Subscribe to real-time changes on incidents
    const incidentsChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents' },
        (payload) => {
          setRecentIncidents((prev) => [payload.new as Incident, ...prev].slice(0, 50))
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incidents' },
        (payload) => {
          setRecentIncidents((prev) => 
            prev.map(inc => inc.incident_id === payload.new.incident_id ? (payload.new as Incident) : inc)
          )
        }
      )
      .subscribe()

    // 3. Subscribe to real-time location updates (incident_events)
    const eventsChannel = supabase
      .channel('schema-events-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incident_events' },
        (payload) => {
          setLiveEvents((prev) => [...prev, payload.new as IncidentEvent])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(incidentsChannel)
      supabase.removeChannel(eventsChannel)
    }
  }, [])

  return (
    <div className="dashboard-layout">
      {/* Map Layer (Background) */}
      <div className="map-container-wrapper">
        {/* The Map is ALWAYS rendered in the background */}
        <LiveMap 
          incidents={recentIncidents} 
          liveEvents={liveEvents} 
        />
        {/* End of Map Layer */}
        
        {activeTab === 'analytics' && (
          <div style={{ position: 'absolute', top: 0, left: 250, right: 0, bottom: 0, zIndex: 20, background: 'rgba(10,10,14,0.7)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', overflow: 'hidden', pointerEvents: 'auto' }}>
             <Analytics incidents={recentIncidents} liveEvents={liveEvents} />
          </div>
        )}
        
        {activeTab === 'incidents' && (
          <div style={{ position: 'absolute', top: 0, left: 250, right: 0, bottom: 0, zIndex: 20, background: 'rgba(10,10,14,0.7)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', overflow: 'hidden', pointerEvents: 'auto' }}>
             <IncidentsTab incidents={recentIncidents} liveEvents={liveEvents} />
          </div>
        )}
        
        {activeTab === 'personnel' && (
          <div style={{ position: 'absolute', top: 0, left: 250, right: 0, bottom: 0, zIndex: 20, background: 'rgba(10,10,14,0.7)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', overflow: 'hidden', pointerEvents: 'auto' }}>
            <PersonnelTab />
          </div>
        )}
      </div>

      {/* UI Overlay */}
      <div className="ui-overlay">
        {/* Left Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1>
              <span style={{ color: 'var(--danger)' }}>Safety</span> <span className="gradient-text">Mesh<br/>Overwatch</span>
            </h1>
          </div>
          
          <nav className="sidebar-nav">
            <div 
              className={`nav-item ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              <MapIcon size={20} />
              <span>Live Map</span>
            </div>
            <div 
              className={`nav-item ${activeTab === 'incidents' ? 'active' : ''}`}
              onClick={() => setActiveTab('incidents')}
            >
              <AlertTriangle size={20} />
              <span>Incidents</span>
            </div>
            <div 
              className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <Activity size={20} />
              <span>Analytics</span>
            </div>
            <div 
              className={`nav-item ${activeTab === 'personnel' ? 'active' : ''}`}
              onClick={() => setActiveTab('personnel')}
            >
              <Users size={20} />
              <span>Personnel</span>
            </div>
          </nav>
          
        </aside>

        {/* FLOATING ALERTS PILL (Only on Map Tab) */}
        {activeTab === 'map' && (
          <div 
            onClick={() => setIsAlertsModalOpen(!isAlertsModalOpen)}
            className="glass-panel" 
            style={{ 
              position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 50, 
              padding: '0.5rem 1.25rem', borderRadius: '2rem', cursor: 'pointer', 
              display: 'flex', alignItems: 'center', gap: '0.75rem', 
              background: 'rgba(20,20,25,0.8)', border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)', transition: 'all 0.2s ease',
              pointerEvents: 'auto'
            }}
          >
            <AlertTriangle size={18} color="var(--danger)" />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Alerts</span>
            <span style={{ 
              background: 'var(--danger)', color: 'white', padding: '0.1rem 0.6rem', 
              borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 700 
            }}>
              {recentIncidents.filter(i => i.status === 'Active' || i.status === 'Dispatched').length}
            </span>
          </div>
        )}

        {/* ALERTS MODAL */}
        {activeTab === 'map' && isAlertsModalOpen && (
          <div className="glass-panel" style={{ 
            position: 'absolute', top: '4.5rem', right: '1.5rem', width: '350px', maxHeight: '70vh', 
            zIndex: 50, display: 'flex', flexDirection: 'column', 
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)', borderRadius: '1rem', overflow: 'hidden',
            pointerEvents: 'auto'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} />
                Recent Alerts
              </h2>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-tertiary)' }} onClick={() => setIsAlertsModalOpen(false)} />
            </div>
            
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(20,20,25,0.6)' }}>
              {recentIncidents.length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem' }}>No recent incidents found.</p>
              ) : (
                recentIncidents.map(incident => (
                  <div key={incident.incident_id} style={{ 
                    background: 'rgba(0,0,0,0.4)', 
                    borderLeft: `3px solid ${incident.status === 'Resolved' ? 'var(--success)' : incident.status === 'Dispatched' ? 'var(--accent-primary)' : 'var(--danger)'}`, 
                    padding: '1rem', borderRadius: '0.5rem' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                        {incident.incident_id.includes('-') 
                          ? incident.incident_id.split('-').slice(0, 2).join('-') 
                          : incident.incident_id.slice(0, 16)}
                      </span>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                        {new Date(incident.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {incident.trigger_source || 'Unknown Source'}
                    </div>
                    <div style={{ 
                      marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase',
                      color: incident.status === 'Resolved' ? 'var(--success)' : incident.status === 'Dispatched' ? 'var(--accent-primary)' : 'var(--danger)' 
                    }}>
                      {incident.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App


