'use client';

import { useState } from 'react';
import { AlertTriangle, Check, Lock, MapPin, Plus, Trash2, X } from 'lucide-react';
import type { HomeFloorPlan, Room } from '@/lib/types';
import type { SaveResult } from './helpers';
import type { DerivedRoomShape } from './useDerivedRoomShapes';

export type RoomAnchorPlacement = {
  pendingName: string;
  pendingRoomId?: number;
};

export function RoomAnchorControls({
  floorPlan,
  floorRooms,
  derivedShapes,
  placementMode,
  locked,
  onStartPlacement,
  onCancelPlacement,
  onDeleteRoom,
  onRenameRoom,
}: {
  floorPlan: HomeFloorPlan;
  floorRooms: Room[];
  derivedShapes: Map<number, DerivedRoomShape>;
  placementMode: RoomAnchorPlacement | null;
  locked: boolean;
  /** Tells the page that the user wants to place an anchor for a new (or
   * existing, when re-anchoring) room. Page enters anchor-placement mode
   * on the canvas; clicking the canvas commits the anchor. */
  onStartPlacement: (placement: RoomAnchorPlacement) => void;
  onCancelPlacement: () => void;
  onDeleteRoom: (roomId: number) => Promise<SaveResult>;
  onRenameRoom: (roomId: number, name: string) => Promise<SaveResult>;
}) {
  const [draftName, setDraftName] = useState('');
  void floorPlan;

  const startNewRoom = () => {
    const name = draftName.trim();
    if (!name) return;
    onStartPlacement({ pendingName: name });
    setDraftName('');
  };

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin size={17} color="var(--color-accent-dark)" />
            <div>
              <div className="section-label" style={{ marginBottom: 4 }}>Rooms (anchored)</div>
              <div style={{ fontSize: 12, color: 'var(--color-secondary)' }}>
                Click inside a wall-bounded area to anchor a room. Shape is derived from the walls around it.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) auto', gap: 10, alignItems: 'end' }}>
          <label style={{ display: 'block' }}>
            <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>New room name</span>
            <input
              value={draftName}
              onChange={event => setDraftName(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  startNewRoom();
                }
              }}
              placeholder="e.g. Master Bedroom"
              disabled={placementMode !== null}
            />
          </label>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={startNewRoom}
            disabled={placementMode !== null || !draftName.trim() || locked}
          >
            <Plus size={14} /> Add Room
          </button>
        </div>
        {locked && (
          <div style={{ fontSize: 12, color: 'var(--color-secondary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={12} /> Structure layer locked. Unlock to add or rename rooms.
          </div>
        )}

        {placementMode && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px dashed var(--color-accent)',
              background: 'var(--color-accent-soft)',
            }}
          >
            <MapPin size={14} color="var(--color-accent-dark)" />
            <div style={{ flex: 1, fontSize: 12, color: 'var(--color-accent-dark)', fontWeight: 700 }}>
              {placementMode.pendingRoomId
                ? 'Click inside the room to move its anchor.'
                : `Click inside a wall-bounded area to place "${placementMode.pendingName}".`}
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancelPlacement}>
              <X size={14} /> Cancel
            </button>
          </div>
        )}

        {floorRooms.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--color-secondary)' }}>
            No rooms on this floor yet. Trace walls first, then add rooms.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {floorRooms.map(room => (
              <RoomAnchorRow
                key={room.id}
                room={room}
                shape={derivedShapes.get(room.id) ?? null}
                isPlacing={placementMode?.pendingRoomId === room.id}
                locked={locked}
                onMoveAnchor={() => onStartPlacement({ pendingName: room.name, pendingRoomId: room.id })}
                onDelete={() => onDeleteRoom(room.id)}
                onRename={(name) => onRenameRoom(room.id, name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RoomAnchorRow({
  room,
  shape,
  isPlacing,
  locked,
  onMoveAnchor,
  onDelete,
  onRename,
}: {
  room: Room;
  shape: DerivedRoomShape | null;
  isPlacing: boolean;
  locked: boolean;
  onMoveAnchor: () => void;
  onDelete: () => Promise<SaveResult>;
  onRename: (name: string) => Promise<SaveResult>;
}) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(room.name);
  const hasAnchor = room.anchorXFt !== null && room.anchorYFt !== null;
  const polygonLength = shape?.polygon.length ?? 0;
  const bounded = hasAnchor && (shape?.bounded ?? false);
  // An empty polygon with bounded=false means the flood-fill couldn't
  // start — either the anchor sits on a wall obstacle, or it's outside
  // the floor. Distinct from "fill leaked", where polygon is non-empty
  // but reached the floor edge.
  const anchorOnObstacle = hasAnchor && polygonLength === 0 && shape !== null;
  const areaFt2 = shape?.areaFt2 ?? 0;

  const saveName = async () => {
    const next = draftName.trim();
    if (!next || next === room.name) {
      setEditingName(false);
      setDraftName(room.name);
      return;
    }
    const result = await onRename(next);
    if (result.ok) {
      setEditingName(false);
    } else {
      setDraftName(room.name);
      setEditingName(false);
    }
  };

  const removeRoom = async () => {
    if (!window.confirm(`Remove the room "${room.name}"? Items assigned to it will become unplaced.`)) return;
    await onDelete();
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 8,
        border: '1px solid var(--color-border)',
        background: isPlacing ? 'var(--color-accent-soft)' : 'var(--color-surface)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {editingName ? (
          <input
            value={draftName}
            onChange={event => setDraftName(event.target.value)}
            onBlur={saveName}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                saveName();
              } else if (event.key === 'Escape') {
                setDraftName(room.name);
                setEditingName(false);
              }
            }}
            autoFocus
            style={{ width: '100%' }}
          />
        ) : (
          <button
            type="button"
            onClick={() => { if (locked) return; setDraftName(room.name); setEditingName(true); }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: 0,
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--color-foreground)',
              cursor: locked ? 'default' : 'text',
            }}
            title={locked ? 'Structure layer locked.' : 'Click to rename'}
          >
            {room.name}
          </button>
        )}
        <div style={{ fontSize: 11, color: 'var(--color-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          {!hasAnchor ? (
            <span style={{ color: '#9a5a2f' }}>Not yet anchored</span>
          ) : bounded ? (
            <>
              <Check size={11} color="#1f6b5b" />
              <span>{areaFt2.toFixed(0)} ft² · bounded</span>
            </>
          ) : anchorOnObstacle ? (
            <>
              <AlertTriangle size={11} color="#b45309" />
              <span style={{ color: '#b45309' }}>Anchor sits on a wall — move it to an open spot</span>
            </>
          ) : (
            <>
              <AlertTriangle size={11} color="#b45309" />
              <span style={{ color: '#b45309' }}>Anchor leaks — close the walls around it</span>
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={onMoveAnchor}
        disabled={isPlacing || locked}
        title={locked ? 'Structure layer locked.' : hasAnchor ? 'Move anchor' : 'Place anchor'}
      >
        <MapPin size={13} /> {hasAnchor ? 'Move' : 'Place'}
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={removeRoom}
        disabled={locked}
        title={locked ? 'Structure layer locked.' : 'Delete room'}
        style={{ color: locked ? 'var(--color-secondary)' : '#b91c1c' }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
