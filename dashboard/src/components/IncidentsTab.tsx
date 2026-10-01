import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  CheckCircle, 
  Clock, 
  Navigation, 
  Radio, 
  Search,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  MapPin,
  Check
} from 'lucide-react';
import type { Incident, IncidentEvent } from './LiveMap';

interface IncidentsTabProps {
  incidents: Incident[];
  liveEvents: IncidentEvent[];
}

const SIMULATED_INCIDENTS: Incident[] = [
  {
    incident_id: 'INC-8a4b2-001',
    created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(), 
    status: 'Active',
    trigger_source: 'Offline BLE Relay',
    ended_at: null,
    guardian_id: 'guard_1',
    sender_location: { coordinates: [73.8567, 18.5204], type: 'Point' }
  },
  {
    incident_id: 'INC-9x3c1-002',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    status: 'Dispatched',
    trigger_source: 'Direct Web App',
    ended_at: null,
    guardian_id: 'guard_2',
    sender_location: { coordinates: [73.8580, 18.5210], type: 'Point' }
  },
  {
    incident_id: 'INC-2v7d9-003',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: 'Resolved',
    trigger_source: 'Offline BLE Relay',
    ended_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    guardian_id: 'guard_3',
    sender_location: { coordinates: [73.8510, 18.5150], type: 'Point' }
  },
  {
    incident_id: 'INC-1b2c3-004',
    created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    status: 'Active',
    trigger_source: 'Twilio Fallback',
    ended_at: null,
    guardian_id: 'guard_4',
    sender_location: { coordinates: [73.8450, 18.5250], type: 'Point' }
  },
  {
    incident_id: 'INC-4d5e6-005',
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    status: 'Dispatched',
    trigger_source: 'Offline BLE Relay',
    ended_at: null,
    guardian_id: 'guard_5',
    sender_location: { coordinates: [73.8600, 18.5300], type: 'Point' }
  },
  {
    incident_id: 'INC-7f8g9-006',
    created_at: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
    status: 'Resolved',
    trigger_source: 'Direct Web App',
    ended_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    guardian_id: 'guard_6',
    sender_location: { coordinates: [73.8520, 18.5100], type: 'Point' }
  },
  {
    incident_id: 'INC-0h1i2-007',
    created_at: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
    status: 'Resolved',
    trigger_source: 'Twilio Fallback',
    ended_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    guardian_id: 'guard_7',
    sender_location: { coordinates: [73.8400, 18.5150], type: 'Point' }
  },
  {
    incident_id: 'INC-3j4k5-008',
    created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    status: 'Active',
    trigger_source: 'Offline BLE Relay',
    ended_at: null,
    guardian_id: 'guard_8',
    sender_location: { coordinates: [73.8650, 18.5220], type: 'Point' }
  },
  {
    incident_id: 'INC-6l7m8-009',
    created_at: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    status: 'Dispatched',
    trigger_source: 'Offline BLE Relay',
    ended_at: null,
    guardian_id: 'guard_9',
    sender_location: { coordinates: [73.8500, 18.5350], type: 'Point' }
  },
  {
    incident_id: 'INC-9n0o1-010',
    created_at: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    status: 'Resolved',
    trigger_source: 'Direct Web App',
    ended_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    guardian_id: 'guard_10',
    sender_location: { coordinates: [73.8700, 18.5180], type: 'Point' }
  },
  {
    incident_id: 'INC-2p3q4-011',
    created_at: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    status: 'Active',
    trigger_source: 'Direct Web App',
    ended_at: null,
    guardian_id: 'guard_11',
    sender_location: { coordinates: [73.8420, 18.5280], type: 'Point' }
  },
  {
    incident_id: 'INC-5r6s7-012',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: 'Dispatched',
    trigger_source: 'Twilio Fallback',
    ended_at: null,
    guardian_id: 'guard_12',
    sender_location: { coordinates: [73.8590, 18.5120], type: 'Point' }
  },
  {
    incident_id: 'INC-8t9u0-013',
    created_at: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    status: 'Resolved',
    trigger_source: 'Offline BLE Relay',
    ended_at: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
    guardian_id: 'guard_13',
    sender_location: { coordinates: [73.8480, 18.5050], type: 'Point' }
  }
];

