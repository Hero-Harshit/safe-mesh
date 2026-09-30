import { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { Users, Radio, Clock, ShieldAlert } from 'lucide-react';
import type { Incident, IncidentEvent } from './LiveMap';

interface AnalyticsProps {
  incidents: Incident[];
  liveEvents: IncidentEvent[];
}

// ----------------------------------------------------------------------------
// SIMULATION DATA (City-Scale Scale)
// ----------------------------------------------------------------------------
const SIMULATED_KPIs = {
  activeGuardians: "12,482",
  pendingIncidents: 47,
  avgHopTime: "2.1s",
  avgDispatchTime: "1m 14s",
};

const SIMULATED_NETWORK_DATA = Array.from({ length: 24 }).map((_, i) => ({
  time: `${i}:00`,
  nodes: Math.floor(8000 + Math.random() * 4000 + (i > 8 && i < 20 ? 3000 : 0)), // Peak during day
  incidents: Math.floor(Math.random() * 10 + (i > 18 || i < 2 ? 8 : 1)) // Peak at night
}));

const SIMULATED_ORIGINS = [
  { name: 'Offline BLE Relay', value: 68 },
  { name: 'Direct Web App', value: 22 },
  { name: 'Twilio Fallback', value: 10 },
];

const SIMULATED_RESPONSE_TIMES = [
  { zone: 'North', time: 1.5 },
  { zone: 'South', time: 2.2 },
  { zone: 'East', time: 1.8 },
  { zone: 'West', time: 3.1 },
  { zone: 'Central', time: 0.9 },
];

const COLORS = ['#4361ee', '#f72585', '#4cc9f0', '#7209b7', '#3f37c9'];

// ----------------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------------
export default function Analytics({ incidents, liveEvents }: AnalyticsProps) {
  const [isSimulated, setIsSimulated] = useState(false);

  // --------------------------------------------------------------------------
  // LIVE DATA CALCULATION
  // --------------------------------------------------------------------------
  const liveKPIs = useMemo(() => {
    // Unique guardians based on events
    const uniqueGuardians = new Set(liveEvents.map(e => e.guardian_id));
    const activeGuardians = uniqueGuardians.size;
    
    // Pending incidents (status !== 'resolved' and !== 'ended')
    const pendingIncidents = incidents.filter(i => i.status !== 'resolved' && i.status !== 'ended').length;

    return {
      activeGuardians: activeGuardians.toString(),
      pendingIncidents,
      avgHopTime: liveEvents.length > 0 ? "N/A (Local)" : "--",
      avgDispatchTime: incidents.length > 0 ? "Under Review" : "--",
    };
  }, [incidents, liveEvents]);

  const liveNetworkData = useMemo(() => {
    // Group incidents by hour for the live graph
    const hourCounts = new Array(24).fill(0).map((_, i) => ({ time: `${i}:00`, nodes: 0, incidents: 0 }));
    
    incidents.forEach(inc => {
      const hour = new Date(inc.created_at).getHours();
      hourCounts[hour].incidents += 1;
    });

    liveEvents.forEach(evt => {
      const hour = new Date(evt.detected_at).getHours();
      hourCounts[hour].nodes += 1; // Simplification: count pings as "node activity"
    });

    return hourCounts;
  }, [incidents, liveEvents]);

  const liveOrigins = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach(inc => {
      const source = inc.trigger_source || 'Unknown';
      counts[source] = (counts[source] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  // --------------------------------------------------------------------------
  // RENDER HELPERS
  // --------------------------------------------------------------------------
  const kpis = isSimulated ? SIMULATED_KPIs : liveKPIs;
  const networkData = isSimulated ? SIMULATED_NETWORK_DATA : liveNetworkData;
  const originsData = isSimulated ? SIMULATED_ORIGINS : liveOrigins;
  const responseData = isSimulated ? SIMULATED_RESPONSE_TIMES : []; // Hide response time for live if empty

  return (
    <div style={{ padding: '2rem', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* HEADER & TOGGLE */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>System Analytics & Network Health</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {isSimulated 
              ? "Showing simulated city-scale projection data (10,000+ nodes)" 
              : "Showing live telemetry from current database connections"}
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

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)' }}>
            <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Guardians</span>
            <Users size={18} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{kpis.activeGuardians}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)' }}>
            <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Pending Incidents</span>
            <ShieldAlert size={18} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: kpis.pendingIncidents > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
            {kpis.pendingIncidents}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)' }}>
            <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Avg Hop Time</span>
            <Radio size={18} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{kpis.avgHopTime}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)' }}>
            <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Avg Dispatch Time</span>
            <Clock size={18} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{kpis.avgDispatchTime}</div>
        </div>
      </div>

      {/* MAIN CHARTS */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', flexGrow: 1 }}>
        
        {/* WIDE CHART: Network Density */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            Network Density & Incident Volume (24h)
          </h3>
          <div style={{ flexGrow: 1, minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={networkData}>
                <defs>
                  <linearGradient id="colorNodes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="var(--danger)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--text-tertiary)" tick={{fill: 'var(--text-tertiary)', fontSize: 12}} />
                <YAxis yAxisId="left" stroke="var(--text-tertiary)" tick={{fill: 'var(--text-tertiary)', fontSize: 12}} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-tertiary)" tick={{fill: 'var(--text-tertiary)', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(20,20,22,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Area yAxisId="left" type="monotone" dataKey="nodes" stroke="var(--accent-primary)" fillOpacity={1} fill="url(#colorNodes)" name="Active Nodes" />
                <Area yAxisId="right" type="step" dataKey="incidents" stroke="var(--danger)" fillOpacity={1} fill="url(#colorIncidents)" name="Incidents" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SIDE CHARTS: Origins & Response Times */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem', flex: 3, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              Trigger Origins
            </h3>
            {originsData.length > 0 ? (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flexGrow: 1, minHeight: '130px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={originsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {originsData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(20,20,22,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.75rem', flexShrink: 0 }}>
                  {originsData.map((entry, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[idx % COLORS.length] }} />
                        {entry.name}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                No Data Available
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', flex: 2, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              Response Time (Mins)
            </h3>
            {responseData.length > 0 ? (
              <div style={{ flexGrow: 1, minHeight: '120px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={responseData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="zone" stroke="var(--text-tertiary)" tick={{fill: 'var(--text-tertiary)', fontSize: 11}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(20,20,22,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="time" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                Insufficient Data
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
