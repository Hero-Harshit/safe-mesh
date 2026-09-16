import React, { useState } from 'react';
import { UsersIcon, PhoneCallIcon } from './Icons';
import type { EmergencyContact } from '../services/emergency';
import { generateSmsLink, triggerHaptic } from '../services/emergency';

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
  const [relation, setRelation] = useState<EmergencyContact['relation']>('Family');
  const [isPrimary, setIsPrimary] = useState(false);
  const [error, setError] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter the contact name.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 5) {
      setError('Please enter a valid telephone number.');
      return;
    }

    onAddContact({
      name: name.trim(),
      phone: phone.trim(),
      relation,
      isPrimary,
    });

    triggerHaptic(50);
    setName('');
    setPhone('');
    setError('');
    setShowAddForm(false);
    onShowToast(`Added ${name} to Emergency Contacts`);
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
            <button
              className="btn-add-contact-pill"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? '✕ Close Form' : '+ Add Number'}
            </button>
          </div>

          {/* Add Contact Inline Card */}
          {showAddForm && (
            <form onSubmit={handleSave} className="add-contact-card-form">
              <h3 className="form-heading">Add Emergency Contact</h3>
              {error && <div className="form-error-msg">{error}</div>}

              <div className="form-field">
                <label className="field-label">Full Name</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Mom, Dad, Warden, Friend"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-field">
                <label className="field-label">Phone Number</label>
                <input
                  type="tel"
                  className="field-input"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="field-label">Relationship</label>
                <div className="chips-row">
                  {(['Family', 'Friend', 'Guardian', 'Police', 'Other'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`chip-btn ${relation === r ? 'active' : ''}`}
                      onClick={() => setRelation(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-checkbox-row">
                <label className="checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                  />
                  <span>Mark as Primary SOS Contact</span>
                </label>
              </div>

              <div className="form-btn-group">
                <button
                  type="button"
                  className="btn-subtle"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  Save Contact
                </button>
              </div>
            </form>
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
