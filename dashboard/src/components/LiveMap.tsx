import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { Icon } from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Custom marker icon for incidents
const incidentIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Types matching the actual Supabase schema
export interface PointGeometry {
  type: 'Point';
  coordinates: [number, number]; // [lon, lat]
}

export interface Incident {
  incident_id: string;
  sender_safehelp_id: string;
  sender_location: PointGeometry;
  created_at: string;
  status: string;
  trigger_source: string;
}

export interface IncidentEvent {
  id: string;
  incident_id: string;
  guardian_id: string;
  location: PointGeometry;
  detected_at: string;
  rssi: number;
  proximity: string;
}

interface LiveMapProps {
  onIncidentSelect: (incident: Incident) => void;
  incidents: Incident[];
  liveEvents?: IncidentEvent[];
}

function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function LiveMap({ onIncidentSelect, incidents, liveEvents = [] }: LiveMapProps) {
  // Default center (Pune, Maharashtra, India)
  const defaultCenter: [number, number] = [18.5204, 73.8567] 

  // Combine static incidents with live events to get the latest coordinates for markers
  const activeLocations = useMemo(() => {
    const locations = new Map<string, [number, number]>();
    
    // Base locations
    incidents.forEach(inc => {
      if (inc.sender_location?.coordinates) {
        // coordinates are [lon, lat], Leaflet wants [lat, lon]
        locations.set(inc.incident_id, [inc.sender_location.coordinates[1], inc.sender_location.coordinates[0]]);
      }
    });

    // Override with latest live events
    liveEvents.forEach(evt => {
      if (evt.location?.coordinates) {
        locations.set(evt.incident_id, [evt.location.coordinates[1], evt.location.coordinates[0]]);
      }
    });

    return locations;
  }, [incidents, liveEvents]);

  const mapCenter = incidents.length > 0 && incidents[0].sender_location?.coordinates
    ? [incidents[0].sender_location.coordinates[1], incidents[0].sender_location.coordinates[0]] as [number, number]
    : defaultCenter;

  return (
    <div style={{ height: '100%', width: '100%', zIndex: 1 }}>
      <MapContainer 
        center={mapCenter} 
        zoom={13} 
        style={{ height: '100%', width: '100%', background: '#1a1a1c' }}
        zoomControl={false}
      >
        <MapUpdater center={mapCenter} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          className="map-tiles"
        />
        {incidents.map((incident) => {
          const latLng = activeLocations.get(incident.incident_id);
          if (!latLng) return null;

          return (
            <Marker 
              key={incident.incident_id} 
              position={latLng}
              icon={incidentIcon}
              eventHandlers={{
                click: () => onIncidentSelect(incident)
              }}
            >
              <Popup>
                <strong>Incident:</strong> {incident.incident_id.slice(0, 15)}...<br/>
                <strong>Status:</strong> {incident.status}<br/>
                <strong>Time:</strong> {new Date(incident.created_at).toLocaleTimeString()}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  )
}


