import React, { useState } from 'react';
import { UsersIcon, PhoneCallIcon } from './Icons';
import type { EmergencyContact } from '../services/emergency';
import { generateSmsLink, triggerHaptic } from '../services/emergency';
import { pickNativeContact } from '../services/native';

interface EmergencyContactsModalProps {
  contacts: EmergencyContact[];
  onAddContact: (contact: Omit<EmergencyContact, 'id'>) => void;
  onDeleteContact: (id: string) => void;
  currentMapsUrl?: string;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const EmergencyContactsModal: React.FC<EmergencyContactsModalProps> = ({
  contacts,
  onAddContact,
  onDeleteContact,
  currentMapsUrl,
  onClose,
  onShowToast,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState<'Family' | 'Friend' | 'Police' | 'Guardian' | 'Other'>('Family');
  const [isPrimary, setIsPrimary] = useState(false);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      onShowToast('Please provide both name and phone number');
      return;
    }

    const normalize = (num: string) => num.replace(/[\s\-()]+/g, '');
    const cleanPhone = normalize(phone);

    if (cleanPhone.length < 5) {
      onShowToast('Please enter a valid phone number');
      return;
    }

    const exists = contacts.some((c) => normalize(c.phone) === cleanPhone);
    if (exists) {
      onShowToast('This phone number is already in your emergency contacts.');
      return;
    }

    onAddContact({
      name: name.trim(),
      phone: phone.trim(),
      relation,
      isPrimary: isPrimary || contacts.length === 0,
    });

    triggerHaptic(50);
    onShowToast(`Added ${name.trim()} to Emergency Contacts`);
    setName('');
    setPhone('');
    setIsPrimary(false);
    setShowAddForm(false);
  };

  const handleAddNativeContact = async () => {
    try {
      const contact = await pickNativeContact();
      if (contact && contact.phone) {
        // Basic normalization to detect exact matches
        const normalize = (num: string) => num.replace(/[\s\-()]+/g, '');
        const newPhone = normalize(contact.phone);

        const exists = contacts.some((c) => normalize(c.phone) === newPhone);

        if (exists) {
          onShowToast('This contact is already an emergency contact.');
          return;
        }

        onAddContact({
          name: contact.name || 'Emergency Contact',
          phone: contact.phone,
          relation: 'Other',
          isPrimary: contacts.length === 0,
        });

        triggerHaptic(50);
        onShowToast(`Added ${contact.name} to Emergency Contacts`);
      } else {
        // Native picker was cancelled or unavailable on current device: open manual form
        setShowAddForm(true);
      }
    } catch (e) {
      console.error('Failed to pick contact', e);
      setShowAddForm(true);
    }
  };

  const handleSendSms = (contact: EmergencyContact) => {
    const link = generateSmsLink(contact.phone, currentMapsUrl);
    window.location.href = link;
  };

  return (
    <div 
      className="safetymesh-modal-backdrop" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="safetymesh-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-pill-indicator"></div>

        <div className="modal-sheet-header">
          <div className="modal-title-group">
            <div className="modal-icon-bubble bg-purple-tint">
              <UsersIcon size={22} color="#8B5CF6" />
            </div>
            <div>
              <h2 className="modal-sheet-title">Emergency Contacts</h2>
              <span className="modal-sheet-subtitle">Reach your trusted circle</span>
            </div>
          </div>
          <button className="modal-close-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-sheet-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#1E293B' }}>
              {contacts.length} Trusted {contacts.length === 1 ? 'Contact' : 'Contacts'}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6', padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', border: '1px solid #E0E7FF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                onClick={() => setShowAddForm(!showAddForm)}
              >
                {showAddForm ? '✕ Close' : '+ Add'}
              </button>
              <button
                style={{ backgroundColor: '#F1F5F9', color: '#475569', padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', border: '1px solid #E2E8F0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                onClick={handleAddNativeContact}
                title="Import from phone address book"
              >
                <UsersIcon size={14} color="#475569" />
                Phone Book
              </button>
            </div>
          </div>

          {/* Inline Add Contact Form */}
          {showAddForm && (
            <form onSubmit={handleManualSubmit} style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#1E293B', fontWeight: 'bold' }}>New Emergency Contact</h3>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mom, Best Friend, Roommate"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                  autoFocus
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Relation</label>
                  <select
                    value={relation}
                    onChange={(e) => setRelation(e.target.value as any)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box', backgroundColor: 'white' }}
                  >
                    <option value="Family">Family</option>
                    <option value="Friend">Friend</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Police">Police</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155', cursor: 'pointer', fontWeight: '500' }}>
                    <input
                      type="checkbox"
                      checked={isPrimary}
                      onChange={(e) => setIsPrimary(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#8B5CF6' }}
                    />
                    Set Primary
                  </label>
                </div>
              </div>

              <button
                type="submit"
                style={{ width: '100%', padding: '12px', fontSize: '14px', backgroundColor: '#8B5CF6', color: 'white', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}
              >
                Save Contact
              </button>
            </form>
          )}

          {contacts.length === 0 && !showAddForm && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
              <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: '#F1F5F9', marginBottom: '12px' }}>
                <UsersIcon size={32} color="#94A3B8" />
              </div>
              <h3 style={{ marginBottom: '0.5rem', color: '#1E293B', fontSize: '16px', fontWeight: '700' }}>No Emergency Contacts</h3>
              <p style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '16px' }}>Add a trusted contact so SafetyMesh can notify them during an emergency.</p>
              <button
                style={{ backgroundColor: '#10B981', color: 'white', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(16,185,129,0.2)' }}
                onClick={() => setShowAddForm(true)}
              >
                + Add Your First Contact
              </button>
            </div>
          )}

          {/* Contact Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {contacts.map((contact) => (
              <div key={contact.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '14px', padding: '14px', boxShadow: '0 2px 10px rgba(15,23,42,0.02)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', wordBreak: 'break-word' }}>{contact.name}</span>
                    {contact.isPrimary && <span style={{ backgroundColor: '#ECFDF5', color: '#10B981', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>Primary</span>}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ wordBreak: 'break-word' }}>{contact.phone}</span>
                    <span style={{ color: '#CBD5E1' }}>•</span>
                    <span>{contact.relation}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginLeft: '10px' }}>
                  <a
                    href={`tel:${contact.phone}`}
                    style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #D1FAE5', flexShrink: 0 }}
                    title={`Call ${contact.name}`}
                  >
                    <PhoneCallIcon size={16} color="#10B981" />
                  </a>
                  <button
                    onClick={() => handleSendSms(contact)}
                    style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #DBEAFE', color: '#3B82F6', fontSize: '11px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}
                    title={`Send SOS SMS to ${contact.name}`}
                  >
                    SMS
                  </button>
                  <button
                    onClick={() => {
                      onDeleteContact(contact.id);
                      onShowToast(`Removed ${contact.name}`);
                    }}
                    style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #FEE2E2', color: '#EF4444', fontSize: '14px', cursor: 'pointer', flexShrink: 0 }}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyContactsModal;
