SafeMesh
AI-Powered Real-Time Safety Response Network
Created by Team MinorNode for the International Innovation Challenge 3.0.
SafeMesh is an intelligent safety system that connects emergency services, device capabilities, safe routing, and trusted contacts into one coordinated response. It focuses on women and child safety, providing an ecosystem of real-time support across mobile, wearables, and web.
Key Innovation & Features
AI-Powered Safe Routing: Recommends safer, populated escape routes instead of just the shortest path.
Offline-First Emergency Support: Core actions function with limited/no internet using GPS, SMS/calls, and local processing.
100m Response Network: Opt-in geospatial matching alerts eligible nearby SafeMesh users within a 100m radius to provide immediate help, maintaining strict privacy (consent-first, no passive browsing).
Existing Infrastructure Integration: Works with existing emergency networks like 112/ERSS instead of replacing them.
Multi-Signal Verification (Hands-Free Safety): Trigger SOS via voice, shake, wearable, or panic button to reduce false triggers.
Incident Memory: Maintains an immutable, real-time, auditable incident log from trigger to resolution.
Unified Device Ecosystem: Supports Child Watch (Wear OS/Apple Watch), Child Phone (Android/iOS), and Parent Dashboard with guardian controls and configurable safe zones.
System Architecture
SafeMesh operates on a modular, layered architecture:
Device & Trigger Layer: Web, Mobile, Wearables (SOS, Shake, Panic Button).
SafeMesh API: Authentication, Events, Push notifications, and Routing.
Location Engine: PostgreSQL + PostGIS, Geofencing, 100m spatial query matching.
Maps & Routing: OpenStreetMap (OSM), TomTom, Directions, ETA.
Audit System: Immutable incident records and compliance logs.
End-to-End Data Flow:
`Trigger → GPS → Incident → Escalate → 100m Mesh → YES/NO → Navigate → Audit`
Tech Stack
Frontend & Device Layer
React / TypeScript / Vite
Tailwind CSS (for responsive design)
PWA-ready architecture
Android / Trusted Web Activity (TWA) wrappers
Backend & Intelligence
Node.js API (Express)
TomTom API (for routing & geocoding)
Groq SDK (for AI incident classification)
PostgreSQL + PostGIS (Location engine / Geospatial matching)
Authentication & Event Logging
Prerequisites
Node.js (v22.12.0 or higher recommended)
npm or yarn
TomTom Developer API Key
Groq API Key
Environment Variables
To run the backend, create a `.env` file in the `backend` directory with the following variables:
```env
PORT=5000
TOMTOM_API_KEY=your_tomtom_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```
Installation & Setup
1. Backend Setup
Navigate to the backend directory, install dependencies, and start the server:
```bash
cd backend
npm install
npm start # or node server.js
```
The backend will run on `http://localhost:5000` by default.
2. Frontend Setup
Navigate to the frontend directory, install dependencies, and start the development server:
```bash
cd frontend
npm install
npm run dev
```
The frontend will typically run on `http://localhost:5173`.
3. Android App
The `android` directory contains the source code for building the APK/AAB. It serves as a TWA (Trusted Web Activity) wrapping the deployed frontend URL, offering native-like installation.
Product Principles & Impact
Consent-First: No passive nearby-user browsing. Opt-in only.
Fast & Frictionless: Removes unnecessary steps in emergency UX.
Location-Aware & Device-Agnostic: Real coordinates drive routing across Web, iOS, Android, and Wearables.
Auditable: Every alert, match, and response is fully logged for accountability.
License
This project is licensed under the ISC License.