const SIMULATED_EVENTS: IncidentEvent[] = [
  { id: '1', incident_id: 'INC-8a4b2-001', guardian_id: 'guard_alpha_99', detected_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(), latitude: 18.5204, longitude: 73.8567, location: { type: 'Point', coordinates: [73.8567, 18.5204] }, rssi: -65 },
  { id: '2', incident_id: 'INC-8a4b2-001', guardian_id: 'guard_beta_42', detected_at: new Date(Date.now() - 1000 * 60 * 1.5).toISOString(), latitude: 18.5209, longitude: 73.8572, location: { type: 'Point', coordinates: [73.8572, 18.5209] }, rssi: -72 },
  { id: '3', incident_id: 'INC-8a4b2-001', guardian_id: 'guard_delta_17', detected_at: new Date(Date.now() - 1000 * 60 * 1).toISOString(), latitude: 18.5215, longitude: 73.8580, location: { type: 'Point', coordinates: [73.8580, 18.5215] }, rssi: -60 },
  
  { id: '4', incident_id: 'INC-9x3c1-002', guardian_id: 'guard_gamma_11', detected_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(), latitude: 18.5210, longitude: 73.8580, location: { type: 'Point', coordinates: [73.8580, 18.5210] }, rssi: -80 },
  
  { id: '5', incident_id: 'INC-2v7d9-003', guardian_id: 'guard_zeta_88', detected_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), latitude: 18.5150, longitude: 73.8510, location: { type: 'Point', coordinates: [73.8510, 18.5150] }, rssi: -90 },
  { id: '6', incident_id: 'INC-2v7d9-003', guardian_id: 'guard_eta_22', detected_at: new Date(Date.now() - 1000 * 60 * 43).toISOString(), latitude: 18.5155, longitude: 73.8505, location: { type: 'Point', coordinates: [73.8505, 18.5155] }, rssi: -85 },

  { id: '7', incident_id: 'INC-3j4k5-008', guardian_id: 'guard_theta_33', detected_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(), latitude: 18.5220, longitude: 73.8650, location: { type: 'Point', coordinates: [73.8650, 18.5220] }, rssi: -70 },
  { id: '8', incident_id: 'INC-3j4k5-008', guardian_id: 'guard_iota_44', detected_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(), latitude: 18.5225, longitude: 73.8645, location: { type: 'Point', coordinates: [73.8645, 18.5225] }, rssi: -65 },
  { id: '9', incident_id: 'INC-3j4k5-008', guardian_id: 'guard_kappa_55', detected_at: new Date(Date.now() - 1000 * 60 * 1).toISOString(), latitude: 18.5230, longitude: 73.8640, location: { type: 'Point', coordinates: [73.8640, 18.5230] }, rssi: -60 },

  { id: '10', incident_id: 'INC-4d5e6-005', guardian_id: 'guard_lambda_66', detected_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(), latitude: 18.5300, longitude: 73.8600, location: { type: 'Point', coordinates: [73.8600, 18.5300] }, rssi: -75 },
  { id: '11', incident_id: 'INC-4d5e6-005', guardian_id: 'guard_mu_77', detected_at: new Date(Date.now() - 1000 * 60 * 17).toISOString(), latitude: 18.5295, longitude: 73.8605, location: { type: 'Point', coordinates: [73.8605, 18.5295] }, rssi: -70 },

  { id: '12', incident_id: 'INC-6l7m8-009', guardian_id: 'guard_nu_88', detected_at: new Date(Date.now() - 1000 * 60 * 22).toISOString(), latitude: 18.5350, longitude: 73.8500, location: { type: 'Point', coordinates: [73.8500, 18.5350] }, rssi: -82 },
  { id: '13', incident_id: 'INC-6l7m8-009', guardian_id: 'guard_xi_99', detected_at: new Date(Date.now() - 1000 * 60 * 21).toISOString(), latitude: 18.5345, longitude: 73.8505, location: { type: 'Point', coordinates: [73.8505, 18.5345] }, rssi: -78 },

  { id: '14', incident_id: 'INC-8t9u0-013', guardian_id: 'guard_omicron_11', detected_at: new Date(Date.now() - 1000 * 60 * 110).toISOString(), latitude: 18.5050, longitude: 73.8480, location: { type: 'Point', coordinates: [73.8480, 18.5050] }, rssi: -88 },
  { id: '15', incident_id: 'INC-8t9u0-013', guardian_id: 'guard_pi_22', detected_at: new Date(Date.now() - 1000 * 60 * 105).toISOString(), latitude: 18.5055, longitude: 73.8475, location: { type: 'Point', coordinates: [73.8475, 18.5055] }, rssi: -85 },
  { id: '16', incident_id: 'INC-8t9u0-013', guardian_id: 'guard_rho_33', detected_at: new Date(Date.now() - 1000 * 60 * 100).toISOString(), latitude: 18.5060, longitude: 73.8470, location: { type: 'Point', coordinates: [73.8470, 18.5060] }, rssi: -80 },
];

