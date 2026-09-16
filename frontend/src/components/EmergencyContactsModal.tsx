import React from 'react';
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
  const handleAddNativeContact = async () => {
    try {
      const contact = await pickNativeContact();
      if (contact && contact.phone) {
        // Basic normalization to detect exact matches
        const normalize = (num: string) => num.replace(/\s+/g, '');
        const newPhone = normalize(contact.phone);
        
        const exists = contacts.some(c => normalize(c.phone) === newPhone);
        
        if (exists) {
          onShowToast("This contact is already an emergency contact.");
          return;
        }

        onAddContact({
          name: contact.name || 'Unknown Contact',
          phone: contact.phone,
          relation: 'Other', // We drop the manual relation field
          isPrimary: false,
        });
        
        triggerHaptic(50);
        onShowToast(`Added ${contact.name} to Emergency Contacts`);
      }
    } catch (e) {
      console.error("Failed to pick contact", e);
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
            <button
              className="btn-add-contact-pill"
              onClick={handleAddNativeContact}
            >
              + Add Number
            </button>
          </div>

          {contacts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748B' }}>
              <h3 style={{ marginBottom: '0.5rem', color: '#1E293B' }}>NO EMERGENCY CONTACTS</h3>
              <p>Add a trusted contact so SafeHelp can notify them during an emergency.</p>
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
