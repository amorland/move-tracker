'use client';

import { useEffect, useState } from 'react';
import { PackingItem, PackingAction, PackingStatus, PackingPriority } from '@/lib/types';
import { Plus, Trash2, Box, X, Save, Search, Tag, AlertCircle, CheckCircle2, MoreVertical, ExternalLink, MoveRight, DollarSign, Heart, Trash } from 'lucide-react';

const COMMON_ROOMS = [
  'Kitchen', 'Living Room', 'Master Bedroom', 'Bedroom 2', 'Bedroom 3',
  'Bathroom 1', 'Bathroom 2', 'Garage', 'Storage', 'Office', 'Dining Room',
  'Outdoor/Patio', 'Closet', 'Other'
];

type TabType = PackingAction;

export default function InventoryPage() {
  const [items, setItems] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('Bring');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<PackingItem> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const res = await fetch('/api/packing');
    const data = await res.json();
    setItems(data);
    setLoading(false);
  };

  const saveItem = async (item: Partial<PackingItem>) => {
    const method = item.id ? 'PATCH' : 'POST';
    const res = await fetch('/api/packing', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (res.ok) {
      setIsModalOpen(false);
      fetchItems();
    } else {
      const err = await res.json();
      alert(`Error saving item: ${err.error || 'Unknown error'}`);
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm('Delete this item?')) return;
    await fetch(`/api/packing?id=${id}`, { method: 'DELETE' });
    fetchItems();
  };

  const resolveItem = async (item: PackingItem) => {
    await saveItem({ ...item, status: 'Resolved' });
  };

  const moveItem = async (item: PackingItem, newAction: PackingAction) => {
    await saveItem({ ...item, action: newAction, status: 'Unresolved' });
  };

  const filteredItems = items.filter(i => {
    const matchesTab = i.action === activeTab;
    const matchesSearch = i.itemName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesResolution = showResolved ? i.status === 'Resolved' : i.status === 'Unresolved';
    return matchesTab && matchesSearch && matchesResolution;
  });

  const stats = {
    Bring: items.filter(i => i.action === 'Bring' && i.status === 'Unresolved').length,
    Sell: items.filter(i => i.action === 'Sell' && i.status === 'Unresolved').length,
    Donate: items.filter(i => i.action === 'Donate' && i.status === 'Unresolved').length,
    Trash: items.filter(i => i.action === 'Trash' && i.status === 'Unresolved').length,
    Resolved: items.filter(i => i.status === 'Resolved').length
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px' }}>Loading Starland Inventory...</div>;

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <div className="flex flex-stack items-center justify-between" style={{ marginBottom: '48px' }}>
        <div>
          <h1 style={{ marginBottom: '8px', letterSpacing: '0.02em' }}>Inventory Resolution</h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>Decide the fate of every item in your home.</p>
        </div>
        <button className="btn btn-primary" style={{ gap: '10px', height: '48px', padding: '0 24px', borderRadius: '12px' }} onClick={() => { setEditingItem({ action: activeTab, status: 'Unresolved', priority: 'Medium', room: 'Kitchen' }); setIsModalOpen(true); }}>
          <Plus size={20} /> Add Item
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        {(['Bring', 'Sell', 'Donate', 'Trash'] as TabType[]).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ 
              padding: '12px 24px', 
              borderRadius: '10px', 
              fontSize: '13px', 
              fontWeight: 600, 
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              background: activeTab === tab ? 'var(--accent)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            {tab === 'Bring' && <Box size={16} />}
            {tab === 'Sell' && <DollarSign size={16} />}
            {tab === 'Donate' && <Heart size={16} />}
            {tab === 'Trash' && <Trash size={16} />}
            {tab}
            {stats[tab] > 0 && <span style={{ opacity: 0.8, fontSize: '11px' }}>({stats[tab]})</span>}
          </button>
        ))}
        <div style={{ flex: 1 }}></div>
        <button 
          onClick={() => setShowResolved(!showResolved)}
          style={{ 
            fontSize: '11px', 
            fontWeight: 700, 
            color: showResolved ? 'var(--accent)' : 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {showResolved ? 'VIEW UNRESOLVED' : `VIEW RESOLVED (${stats.Resolved})`}
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: '32px' }}>
        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input 
          placeholder={`Search in ${activeTab}...`} 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '48px', height: '52px', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'var(--border)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
        {filteredItems.length > 0 ? filteredItems.map(item => (
          <InventoryRow 
            key={item.id} 
            item={item} 
            onResolve={() => resolveItem(item)} 
            onDelete={() => deleteItem(item.id)} 
            onMove={(action) => moveItem(item, action)}
            onEdit={() => { setEditingItem(item); setIsModalOpen(true); }}
          />
        )) : (
          <div style={{ padding: '80px 32px', textAlign: 'center', background: '#fff' }}>
            <Box size={48} color="var(--border)" style={{ margin: '0 auto 24px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>No {showResolved ? 'resolved' : 'unresolved'} items in {activeTab}.</p>
          </div>
        )}
      </div>

      {/* Item Modal */}
      {isModalOpen && editingItem && (
        <InventoryModal 
          item={editingItem} 
          onClose={() => setIsModalOpen(false)} 
          onSave={saveItem} 
        />
      )}
    </div>
  );
}

