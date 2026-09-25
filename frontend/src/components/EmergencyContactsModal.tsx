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
    <div className="safemesh-modal-backdrop" onClick={onClose}>
      <div className="safemesh-modal-sheet" onClick={(e) => e.stopPropagation()}>
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
          <div className="contacts-action-bar">
            <span className="contacts-count-label">
              {contacts.length} Trusted {contacts.length === 1 ? 'Contact' : 'Contacts'}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-add-contact-pill"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                {showAddForm ? '✕ Close Form' : '+ Add Contact'}
              </button>
              <button
                className="btn-add-contact-pill"
                style={{ backgroundColor: '#475569' }}
                onClick={handleAddNativeContact}
                title="Import from phone address book"
              >
                📱 Phone Book
              </button>
            </div>
          </div>

          {/* Inline Add Contact Form */}
          {showAddForm && (
            <form onSubmit={handleManualSubmit} style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#1E293B', fontWeight: 'bold' }}>New Emergency Contact</h3>
              
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mom, Best Friend, Roommate"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                  autoFocus
                  required
                />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Relation</label>
                  <select
                    value={relation}
                    onChange={(e) => setRelation(e.target.value as any)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box', backgroundColor: 'white' }}
                  >
                    <option value="Family">Family</option>
                    <option value="Friend">Friend</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Police">Police</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '18px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isPrimary}
                      onChange={(e) => setIsPrimary(e.target.checked)}
                    />
                    Set Primary
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="action-button-primary"
                style={{ width: '100%', padding: '10px', fontSize: '14px' }}
              >
                Save Contact
              </button>
            </form>
          )}

          {contacts.length === 0 && !showAddForm && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748B' }}>
              <h3 style={{ marginBottom: '0.5rem', color: '#1E293B' }}>NO EMERGENCY CONTACTS</h3>
              <p>Add a trusted contact so SafeMesh can notify them during an emergency.</p>
              <button
                className="action-button-primary"
                style={{ marginTop: '12px', display: 'inline-flex', width: 'auto', padding: '8px 16px' }}
                onClick={() => setShowAddForm(true)}
              >
                + Add Your First Contact
              </button>
            </div>
          )}

          {/* Contact Cards List */}
          <div className="contacts-stack">
            {contacts.map((contact) => (
              <div key={contact.id} className="contact-item-card">
                <div className="contact-item-avatar">
                  <span className="avatar-letter">{contact.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="contact-item-details">
                  <div className="name-and-tag">
                    <span className="contact-item-name">{contact.name}</span>
                    {contact.isPrimary && <span className="primary-pill-badge">Primary</span>}
                  </div>
                  <span className="contact-item-phone">{contact.phone}</span>
                  <span className="contact-item-relation">{contact.relation}</span>
                </div>
                <div className="contact-item-buttons">
                  <a
                    href={`tel:${contact.phone}`}
                    className="contact-action-circle call-circle"
                    title={`Call ${contact.name}`}
                  >
                    <PhoneCallIcon size={16} color="#10B981" />
                  </a>
                  <button
                    onClick={() => handleSendSms(contact)}
                    className="contact-action-circle sms-circle"
                    title={`Send SOS SMS to ${contact.name}`}
                  >
                    SMS
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${contact.name} from emergency contacts?`)) {
                        onDeleteContact(contact.id);
                        onShowToast(`Removed ${contact.name}`);
                      }
                    }}
                    className="contact-action-circle delete-circle"
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
