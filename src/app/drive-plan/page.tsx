'use client';

import { DriveLoadoutItem, DriveLoadoutType, DriveVehicle } from '@/lib/types';
import { useScrollLock } from '@/lib/useScrollLock';
import { CarFront, Dog, Baby, Bike, Briefcase, Leaf, Package, PackagePlus, Pencil, Plus, Trash2, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const DEFAULT_VEHICLES: Omit<DriveVehicle, 'id' | 'orderIndex'>[] = [
  {
    name: '2024 Mazda CX-50',
    vehicleType: 'car',
    seats: 5,
    cargoSummary: 'Primary family cabin space',
    driverName: 'Andrew',
  },
  {
    name: '2021 Subaru Crosstrek',
    vehicleType: 'car',
    seats: 5,
    cargoSummary: 'Roof pod compatible',
    driverName: 'Tory',
  },
];

const DEFAULT_LOADOUT_ITEMS: Omit<DriveLoadoutItem, 'id' | 'orderIndex'>[] = [
  { label: 'Andrew', itemType: 'adult', assignedVehicleId: null, placement: 'driver', required: true, notes: 'May swap with extra driver' },
  { label: 'Tory', itemType: 'adult', assignedVehicleId: null, placement: 'driver', required: true, notes: null },
  { label: 'Remy', itemType: 'child', assignedVehicleId: null, placement: 'back seat', required: true, notes: 'Car seat and easy-access supplies' },
  { label: 'Winston', itemType: 'pet', assignedVehicleId: null, placement: 'back seat', required: true, notes: 'Frequent stop access' },
  { label: 'Harper', itemType: 'pet', assignedVehicleId: null, placement: 'back seat', required: true, notes: 'Keep close to people' },
  { label: 'Optional extra driver', itemType: 'adult', assignedVehicleId: null, placement: 'driver', required: false, notes: 'Use if needed' },
  { label: '2021 Subaru roof pod', itemType: 'vehicle_addon', assignedVehicleId: null, placement: 'roof', required: true, notes: 'Subaru only' },
  { label: 'Bike 1', itemType: 'gear', assignedVehicleId: null, placement: 'cargo area', required: true, notes: 'Plan for rack or interior' },
  { label: 'Bike 2', itemType: 'gear', assignedVehicleId: null, placement: 'cargo area', required: true, notes: 'Plan for rack or interior' },
  { label: 'Plants', itemType: 'gear', assignedVehicleId: null, placement: 'cabin', required: true, notes: 'Temperature sensitive' },
  { label: 'Luggage', itemType: 'gear', assignedVehicleId: null, placement: 'cargo area', required: true, notes: 'Split by nightly access' },
  { label: 'Dog supplies', itemType: 'gear', assignedVehicleId: null, placement: 'easy access', required: true, notes: 'Food, water, meds, cleanup' },
  { label: 'Baby supplies', itemType: 'gear', assignedVehicleId: null, placement: 'easy access', required: true, notes: 'Diaper bag, feeding, sleep gear' },
];

export default function DrivePlanPage() {
  const [vehicles, setVehicles] = useState<DriveVehicle[]>([]);
  const [items, setItems] = useState<DriveLoadoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicleModal, setVehicleModal] = useState<Partial<DriveVehicle> | null>(null);
  const [itemModal, setItemModal] = useState<Partial<DriveLoadoutItem> | null>(null);

  useScrollLock(vehicleModal !== null || itemModal !== null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [vehicleRes, itemRes] = await Promise.all([
      fetch('/api/drive-vehicles'),
      fetch('/api/drive-loadout-items'),
    ]);
    setVehicles(await vehicleRes.json());
    setItems(await itemRes.json());
    setLoading(false);
  };

  const saveVehicle = async (vehicle: Partial<DriveVehicle>) => {
    const res = await fetch('/api/drive-vehicles', {
      method: vehicle.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicle),
    });
    if (res.ok) {
      setVehicleModal(null);
      fetchAll();
    }
  };

  const saveItem = async (item: Partial<DriveLoadoutItem>) => {
    const res = await fetch('/api/drive-loadout-items', {
      method: item.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (res.ok) {
      setItemModal(null);
      fetchAll();
    }
  };

  const deleteVehicle = async (id: number) => {
    if (!confirm('Delete this vehicle plan?')) return;
    await fetch(`/api/drive-vehicles?id=${id}`, { method: 'DELETE' });
    const assignedItems = items.filter(item => item.assignedVehicleId === id);
    await Promise.all(assignedItems.map(item =>
      fetch('/api/drive-loadout-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, assignedVehicleId: null }),
      })
    ));
    fetchAll();
  };

  const deleteItem = async (id: number) => {
    if (!confirm('Delete this loadout item?')) return;
    await fetch(`/api/drive-loadout-items?id=${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const moveItem = async (itemId: number, vehicleId: number | null, placement?: string | null) => {
    await fetch('/api/drive-loadout-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId, assignedVehicleId: vehicleId, ...(placement !== undefined ? { placement } : {}) }),
    });
    fetchAll();
  };

  const seedDefaults = async () => {
    if (!confirm('Load the suggested Starland convoy setup? This only runs cleanly when the planner is empty.')) return;
    const createdVehicles: DriveVehicle[] = [];
    for (const vehicle of DEFAULT_VEHICLES) {
      const res = await fetch('/api/drive-vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle),
      });
      if (res.ok) createdVehicles.push(await res.json());
    }

    const mazda = createdVehicles.find(vehicle => vehicle.name.includes('Mazda')) || null;
    const subaru = createdVehicles.find(vehicle => vehicle.name.includes('Subaru')) || null;

    for (const item of DEFAULT_LOADOUT_ITEMS) {
      const assignedVehicleId = item.label === '2021 Subaru roof pod'
        ? subaru?.id ?? null
        : item.label === 'Andrew'
          ? mazda?.id ?? null
          : item.label === 'Tory'
            ? subaru?.id ?? null
            : null;

      await fetch('/api/drive-loadout-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, assignedVehicleId }),
      });
    }

    fetchAll();
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading the convoy loadout…</div>;

  const unassignedItems = items.filter(item => item.assignedVehicleId === null);

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Cars</h1>
          <p className="page-subtitle">Who rides where, and what ends up in which car.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {vehicles.length === 0 && items.length === 0 && (
            <button className="btn btn-secondary btn-lg" onClick={seedDefaults}>
              <PackagePlus size={18} /> Load Our Starter Split
            </button>
          )}
          <button className="btn btn-secondary btn-lg" onClick={() => setItemModal({ label: '', itemType: 'gear', assignedVehicleId: null, placement: '', required: true, notes: '' })}>
            <Plus size={18} /> Add Item
          </button>
          <button className="btn btn-primary btn-lg" onClick={() => setVehicleModal({ name: '', vehicleType: 'car', seats: 5, cargoSummary: '', driverName: '' })}>
            <Plus size={18} /> Add Vehicle
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="section-label" style={{ marginBottom: 6 }}>Our convoy setup</div>
            <div style={{ fontSize: 13, color: 'var(--color-secondary)', maxWidth: 720 }}>
              Drag people, pets, and gear between cars until the split actually feels sane.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-neutral">{vehicles.length} vehicles</span>
            <span className="badge badge-neutral">{items.length} items</span>
            <span className="badge badge-neutral">{unassignedItems.length} unassigned</span>
          </div>
        </div>
      </div>

      <div className="overview-grid" style={{ alignItems: 'start' }}>
        {vehicles.map(vehicle => {
          const assignedItems = items.filter(item => item.assignedVehicleId === vehicle.id);
          const passengers = assignedItems.filter(item => ['adult', 'child', 'pet'].includes(item.itemType)).length;
          return (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              items={assignedItems}
              passengerCount={passengers}
              onDropItem={moveItem}
              onEdit={() => setVehicleModal(vehicle)}
              onDelete={() => deleteVehicle(vehicle.id)}
              onEditItem={setItemModal}
              onDeleteItem={deleteItem}
            />
          );
        })}
      </div>

      <div style={{ marginTop: 24 }}>
        <DropZone
          title="Unassigned Pool"
          subtitle="Items not assigned to a car yet"
          items={unassignedItems}
          onDropItem={itemId => moveItem(itemId, null, null)}
          onEditItem={setItemModal}
          onDeleteItem={deleteItem}
        />
      </div>

      {vehicleModal && (
        <VehicleModal vehicle={vehicleModal} onClose={() => setVehicleModal(null)} onSave={saveVehicle} />
      )}
      {itemModal && (
        <LoadoutItemModal item={itemModal} vehicles={vehicles} onClose={() => setItemModal(null)} onSave={saveItem} />
      )}
    </div>
  );
}

function VehicleCard({
  vehicle,
  items,
  passengerCount,
  onDropItem,
  onEdit,
  onDelete,
  onEditItem,
  onDeleteItem,
}: {
  vehicle: DriveVehicle;
  items: DriveLoadoutItem[];
  passengerCount: number;
  onDropItem: (itemId: number, vehicleId: number | null, placement?: string | null) => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditItem: (item: Partial<DriveLoadoutItem>) => void;
  onDeleteItem: (id: number) => void;
}) {
  return (
    <div
      className="card"
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) onDropItem(Number(raw), vehicle.id);
      }}
    >
      <div className="card-header">
        <div>
          <h2 style={{ margin: 0 }}>{vehicle.name}</h2>
          <div style={{ fontSize: 12, color: 'var(--color-secondary)', marginTop: 6 }}>
            {vehicle.driverName || 'Driver not set'} · {passengerCount}/{vehicle.seats} people + pets assigned
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={onEdit}><Pencil size={14} /></button>
          <button className="btn btn-ghost btn-sm" onClick={onDelete} style={{ color: '#b91c1c' }}><Trash2 size={14} /></button>
        </div>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="badge badge-neutral">{vehicle.vehicleType}</span>
          <span className="badge badge-neutral">{vehicle.seats} seats</span>
          {vehicle.cargoSummary && <span className="badge badge-neutral">{vehicle.cargoSummary}</span>}
        </div>
        <DropZone
          title="Assigned to this vehicle"
          subtitle="Driver, passengers, pets, and gear"
          items={items}
          onDropItem={itemId => onDropItem(itemId, vehicle.id, null)}
          onEditItem={onEditItem}
          onDeleteItem={onDeleteItem}
          compact
        />
      </div>
    </div>
  );
}

function DropZone({
  title,
  subtitle,
  items,
  onDropItem,
  onEditItem,
  onDeleteItem,
  compact = false,
}: {
  title: string;
  subtitle: string;
  items: DriveLoadoutItem[];
  onDropItem: (itemId: number) => void;
  onEditItem: (item: Partial<DriveLoadoutItem>) => void;
  onDeleteItem: (id: number) => void;
  compact?: boolean;
}) {
  return (
    <div
      style={{ border: '1px dashed var(--color-border)', borderRadius: 12, padding: compact ? 12 : 16, background: 'var(--color-background)', minHeight: 120 }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) onDropItem(Number(raw));
      }}
    >
      <div style={{ marginBottom: 10 }}>
        <div className="section-label" style={{ marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--color-secondary)' }}>{subtitle}</div>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--color-secondary)' }}>Nothing parked here yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => (
            <button
              key={item.id}
              draggable
              onDragStart={e => e.dataTransfer.setData('text/plain', String(item.id))}
              onClick={() => onEditItem(item)}
              style={{ width: '100%', textAlign: 'left', border: '1px solid var(--color-border)', borderRadius: 10, background: 'var(--color-surface)', padding: '10px 12px', cursor: 'grab' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--color-accent-dark)' }}>{itemIcon(item)}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)' }}>{item.label}</span>
                    {!item.required && <span className="badge badge-neutral">optional</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <span className="section-label" style={{ margin: 0 }}>{item.itemType.replace('_', ' ')}</span>
                    {item.placement && <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>{item.placement}</span>}
                  </div>
                  {item.notes && <div style={{ fontSize: 12, color: 'var(--color-secondary)', marginTop: 6 }}>{item.notes}</div>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <span className="row-action-btn" onClick={e => { e.stopPropagation(); onEditItem(item); }}><Pencil size={14} /></span>
                  <span className="row-action-btn row-action-delete" onClick={e => { e.stopPropagation(); onDeleteItem(item.id); }}><Trash2 size={14} /></span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VehicleModal({
  vehicle,
  onClose,
  onSave,
}: {
  vehicle: Partial<DriveVehicle>;
  onClose: () => void;
  onSave: (vehicle: Partial<DriveVehicle>) => void;
}) {
  const [editing, setEditing] = useState(vehicle);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{vehicle.id ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '0 8px' }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Vehicle Name</label>
            <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Vehicle Type</label>
            <input value={editing.vehicleType || ''} onChange={e => setEditing({ ...editing, vehicleType: e.target.value })} placeholder="car, suv, borrowed car" />
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Driver</label>
            <input value={editing.driverName || ''} onChange={e => setEditing({ ...editing, driverName: e.target.value })} placeholder="Andrew, Tory, optional driver" />
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Seats</label>
            <input type="number" min={1} value={editing.seats ?? 5} onChange={e => setEditing({ ...editing, seats: Number(e.target.value) })} />
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Cargo Summary</label>
            <textarea value={editing.cargoSummary || ''} onChange={e => setEditing({ ...editing, cargoSummary: e.target.value })} style={{ height: 72, resize: 'none' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(editing)}>Save Vehicle</button>
        </div>
      </div>
    </div>
  );
}

function LoadoutItemModal({
  item,
  vehicles,
  onClose,
  onSave,
}: {
  item: Partial<DriveLoadoutItem>;
  vehicles: DriveVehicle[];
  onClose: () => void;
  onSave: (item: Partial<DriveLoadoutItem>) => void;
}) {
  const [editing, setEditing] = useState(item);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{item.id ? 'Edit Loadout Item' : 'Add Loadout Item'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '0 8px' }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Label</label>
            <input value={editing.label || ''} onChange={e => setEditing({ ...editing, label: e.target.value })} />
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Type</label>
            <select value={editing.itemType || 'gear'} onChange={e => setEditing({ ...editing, itemType: e.target.value as DriveLoadoutType })}>
              <option value="adult">Adult</option>
              <option value="child">Child</option>
              <option value="pet">Pet</option>
              <option value="gear">Gear</option>
              <option value="vehicle_addon">Vehicle Add-on</option>
            </select>
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Assigned Vehicle</label>
            <select value={editing.assignedVehicleId ?? ''} onChange={e => setEditing({ ...editing, assignedVehicleId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Unassigned</option>
              {vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}
            </select>
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Placement</label>
            <input value={editing.placement || ''} onChange={e => setEditing({ ...editing, placement: e.target.value })} placeholder="driver, back seat, cargo area, roof" />
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Notes</label>
            <textarea value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} style={{ height: 80, resize: 'none' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--color-secondary)' }}>
            <input type="checkbox" checked={editing.required ?? true} onChange={e => setEditing({ ...editing, required: e.target.checked })} />
            Required for the drive
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(editing)}>Save Item</button>
        </div>
      </div>
    </div>
  );
}

function itemIcon(item: Pick<DriveLoadoutItem, 'itemType' | 'label'>) {
  if (item.itemType === 'adult') return <User size={14} />;
  if (item.itemType === 'child') return <Baby size={14} />;
  if (item.itemType === 'pet') return <Dog size={14} />;
  if (item.itemType === 'vehicle_addon') return <PackagePlus size={14} />;
  const label = item.label.toLowerCase();
  if (label.includes('bike')) return <Bike size={14} />;
  if (label.includes('plant')) return <Leaf size={14} />;
  if (label.includes('luggage') || label.includes('bag')) return <Briefcase size={14} />;
  if (label.includes('suppl')) return <Package size={14} />;
  return <Briefcase size={14} />;
}
