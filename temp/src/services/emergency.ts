export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: 'Family' | 'Friend' | 'Police' | 'Guardian' | 'Other';
  isPrimary?: boolean;
}

const STORAGE_KEY = 'safemesh_contacts';

const DEFAULT_CONTACTS: EmergencyContact[] = [
  {
    id: 'c1',
    name: 'Mom / Family',
    phone: '+91 98765 43210',
    relation: 'Family',
    isPrimary: true,
  },
  {
    id: 'c2',
    name: 'Campus Security',
    phone: '+91 141 3999100',
    relation: 'Guardian',
    isPrimary: false,
  },
];

export function getEmergencyContacts(): EmergencyContact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CONTACTS));
      return DEFAULT_CONTACTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CONTACTS;
  }
}

export function saveEmergencyContact(contact: Omit<EmergencyContact, 'id'> & { id?: string }): EmergencyContact[] {
  const current = getEmergencyContacts();
  let updated: EmergencyContact[];

  if (contact.id) {
    updated = current.map((c) => (c.id === contact.id ? (contact as EmergencyContact) : c));
  } else {
    const newContact: EmergencyContact = {
      ...contact,
      id: 'contact_' + Date.now(),
    };
    updated = [newContact, ...current];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteEmergencyContact(id: string): EmergencyContact[] {
  const current = getEmergencyContacts();
  const updated = current.filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function triggerHaptic(pattern: number | number[] = [200, 100, 200]): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors
    }
  }
}

export function generateSmsLink(phone: string, mapsUrl?: string): string {
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const body = `EMERGENCY ALERT from Safemesh! I need immediate help. ${
    mapsUrl ? `My live location: ${mapsUrl}` : 'Please reach out immediately!'
  }`;
  return `sms:${cleanPhone}?body=${encodeURIComponent(body)}`;
}
