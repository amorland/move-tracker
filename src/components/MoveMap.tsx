'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MoveLocation, MoveSettings } from '@/lib/types';
import { MapPin, Navigation, Plus, Trash2, X, Clock, Route, Info } from 'lucide-react';
import { format, parseISO, addSeconds } from 'date-fns';

const OriginIcon = L.divIcon({
  html: '<div style="background:var(--color-accent);width:14px;height:14px;border:2.5px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(197,176,151,0.3)"></div>',
  className: '', iconSize: [14, 14], iconAnchor: [7, 7],
});
const DestIcon = L.divIcon({
  html: '<div style="background:#2d2a26;width:14px;height:14px;border:2.5px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(0,0,0,0.1)"></div>',
  className: '', iconSize: [14, 14], iconAnchor: [7, 7],
});
const StopIcon = L.divIcon({
  html: '<div style="background:#8c8882;width:10px;height:10px;border:2px solid white;border-radius:50%;box-shadow:0 0 0 3px rgba(140,136,130,0.2)"></div>',
  className: '', iconSize: [10, 10], iconAnchor: [5, 5],
});

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [80, 80], animate: true });
  }, [bounds, map]);
  return null;
}

interface RouteStats {
  distanceMiles: number;
  durationSeconds: number;
  legs: { distanceMiles: number; durationSeconds: number }[];
}

function fmtDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function MoveMap() {
  const [locations, setLocations] = useState<MoveLocation[]>([]);
  const [settings, setSettings] = useState<MoveSettings | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeStats, setRouteStats] = useState<RouteStats | null>(null);
  const [bounds, setBounds] = useState<L.LatLngBoundsExpression | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newLoc, setNewLoc] = useState<Partial<MoveLocation>>({ name: '', address: '', category: 'Stop', notes: '' });

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (locations.length >= 2) fetchRoute(); }, [locations]);

  const fetchAll = async () => {
    const [lRes, sRes] = await Promise.all([fetch('/api/locations'), fetch('/api/settings')]);
    setLocations(await lRes.json());
    setSettings(await sRes.json());
  };

  const fetchRoute = async () => {
    const routePoints = locations
      .filter(l => ['Origin', 'Stop', 'Destination'].includes(l.category) && l.lat && l.lng)
      .sort((a, b) => {
        if (a.category === 'Origin') return -1;
        if (b.category === 'Origin') return 1;
        if (a.category === 'Destination') return 1;
        if (b.category === 'Destination') return -1;
        return 0;
      });

    if (routePoints.length < 2) return;

    const coords = routePoints.map(p => `${p.lng},${p.lat}`).join(';');
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`);
      const data = await res.json();
      if (data.routes?.[0]) {
        const route = data.routes[0];
        setRouteCoords(route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]));
        setRouteStats({
          distanceMiles: route.distance * 0.000621371,
          durationSeconds: route.duration,
          legs: (route.legs ?? []).map((leg: any) => ({
            distanceMiles: leg.distance * 0.000621371,
            durationSeconds: leg.duration,
          })),
        });
        // Auto-fit
        const lats = routePoints.map(p => p.lat!);
        const lngs = routePoints.map(p => p.lng!);
        setBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]]);
      }
    } catch {
      setRouteCoords(routePoints.map(p => [p.lat!, p.lng!]));
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    let lat = null, lng = null;
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newLoc.address || '')}`);
      const geo = await geoRes.json();
      if (geo?.[0]) { lat = parseFloat(geo[0].lat); lng = parseFloat(geo[0].lon); }
    } catch { /* use null */ }

    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newLoc, lat, lng }),
    });
    if (res.ok) { setIsAdding(false); setNewLoc({ name: '', address: '', category: 'Stop', notes: '' }); fetchAll(); }
  };

  const deleteLoc = async (id: number) => {
    if (!confirm('Remove this location?')) return;
    await fetch(`/api/locations?id=${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const fitAll = () => {
    const pts = locations.filter(l => l.lat && l.lng);
    if (!pts.length) return;
    const lats = pts.map(l => l.lat!), lngs = pts.map(l => l.lng!);
    setBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]]);
  };

  // ETA from drive start
  const driveStart = settings?.driveStartDate ? parseISO(settings.driveStartDate) : null;
  const estArrival = driveStart && routeStats ? addSeconds(driveStart, routeStats.durationSeconds) : null;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Move Map</h1>
          <p className="page-subtitle">Route and key locations from Clearwater, FL to Cold Spring, NY.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setIsAdding(true)}>
          <Plus size={18} /> Add Location
        </button>
      </div>

      {/* Route stats bar */}
      {routeStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatCard icon={<Route size={16} />} label="Total Distance" value={`${Math.round(routeStats.distanceMiles).toLocaleString()} mi`} />
          <StatCard icon={<Clock size={16} />} label="Drive Time" value={fmtDuration(routeStats.durationSeconds)} />
          {driveStart && (
            <StatCard icon={<Navigation size={16} />} label="Drive Start" value={format(driveStart, 'MMM d')} accent />
          )}
          {estArrival && (
            <StatCard icon={<MapPin size={16} />} label="Est. Arrival" value={format(estArrival, 'MMM d')} accent />
          )}
        </div>
      )}

      <div className="map-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, height: 640 }}>
        {/* Map */}
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--color-border)', position: 'relative', boxShadow: 'var(--shadow-md)' }}>
          <MapContainer center={[36, -80]} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            {locations.map(loc => {
              if (!loc.lat || !loc.lng) return null;
              const icon = loc.category === 'Origin' ? OriginIcon : loc.category === 'Destination' ? DestIcon : StopIcon;
              return (
                <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={icon}>
                  <Popup>
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{loc.name}</div>
                      <div style={{ fontSize: 11, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{loc.category}</div>
                      <div style={{ fontSize: 12, color: '#555' }}>{loc.address}</div>
                      {loc.notes && <div style={{ fontSize: 12, marginTop: 6, paddingTop: 6, borderTop: '1px solid #eee' }}>{loc.notes}</div>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            {routeCoords.length >= 2 && (
              <Polyline positions={routeCoords} color="#c5b097" weight={3} opacity={0.7} dashArray="10, 6" />
            )}
            {bounds && <FitBounds bounds={bounds} />}
          </MapContainer>
          <button onClick={fitAll} style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 1000, background: 'white', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
            Fit Route
          </button>
        </div>

        {/* Side panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          {/* Add form */}
          {isAdding && (
            <div className="card" style={{ border: '1px solid var(--color-accent)', background: 'var(--color-accent-soft)' }}>
              <div className="card-header" style={{ paddingTop: 16, paddingBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Add Location</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => setIsAdding(false)} style={{ padding: '0 8px' }}><X size={16} /></button>
              </div>
              <div className="card-body">
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input required placeholder="Name (e.g. Hotel)" value={newLoc.name || ''} onChange={e => setNewLoc({ ...newLoc, name: e.target.value })} />
                  <input required placeholder="Full address" value={newLoc.address || ''} onChange={e => setNewLoc({ ...newLoc, address: e.target.value })} />
                  <select value={newLoc.category} onChange={e => setNewLoc({ ...newLoc, category: e.target.value as any })}>
                    <option value="Stop">Travel Stop</option>
                    <option value="Origin">Origin</option>
                    <option value="Destination">Destination</option>
                    <option value="Utility">Utility</option>
                    <option value="Service">Service</option>
                    <option value="Errand">Errand</option>
                  </select>
                  <textarea placeholder="Notes (optional)" value={newLoc.notes || ''} onChange={e => setNewLoc({ ...newLoc, notes: e.target.value })} style={{ height: 60, resize: 'none' }} />
                  <button type="submit" className="btn btn-primary">Add to Map</button>
                </form>
              </div>
            </div>
          )}

          {/* Locations list */}
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
            {locations.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-secondary)', fontSize: 14 }}>
                <Info size={32} color="var(--color-border)" style={{ margin: '0 auto 12px' }} />
                Add locations to build your route.
              </div>
            ) : locations
              .sort((a, b) => {
                const order = { Origin: 0, Stop: 1, Destination: 2, Utility: 3, Errand: 4, Service: 5 };
                return (order[a.category] ?? 9) - (order[b.category] ?? 9);
              })
              .map((loc, i, arr) => (
                <div
                  key={loc.id}
                  style={{ padding: '14px 16px', background: 'white', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                  className="item-row"
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {['Origin', 'Destination'].includes(loc.category) ? <Navigation size={15} color="var(--color-accent-dark)" /> : <MapPin size={15} color="var(--color-accent-dark)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.name}</div>
                    <div className="section-label" style={{ marginTop: 2 }}>{loc.category}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '0 6px', flexShrink: 0 }} onClick={() => deleteLoc(loc.id)}>
                    <Trash2 size={14} color="var(--color-border)" />
                  </button>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ padding: '14px 18px', borderRadius: 12, background: accent ? 'var(--color-accent-soft)' : 'var(--color-surface)', border: `1px solid ${accent ? 'var(--color-accent)' : 'var(--color-border)'}`, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ color: accent ? 'var(--color-accent-dark)' : 'var(--color-secondary)' }}>{icon}</div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: accent ? 'var(--color-accent-dark)' : 'var(--color-foreground)', lineHeight: 1 }}>{value}</div>
        <div className="section-label" style={{ marginTop: 3, color: accent ? 'var(--color-accent-dark)' : undefined }}>{label}</div>
      </div>
    </div>
  );
}
