# Database Schema Documentation

This folder documents the Supabase database tables used by the Safe Mesh backend and dashboard. It provides a quick glance at the current and planned database architecture.

## 1. `incidents`
This is the core table that tracks active emergency alerts triggered by victims.
* `incident_id` (String, Primary Key): Unique server-side identifier for the incident.
* `emergency_id` (String): The mesh broadcast ID or emergency identifier from the user's app.
* `trigger_source` (String): Where the alert originated (e.g., 'web', 'mesh_relay').
* `sender_safehelp_id` (String): The ID of the victim who triggered the alert.
* `sender_location` (PostGIS POINT): The initial latitude/longitude coordinates of the alert.
* `status` (String): Current status of the incident (e.g., 'ACTIVE', 'RESOLVED').
* `created_at` (Timestamp): When the incident was created.

## 2. `incident_events` (Live Tracking & Mesh Relays)
This table stores continuous location updates and mesh relay events for an active incident. It's crucial for tracking moving victims or handling multiple bystander pings.
* `id` (UUID, Primary Key): Unique event ID.
* `incident_id` (String, Foreign Key): Links back to the `incidents` table.
* `emergency_id` (String): The mesh broadcast ID.
* `guardian_id` (String): The ID of the bystander/guardian whose phone acted as a relay.
* `event_type` (String): The type of event (e.g., 'guardian_detection').
* `detected_at` (Timestamp): When the bystander's phone detected the BLE signal.
* `rssi` (Integer): Signal strength indicator of the Bluetooth connection.
* `proximity` (Float): Estimated distance from the bystander to the victim.
* `location` (PostGIS POINT): The GPS location of the *bystander's* phone.
* `time_bucket` (Integer): Used for deduplication to prevent spamming the database with rapid identical pings.

---

## Planned Tables (Phase 5: Twilio Fallback)

## 3. `users`
Stores the victim's details to map their offline mesh ID to their actual identity and contacts.
* `id` (UUID, Primary Key): User's unique identifier.
* `name` (String): Full name of the user.
* `mesh_broadcast_id` (String, Unique): The unique string their phone broadcasts over BLE when they are offline.

## 4. `emergency_contacts`
Stores the emergency contacts for Twilio to SMS/Call during an offline alert.
* `id` (UUID, Primary Key): Unique contact ID.
* `user_id` (UUID, Foreign Key): Links to the `users` table.
* `contact_name` (String): Name of the emergency contact (e.g., "Dad").
* `phone_number` (String): E.164 formatted number (e.g., "+1234567890") required by Twilio.
* `priority` (Integer): Order in which to contact them (1 = primary).
