'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MoveLocation } from '@/lib/types';
import { MapPin, Navigation, Plus, Trash2, Info, UtilityPole, ShoppingBag, Truck, ChevronRight, Search } from 'lucide-react';

// Fix Leaflet icon issue
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const OriginIcon = L.divIcon({
  html: '<div style="background-color: var(--accent); width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 0 4px rgba(197,176,151,0.25)"></div>',
  className: 'custom-div-icon',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const DestIcon = L.divIcon({
  html: '<div style="background-color: #333; width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 0 4px rgba(0,0,0,0.1)"></div>',
  className: 'custom-div-icon',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const StopIcon = L.divIcon({
  html: '<div style="background-color: #8c8882; width: 10px; height: 10px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 0 3px rgba(140,136,130,0.2)"></div>',
  className: 'custom-div-icon',
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

function ChangeView({ center, zoom, bounds }: { center: [number, number], zoom: number, bounds?: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [100, 100] });
    } else {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, bounds, map]);
  return null;
}

export default function MoveMap() {
  const [locations, setLocations] = useState<MoveLocation[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newLoc, setNewDoc] = useState<Partial<MoveLocation>>({ name: '', address: '', category: 'Stop', notes: '' });
  const [center, setCenter] = useState<[number, number]>([34.68, -78.35]);
  const [zoom, setZoom] = useState(5);
  const [routeData, setRouteData] = useState<[number, number][]>([]);
  const [bounds, setBounds] = useState<L.LatLngBoundsExpression | undefined>(undefined);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fitAllMarkers = () => {
    const activeLocs = locations.filter(l => l.lat && l.lng);
    if (activeLocs.length === 0) return;
    const lats = activeLocs.map(l => l.lat!);
    const lngs = activeLocs.map(l => l.lng!);
    setBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]]);
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
      setRouteData(points.map(p => [p.lat!, p.lng!] as [number, number]));
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    let lat = null, lng = null;
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newLoc.address || '')}`);
      const geoData = await geoRes.json();
      if (geoData && geoData[0]) {
        lat = parseFloat(geoData[0].lat);
        lng = parseFloat(geoData[0].lon);
      }
    } catch (err) {}

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

  return (
    <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      <div className="flex flex-stack justify-between items-center mb-12">
        <div>
          <h1 style={{ marginBottom: '4px' }}>Move Map</h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>Route and essential locations mapped across the coast.</p>
        </div>
        <button className="btn btn-primary" style={{ gap: '10px', height: '48px', padding: '0 24px', borderRadius: '12px' }} onClick={() => setIsAdding(true)}>
          <Plus size={20} /> Add Location
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '48px', height: '700px' }} className="flex-stack map-grid">
        <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', height: '100%', position: 'relative', boxShadow: 'var(--shadow-md)' }}>
          <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            {locations.map(loc => {
              if (!loc.lat || !loc.lng) return null;
              const icon = loc.category === 'Origin' ? OriginIcon : loc.category === 'Destination' ? DestIcon : StopIcon;
              return (
                <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={icon}>
                  <Tooltip permanent direction="top" offset={[0, -10]} opacity={0.9} className="custom-tooltip">
                    <span style={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{loc.name}</span>
                  </Tooltip>
                  <Popup>
                    <div style={{ padding: '8px', minWidth: '180px' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{loc.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.4' }}>{loc.address}</div>
                      {loc.notes && <div style={{ fontSize: '12px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>{loc.notes}</div>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            {routeData.length >= 2 && <Polyline positions={routeData} color="var(--accent)" weight={2} opacity={0.6} dashArray="8, 8" />}
            <ChangeView center={center} zoom={zoom} bounds={bounds} />
          </MapContainer>
          <button onClick={fitAllMarkers} style={{ position: 'absolute', bottom: '24px', right: '24px', zIndex: 1000, background: '#fff', border: '1px solid var(--border)', padding: '12px 20px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', boxShadow: 'var(--shadow-md)', cursor: 'pointer' }}>
            FIT ENTIRE ROUTE
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', paddingRight: '12px' }}>
          {isAdding && (
            <div className="card" style={{ padding: '32px', border: '1px solid var(--accent)', background: 'var(--accent-soft)', borderRadius: '16px' }}>
              <div className="flex justify-between items-center mb-6">
                <h3 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--foreground)' }}>ADD LOCATION</h3>
                <button onClick={() => setIsAdding(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
              </div>
              <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <input required placeholder="Name (e.g. Hotel)" value={newLoc.name || ''} onChange={e => setNewDoc({...newLoc, name: e.target.value})} style={{ background: '#fff' }} />
                <input required placeholder="Full Address" value={newLoc.address || ''} onChange={e => setNewDoc({...newLoc, address: e.target.value})} style={{ background: '#fff' }} />
                <select value={newLoc.category} onChange={e => setNewDoc({...newLoc, category: e.target.value as any})} style={{ background: '#fff' }}>
                  <option value="Stop">Travel Stop</option>
                  <option value="Origin">Origin</option>
                  <option value="Destination">Destination</option>
                  <option value="Utility">Utility</option>
                  <option value="Service">Service</option>
                  <option value="Errand">Errand</option>
                </select>
                <button type="submit" className="btn btn-primary" style={{ height: '48px', fontWeight: 700 }}>ADD TO MAP</button>
              </form>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'var(--border)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            {locations.sort((a,b) => (a.category==='Origin'? -1 : 1)).map(loc => (
              <div key={loc.id} style={{ padding: '16px 24px', background: '#fff', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }} className="task-row clickable" onClick={() => { if (loc.lat && loc.lng) { setBounds(undefined); setCenter([loc.lat, loc.lng]); setZoom(14); } }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  {loc.category === 'Origin' || loc.category === 'Destination' ? <Navigation size={18} /> : <MapPin size={18} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{loc.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{loc.category}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteLoc(loc.id); }} style={{ background: 'none', border: 'none', color: 'var(--border)', cursor: 'pointer' }} className="hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