export default function IncidentsTab({ incidents, liveEvents }: IncidentsTabProps) {
  const [isSimulated, setIsSimulated] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Active' | 'Dispatched' | 'Resolved'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Use simulated data if toggled
  const currentIncidents = isSimulated ? SIMULATED_INCIDENTS : incidents;
  const currentLiveEvents = isSimulated ? SIMULATED_EVENTS : liveEvents;

  // Filter and Search Logic
  const filteredIncidents = useMemo(() => {
    let result = currentIncidents;
    
    if (filter !== 'All') {
      if (filter === 'Active') {
        result = result.filter(i => i.status !== 'Resolved' && i.status !== 'Dispatched' && i.status !== 'ended');
      } else {
        result = result.filter(i => i.status === filter);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => 
        i.incident_id.toLowerCase().includes(q) || 
        (i.trigger_source || '').toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [currentIncidents, filter, searchQuery]);

  // Group events by incident for the Mesh Trail
  const eventsByIncident = useMemo(() => {
    const map: Record<string, IncidentEvent[]> = {};
    currentLiveEvents.forEach(evt => {
      if (!map[evt.incident_id]) map[evt.incident_id] = [];
      map[evt.incident_id].push(evt);
    });
    
    // Sort events inside each incident by time (oldest first)
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => new Date(a.detected_at).getTime() - new Date(b.detected_at).getTime());
    });
    return map;
  }, [currentLiveEvents]);

  const handleUpdateStatus = async (incidentId: string, newStatus: string) => {
    setIsUpdating(incidentId);
    try {
      const { error } = await supabase
        .from('incidents')
        .update({ status: newStatus })
        .eq('incident_id', incidentId);
        
      if (error) {
        console.error("Failed to update status:", error);
        alert("Error updating status. Check console.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'resolved' || s === 'ended') return 'var(--success)';
    if (s === 'dispatched') return 'var(--accent-primary)';
    return 'var(--danger)'; // active/new
  };

  const formatTimeElapsed = (createdAt: string, status: string) => {
    if (status === 'Resolved' || status === 'ended') return 'Closed';
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const hours = Math.floor(diffMins / 60);
    return `${hours}h ${diffMins % 60}m ago`;
  };

  return (
    <div style={{ padding: '2rem', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* HEADER & FILTERS */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Active Operations</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {isSimulated ? "Showing simulated hackathon data" : "Manage and dispatch units to active emergencies."}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.4)', padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isSimulated ? 'var(--text-secondary)' : 'var(--accent-primary)' }}>
            LIVE DATA
          </span>
          
          <div 
            onClick={() => setIsSimulated(!isSimulated)}
            style={{ 
              width: '44px', height: '24px', borderRadius: '12px', 
              background: isSimulated ? 'var(--danger)' : 'var(--bg-hover)',
              position: 'relative', cursor: 'pointer', transition: 'all 0.3s ease'
            }}
          >
            <div style={{
              width: '18px', height: '18px', borderRadius: '50%', background: 'white',
              position: 'absolute', top: '3px', left: isSimulated ? '23px' : '3px',
              transition: 'all 0.3s ease', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }}/>
          </div>

          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isSimulated ? 'var(--danger)' : 'var(--text-secondary)' }}>
            SIMULATION
          </span>
        </div>
      </div>
      
      {/* FILTER BAR */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '-0.5rem' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input 
              type="text" 
              placeholder="Search ID or Source..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '0.5rem 1rem 0.5rem 2.25rem', borderRadius: '0.5rem',
                color: 'var(--text-primary)', outline: 'none', width: '200px'
              }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.25rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            {(['All', 'Active', 'Dispatched', 'Resolved'] as const).map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? 'var(--bg-hover)' : 'transparent',
                  color: filter === f ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  border: 'none', padding: '0.5rem 1rem', borderRadius: '0.25rem',
                  fontWeight: filter === f ? 600 : 400, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        
      {/* INCIDENTS LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1 }}>
        {filteredIncidents.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5, color: 'var(--success)' }} />
            <h3>No incidents found</h3>
            <p style={{ fontSize: '0.9rem' }}>The mesh network is currently clear.</p>
          </div>
        ) : (
          filteredIncidents.map(incident => {
            const isExpanded = expandedId === incident.incident_id;
            const trail = eventsByIncident[incident.incident_id] || [];
            const statusColor = getStatusColor(incident.status);
            
            return (
              <div key={incident.incident_id} className="glass-panel" style={{ padding: '0', overflow: 'hidden', transition: 'all 0.3s ease', borderLeft: `4px solid ${statusColor}` }}>
                
                {/* CARD HEADER (Always Visible) */}
                <div 
                  style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : incident.incident_id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: statusColor, boxShadow: `0 0 10px ${statusColor}` }} />
                    
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '1px' }}>
                        {incident.incident_id.split('-')[0]}-{incident.incident_id.split('-')[1]}
                      </h3>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={14} /> {formatTimeElapsed(incident.created_at, incident.status)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Radio size={14} /> {incident.trigger_source || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <span style={{ fontWeight: 600, color: statusColor, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>
                      {incident.status || 'Active'}
                    </span>
                    {isExpanded ? <ChevronUp size={20} color="var(--text-tertiary)" /> : <ChevronDown size={20} color="var(--text-tertiary)" />}
                  </div>
                </div>

                {/* EXPANDED MESH TRAIL & ACTIONS */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    
                    {/* Mesh Trail Timeline */}
                    <div>
                      <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Navigation size={16} /> Mesh Event Trail
                      </h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                        {/* Vertical line connecting timeline dots */}
                        {trail.length > 1 && (
                          <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '10px', width: '2px', background: 'rgba(255,255,255,0.1)' }} />
                        )}
                        
                        {/* Initial Trigger */}
                        <div style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1 }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />
                          </div>
                          <div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Initial SOS Triggered ({incident.trigger_source})</p>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{new Date(incident.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        {/* Hop Events */}
                        {trail.map((evt, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1 }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--bg-panel)', border: '2px solid var(--accent-primary)', marginTop: '2px' }} />
                            <div>
                              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                Signal relayed by Guardian <span style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>#{evt.guardian_id.substring(0,6)}</span>
                              </p>
                              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                                <span>{new Date(evt.detected_at).toLocaleTimeString()}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <MapPin size={12} /> {(evt.latitude ?? evt.location?.coordinates[1] ?? 0).toFixed(4)}, {(evt.longitude ?? evt.location?.coordinates[0] ?? 0).toFixed(4)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {trail.length === 0 && (
                          <div style={{ paddingLeft: '2rem', fontSize: '0.85rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                            No offline mesh hops recorded yet.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Command Actions
                      </h4>
                      
                      <button 
                        disabled={incident.status === 'Dispatched' || isUpdating === incident.incident_id}
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(incident.incident_id, 'Dispatched'); }}
                        style={{ 
                          width: '100%', padding: '0.75rem', 
                          background: incident.status === 'Dispatched' ? 'rgba(255,255,255,0.05)' : 'var(--accent-primary)', 
                          color: incident.status === 'Dispatched' ? 'var(--text-tertiary)' : '#fff',
                          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', 
                          fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                          cursor: incident.status === 'Dispatched' ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <ShieldAlert size={18} />
                        {incident.status === 'Dispatched' ? 'Unit Dispatched' : 'Dispatch Unit'}
                      </button>

                      <button 
                        disabled={incident.status === 'Resolved' || isUpdating === incident.incident_id}
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(incident.incident_id, 'Resolved'); }}
                        style={{ 
                          width: '100%', padding: '0.75rem', 
                          background: incident.status === 'Resolved' ? 'rgba(255,255,255,0.05)' : 'var(--success)', 
                          color: incident.status === 'Resolved' ? 'var(--text-tertiary)' : '#fff',
                          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', 
                          fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                          cursor: incident.status === 'Resolved' ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Check size={18} />
                        {incident.status === 'Resolved' ? 'Incident Closed' : 'Mark Resolved'}
                      </button>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
