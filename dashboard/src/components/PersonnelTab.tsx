import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  Search,
  ChevronDown,
  ChevronUp,
  Phone,
  Droplet,
  HeartPulse,
  Activity,
  Trash2
} from 'lucide-react';

export interface CitizenProfile {
  id: string;
  full_name: string;
  phone_number: string;
  age: string | null;
  blood_group: string | null;
  medical_conditions: string | null;
  primary_contact_name: string | null;
  primary_contact_phone: string | null;
  created_at?: string;
}

export default function PersonnelTab() {
  const [users, setUsers] = useState<CitizenProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | '18-25' | '26-40' | '41+'>('All');
  const [bloodFilter, setBloodFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('citizen_profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (data) {
          setUsers(data as CitizenProfile[]);
        }
      } catch (error) {
        console.error("Error fetching citizen_profiles:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();

    // Subscribe to real-time changes
    const usersChannel = supabase
      .channel('schema-db-changes-personnel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'citizen_profiles' },
        () => {
          fetchUsers(); // Simply refetch on any change for now
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
    };
  }, []);

  const handleDeleteUser = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    
    try {
      const { error } = await supabase.from('citizen_profiles').delete().eq('id', id);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user.");
    }
  };

  const filteredUsers = useMemo(() => {
    let result = users;
    
    // Apply age filter
    if (filter !== 'All') {
      result = result.filter(u => {
        if (!u.age) return false;
        const ageNum = parseInt(u.age, 10);
        if (isNaN(ageNum)) return false;
        
        if (filter === '18-25') return ageNum >= 18 && ageNum <= 25;
        if (filter === '26-40') return ageNum >= 26 && ageNum <= 40;
        if (filter === '41+') return ageNum >= 41;
        return true;
      });
    }

    // Apply blood filter
    if (bloodFilter !== 'All') {
      result = result.filter(u => u.blood_group === bloodFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u => 
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.phone_number || '').includes(q) ||
        (u.id || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [users, filter, searchQuery]);

  return (
    <div style={{ width: '100%', height: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
      
      {/* HEADER & FILTERS */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: 0, zIndex: 10 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)' }}>
              <Users size={24} color="var(--accent-primary)" />
              Personnel Directory
            </h2>
            <p style={{ color: 'var(--text-tertiary)', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
              Monitoring {filteredUsers.length} registered citizens
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={18} color="var(--text-tertiary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search name, phone, or ID..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.5rem',
                color: 'var(--text-primary)', outline: 'none', width: '300px',
                fontSize: '0.95rem'
              }}
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.25rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)', width: 'fit-content' }}>
            {(['All', '18-25', '26-40', '41+'] as const).map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? 'var(--bg-hover)' : 'transparent',
                  color: filter === f ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  border: 'none', padding: '0.5rem 1.25rem', borderRadius: '0.25rem',
                  fontWeight: filter === f ? 600 : 400, cursor: 'pointer', transition: 'all 0.2s',
                  fontSize: '0.9rem'
                }}
              >
                Age: {f}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.25rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)', width: 'fit-content', alignItems: 'center' }}>
             <Droplet size={14} color="#EF4444" style={{ marginLeft: '0.5rem' }} />
             <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', marginRight: '0.5rem' }}>Blood Group:</span>
             <select 
                value={bloodFilter} 
                onChange={(e) => setBloodFilter(e.target.value)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  paddingRight: '0.5rem'
                }}
             >
                <option value="All" style={{ color: '#000' }}>All</option>
                <option value="A+" style={{ color: '#000' }}>A+</option>
                <option value="A-" style={{ color: '#000' }}>A-</option>
                <option value="B+" style={{ color: '#000' }}>B+</option>
                <option value="B-" style={{ color: '#000' }}>B-</option>
                <option value="AB+" style={{ color: '#000' }}>AB+</option>
                <option value="AB-" style={{ color: '#000' }}>AB-</option>
                <option value="O+" style={{ color: '#000' }}>O+</option>
                <option value="O-" style={{ color: '#000' }}>O-</option>
             </select>
          </div>
        </div>
      </div>
      
      {/* PERSONNEL LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1, paddingBottom: '2rem' }}>
        {isLoading ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={48} className="animate-spin" style={{ marginBottom: '1rem', opacity: 0.5, color: 'var(--accent-primary)' }} />
            <p>Loading records...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5, color: 'var(--text-tertiary)' }} />
            <h3>No personnel found</h3>
            <p style={{ fontSize: '0.9rem' }}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          filteredUsers.map(user => {
            const isExpanded = expandedId === user.id;
            
            return (
              <div key={user.id} className="glass-panel" style={{ padding: '0', overflow: 'hidden', transition: 'all 0.3s ease', borderLeft: `4px solid var(--accent-primary)` }}>
                
                {/* CARD HEADER */}
                <div 
                  style={{ padding: '1.25rem 1.5rem', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : user.id)}
                >
                  {/* Name & ID */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                      {(user.full_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        {user.full_name || 'Unknown User'}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                        ID: {user.id.slice(0, 12)}...
                      </span>
                    </div>
                  </div>

                  {/* Phone */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <Phone size={16} color="var(--text-tertiary)" />
                    <span style={{ fontSize: '0.9rem' }}>{user.phone_number || 'N/A'}</span>
                  </div>

                  {/* Quick Stats */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
                    <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Age</span> {user.age || '--'}
                    </span>
                    <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Droplet size={14} color="#EF4444" /> {user.blood_group || '--'}
                    </span>
                  </div>

                  {/* Actions & Expand Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button 
                      onClick={(e) => handleDeleteUser(user.id, e)}
                      title="Delete User"
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', border: 'none', padding: '0.4rem', 
                        borderRadius: '0.25rem', cursor: 'pointer', color: 'var(--danger)', 
                        display: 'flex', alignItems: 'center', transition: 'all 0.2s' 
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                    {isExpanded ? <ChevronUp size={20} color="var(--text-tertiary)" /> : <ChevronDown size={20} color="var(--text-tertiary)" />}
                  </div>
                </div>

                {/* EXPANDED DETAILS */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    
                    {/* Medical Info */}
                    <div>
                      <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <HeartPulse size={16} color="#EF4444" /> Medical Profile
                      </h4>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>Blood Group:</span>
                          <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>{user.blood_group || 'Not specified'}</span>
                          
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>Medical Conditions:</span>
                          <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{user.medical_conditions || 'None reported'}</span>
                          
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>Registered On:</span>
                          <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contacts */}
                    <div>
                      <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={16} color="var(--accent-primary)" /> Emergency Contacts
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {user.primary_contact_name || user.primary_contact_phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Phone size={16} color="var(--success)" />
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600 }}>
                                {user.primary_contact_name || 'Primary Contact'}
                              </div>
                              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: '0.1rem' }}>
                                {user.primary_contact_phone || 'No phone provided'}
                              </div>
                            </div>
                            <div style={{ marginLeft: 'auto' }}>
                              <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', padding: '0.2rem 0.5rem', borderRadius: '1rem', textTransform: 'uppercase', fontWeight: 600 }}>
                                Primary
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.9rem', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', textAlign: 'center' }}>
                            No emergency contacts registered.
                          </div>
                        )}
                      </div>
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
