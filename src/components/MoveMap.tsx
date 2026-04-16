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

const StopIcon = L.divIcon({
  html: '<div style="background-color: #64748b; width: 10px; height: 10px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 0 3px rgba(100,116,139,0.2)"></div>',
  className: 'custom-div-icon',
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

// Component to handle map center/zoom
function ChangeView({ center, zoom, bounds }: { center: [number, number], zoom: number, bounds?: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(center, zoom);
    }
  }, [center, zoom, bounds, map]);
  return null;
}

export default function MoveMap() {
  const [locations, setLocations] = useState<MoveLocation[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newLoc, setNewDoc] = useState<Partial<MoveLocation>>({ name: '', address: '', category: 'Stop', notes: '' });
  const [center, setCenter] = useState<[number, number]>([34.68, -78.35]); // Mid-point roughly
  const [zoom, setZoom] = useState(5);
  const [routeData, setRouteData] = useState<[number, number][]>([]);
  const [bounds, setBounds] = useState<L.LatLngBoundsExpression | undefined>(undefined);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (locations.length > 0 && bounds === undefined) {
      fitAllMarkers();
    }
  }, [locations]);

  const fitAllMarkers = () => {
    const activeLocs = locations.filter(l => l.lat && l.lng);
    if (activeLocs.length === 0) return;
    const lats = activeLocs.map(l => l.lat!);
    const lngs = activeLocs.map(l => l.lng!);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    setBounds([[minLat, minLng], [maxLat, maxLng]]);
  };

  useEffect(() => {
    if (locations.length >= 2) {
      fetchRoute();
    } else {
      setRouteData([]);
    }
  }, [locations]);

  const fetchLocations = async () => {
    const res = await fetch('/api/locations');
    const data = await res.json();
    setLocations(data);
  };

  const fetchRoute = async () => {
    const points = locations
      .filter(l => (l.category === 'Origin' || l.category === 'Destination' || l.category === 'Stop') && l.lat && l.lng)
      .sort((a, b) => {
        if (a.category === 'Origin') return -1;
        if (b.category === 'Origin') return 1;
        if (a.category === 'Destination') return 1;
        if (b.category === 'Destination') return -1;
        return 0;
      });

    if (points.length < 2) return;

    const coordinates = points.map(p => `${p.lng},${p.lat}`).join(';');
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`);
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
        setRouteData(coords);
      }
    } catch (err) {
      console.error('Routing error:', err);
      // Fallback to straight lines if OSRM fails
      setRouteData(points.map(p => [p.lat!, p.lng!] as [number, number]));
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Geocode address
    let lat = null;
    let lng = null;
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newLoc.address || '')}`);
      const geoData = await geoRes.json();
      if (geoData && geoData[0]) {
        lat = parseFloat(geoData[0].lat);
        lng = parseFloat(geoData[0].lon);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }

    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newLoc, lat, lng })
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

  const sortedLocations = [...locations].sort((a, b) => {
    const order: Record<string, number> = { 'Origin': 1, 'Stop': 2, 'Destination': 3, 'Utility': 4, 'Service': 5, 'Errand': 6 };
    return (order[a.category] || 99) - (order[b.category] || 99);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <div className="flex flex-stack justify-between items-center">
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Move Map</h1>
          <p className="section-subtitle">Route and important locations for Andrew & Tory.</p>
        </div>
        {!isAdding && (
          <button className="btn btn-primary" style={{ gap: '10px' }} onClick={() => setIsAdding(true)}>
            <Plus size={20} /> Add Location
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', height: '600px' }} className="flex-stack map-grid">
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', height: '100%', position: 'relative' }}>
          <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {locations.map(loc => {
              if (!loc.lat || !loc.lng) return null;
              
              let icon: L.Icon | L.DivIcon = DefaultIcon;
              if (loc.category === 'Origin') icon = OriginIcon;
              else if (loc.category === 'Destination') icon = DestIcon;
              else if (loc.category === 'Stop') icon = StopIcon;

              return (
                <Marker 
                  key={loc.id} 
                  position={[loc.lat, loc.lng]} 
                  icon={icon}
                >
                  <Popup>
                    <div style={{ padding: '4px', maxWidth: '200px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{loc.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{loc.address}</div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '8px' }}>{loc.category}</div>
                      {loc.notes && <div style={{ fontSize: '12px', borderTop: '1px solid #eee', paddingTop: '4px', color: 'var(--text-primary)' }}>{loc.notes}</div>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            {routeData.length >= 2 && (
              <>
                <Polyline positions={routeData} color="var(--accent)" weight={6} opacity={0.2} />
                <Polyline positions={routeData} color="var(--accent)" weight={3} opacity={0.8} />
              </>
            )}
            <ChangeView center={center} zoom={zoom} bounds={bounds} />
          </MapContainer>
          
          <button 
            onClick={fitAllMarkers}
            style={{ 
              position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000, 
              backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '8px',
              padding: '8px 12px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: 'var(--shadow-md)', cursor: 'pointer', color: 'var(--text-primary)'
            }}
          >
            <Navigation size={14} /> Fit All
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
          {isAdding && (
            <div className="card" style={{ padding: '20px', border: '2px solid var(--accent-soft)', marginBottom: '0' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--accent)' }}>ADD NEW LOCATION</h3>
              <form onSubmit={handleAdd} className="flex flex-col gap-4">
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: 700, marginBottom: '4px', display: 'block' }}>NAME</label>
                  <input 
                    required placeholder="e.g. Hotel, Electric Co" 
                    value={newLoc.name || ''} onChange={e => setNewDoc({...newLoc, name: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: 700, marginBottom: '4px', display: 'block' }}>ADDRESS</label>
                  <input 
                    required placeholder="Full street address" 
                    value={newLoc.address || ''} onChange={e => setNewDoc({...newLoc, address: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: 700, marginBottom: '4px', display: 'block' }}>CATEGORY</label>
                  <select 
                    value={newLoc.category} onChange={e => setNewDoc({...newLoc, category: e.target.value as any})}
                  >
                    <option value="Stop">Travel Stop</option>
                    <option value="Origin">Origin</option>
                    <option value="Destination">Destination</option>
                    <option value="Utility">Utility</option>
                    <option value="Service">Service</option>
                    <option value="Errand">Errand</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: 700, marginBottom: '4px', display: 'block' }}>NOTES</label>
                  <textarea 
                    placeholder="Optional notes..." 
                    value={newLoc.notes || ''} onChange={e => setNewDoc({...newLoc, notes: e.target.value})}
                    style={{ minHeight: '60px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '14px' }}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Add to Map</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {locations.length === 0 && !isAdding && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                <MapPin size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p>No locations added yet.</p>
              </div>
            )}
            {sortedLocations.map(loc => (
              <div 
                key={loc.id} 
                className="card location-card" 
                style={{ 
                  margin: 0, padding: '16px', border: 'none', boxShadow: 'var(--shadow-sm)', cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onClick={() => {
                  if (loc.lat && loc.lng) {
                    setBounds(undefined);
                    setCenter([loc.lat, loc.lng]);
                    setZoom(14);
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: loc.category === 'Origin' ? '#ebf5ff' : loc.category === 'Destination' ? '#f0fdf4' : '#f8fafc',
                      color: loc.category === 'Origin' ? '#005fb8' : loc.category === 'Destination' ? '#166534' : 'var(--text-secondary)'
                    }}>
                      {loc.category === 'Origin' || loc.category === 'Destination' ? <Navigation size={16} /> : 
                       loc.category === 'Utility' ? <UtilityPole size={16} /> :
                       loc.category === 'Errand' ? <ShoppingBag size={16} /> :
                       loc.category === 'Service' ? <Truck size={16} /> :
                       <MapPin size={16} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{loc.name}</div>
                      <div className="flex items-center gap-2" style={{ marginTop: '2px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#64748b', textTransform: 'uppercase' }}>
                          {loc.category}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                          {loc.address.split(',')[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteLoc(loc.id); }} 
                    style={{ border: 'none', background: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px' }}
                    className="hover:text-red-500"
                    title="Delete location"
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
