# Safe Mesh - Database & Realtime Infrastructure Documentation

This document provides complete technical specifications for all database tables, storage buckets, and real-time streaming protocols hosted on Supabase (`pttbxtbbpiwjapntyenc.supabase.co`).

It is designed as an architectural and API reference for the **Safe Mesh Backend**, **Mobile App (`frontend`)**, and **Law Enforcement / Command Dashboard (`dashboard`)**.

---

## 1. Supabase PostgreSQL Tables

### 1.1 `incidents`
Tracks active and historical emergency alerts triggered by citizens or mesh relays.

| Column | Type | Description |
| :--- | :--- | :--- |
| `incident_id` | `TEXT` (PK) | Unique server-side identifier (e.g., `INC_20261003_sos_123456_...`). |
| `emergency_id` | `TEXT` | BLE mesh broadcast ID or emergency session ID from the app. |
| `status` | `TEXT` | Status: `'active'`, `'resolved'`, `'cancelled'`. |
| `trigger_source` | `TEXT` | Source: `'web'`, `'app'`, `'mesh_relay'`, `'voice_keyword'`. |
| `sender_safehelp_id` | `TEXT` | Unique ID of the victim who triggered the alert. |
| `sender_location` | `GEOMETRY(Point, 4326)` | PostGIS initial GPS coordinates (`POINT(lng lat)`). |
| `detection_summary` | `JSONB` | Metadata payload: `{ "roomId": "...", "listenUrl": "...", "evidenceUrl": "...", "audioRecorded": true }`. |
| `created_at` | `TIMESTAMPTZ` | Timestamp when alert was initiated. |
| `ended_at` | `TIMESTAMPTZ` | Timestamp when alert was resolved/ended. |

### 1.2 `incident_events` (Live Bystander Relays & Tracking)
Stores continuous location updates and BLE mesh relay events from surrounding bystander/guardian phones.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Unique event ID (auto-generated). |
| `incident_id` | `TEXT` (FK) | References `incidents(incident_id)`. |
| `emergency_id` | `TEXT` | The mesh broadcast ID. |
| `guardian_id` | `TEXT` | ID of the bystander phone that relayed the BLE beacon. |
| `event_type` | `TEXT` | Event type: `'guardian_detection'`, `'gps_update'`, `'audio_started'`. |
| `detected_at` | `TIMESTAMPTZ` | Timestamp when the bystander's device detected the beacon. |
| `rssi` | `INT4` | Bluetooth signal strength (dBm). |
| `proximity` | `TEXT` | Estimated proximity: `'immediate'`, `'near'`, `'far'`. |
| `location` | `GEOMETRY(Point, 4326)` | GPS coordinates of the relaying bystander's device. |
| `app_version` | `TEXT` | Version of the relaying app. |
| `time_bucket` | `INT4` | Deduplication window hash (prevents spamming). |
| `created_at` | `TIMESTAMPTZ` | Record creation timestamp. |

### 1.3 `users`
Victim user profiles mapping offline mesh broadcast IDs to citizen identities.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Citizen's unique account ID. |
| `name` | `TEXT` | Full name of the user. |
| `mesh_broadcast_id` | `TEXT` (Unique) | Static BLE token broadcasted when device is offline. |
| `created_at` | `TIMESTAMPTZ` | Account creation timestamp. |

### 1.4 `emergency_contacts`
Emergency contacts configured for each user for automated SMS dispatch and live listening links.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Unique contact identifier. |
| `user_id` | `UUID` (FK) | References `users(id)`. |
| `contact_name` | `TEXT` | Contact display name (e.g., "Dad", "Advocate Sharma"). |
| `phone_number` | `TEXT` | Phone number in E.164 format (e.g., `+919876543210`). |
| `priority` | `INT4` | Contact priority ordering (`1` = primary). |
| `created_at` | `TIMESTAMPTZ` | Creation timestamp. |

---

## 2. Supabase Storage: `evidence_recordings`

All forensic audio recordings and police chain-of-custody logs are stored in the public bucket **`evidence_recordings`**.

- **Bucket Name:** `evidence_recordings`
- **Public URL Base:** `https://pttbxtbbpiwjapntyenc.supabase.co/storage/v1/object/public/evidence_recordings/`

### 2.1 File Formats & Naming Schema

1. **Audio Evidence Files (`.webm` / `.mp4`):**
   - **Pattern:** `evidence_${roomId}_${timestamp}.webm`
   - **MIME Type:** `audio/webm;codecs=opus` (or `audio/mp4` on iOS Safari)
   - **Example:** `evidence_sos_1727914000000_x89a2_1727914300000.webm`
   - **Purpose:** Full, uncompressed ambient audio recording of the incident captured silently from the victim's device for law enforcement and courtroom evidence.

