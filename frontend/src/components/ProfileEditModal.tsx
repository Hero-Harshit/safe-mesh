import React, { useState } from 'react';

interface ProfileData {
  fullName: string;
  phone: string;
  age: string;
  bloodGroup: string;
  medical: string;
  contactName: string;
  contactPhone: string;
}

interface ProfileEditModalProps {
  initialData: ProfileData;
  onClose: () => void;
  onSave: (newProfile: ProfileData) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ initialData, onClose, onSave }) => {
  const [formData, setFormData] = useState<ProfileData>(initialData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = () => {
    if (!formData.fullName || !formData.phone) {
      alert("Name and Phone are required.");
      return;
    }
    onSave(formData);
  };

  return (
    <div 
      className="safetymesh-modal-backdrop" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }} 
      style={{ zIndex: 300 }}
    >
      <div className="safetymesh-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-pill-indicator"></div>

        <div className="modal-sheet-header">
          <div className="modal-title-group">
            <div className="modal-icon-bubble" style={{ background: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)', color: '#475569' }}>
              <span style={{ fontSize: '1.4rem' }}>👤</span>
            </div>
            <div>
              <h2 className="modal-sheet-title" style={{ fontSize: '1.4rem' }}>Edit Profile</h2>
              <span className="modal-sheet-subtitle">Update your emergency info</span>
            </div>
          </div>
          <button className="modal-close-icon-btn" onClick={onClose} aria-label="Close" style={{ background: '#F1F5F9' }}>
            ✕
          </button>
        </div>

        <div className="modal-sheet-content" style={{ paddingBottom: '16px' }}>
          <div className="profile-form-grid">
            <div className="profile-input-group">
              <label className="profile-input-label">Full Name</label>
              <input
                className="profile-input"
                name="fullName"
                placeholder="E.g., Alex Sharma"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>
            
            <div className="profile-input-group">
              <label className="profile-input-label">Phone Number</label>
              <input
                className="profile-input"
                name="phone"
                placeholder="E.g., +91 9876543210"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="profile-input-group" style={{ flex: 1 }}>
                <label className="profile-input-label">Age</label>
                <input
                  className="profile-input"
                  name="age"
                  placeholder="Age"
                  type="number"
                  value={formData.age}
                  onChange={handleChange}
                />
              </div>
              <div className="profile-input-group" style={{ flex: 1 }}>
                <label className="profile-input-label">Blood Group</label>
                <input
                  className="profile-input"
                  name="bloodGroup"
                  placeholder="E.g., O+"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="profile-input-group">
              <label className="profile-input-label">Medical Conditions & Allergies</label>
              <textarea
                className="profile-input"
                name="medical"
                placeholder="List any medical conditions, allergies, or medications"
                value={formData.medical}
                onChange={handleChange}
              />
            </div>

            <button className="profile-save-btn" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditModal;
