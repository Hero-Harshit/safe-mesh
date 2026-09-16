import { useState } from 'react';
import type { EmergencyContact } from '../services/emergency';
import { generateSmsLink, triggerHaptic } from '../services/emergency';

interface EmergencyContactsProps {
  contacts: EmergencyContact[];
  onAddContact: (contact: Omit<EmergencyContact, 'id'>) => void;
  onDeleteContact: (id: string) => void;
  currentMapsUrl?: string;
  onShowToast: (msg: string) => void;
}

const RELATION_ICONS: Record<string, string> = {
  Family: '👨‍👩‍👦',
  Guardian: '🛡️',
  Friend: '🤝',
  Police: '👮',
  Other: '👤',
};

const EmergencyContacts: React.FC<EmergencyContactsProps> = ({
  contacts,
  onAddContact,
  onDeleteContact,
  currentMapsUrl,
  onShowToast,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState<EmergencyContact['relation']>('Family');
  const [isPrimary, setIsPrimary] = useState(false);
  const [error, setError] = useState('');

  const handleOpenModal = () => {
    setName('');
    setPhone('');
    setRelation('Family');
    setIsPrimary(contacts.length === 0);
    setError('');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter contact name');
      return;
    }
    if (!phone.trim() || phone.trim().length < 5) {
      setError('Please enter a valid phone number');
      return;
    }

    onAddContact({
      name: name.trim(),
      phone: phone.trim(),
      relation,
      isPrimary,
    });

    triggerHaptic(50);
    setShowModal(false);
    onShowToast(`Added ${name} to Emergency Contacts`);
  };

  const handleQuickSms = (contact: EmergencyContact) => {
    const url = generateSmsLink(contact.phone, currentMapsUrl);
    window.location.href = url;
  };

  return (
    <section className="contacts-section" aria-label="Emergency contacts management">
      <div className="section-header">
        <div className="section-title-group">
          <span className="section-icon">📞</span>
          <h2 className="section-title">EMERGENCY NUMBERS</h2>
          <span className="contacts-count-badge">{contacts.length}</span>
        </div>
        <button
          className="add-contact-btn"
          onClick={handleOpenModal}
          aria-label="Add new emergency contact"
        >
          <span className="plus-icon">+</span>
          <span>Add Number</span>
        </button>
      </div>

      <p className="section-subtitle">
        Saved contacts receive instant SMS coordinates when SOS triggers
      </p>

      {contacts.length === 0 ? (
        <div className="empty-contacts-card">
          <span className="empty-icon">📇</span>
          <p className="empty-title">No Emergency Contacts Added</p>
          <p className="empty-sub">
            Add trusted friends, family, or campus security numbers to alert in distress.
          </p>
          <button className="primary-pill-btn" onClick={handleOpenModal}>
            + Add First Emergency Number
          </button>
        </div>
      ) : (
        <div className="contacts-list">
          {contacts.map((contact) => (
            <div key={contact.id} className="contact-card">
              <div className="contact-info">
                <div className="contact-avatar">
                  {RELATION_ICONS[contact.relation] || '👤'}
                </div>
                <div className="contact-meta">
                  <div className="contact-name-row">
                    <span className="contact-name">{contact.name}</span>
                    {contact.isPrimary && (
                      <span className="primary-tag" title="Primary SOS recipient">
                        PRIMARY
                      </span>
                    )}
                  </div>
                  <span className="contact-phone">{contact.phone}</span>
                  <span className="contact-relation-label">{contact.relation}</span>
                </div>
              </div>

              <div className="contact-actions">
                <a
                  href={`tel:${contact.phone}`}
                  className="contact-call-btn"
                  title={`Call ${contact.name}`}
                  aria-label={`Call ${contact.name}`}
                >
                  <span className="action-icon">📞</span>
                  <span className="action-label">Call</span>
                </a>

                <button
                  onClick={() => handleQuickSms(contact)}
                  className="contact-sms-btn"
                  title={`Send SOS SMS to ${contact.name}`}
                  aria-label={`Send SOS SMS to ${contact.name}`}
                >
                  <span className="action-icon">💬</span>
                  <span className="action-label">SMS</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Remove ${contact.name} from emergency contacts?`)) {
                      onDeleteContact(contact.id);
                      onShowToast(`Removed ${contact.name}`);
                    }
                  }}
                  className="contact-del-btn"
                  title="Remove contact"
                  aria-label={`Remove ${contact.name}`}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <span className="modal-icon">➕</span>
                <h3 className="modal-title">Add Emergency Contact</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowModal(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="contact-form">
              {error && <div className="form-error-banner">⚠️ {error}</div>}

              <div className="form-group">
                <label htmlFor="contact-name" className="form-label">
                  Contact Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dad, Sister, Warden, Campus Guard"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact-phone" className="form-label">
                  Phone Number
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  className="form-input"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Relationship / Role</label>
                <div className="relation-chips">
                  {(['Family', 'Guardian', 'Friend', 'Police', 'Other'] as const).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`relation-chip ${relation === tag ? 'selected' : ''}`}
                      onClick={() => setRelation(tag)}
                    >
                      {RELATION_ICONS[tag]} {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                  />
                  <span>Set as Primary Contact (receives priority SMS)</span>
                </label>
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="modal-btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-btn-save">
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default EmergencyContacts;
