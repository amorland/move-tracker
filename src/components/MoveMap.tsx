'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MoveLocation } from '@/lib/types';
import { MapPin, Navigation, Plus, Trash2, Info, UtilityPole, ShoppingBag, Truck } from 'lucide-react';

// Fix Leaflet icon issue
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const OriginIcon = L.divIcon({
  html: '<div style="background-color: #005fb8; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 0 4px rgba(0,95,184,0.2)"></div>',
  className: 'custom-div-icon',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const DestIcon = L.divIcon({
  html: '<div style="background-color: #1a8a5f; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 0 4px rgba(26,138,95,0.2)"></div>',
  className: 'custom-div-icon',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

// Component to handle map center/zoom
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function MoveMap() {
  const [locations, setLocations] = useState<MoveLocation[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newLoc, setNewDoc] = useState<Partial<MoveLocation>>({ name: '', address: '', category: 'Stop', notes: '' });
  const [center, setCenter] = useState<[number, number]>([34.68, -78.35]); // Mid-point roughly
  const [zoom, setZoom] = useState(5);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    const res = await fetch('/api/locations');
    const data = await res.json();
    setLocations(data);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLoc)
    });
    if (res.ok) {
      setIsAdding(false);
      setNewDoc({ name: '', address: '', category: 'Stop', notes: '' });
      fetchLocations();
    }
  };

  const deleteLoc = async (id: number) => {
    if (!confirm('Remove this location?')) return;
    await fetch(`/api/locations?id=${id}`, { method: 'DELETE' });
    fetchLocations();
  };

  const routePoints = locations
    .filter(l => (l.category === 'Origin' || l.category === 'Destination' || l.category === 'Stop') && l.lat && l.lng)
    .sort((a, b) => a.category === 'Origin' ? -1 : b.category === 'Origin' ? 1 : a.category === 'Destination' ? 1 : -1)
    .map(l => [l.lat!, l.lng!] as [number, number]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <div className="flex flex-stack justify-between items-center">
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Move Map</h1>
          <p className="section-subtitle">Route and important locations for Andrew & Tory.</p>
        </div>
        <button className="btn btn-primary" style={{ gap: '10px' }} onClick={() => setIsAdding(!isAdding)}>
          <Plus size={20} /> Add Location
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', height: '600px' }} className="flex-stack">
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', height: '100%', position: 'relative' }}>
          <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {locations.map(loc => {
              if (!loc.lat || !loc.lng) return null;
              return (
                <Marker 
                  key={loc.id} 
                  position={[loc.lat, loc.lng]} 
                  icon={loc.category === 'Origin' ? OriginIcon : loc.category === 'Destination' ? DestIcon : DefaultIcon}
                >
                  <Popup>
                    <div style={{ padding: '4px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{loc.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{loc.address}</div>
                      {loc.notes && <div style={{ fontSize: '12px', borderTop: '1px solid #eee', paddingTop: '4px' }}>{loc.notes}</div>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            {routePoints.length >= 2 && (
              <Polyline positions={routePoints} color="var(--accent)" weight={3} dashArray="10, 10" opacity={0.6} />
            )}
            <ChangeView center={center} zoom={zoom} />
          </MapContainer>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {isAdding && (
            <div className="card" style={{ padding: '20px', border: '2px solid var(--accent-soft)', marginBottom: '0' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>ADD LOCATION</h3>
              <form onSubmit={handleAdd} className="flex flex-col gap-4">
                <input 
                  required placeholder="Name (e.g. Hotel, Electric Co)" 
                  value={newLoc.name} onChange={e => setNewDoc({...newLoc, name: e.target.value})} 
                />
                <input 
                  required placeholder="Full Address" 
                  value={newLoc.address} onChange={e => setNewDoc({...newLoc, address: e.target.value})} 
                />
                <select 
                  value={newLoc.category} onChange={e => setNewDoc({...newLoc, category: e.target.value as any})}
                >
                  <option value="Stop">Travel Stop</option>
                  <option value="Utility">Utility</option>
                  <option value="Service">Service</option>
                  <option value="Errand">Errand</option>
                </select>
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {locations.map(loc => (
              <div 
                key={loc.id} 
                className="card" 
                style={{ 
                  margin: 0, padding: '16px', border: 'none', boxShadow: 'var(--shadow-sm)', cursor: 'pointer' 
                }}
                onClick={() => {
                  if (loc.lat && loc.lng) {
                    setCenter([loc.lat, loc.lng]);
                    setZoom(14);
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div style={{ color: loc.category === 'Origin' ? 'var(--accent)' : loc.category === 'Destination' ? 'var(--success)' : 'var(--text-secondary)' }}>
                      {loc.category === 'Origin' || loc.category === 'Destination' ? <Navigation size={18} /> : <MapPin size={18} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{loc.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{loc.category}</div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteLoc(loc.id); }} 
                    style={{ border: 'none', background: 'none', color: '#eee', cursor: 'pointer' }}
                    className="hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
