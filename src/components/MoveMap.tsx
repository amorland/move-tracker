'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MoveLocation, MoveSettings } from '@/lib/types';
import { MapPin, Navigation, Plus, Trash2, X, Clock, Route, Info, Moon, Pencil, Home } from 'lucide-react';
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

function isOvernight(loc: MoveLocation) {
  return loc.category === 'Stop' && !!loc.notes?.startsWith('[overnight]');
}

function stripOvernightPrefix(notes: string | null | undefined): string {
  if (!notes) return '';
  return notes.startsWith('[overnight]') ? notes.slice('[overnight]'.length).trimStart() : notes;
}

function encodeNotes(notes: string, overnight: boolean, category: string): string | null {
  const raw = notes.trim();
  if (overnight && category === 'Stop') return `[overnight]${raw ? ' ' + raw : ''}`;
  return raw || null;
}

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

export default function MoveMap() {
  const [locations, setLocations] = useState<MoveLocation[]>([]);
  const [settings, setSettings] = useState<MoveSettings | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeStats, setRouteStats] = useState<RouteStats | null>(null);
  const [bounds, setBounds] = useState<L.LatLngBoundsExpression | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newLoc, setNewLoc] = useState<Partial<MoveLocation>>({ name: '', address: '', category: 'Stop', notes: '' });
  const [newLocOvernight, setNewLocOvernight] = useState(false);
  const [editingLoc, setEditingLoc] = useState<MoveLocation | null>(null);
  const [editOvernight, setEditOvernight] = useState(false);
  const [departureTime, setDepartureTime] = useState('09:00');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [lRes, sRes] = await Promise.all([fetch('/api/locations'), fetch('/api/settings')]);
    const locs: MoveLocation[] = await lRes.json();
    setLocations(locs);
    setSettings(await sRes.json());
    if (locs.length >= 2) fetchRoute(locs);
  };

  const fetchRoute = async (locs: MoveLocation[]) => {
    const routePoints = locs
      .filter(l => ['Origin', 'Stop', 'Destination'].includes(l.category) && l.lat && l.lng)
      .sort((a, b) => {
        if (a.category === 'Origin') return -1;
        if (b.category === 'Origin') return 1;
        if (a.category === 'Destination') return 1;
        if (b.category === 'Destination') return -1;
        return (a.id ?? 0) - (b.id ?? 0);
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
    const coords = await geocode(newLoc.address || '');
    const notes = encodeNotes(newLoc.notes || '', newLocOvernight, newLoc.category || '');
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newLoc, notes, lat: coords?.lat ?? null, lng: coords?.lng ?? null }),
    });
    if (res.ok) {
      setIsAdding(false);
      setNewLoc({ name: '', address: '', category: 'Stop', notes: '' });
      setNewLocOvernight(false);
      fetchAll();
    }
  };

  const openEdit = (loc: MoveLocation) => {
    setEditingLoc({ ...loc, notes: stripOvernightPrefix(loc.notes) });
    setEditOvernight(isOvernight(loc));
    setIsAdding(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoc) return;
    const original = locations.find(l => l.id === editingLoc.id);
    let lat = editingLoc.lat, lng = editingLoc.lng;
    if (editingLoc.address !== original?.address) {
      const coords = await geocode(editingLoc.address || '');
      if (coords) { lat = coords.lat; lng = coords.lng; }
    }
    const notes = encodeNotes(editingLoc.notes || '', editOvernight, editingLoc.category);
    const res = await fetch('/api/locations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editingLoc, notes, lat, lng }),
    });
    if (res.ok) { setEditingLoc(null); fetchAll(); }
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

  const overnightCount = locations.filter(isOvernight).length;
  const daysOfDriving = overnightCount + 1;
  const adjustedDuration = routeStats ? Math.round(routeStats.durationSeconds * 0.8) : 0;
  const driveSecondsPerDay = adjustedDuration / daysOfDriving;

  const driveStart = settings?.driveStartDate ? parseISO(settings.driveStartDate) : null;
  let estArrival: Date | null = null;
  if (driveStart && routeStats) {
    const [depHour, depMin] = departureTime.split(':').map(Number);
    const lastDayStart = new Date(driveStart);
    lastDayStart.setDate(lastDayStart.getDate() + (daysOfDriving - 1));
    lastDayStart.setHours(depHour, depMin, 0, 0);
    estArrival = addSeconds(lastDayStart, driveSecondsPerDay);
  }

  // Build sorted list + route-leg index map for drive-time display
  const catOrder: Record<string, number> = { Origin: 0, Stop: 1, Destination: 2, Utility: 3, Errand: 4, Service: 5 };
  const sortedLocs = [...locations].sort((a, b) => {
    const oa = catOrder[a.category] ?? 9, ob = catOrder[b.category] ?? 9;
    if (oa !== ob) return oa - ob;
    return (a.id ?? 0) - (b.id ?? 0);
  });
  const routePts = sortedLocs.filter(l => ['Origin', 'Stop', 'Destination'].includes(l.category) && l.lat && l.lng);
  const routePtIdx = new Map(routePts.map((l, i) => [l.id, i]));
  const routeItems = sortedLocs.filter(l => ['Origin', 'Stop', 'Destination'].includes(l.category));
  const auxItems = sortedLocs.filter(l => !['Origin', 'Stop', 'Destination'].includes(l.category));

  const showForm = isAdding || editingLoc !== null;
  const formLoc = isAdding ? newLoc : (editingLoc as Partial<MoveLocation>);
  const formOvernight = isAdding ? newLocOvernight : editOvernight;
  const setFormLoc = isAdding
    ? setNewLoc
    : (v: Partial<MoveLocation>) => setEditingLoc(v as MoveLocation);
  const setFormOvernight = isAdding ? setNewLocOvernight : setEditOvernight;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>The Route</h1>
          <p className="page-subtitle">Clearwater, FL → Cold Spring, NY · Summer 2026</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => { setIsAdding(true); setEditingLoc(null); }}>
          <Plus size={18} /> Add Location
        </button>
      </div>

      {routeStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatCard icon={<Route size={16} />} label="Total Distance" value={`${Math.round(routeStats.distanceMiles).toLocaleString()} mi`} />
          <StatCard icon={<Clock size={16} />} label="Drive Time" value={fmtDuration(adjustedDuration)} />
          {daysOfDriving > 1 && (
            <StatCard icon={<Moon size={16} />} label="Days of Driving" value={`${daysOfDriving} days`} />
          )}
          <div style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ color: 'var(--color-secondary)' }}><Navigation size={16} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="section-label" style={{ marginBottom: 4 }}>Departure</div>
              <input
                type="time"
                value={departureTime}
                onChange={e => setDepartureTime(e.target.value)}
                style={{ fontSize: 18, fontWeight: 700, border: 'none', background: 'transparent', padding: 0, color: 'var(--color-foreground)', width: '100%', outline: 'none', lineHeight: 1 }}
              />
            </div>
          </div>
          {driveStart && <StatCard icon={<MapPin size={16} />} label="Drive Start" value={format(driveStart, 'MMM d')} accent />}
          {estArrival && <StatCard icon={<MapPin size={16} />} label="Est. Arrival" value={format(estArrival, "MMM d 'at' h:mma")} accent />}
        </div>
      )}

      <div className="map-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, height: 640 }}>
        {/* Map */}
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--color-border)', position: 'relative', boxShadow: 'var(--shadow-md)', minHeight: 320, isolation: 'isolate' }}>
          <MapContainer center={[36, -80]} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            {locations.map(loc => {
              if (!loc.lat || !loc.lng) return null;
              const icon = loc.category === 'Origin' ? OriginIcon : loc.category === 'Destination' ? DestIcon : StopIcon;
              const displayNotes = stripOvernightPrefix(loc.notes);
              return (
                <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={icon}>
                  <Popup>
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{loc.name}</div>
                      <div style={{ fontSize: 11, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {loc.category}{isOvernight(loc) ? ' · Overnight' : ''}
                      </div>
                      <div style={{ fontSize: 12, color: '#555' }}>{loc.address}</div>
                      {displayNotes && <div style={{ fontSize: 12, marginTop: 6, paddingTop: 6, borderTop: '1px solid #eee' }}>{displayNotes}</div>}
                      <button
                        onClick={() => openEdit(loc)}
                        style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: 'var(--color-accent-dark)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        Edit →
                      </button>
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

          {/* Add / Edit form */}
          {showForm && (
            <div className="card" style={{ border: '1px solid var(--color-accent)', background: 'var(--color-accent-soft)' }}>
              <div className="card-header" style={{ paddingTop: 16, paddingBottom: 16 }}>
                <h2 style={{ margin: 0 }}>{isAdding ? 'Add Location' : 'Edit Location'}</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => { setIsAdding(false); setEditingLoc(null); setNewLocOvernight(false); }} style={{ padding: '0 8px' }}><X size={16} /></button>
              </div>
              <div className="card-body">
                <form onSubmit={isAdding ? handleAdd : handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input required placeholder="Name (e.g. Hotel)" value={formLoc.name || ''} onChange={e => setFormLoc({ ...formLoc, name: e.target.value })} />
                  <input required placeholder="Full address" value={formLoc.address || ''} onChange={e => setFormLoc({ ...formLoc, address: e.target.value })} />
                  <select value={formLoc.category} onChange={e => { setFormLoc({ ...formLoc, category: e.target.value as any }); setFormOvernight(false); }}>
                    <option value="Stop">Travel Stop</option>
                    <option value="Origin">Origin</option>
                    <option value="Destination">Destination</option>
                    <option value="Utility">Utility</option>
                    <option value="Service">Service</option>
                    <option value="Errand">Errand</option>
                  </select>
                  {formLoc.category === 'Stop' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 500, padding: '8px 10px', borderRadius: 8, background: formOvernight ? 'rgba(15,23,42,0.06)' : 'transparent', transition: 'background 0.15s' }}>
                      <input
                        type="checkbox"
                        checked={formOvernight}
                        onChange={e => setFormOvernight(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: 'var(--color-accent-dark)', flexShrink: 0 }}
                      />
                      <Moon size={14} color="var(--color-secondary)" />
                      Overnight stop
                    </label>
                  )}
                  <textarea placeholder="Notes (optional)" value={formLoc.notes || ''} onChange={e => setFormLoc({ ...formLoc, notes: e.target.value })} style={{ height: 60, resize: 'none' }} />
                  <button type="submit" className="btn btn-primary">{isAdding ? 'Add to Map' : 'Save Changes'}</button>
                </form>
              </div>
            </div>
          )}

          {/* Locations list */}
          {locations.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-secondary)', fontSize: 14, background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
              <Info size={32} color="var(--color-border)" style={{ margin: '0 auto 12px' }} />
              <span style={{ fontWeight: 600, color: 'var(--color-foreground)' }}>Fat Necks, start here.</span>
              <br />Add locations to plot the route.
            </div>
          ) : (
            <>
              {routeItems.length > 0 && (
                <div style={{ position: 'relative' }}>
                  {routeItems.length > 1 && (
                    <div style={{ position: 'absolute', left: 22, top: 22, bottom: 22, width: 2, background: 'var(--color-border)', zIndex: 0 }} />
                  )}
                  {routeItems.map((loc, i) => {
                    const nextRouteLoc = i < routeItems.length - 1 ? routeItems[i + 1] : null;
                    const idxA = routePtIdx.get(loc.id);
                    const idxB = nextRouteLoc ? routePtIdx.get(nextRouteLoc.id) : undefined;
                    const leg = (idxA !== undefined && idxB !== undefined && idxB === idxA + 1)
                      ? routeStats?.legs[idxA] : null;
                    const isOrigin = loc.category === 'Origin';
                    const isDest = loc.category === 'Destination';
                    const isOvernightStop = isOvernight(loc);
                    const isLastRoute = i === routeItems.length - 1;

                    return (
                      <React.Fragment key={loc.id}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: leg ? 2 : isLastRoute ? 0 : 8 }}>
                          <div style={{ width: 46, flexShrink: 0, display: 'flex', justifyContent: 'center', paddingTop: 13, position: 'relative', zIndex: 1 }}>
                            {isOrigin && (
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--color-accent)', border: '2.5px solid white', boxShadow: '0 0 0 3px rgba(192,107,62,0.2)' }} />
                            )}
                            {isDest && (
                              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--color-accent-soft)', border: '2px solid var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Home size={11} color="var(--color-accent-dark)" />
                              </div>
                            )}
                            {isOvernightStop && (
                              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#eef2ff', border: '2px solid #6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Moon size={9} color="#6366f1" />
                              </div>
                            )}
                            {!isOrigin && !isDest && !isOvernightStop && (
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'white', border: '2px solid var(--color-border)', marginTop: 5 }} />
                            )}
                          </div>
                          <div style={{ flex: 1, background: editingLoc?.id === loc.id ? 'var(--color-accent-soft)' : 'var(--color-surface)', borderRadius: 8, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.15s' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                <span className="section-label">{isOrigin ? 'Start' : isDest ? 'Destination' : 'Stop'}</span>
                                {isOvernightStop && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '1px 6px', borderRadius: 'var(--radius-pill)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <Moon size={9} /> Overnight
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                              <button className="btn btn-ghost btn-sm" style={{ padding: '0 6px' }} onClick={() => openEdit(loc)} title="Edit"><Pencil size={14} color="var(--color-secondary)" /></button>
                              <button className="btn btn-ghost btn-sm" style={{ padding: '0 6px' }} onClick={() => deleteLoc(loc.id)} title="Delete"><Trash2 size={14} color="var(--color-border)" /></button>
                            </div>
                          </div>
                        </div>
                        {leg && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 58, paddingTop: 3, paddingBottom: 3, marginBottom: isLastRoute ? 0 : 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-secondary)' }}>{fmtDuration(Math.round(leg.durationSeconds * 0.8))}</span>
                            <span style={{ fontSize: 10, color: 'var(--color-border)' }}>·</span>
                            <span style={{ fontSize: 11, color: 'var(--color-secondary)', opacity: 0.7 }}>{Math.round(leg.distanceMiles)} mi</span>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
              {auxItems.length > 0 && (
                <div style={{ marginTop: routeItems.length > 0 ? 8 : 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="section-label" style={{ paddingLeft: 2 }}>Other Stops</div>
                  {auxItems.map(loc => (
                    <div key={loc.id} style={{ background: editingLoc?.id === loc.id ? 'var(--color-accent-soft)' : 'var(--color-surface)', borderRadius: 8, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.15s' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--color-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MapPin size={14} color="var(--color-accent-dark)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.name}</div>
                        <span className="section-label" style={{ marginTop: 2, display: 'block' }}>{loc.category}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '0 6px' }} onClick={() => openEdit(loc)} title="Edit"><Pencil size={14} color="var(--color-secondary)" /></button>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '0 6px' }} onClick={() => deleteLoc(loc.id)} title="Delete"><Trash2 size={14} color="var(--color-border)" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
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