function InventoryRow({ item, onResolve, onDelete, onMove, onEdit }: { item: PackingItem, onResolve: () => void, onDelete: () => void, onMove: (a: PackingAction) => void, onEdit: () => void }) {
  const isResolved = item.status === 'Resolved';
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '20px', 
      padding: '16px 24px', 
      background: '#fff',
      opacity: isResolved ? 0.6 : 1
    }} className="task-row">
      <button 
        onClick={onResolve}
        style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: 0, flexShrink: 0 }}
      >
        {isResolved ? 
          <CheckCircle2 size={24} color="var(--accent)" /> : 
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid var(--border)' }}></div>
        }
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.itemName}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {item.room}
          </div>
          {item.notes && (
            <>
              <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--border)' }}></div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.notes}</div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        {item.action === 'Sell' && !isResolved && (
          <button className="btn btn-secondary" style={{ fontSize: '10px', padding: '6px 12px' }} onClick={() => onMove('Donate')}>MOVE TO DONATE</button>
        )}
        {item.action === 'Donate' && !isResolved && (
          <button className="btn btn-secondary" style={{ fontSize: '10px', padding: '6px 12px' }} onClick={() => onMove('Trash')}>MOVE TO TRASH</button>
        )}
        <button onClick={onEdit} style={{ border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><MoreVertical size={18} /></button>
        <button onClick={onDelete} style={{ border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} className="hover:text-red-500"><Trash2 size={18} /></button>
      </div>
    </div>
  );
}

function InventoryModal({ item, onClose, onSave }: { item: Partial<PackingItem>, onClose: () => void, onSave: (i: Partial<PackingItem>) => void }) {
  const [itemName, setItemName] = useState(item.itemName || '');
  const [room, setRoom] = useState(item.room || COMMON_ROOMS[0]);
  const [action, setAction] = useState(item.action || 'Bring');
  const [notes, setNotes] = useState(item.notes || '');

  const handleSave = () => {
    onSave({
      ...item,
      itemName,
      room,
      action,
      notes,
      status: (item.status === 'Resolved' ? 'Resolved' : 'Unresolved') as PackingStatus,
      priority: (item.priority || 'Medium') as PackingPriority
    });
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(45,42,38,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{item.id ? 'Edit Item' : 'New Inventory Item'}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', background: '#fff' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Item Name</label>
            <input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="e.g. Dining Table" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Room</label>
              <select value={room} onChange={e => setRoom(e.target.value)}>
                {COMMON_ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Action</label>
              <select value={action} onChange={e => setAction(e.target.value as PackingAction)}>
                <option value="Bring">Bring</option>
                <option value="Sell">Sell</option>
                <option value="Donate">Donate</option>
                <option value="Trash">Trash</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ height: '80px', resize: 'none' }} />
          </div>
        </div>
        <div style={{ padding: '24px 32px', background: 'var(--background)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Item</button>
        </div>
      </div>
    </div>
  );
}