2. **Forensic Audit Logs (`.json`):**
   - **Pattern:** `log_${roomId}_${timestamp}.json`
   - **MIME Type:** `application/json`
   - **Example:** `log_sos_1727914000000_x89a2_1727914300000.json`

### 2.2 Forensic Log JSON Structure (`ForensicLog`)
```json
{
  "roomId": "sos_1727914000000_x89a2",
  "victimName": "Harshit Sharma",
  "victimPhone": "+919876543210",
  "startTime": "2026-10-02T19:20:00.000Z",
  "endTime": "2026-10-02T19:25:00.000Z",
  "durationSeconds": 300,
  "totalChunks": 300,
  "gpsBreadcrumbs": [
    {
      "lat": 28.613939,
      "lng": 77.209021,
      "accuracy": 8.5,
      "timestamp": 1727914001000
    },
    {
      "lat": 28.614050,
      "lng": 77.209180,
      "accuracy": 6.2,
      "timestamp": 1727914060000
    }
  ],
  "deviceInfo": {
    "userAgent": "Mozilla/5.0 (Linux; Android 14; Mobile)...",
    "platform": "Linux armv8l",
    "timeZone": "Asia/Kolkata"
  }
}
```

---

## 3. Realtime Audio & GPS Broadcast Protocol

Live streaming runs over Supabase Realtime Channels, allowing low-latency ambient audio listening without launching cellular dialer screens.

- **Channel Pattern:** `emergency_${roomId}`
- **Channel Type:** Broadcast (`{ broadcast: { self: false } }`)

### 3.1 Broadcast Events

#### A. Event: `audio_stream`
Broadcast every 1,000 ms containing the latest base64-encoded audio chunk from the victim's microphone.
```json
{
  "type": "broadcast",
  "event": "audio_stream",
  "payload": {
    "chunk": "<base64_string>",
    "mimeType": "audio/webm;codecs=opus",
    "index": 42,
    "timestamp": 1727914042000,
    "lat": 28.613939,
    "lng": 77.209021,
    "accuracy": 8.5,
    "victimName": "Harshit Sharma"
  }
}
```

#### B. Event: `location_update`
Broadcast whenever the victim's GPS coordinates change significantly.
```json
{
  "type": "broadcast",
  "event": "location_update",
  "payload": {
    "lat": 28.614050,
    "lng": 77.209180,
    "accuracy": 6.2,
    "timestamp": 1727914060000
  }
}
```

#### C. Event: `session_ended`
Broadcast when the victim deactivates SOS mode or the emergency session terminates.
```json
{
  "type": "broadcast",
  "event": "session_ended",
  "payload": {
    "evidenceUrl": "https://pttbxtbbpiwjapntyenc.supabase.co/storage/v1/object/public/evidence_recordings/evidence_sos_...webm",
    "log": { ...ForensicLog... }
  }
}
```

---

## 4. Dashboard Implementation Guide

When adding live emergency audio and evidence features to the command dashboard (`dashboard/`):

### 4.1 Subscribing to Live Emergency Audio
```typescript
import { supabase } from '../lib/supabase';

export function listenToEmergency(roomId: string, onAudioChunk: (blob: Blob) => void) {
  const channel = supabase.channel(`emergency_${roomId}`, {
    config: { broadcast: { self: false } },
  });

  channel.on('broadcast', { event: 'audio_stream' }, ({ payload }) => {
    // 1. Decode base64 to binary
    const binary = atob(payload.chunk);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const audioBlob = new Blob([bytes], { type: payload.mimeType || 'audio/webm' });
    
    // 2. Pass blob to Web Audio API / Audio element for live playback
    onAudioChunk(audioBlob);
  });

  channel.on('broadcast', { event: 'location_update' }, ({ payload }) => {
    console.log('Victim moved to:', payload.lat, payload.lng);
  });

  channel.subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
```

### 4.2 Fetching Historical Evidence Recordings for an Incident
```typescript
import { supabase } from '../lib/supabase';

export async function getEvidenceFilesForIncident(roomId: string) {
  const { data, error } = await supabase.storage
    .from('evidence_recordings')
    .list('', {
      search: roomId,
    });

  if (error || !data) return [];

  return data.map((file) => ({
    name: file.name,
    publicUrl: supabase.storage.from('evidence_recordings').getPublicUrl(file.name).data.publicUrl,
    createdAt: file.created_at,
  }));
}
```

---

## 5. Environment & Endpoints

- **Supabase Project URL:** `https://pttbxtbbpiwjapntyenc.supabase.co`
- **Public Anon Key:** Found in `.env` / `frontend/.env` as `VITE_SUPABASE_ANON_KEY`
- **Live Emergency Portal Endpoint:** `https://safety-mesh.vercel.app/?room=<ROOM_ID>`
