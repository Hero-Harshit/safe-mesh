import { useState, useEffect } from 'react'
import { Map, AlertTriangle, Activity, Users, Radio, Clock, Navigation } from 'lucide-react'
import './App.css'
import LiveMap from './components/LiveMap'
import Analytics from './components/Analytics'
import type { Incident, IncidentEvent } from './components/LiveMap'
import { supabase } from './lib/supabase'

function App() {
  const [activeTab, setActiveTab] = useState('map')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([])
  const [liveEvents, setLiveEvents] = useState<IncidentEvent[]>([])

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
          setSelectedIncident((prev) => 
            prev?.incident_id === payload.new.incident_id ? (payload.new as Incident) : prev
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
        {activeTab === 'map' ? (
          <LiveMap 
            onIncidentSelect={setSelectedIncident} 
            incidents={recentIncidents} 
            liveEvents={liveEvents} 
          />
        ) : activeTab === 'analytics' ? (
          <div style={{ position: 'absolute', top: 0, left: 250, right: 350, bottom: 0, zIndex: 20, background: 'rgba(10,10,14,0.95)', overflow: 'hidden' }}>
             <Analytics incidents={recentIncidents} liveEvents={liveEvents} />
          </div>
        ) : (
          <div className="map-placeholder" style={{ marginLeft: '250px', marginRight: '350px' }}>
            <div style={{ textAlign: 'center' }}>
              <Activity size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module Pending</p>
            </div>
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
              <Map size={20} />
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

        {/* Right Side Panel */}
        <aside className="side-panel">
          <div className="side-panel-header">
            <h2>Active Alerts</h2>
          </div>
          <div className="side-panel-content">
            {selectedIncident ? (
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', padding: '0.5rem', borderRadius: '50%' }}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Selected Incident</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>ID: {selectedIncident.incident_id.slice(0, 8)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} /> <span>{new Date(selectedIncident.created_at).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Navigation size={16} /> 
                    <span>
                      {selectedIncident.sender_location?.coordinates 
                        ? `${selectedIncident.sender_location.coordinates[1].toFixed(4)}, ${selectedIncident.sender_location.coordinates[0].toFixed(4)}`
                        : 'Unknown Location'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={16} /> <span style={{ 
                      color: selectedIncident.status === 'Resolved' ? 'var(--success)' : 
                             selectedIncident.status === 'Dispatched' ? 'var(--accent-primary)' : 'var(--warning)'
                    }}>{selectedIncident.status}</span>
                  </div>
                </div>
                <button style={{ 
                  width: '100%', padding: '0.75rem', marginTop: '1rem', 
                  backgroundColor: 'var(--accent-primary)', color: 'white', 
                  borderRadius: '0.5rem', fontWeight: 'bold' 
                }}>
                  Dispatch Unit
                </button>
              </div>
            ) : null}

            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: selectedIncident ? '1rem' : '0' }}>
              Recent Activity
            </h3>
            
            {recentIncidents.slice(0, 10).map(inc => (
              <div key={inc.incident_id} className="glass-panel" style={{ padding: '1rem', cursor: 'pointer', transition: 'border-color 0.2s' }}
                   onClick={() => setSelectedIncident(inc)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.5rem', borderRadius: '50%' }}>
                    <Radio size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Emergency Ping</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {new Date(inc.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {recentIncidents.length === 0 && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                No recent activity.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default App


