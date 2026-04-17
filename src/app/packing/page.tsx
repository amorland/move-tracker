'use client';

import { useEffect, useState } from 'react';
import { PackingItem, PackingAction, PackingStatus, PackingPriority } from '@/lib/types';
import { Plus, Trash2, Box, X, Save, Filter, Search, Tag, AlertCircle, CheckCircle2, MoreVertical } from 'lucide-react';

const COMMON_ROOMS = [
  'Kitchen',
  'Living Room',
  'Master Bedroom',
  'Bedroom 2',
  'Bedroom 3',
  'Bathroom 1',
  'Bathroom 2',
  'Garage',
  'Storage',
  'Office',
  'Dining Room',
  'Outdoor/Patio',
  'Closet',
  'Other'
];

export default function PackingPage() {
  const [items, setItems] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<PackingItem> | null>(null);
  const [showCustomRoom, setShowCustomRoom] = useState(false);
  
  // Filters
  const [roomFilter, setRoomFilter] = useState<string>('All');
  const [actionFilter, setActionFilter] = useState<PackingAction | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<PackingStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const res = await fetch('/api/packing');
    const data = await res.json();
    setItems(data);
    setLoading(false);
  };

  const deleteItem = async (id: number) => {
    if (!confirm('Delete this item?')) return;
    const res = await fetch(`/api/packing?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchItems();
    } else {
      const err = await res.json();
      alert(`Error deleting item: ${err.error || 'Unknown error'}`);
    }
  };

  const openAddModal = (room?: string) => {
    setEditingItem({
      room: room || COMMON_ROOMS[0],
      itemName: '',
      action: 'Bring',
      status: 'Not Packed',
      priority: 'Medium',
      notes: ''
    });
    setShowCustomRoom(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item: PackingItem) => {
    setEditingItem(item);
    setShowCustomRoom(false);
    setIsModalOpen(true);
  };

  const saveItem = async () => {
    if (!editingItem || !editingItem.itemName || !editingItem.room) {
      alert('Please fill in Item Name and Room.');
      return;
    }

    const method = editingItem.id ? 'PATCH' : 'POST';
    const res = await fetch('/api/packing', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingItem)
    });

    if (res.ok) {
      setIsModalOpen(false);
      setEditingItem(null);
      fetchItems();
    } else {
      const err = await res.json();
      alert(`Error saving item: ${err.error || 'Unknown error'}`);
    }
  };

  const togglePacked = async (item: PackingItem) => {
    const newStatus: PackingStatus = item.status === 'Packed' ? 'Not Packed' : 'Packed';
    await fetch('/api/packing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, status: newStatus })
    });
    fetchItems();
  };

  const rooms = Array.from(new Set(items.map(i => i.room))).sort();
  
  const filteredItems = items.filter(i => {
    const matchesRoom = roomFilter === 'All' || i.room === roomFilter;
    const matchesAction = actionFilter === 'All' || i.action === actionFilter;
    const matchesStatus = statusFilter === 'All' || i.status === statusFilter;
    const matchesSearch = i.itemName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (i.notes && i.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRoom && matchesAction && matchesStatus && matchesSearch;
  });

  const getActionColor = (action: PackingAction) => {
    switch (action) {
      case 'Bring': return '#005fb8';
      case 'Trash': return '#ef4444';
      case 'Sell': return '#10b981';
      case 'Donate': return '#f59e0b';
      default: return 'var(--text-secondary)';
    }
  };

  const getPriorityColor = (priority: PackingPriority) => {
    switch (priority) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#10b981';
      default: return 'var(--text-secondary)';
    }
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Loading inventory...</div>;

  return (
    <div>
      <div className="flex flex-stack items-center justify-between mb-8">
        <div>
          <h1>Inventory List</h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>Decide what to bring, sell, donate, or trash.</p>
        </div>
        <button className="btn btn-primary" style={{ gap: '10px' }} onClick={() => openAddModal()}>
          <Plus size={20} /> Add Item
        </button>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: '32px', border: 'none', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              placeholder="Search items or notes..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>ROOM</label>
            <select value={roomFilter} onChange={e => setRoomFilter(e.target.value)} style={{ padding: '4px 12px', fontSize: '12px', height: '32px', minWidth: '120px' }}>
              <option value="All">All Rooms</option>
              {rooms.map(room => <option key={room} value={room}>{room}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>ACTION</label>
            <select value={actionFilter} onChange={e => setActionFilter(e.target.value as any)} style={{ padding: '4px 12px', fontSize: '12px', height: '32px', minWidth: '100px' }}>
              <option value="All">All Actions</option>
              <option value="Bring">Bring</option>
              <option value="Trash">Trash</option>
              <option value="Sell">Sell</option>
              <option value="Donate">Donate</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>STATUS</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={{ padding: '4px 12px', fontSize: '12px', height: '32px', minWidth: '120px' }}>
              <option value="All">All Status</option>
              <option value="Not Packed">Not Packed</option>
              <option value="Packed">Packed</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {roomFilter === 'All' ? (
          rooms.length > 0 ? rooms.map(room => {
            const roomItems = filteredItems.filter(i => i.room === room);
            if (roomItems.length === 0) return null;
            const packedCount = roomItems.filter(i => i.status === 'Packed').length;
            const roomProgress = (packedCount / roomItems.length) * 100;

            return (
              <div key={room} style={{ marginBottom: '16px' }}>
                <div className="flex justify-between items-end mb-3 px-1">
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Box size={16} color="var(--accent)" />
                      {room.toUpperCase()}
                    </h3>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {packedCount} / {roomItems.filter(i => i.action === 'Bring').length} ITEMS PACKED
                  </div>
                </div>
                <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', marginBottom: '12px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${roomProgress}%`, background: 'var(--accent)', transition: 'width 0.4s ease' }}></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roomItems.map(item => (
                    <ItemCard key={item.id} item={item} onToggle={() => togglePacked(item)} onEdit={() => openEditModal(item)} onDelete={() => deleteItem(item.id)} />
                  ))}
                  <button 
                    onClick={() => openAddModal(room)}
                    className="card hover:border-accent-soft transition-all"
                    style={{ border: '1px dashed var(--border)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-secondary)', padding: '20px', minHeight: '100px' }}
                  >
                    <Plus size={18} /> Add to {room}
                  </button>
                </div>
              </div>
            );
          }) : (
            <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
              <Box size={48} color="var(--border)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No inventory items</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 24px' }}>
                Start tracking your items and deciding their fate.
              </p>
              <button className="btn btn-primary" onClick={() => openAddModal()}>Add Your First Item</button>
            </div>
          )

        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <ItemCard key={item.id} item={item} onToggle={() => togglePacked(item)} onEdit={() => openEditModal(item)} onDelete={() => deleteItem(item.id)} />
            ))}
            <button 
              onClick={() => openAddModal(roomFilter === 'All' ? undefined : roomFilter)}
              className="card hover:border-accent-soft transition-all"
              style={{ border: '1px dashed var(--border)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-secondary)', padding: '20px', minHeight: '100px' }}
            >
              <Plus size={18} /> Add New Item
            </button>
          </div>
        )}
      </div>

      {/* Item Modal */}
      {isModalOpen && editingItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', padding: 0, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} className="justify-between">
              <h2 style={{ margin: 0, fontSize: '18px' }}>{editingItem.id ? 'Edit Item' : 'New Packing Item'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Room / Category</label>
                {!showCustomRoom ? (
                  <select 
                    value={COMMON_ROOMS.includes(editingItem.room || '') ? editingItem.room : 'CUSTOM'} 
                    onChange={e => {
                      if (e.target.value === 'CUSTOM') {
                        setShowCustomRoom(true);
                        setEditingItem({...editingItem, room: ''});
                      } else {
                        setEditingItem({...editingItem, room: e.target.value});
                      }
                    }}
                  >
                    {COMMON_ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                    {/* Include any custom rooms already in the database that aren't in COMMON_ROOMS */}
                    {Array.from(new Set(items.map(i => i.room)))
                      .filter(r => !COMMON_ROOMS.includes(r))
                      .map(r => <option key={r} value={r}>{r}</option>)
                    }
                    {!COMMON_ROOMS.includes(editingItem.room || '') && editingItem.room && !Array.from(new Set(items.map(i => i.room))).includes(editingItem.room) && (
                      <option value={editingItem.room}>{editingItem.room}</option>
                    )}
                    <option value="CUSTOM">+ Add Custom Room...</option>
                  </select>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      value={editingItem.room || ''} 
                      onChange={e => setEditingItem({...editingItem, room: e.target.value})}
                      placeholder="Enter room name"
                      autoFocus
                    />
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => {
                        setShowCustomRoom(false);
                        setEditingItem({...editingItem, room: COMMON_ROOMS[0]});
                      }}
                      style={{ padding: '0 12px' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Item Name</label>
                <input 
                  value={editingItem.itemName || ''} 
                  onChange={e => setEditingItem({...editingItem, itemName: e.target.value})}
                  placeholder="What is this item?"
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Action</label>
                  <select 
                    value={editingItem.action || 'Bring'} 
                    onChange={e => setEditingItem({...editingItem, action: e.target.value as PackingAction})}
                  >
                    <option value="Bring">Bring</option>
                    <option value="Trash">Trash</option>
                    <option value="Sell">Sell</option>
                    <option value="Donate">Donate</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Priority</label>
                  <select 
                    value={editingItem.priority || 'Medium'} 
                    onChange={e => setEditingItem({...editingItem, priority: e.target.value as PackingPriority})}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Notes</label>
                <textarea 
                  value={editingItem.notes || ''} 
                  onChange={e => setEditingItem({...editingItem, notes: e.target.value})}
                  placeholder="Location in box, condition, or price..."
                  style={{ height: '60px', resize: 'none' }}
                />
              </div>
            </div>
            <div style={{ padding: '16px 24px', backgroundColor: '#fcfcfd', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ gap: '8px' }} onClick={saveItem}>
                <Save size={16} /> {editingItem.id ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, onToggle, onEdit, onDelete }: { item: PackingItem, onToggle: () => void, onEdit: () => void, onDelete: () => void }) {
  const isBring = item.action === 'Bring';
  const isPacked = item.status === 'Packed';

  return (
    <div className={`card ${isPacked ? 'opacity-70' : ''}`} style={{ 
      margin: 0, 
      padding: '20px', 
      border: 'none', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
      background: isPacked ? '#fcfcfd' : '#ffffff', 
      position: 'relative',
      transition: 'all 0.2s ease',
      borderLeft: isBring ? (isPacked ? '4px solid var(--success-soft)' : '4px solid var(--accent)') : '4px solid #f1f5f9'
    }}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div style={{ 
            fontSize: '9px', 
            fontWeight: 800, 
            padding: '2px 8px', 
            borderRadius: '4px', 
            background: item.action === 'Bring' ? '#e0f2fe' : 
                        item.action === 'Sell' ? '#dcfce7' :
                        item.action === 'Donate' ? '#fef3c7' : '#fee2e2',
            color: item.action === 'Bring' ? '#0369a1' : 
                   item.action === 'Sell' ? '#15803d' :
                   item.action === 'Donate' ? '#b45309' : '#b91c1c',
            textTransform: 'uppercase',
            letterSpacing: '0.02em'
          }}>
            {item.action}
          </div>
          {item.priority === 'High' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#ef4444', fontSize: '9px', fontWeight: 800 }}>
              <AlertCircle size={10} /> HIGH
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} style={{ border: 'none', background: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px' }} className="hover:text-accent transition-colors">
            <MoreVertical size={14} />
          </button>
        </div>
      </div>
      
      <div className="flex items-start gap-3">
        {isBring && (
          <button onClick={onToggle} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', marginTop: '2px' }}>
            {isPacked ? 
              <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontSize: '24px' }}>check_circle</span> : 
              <span className="material-symbols-outlined" style={{ color: '#d1d5db', fontSize: '24px' }}>radio_button_unchecked</span>
            }
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 700, 
            textDecoration: isPacked ? 'line-through' : 'none', 
            color: isPacked ? 'var(--text-secondary)' : 'var(--foreground)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {item.itemName}
          </div>
          {item.notes && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.5' }}>{item.notes}</div>}
        </div>
      </div>

      <div className="mt-5 pt-3 flex justify-between items-center" style={{ borderTop: '1px solid #f8fafc' }}>
        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}>
          <Tag size={10} /> {item.room}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }} 
          style={{ border: 'none', background: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px' }} 
          className="hover:text-red-500 transition-colors"
          title="Delete item"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
