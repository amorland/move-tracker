'use client';

import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { itemFootprint } from '@/lib/homeLayout';
import { normaliseFurnitureType } from '@/lib/furniture';
import type {
  ArchitecturalElement,
  FurnitureType,
  HomeFloorPlan,
  Room,
  RoomItem,
  Wall,
} from '@/lib/types';
import {
  ArchitecturalElementUpdate,
  RoomItemLayoutUpdate,
  SaveResult,
  clamp,
  clampItemPosition,
  formatFt,
  normaliseRotation,
  roundToHundredth,
  snapPlanValue,
} from './helpers';

export type SceneCameraMode = 'top' | 'orbit';

/**
 * Convert (xFt from left, yFt from top) on the floor plan into the
 * Three.js coordinate space, where the floor sits in the XZ plane and the
 * floor centre is the origin. yFt maps to +Z, depth grows away from camera.
 */
function planToScene(xFt: number, yFt: number, floorPlan: HomeFloorPlan): [number, number, number] {
  return [xFt - floorPlan.widthFt / 2, 0, yFt - floorPlan.depthFt / 2];
}

const CEILING_HEIGHT_DEFAULT_FT = 9;
const WALL_HEIGHT_DEFAULT_FT = 9;
const FLOOR_COLOUR = '#f3ead7';
const GRID_COLOUR = '#cbb88f';
const WALL_COLOUR = '#5e564b';
const WALL_COLOUR_LOCKED = '#5a7691';
const ROOM_TINT_COLOURS = [
  '#7da99a', '#cda07a', '#a98558', '#5b8d77', '#bca988', '#5b8c5e', '#9f7654', '#55758b',
];

export function MeasuredFloorScene({
  floorPlan,
  rooms,
  items,
  walls,
  selectedItemId,
  onSelectItem,
  onMoveItem,
  onSaveItem,
  onDeleteItem,
  cameraMode,
  onCameraModeChange,
  snapToGrid,
  overlayVisible,
  blueprintTextureUrl,
  overlayOpacity,
  statusMessage,
  architecturalElements,
  derivedRoomShapes,
  structureLocked,
  elementsLocked,
}: {
  floorPlan: HomeFloorPlan;
  rooms: Room[];
  items: RoomItem[];
  walls: Wall[];
  architecturalElements: ArchitecturalElement[];
  derivedRoomShapes: Map<number, { roomId: number; polygon: { x: number; y: number }[]; bounded: boolean; areaFt2: number }>;
  structureLocked: boolean;
  elementsLocked: boolean;
  selectedItemId: number | null;
  onSelectItem: (itemId: number | null) => void;
  onMoveItem: (item: RoomItem, floorPlanId: number, roomId: number | null, planXFt: number, planYFt: number) => void;
  onSaveItem: (itemId: number, update: RoomItemLayoutUpdate) => Promise<SaveResult>;
  onDeleteItem?: (itemId: number) => Promise<SaveResult>;
  onMoveArchitecturalElement?: (elementId: number, update: ArchitecturalElementUpdate) => Promise<SaveResult>;
  cameraMode: SceneCameraMode;
  onCameraModeChange: (mode: SceneCameraMode) => void;
  snapToGrid: boolean;
  overlayVisible: boolean;
  blueprintTextureUrl: string | null;
  overlayOpacity: number;
  statusMessage: string | null;
}) {
  void elementsLocked;
  const ceilingHeightFt = floorPlan.ceilingHeightFt ?? CEILING_HEIGHT_DEFAULT_FT;
  const floorItems = items.filter(item => {
    if (item.floorPlanId === floorPlan.id) return true;
    return item.floorPlanId === null && item.roomId !== null && rooms.some(room => room.id === item.roomId && room.floorPlanId === floorPlan.id);
  });

  const handleItemMoved = (item: RoomItem, planXFt: number, planYFt: number) => {
    onMoveItem(item, floorPlan.id, item.roomId, planXFt, planYFt);
  };

  const handleRotateSelected = async (delta: number) => {
    const item = items.find(entry => entry.id === selectedItemId);
    if (!item) return;
    const next = normaliseRotation((item.rotationDeg ?? 0) + delta);
    await onSaveItem(item.id, { rotationDeg: next });
  };

  const handleDeleteSelected = async () => {
    if (!onDeleteItem || !selectedItemId) return;
    if (!window.confirm('Remove this placed item from the layout?')) return;
    await onDeleteItem(selectedItemId);
    onSelectItem(null);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 style={{ margin: 0 }}>{floorPlan.label}</h2>
          <div style={{ fontSize: 12, color: 'var(--color-secondary)', marginTop: 6 }}>
            3D scene · {floorPlan.widthFt}&apos; × {floorPlan.depthFt}&apos; · ceiling {formatFt(ceilingHeightFt)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="seg-control" aria-label="Camera mode">
            <button
              type="button"
              onClick={() => onCameraModeChange('top')}
              className={`seg-btn ${cameraMode === 'top' ? 'seg-active' : ''}`}
            >
              Top-down
            </button>
            <button
              type="button"
              onClick={() => onCameraModeChange('orbit')}
              className={`seg-btn ${cameraMode === 'orbit' ? 'seg-active' : ''}`}
            >
              Orbit
            </button>
          </div>
          <span className="badge badge-neutral">{walls.length} walls</span>
          <span className="badge badge-neutral">{floorItems.length} placed items</span>
          {selectedItemId !== null && (
            <>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleRotateSelected(-15)}>↺ 15°</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleRotateSelected(15)}>↻ 15°</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleRotateSelected(90)}>↻ 90°</button>
              {onDeleteItem && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleDeleteSelected} style={{ color: '#b91c1c' }}>Delete</button>
              )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => onSelectItem(null)}>Deselect</button>
            </>
          )}
        </div>
      </div>
      <div className="card-body">
        {statusMessage && (
          <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 800, color: statusMessage.toLowerCase().includes('failed') ? '#b91c1c' : 'var(--color-secondary)' }}>
            {statusMessage}
          </div>
        )}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: `${Math.max(floorPlan.widthFt, 1)} / ${Math.max(floorPlan.depthFt, 1)}`,
            minHeight: 540,
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            background: '#1a1813',
            overflow: 'hidden',
          }}
          onPointerDown={event => {
            // Click on empty canvas deselects.
            if ((event.target as HTMLElement).tagName === 'CANVAS') onSelectItem(null);
          }}
        >
          <Canvas
            shadows={false}
            dpr={[1, 2]}
            gl={{ antialias: true }}
            style={{ width: '100%', height: '100%' }}
          >
            <SceneCamera floorPlan={floorPlan} mode={cameraMode} />
            <ambientLight intensity={0.55} />
            <directionalLight position={[20, 30, 10]} intensity={0.9} />
            <directionalLight position={[-15, 20, -10]} intensity={0.35} />
            <Floor
              floorPlan={floorPlan}
              overlayVisible={overlayVisible}
              blueprintTextureUrl={blueprintTextureUrl}
              overlayOpacity={overlayOpacity}
            />
            <DerivedFloors
              floorPlan={floorPlan}
              floorRooms={rooms.filter(r => r.floorPlanId === floorPlan.id)}
              derivedRoomShapes={derivedRoomShapes}
            />
            <Walls
              walls={walls}
              floorPlan={floorPlan}
              ceilingHeightFt={ceilingHeightFt}
              architecturalElements={architecturalElements}
              locked={structureLocked}
            />
            {floorItems.map(item => (
              <FurnitureItem3D
                key={item.id}
                item={item}
                floorPlan={floorPlan}
                selected={item.id === selectedItemId}
                snapToGrid={snapToGrid}
                onSelect={() => onSelectItem(item.id)}
                onMoved={(xFt, yFt) => handleItemMoved(item, xFt, yFt)}
              />
            ))}
            <OrbitControls
              enableRotate={cameraMode === 'orbit'}
              enableZoom
              enablePan={cameraMode === 'orbit'}
              minDistance={4}
              maxDistance={Math.max(floorPlan.widthFt, floorPlan.depthFt) * 2.5}
            />
          </Canvas>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-secondary)' }}>
          Click an item to select it. Drag with the pointer to move. Rotate with the buttons above. Use Top-down for placement, Orbit for walking the room visually.
        </div>
      </div>
    </div>
  );
}

function SceneCamera({ floorPlan, mode }: { floorPlan: HomeFloorPlan; mode: SceneCameraMode }) {
  const { set, size } = useThree();
  const aspect = size.width / Math.max(size.height, 1);
  const margin = 4;

  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const persoCameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    const target = mode === 'top' ? orthoCameraRef.current : persoCameraRef.current;
    if (target) set({ camera: target });
  }, [mode, set]);

  const halfWidth = floorPlan.widthFt / 2 + margin;
  const halfDepth = floorPlan.depthFt / 2 + margin;
  const orthoSize = Math.max(halfWidth, halfDepth * aspect);

  return (
    <>
      <orthographicCamera
        ref={orthoCameraRef}
        position={[0, Math.max(floorPlan.widthFt, floorPlan.depthFt), 0]}
        zoom={1}
        left={-orthoSize}
        right={orthoSize}
        top={orthoSize / aspect}
        bottom={-orthoSize / aspect}
        near={0.1}
        far={500}
        // Look straight down at the floor, with +Y as the up axis when looking
        // from above so that increasing yFt visually goes "down" the screen,
        // matching the 2D canvas.
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <perspectiveCamera
        ref={persoCameraRef}
        position={[floorPlan.widthFt * 0.6, ceilingPerspectiveHeight(floorPlan), floorPlan.depthFt * 0.9]}
        fov={45}
        near={0.1}
        far={500}
      />
    </>
  );
}

function ceilingPerspectiveHeight(floorPlan: HomeFloorPlan) {
  return Math.max(floorPlan.widthFt, floorPlan.depthFt) * 0.8;
}

function Floor({
  floorPlan,
  overlayVisible,
  blueprintTextureUrl,
  overlayOpacity,
}: {
  floorPlan: HomeFloorPlan;
  overlayVisible: boolean;
  blueprintTextureUrl: string | null;
  overlayOpacity: number;
}) {
  const blueprintTexture = useBlueprintTexture(blueprintTextureUrl);
  const widthFt = floorPlan.widthFt;
  const depthFt = floorPlan.depthFt;
  const overlayRect = {
    x: floorPlan.overlayOffsetXFt ?? 0,
    y: floorPlan.overlayOffsetYFt ?? 0,
    width: floorPlan.overlayWidthFt ?? widthFt,
    depth: floorPlan.overlayDepthFt ?? depthFt,
  };

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[widthFt, depthFt]} />
        <meshStandardMaterial color={FLOOR_COLOUR} />
      </mesh>
      {/* Grid lines as a wireframe overlay */}
      <gridHelper
        args={[Math.max(widthFt, depthFt) + 4, Math.round(Math.max(widthFt, depthFt) + 4), GRID_COLOUR, GRID_COLOUR]}
        position={[0, 0.005, 0]}
      />
      {/* Blueprint underlay */}
      {overlayVisible && blueprintTexture && (
        <mesh
          position={[
            overlayRect.x + overlayRect.width / 2 - widthFt / 2,
            0.01,
            overlayRect.y + overlayRect.depth / 2 - depthFt / 2,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[overlayRect.width, overlayRect.depth]} />
          <meshBasicMaterial map={blueprintTexture} transparent opacity={overlayOpacity} />
        </mesh>
      )}
    </group>
  );
}

function useBlueprintTexture(url: string | null) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const previousTextureRef = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url) {
      // Schedule the cleanup asynchronously so we don't synchronously
      // setState during the effect body, which the lint rule flags.
      const handle = setTimeout(() => {
        previousTextureRef.current?.dispose();
        previousTextureRef.current = null;
        setTexture(null);
      }, 0);
      return () => clearTimeout(handle);
    }

    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(url, loaded => {
      if (cancelled) {
        loaded.dispose();
        return;
      }
      loaded.colorSpace = THREE.SRGBColorSpace;
      previousTextureRef.current?.dispose();
      previousTextureRef.current = loaded;
      setTexture(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return texture;
}

function Walls({
  walls,
  floorPlan,
  ceilingHeightFt,
  architecturalElements,
  locked,
}: {
  walls: Wall[];
  floorPlan: HomeFloorPlan;
  ceilingHeightFt: number;
  architecturalElements: ArchitecturalElement[];
  locked: boolean;
}) {
  return (
    <group>
      {walls.map(wall => {
        const openings: WallOpening[] = architecturalElements
          .filter((el): el is ArchitecturalElement & { elementType: 'door' | 'window' | 'opening' } =>
            el.wallId === wall.id && el.offsetAlongWallFt !== null &&
            (el.elementType === 'door' || el.elementType === 'window' || el.elementType === 'opening'))
          .map(el => ({
            type: el.elementType,
            offset: el.offsetAlongWallFt ?? 0,
            width: el.widthFt,
          }))
          .sort((a, b) => a.offset - b.offset);
        return (
          <WallWithOpenings
            key={wall.id}
            wall={wall}
            floorPlan={floorPlan}
            ceilingHeightFt={ceilingHeightFt}
            openings={openings}
            locked={locked}
          />
        );
      })}
    </group>
  );
}

type WallOpening = { type: 'door' | 'window' | 'opening'; offset: number; width: number };

/**
 * Render a wall as one or more box segments with gaps for openings.
 * For a wall of length L with N openings at offsets o_i and widths w_i:
 *   segments = [0..o_1 - w_1/2, o_1 + w_1/2 .. o_2 - w_2/2, ..., o_N + w_N/2 .. L]
 * Windows get a translucent pane mesh in the gap; doors and openings stay empty.
 */
function WallWithOpenings({
  wall,
  floorPlan,
  ceilingHeightFt,
  openings,
  locked,
}: {
  wall: Wall;
  floorPlan: HomeFloorPlan;
  ceilingHeightFt: number;
  openings: WallOpening[];
  locked: boolean;
}) {
  const dx = wall.endXFt - wall.startXFt;
  const dy = wall.endYFt - wall.startYFt;
  const length = Math.hypot(dx, dy);
  if (length < 0.01) return null;

  const angle = Math.atan2(dy, dx);
  const thicknessFt = (wall.thicknessIn ?? 5) / 12;
  const heightFt = wall.heightFt ?? ceilingHeightFt ?? WALL_HEIGHT_DEFAULT_FT;
  const wallColour = locked ? WALL_COLOUR_LOCKED : WALL_COLOUR;

  // Walk from offset 0 to offset L, emitting solid segments between openings.
  const segments: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const opening of openings) {
    const halfWidth = opening.width / 2;
    const openingStart = Math.max(0, opening.offset - halfWidth);
    const openingEnd = Math.min(length, opening.offset + halfWidth);
    if (openingStart > cursor) segments.push({ start: cursor, end: openingStart });
    cursor = Math.max(cursor, openingEnd);
  }
  if (cursor < length) segments.push({ start: cursor, end: length });

  const unitX = dx / length;
  const unitY = dy / length;
  const renderSegment = (start: number, end: number, key: string) => {
    const segLength = end - start;
    if (segLength < 0.01) return null;
    const centreOffset = (start + end) / 2;
    const centreXFt = wall.startXFt + centreOffset * unitX;
    const centreYFt = wall.startYFt + centreOffset * unitY;
    const [sceneX, , sceneZ] = planToScene(centreXFt, centreYFt, floorPlan);
    return (
      <mesh key={key} position={[sceneX, heightFt / 2, sceneZ]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[segLength, heightFt, thicknessFt]} />
        <meshStandardMaterial color={wallColour} />
      </mesh>
    );
  };

  return (
    <group>
      {segments.map((seg, idx) => renderSegment(seg.start, seg.end, `seg-${idx}`))}
      {openings.filter(o => o.type === 'window').map((window, idx) => {
        const centreOffset = window.offset;
        const centreXFt = wall.startXFt + centreOffset * unitX;
        const centreYFt = wall.startYFt + centreOffset * unitY;
        const [sceneX, , sceneZ] = planToScene(centreXFt, centreYFt, floorPlan);
        const paneHeight = heightFt * 0.45;
        return (
          <mesh
            key={`pane-${idx}`}
            position={[sceneX, heightFt * 0.5, sceneZ]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[window.width, paneHeight, thicknessFt * 0.4]} />
            <meshPhysicalMaterial color="#bcd6e1" transparent opacity={0.45} roughness={0.1} transmission={0.6} thickness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

function DerivedFloors({
  floorPlan,
  floorRooms,
  derivedRoomShapes,
}: {
  floorPlan: HomeFloorPlan;
  floorRooms: Room[];
  derivedRoomShapes: Map<number, { roomId: number; polygon: { x: number; y: number }[]; bounded: boolean; areaFt2: number }>;
}) {
  return (
    <group>
      {floorRooms.map((room, index) => {
        const shape = derivedRoomShapes.get(room.id);
        if (!shape || shape.polygon.length < 3) return null;
        const colour = shape.bounded
          ? ROOM_TINT_COLOURS[index % ROOM_TINT_COLOURS.length]
          : '#b45309';
        const shapeGeo = new THREE.Shape(shape.polygon.map(p => {
          // Plan coords: (x, y) → scene XZ: x → sceneX = x - widthFt/2; y → sceneZ = y - depthFt/2.
          // We construct the Shape in scene XZ and rotate it flat onto the floor.
          return new THREE.Vector2(p.x - floorPlan.widthFt / 2, p.y - floorPlan.depthFt / 2);
        }));
        return (
          <mesh key={room.id} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <shapeGeometry args={[shapeGeo]} />
            <meshBasicMaterial color={colour} transparent opacity={shape.bounded ? 0.32 : 0.22} />
          </mesh>
        );
      })}
    </group>
  );
}

function FurnitureItem3D({
  item,
  floorPlan,
  selected,
  snapToGrid,
  onSelect,
  onMoved,
}: {
  item: RoomItem;
  floorPlan: HomeFloorPlan;
  selected: boolean;
  snapToGrid: boolean;
  onSelect: () => void;
  onMoved: (planXFt: number, planYFt: number) => void;
}) {
  const footprint = itemFootprint(item);
  const draggingRef = useRef(false);
  const dragStartPlan = useRef<{ xFt: number; yFt: number } | null>(null);
  const dragStartCursor = useRef<THREE.Vector3 | null>(null);
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const { camera, raycaster, gl } = useThree();

  // Local position state during drag; falls back to the latest prop value
  // when not dragging so external refreshes flow through.
  const [dragPosition, setDragPosition] = useState<{ xFt: number; yFt: number } | null>(null);
  const propX = item.planXFt ?? Math.max(0, floorPlan.widthFt / 2 - footprint.widthFt / 2);
  const propY = item.planYFt ?? Math.max(0, floorPlan.depthFt / 2 - footprint.depthFt / 2);
  const position = dragPosition ?? { xFt: propX, yFt: propY };

  const projectPointer = (event: ThreeEvent<PointerEvent>) => {
    const intersection = new THREE.Vector3();
    raycaster.setFromCamera(
      new THREE.Vector2(
        (event.nativeEvent.offsetX / gl.domElement.clientWidth) * 2 - 1,
        -((event.nativeEvent.offsetY / gl.domElement.clientHeight) * 2 - 1),
      ),
      camera,
    );
    raycaster.ray.intersectPlane(planeRef.current, intersection);
    return intersection;
  };

  const beginDrag = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onSelect();
    draggingRef.current = true;
    dragStartPlan.current = { ...position };
    dragStartCursor.current = projectPointer(event).clone();
    (event.target as Element).setPointerCapture?.(event.pointerId);
  };

  const continueDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!draggingRef.current || !dragStartPlan.current || !dragStartCursor.current) return;
    event.stopPropagation();
    const cursor = projectPointer(event);
    const deltaX = cursor.x - dragStartCursor.current.x;
    const deltaZ = cursor.z - dragStartCursor.current.z;
    const rawX = snapPlanValue(dragStartPlan.current.xFt + deltaX, snapToGrid);
    const rawY = snapPlanValue(dragStartPlan.current.yFt + deltaZ, snapToGrid);
    const next = clampItemPosition(rawX, rawY, footprint.widthFt, footprint.depthFt, floorPlan);
    setDragPosition({ xFt: next.planXFt, yFt: next.planYFt });
  };

  const endDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!draggingRef.current) return;
    event.stopPropagation();
    draggingRef.current = false;
    dragStartPlan.current = null;
    dragStartCursor.current = null;
    const finalX = roundToHundredth(position.xFt);
    const finalY = roundToHundredth(position.yFt);
    setDragPosition(null);
    onMoved(finalX, finalY);
  };

  // Centre of the furniture box on the floor.
  const centreXFt = position.xFt + footprint.widthFt / 2;
  const centreYFt = position.yFt + footprint.depthFt / 2;
  const [sceneX, , sceneZ] = planToScene(centreXFt, centreYFt, floorPlan);
  const rotationRad = ((item.rotationDeg ?? 0) * Math.PI) / 180;
  const furnitureType = normaliseFurnitureType(item.furnitureType, item.itemName);

  return (
    <group
      position={[sceneX, 0, sceneZ]}
      rotation={[0, -rotationRad, 0]}
      onPointerDown={beginDrag}
      onPointerMove={continueDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <FurniturePrimitive
        type={furnitureType}
        widthFt={footprint.widthFt}
        depthFt={footprint.depthFt}
        heightFt={(item.heightIn ?? defaultHeightInForType(furnitureType)) / 12}
        selected={selected}
        label={item.itemName}
      />
    </group>
  );
}

function defaultHeightInForType(type: FurnitureType): number {
  if (type === 'bed' || type === 'crib') return 32;
  if (type === 'sofa' || type === 'sectional' || type === 'bench' || type === 'ottoman' || type === 'patio_chair' || type === 'chair') return 32;
  if (type === 'dining_table' || type === 'outdoor_table' || type === 'desk' || type === 'coffee_table') return 30;
  if (type === 'side_table') return 26;
  if (type === 'dresser') return 36;
  if (type === 'bookcase' || type === 'storage') return 72;
  if (type === 'tv_stand') return 24;
  if (type === 'rug') return 0.5;
  if (type === 'lamp') return 60;
  if (type === 'plant') return 36;
  if (type === 'grill') return 42;
  if (type === 'mirror') return 72;
  if (type === 'appliance') return 36;
  return 24;
}

function FurniturePrimitive({
  type,
  widthFt,
  depthFt,
  heightFt,
  selected,
  label,
}: {
  type: FurnitureType;
  widthFt: number;
  depthFt: number;
  heightFt: number;
  selected: boolean;
  label: string;
}) {
  const palette = furnitureColours(type);
  const ringColour = '#1f6b5b';

  return (
    <group>
      <FurnitureBody
        type={type}
        widthFt={widthFt}
        depthFt={depthFt}
        heightFt={heightFt}
        palette={palette}
      />
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(widthFt, depthFt) * 0.55, Math.max(widthFt, depthFt) * 0.6, 32]} />
          <meshBasicMaterial color={ringColour} transparent opacity={0.85} />
        </mesh>
      )}
      <SceneLabel text={label} y={heightFt + 0.4} />
    </group>
  );
}

function SceneLabel({ text, y }: { text: string; y: number }) {
  // Lightweight floating label using a sprite-style billboard: render text on a
  // canvas texture so it scales legibly and faces the camera.
  const texture = useMemo(() => makeTextTexture(text), [text]);
  return (
    <sprite position={[0, y, 0]} scale={[Math.max(text.length * 0.12, 1.4), 0.4, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}

function makeTextTexture(text: string): THREE.Texture {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return new THREE.Texture();
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(28,25,23,0.75)';
    roundRect(ctx, 16, 24, canvas.width - 32, canvas.height - 48, 24);
    ctx.fill();
    ctx.fillStyle = '#fffaf3';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.length > 18 ? `${text.slice(0, 18)}…` : text, canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

type FurniturePalette = {
  primary: string;
  accent: string;
  back: string;
};

function furnitureColours(type: FurnitureType): FurniturePalette {
  if (type === 'bed' || type === 'crib') return { primary: '#e6d4b1', accent: '#b8956a', back: '#8d6c46' };
  if (type === 'sofa' || type === 'sectional') return { primary: '#5b8d77', accent: '#1f6b5b', back: '#2f5e4f' };
  if (type === 'chair' || type === 'patio_chair' || type === 'bench' || type === 'ottoman') return { primary: '#7da99a', accent: '#1f6b5b', back: '#2f5e4f' };
  if (type === 'dining_table' || type === 'outdoor_table' || type === 'coffee_table' || type === 'side_table' || type === 'desk') return { primary: '#cda07a', accent: '#9a5a2f', back: '#7a4424' };
  if (type === 'dresser' || type === 'bookcase' || type === 'tv_stand' || type === 'storage') return { primary: '#bca988', accent: '#7d6f55', back: '#5e4f3a' };
  if (type === 'rug') return { primary: '#d6b88c', accent: '#a98558', back: '#a98558' };
  if (type === 'lamp') return { primary: '#f5dc99', accent: '#b99b68', back: '#b99b68' };
  if (type === 'plant') return { primary: '#5b8c5e', accent: '#3a6c3d', back: '#7a553a' };
  if (type === 'appliance') return { primary: '#cdd4d8', accent: '#7c8a93', back: '#7c8a93' };
  return { primary: '#cab9a0', accent: '#7d6f55', back: '#5e4f3a' };
}

function FurnitureBody({
  type,
  widthFt,
  depthFt,
  heightFt,
  palette,
}: {
  type: FurnitureType;
  widthFt: number;
  depthFt: number;
  heightFt: number;
  palette: FurniturePalette;
}) {
  if (type === 'bed' || type === 'crib') {
    const baseHeight = heightFt * 0.7;
    const headboardHeight = heightFt * 1.1;
    return (
      <group>
        {/* Mattress */}
        <mesh position={[0, baseHeight / 2, 0]}>
          <boxGeometry args={[widthFt, baseHeight, depthFt]} />
          <meshStandardMaterial color={palette.primary} />
        </mesh>
        {/* Headboard along the front (-Z side) of the bed */}
        <mesh position={[0, headboardHeight / 2, -depthFt / 2 + 0.15]}>
          <boxGeometry args={[widthFt, headboardHeight, 0.3]} />
          <meshStandardMaterial color={palette.back} />
        </mesh>
        {/* Pillows */}
        <mesh position={[-widthFt / 4, baseHeight + 0.15, -depthFt / 4]}>
          <boxGeometry args={[widthFt / 2.5, 0.3, depthFt / 4]} />
          <meshStandardMaterial color="#fffaf3" />
        </mesh>
        <mesh position={[widthFt / 4, baseHeight + 0.15, -depthFt / 4]}>
          <boxGeometry args={[widthFt / 2.5, 0.3, depthFt / 4]} />
          <meshStandardMaterial color="#fffaf3" />
        </mesh>
      </group>
    );
  }

  if (type === 'sofa' || type === 'sectional') {
    const seatHeight = clamp(heightFt * 0.55, 1, heightFt * 0.7);
    const armWidth = clamp(widthFt * 0.08, 0.3, 0.8);
    return (
      <group>
        {/* Seat base */}
        <mesh position={[0, seatHeight / 2, 0]}>
          <boxGeometry args={[widthFt, seatHeight, depthFt]} />
          <meshStandardMaterial color={palette.primary} />
        </mesh>
        {/* Backrest */}
        <mesh position={[0, heightFt * 0.75, -depthFt / 2 + 0.15]}>
          <boxGeometry args={[widthFt, heightFt - seatHeight, 0.3]} />
          <meshStandardMaterial color={palette.back} />
        </mesh>
        {/* Left arm */}
        <mesh position={[-widthFt / 2 + armWidth / 2, heightFt * 0.55, 0]}>
          <boxGeometry args={[armWidth, heightFt * 0.85, depthFt]} />
          <meshStandardMaterial color={palette.accent} />
        </mesh>
        {/* Right arm */}
        <mesh position={[widthFt / 2 - armWidth / 2, heightFt * 0.55, 0]}>
          <boxGeometry args={[armWidth, heightFt * 0.85, depthFt]} />
          <meshStandardMaterial color={palette.accent} />
        </mesh>
      </group>
    );
  }

  if (type === 'chair' || type === 'patio_chair' || type === 'ottoman') {
    const seatHeight = clamp(heightFt * 0.55, 0.8, heightFt * 0.7);
    const seatBoxHeight = clamp(heightFt * 0.18, 0.18, 0.4);
    return (
      <group>
        {/* Seat */}
        <mesh position={[0, seatHeight, 0]}>
          <boxGeometry args={[widthFt * 0.95, seatBoxHeight, depthFt * 0.95]} />
          <meshStandardMaterial color={palette.primary} />
        </mesh>
        {/* Back */}
        {type !== 'ottoman' && (
          <mesh position={[0, heightFt * 0.75, -depthFt * 0.4]}>
            <boxGeometry args={[widthFt * 0.95, heightFt * 0.5, 0.2]} />
            <meshStandardMaterial color={palette.back} />
          </mesh>
        )}
        {/* Four legs */}
        {[
          [-widthFt / 2 + 0.15, -depthFt / 2 + 0.15],
          [widthFt / 2 - 0.15, -depthFt / 2 + 0.15],
          [-widthFt / 2 + 0.15, depthFt / 2 - 0.15],
          [widthFt / 2 - 0.15, depthFt / 2 - 0.15],
        ].map(([lx, lz], idx) => (
          <mesh key={idx} position={[lx, seatHeight / 2 - seatBoxHeight / 2, lz]}>
            <boxGeometry args={[0.18, seatHeight - seatBoxHeight, 0.18]} />
            <meshStandardMaterial color={palette.accent} />
          </mesh>
        ))}
      </group>
    );
  }

  if (type === 'bench') {
    const seatHeight = clamp(heightFt * 0.5, 0.6, heightFt * 0.7);
    const seatBoxHeight = clamp(heightFt * 0.18, 0.18, 0.35);
    return (
      <group>
        <mesh position={[0, seatHeight, 0]}>
          <boxGeometry args={[widthFt, seatBoxHeight, depthFt]} />
          <meshStandardMaterial color={palette.primary} />
        </mesh>
        {[
          [-widthFt / 2 + 0.15, -depthFt / 2 + 0.15],
          [widthFt / 2 - 0.15, -depthFt / 2 + 0.15],
          [-widthFt / 2 + 0.15, depthFt / 2 - 0.15],
          [widthFt / 2 - 0.15, depthFt / 2 - 0.15],
        ].map(([lx, lz], idx) => (
          <mesh key={idx} position={[lx, seatHeight / 2 - seatBoxHeight / 2, lz]}>
            <boxGeometry args={[0.18, seatHeight - seatBoxHeight, 0.18]} />
            <meshStandardMaterial color={palette.accent} />
          </mesh>
        ))}
      </group>
    );
  }

  if (type === 'dining_table' || type === 'outdoor_table' || type === 'coffee_table' || type === 'side_table' || type === 'desk') {
    const topHeight = 0.18;
    const tableHeight = heightFt;
    return (
      <group>
        <mesh position={[0, tableHeight - topHeight / 2, 0]}>
          <boxGeometry args={[widthFt, topHeight, depthFt]} />
          <meshStandardMaterial color={palette.primary} />
        </mesh>
        {[
          [-widthFt / 2 + 0.15, -depthFt / 2 + 0.15],
          [widthFt / 2 - 0.15, -depthFt / 2 + 0.15],
          [-widthFt / 2 + 0.15, depthFt / 2 - 0.15],
          [widthFt / 2 - 0.15, depthFt / 2 - 0.15],
        ].map(([lx, lz], idx) => (
          <mesh key={idx} position={[lx, (tableHeight - topHeight) / 2, lz]}>
            <boxGeometry args={[0.16, tableHeight - topHeight, 0.16]} />
            <meshStandardMaterial color={palette.accent} />
          </mesh>
        ))}
      </group>
    );
  }

  if (type === 'dresser') {
    const drawerCount = 4;
    const drawerHeight = heightFt / drawerCount;
    return (
      <group>
        <mesh position={[0, heightFt / 2, 0]}>
          <boxGeometry args={[widthFt, heightFt, depthFt]} />
          <meshStandardMaterial color={palette.primary} />
        </mesh>
        {Array.from({ length: drawerCount }).map((_, idx) => (
          <mesh
            key={idx}
            position={[0, drawerHeight * (idx + 0.5), depthFt / 2 + 0.01]}
          >
            <boxGeometry args={[widthFt * 0.92, drawerHeight * 0.85, 0.02]} />
            <meshStandardMaterial color={palette.back} />
          </mesh>
        ))}
      </group>
    );
  }

  if (type === 'bookcase' || type === 'storage') {
    const shelfCount = 4;
    const shelfHeight = heightFt / shelfCount;
    return (
      <group>
        <mesh position={[0, heightFt / 2, 0]}>
          <boxGeometry args={[widthFt, heightFt, depthFt]} />
          <meshStandardMaterial color={palette.primary} />
        </mesh>
        {Array.from({ length: shelfCount + 1 }).map((_, idx) => (
          <mesh
            key={idx}
            position={[0, shelfHeight * idx, depthFt / 2 + 0.01]}
          >
            <boxGeometry args={[widthFt * 0.96, 0.05, 0.02]} />
            <meshStandardMaterial color={palette.back} />
          </mesh>
        ))}
      </group>
    );
  }

  if (type === 'tv_stand') {
    return (
      <group>
        <mesh position={[0, heightFt / 2, 0]}>
          <boxGeometry args={[widthFt, heightFt, depthFt]} />
          <meshStandardMaterial color={palette.primary} />
        </mesh>
        <mesh position={[0, heightFt / 2, depthFt / 2 + 0.01]}>
          <boxGeometry args={[widthFt * 0.6, heightFt * 0.55, 0.02]} />
          <meshStandardMaterial color="#1c1916" />
        </mesh>
      </group>
    );
  }

  if (type === 'rug') {
    return (
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[widthFt, depthFt]} />
        <meshStandardMaterial color={palette.primary} />
      </mesh>
    );
  }

  if (type === 'lamp') {
    const baseHeight = heightFt * 0.05;
    const shadeHeight = heightFt * 0.3;
    const stemHeight = heightFt - baseHeight - shadeHeight;
    return (
      <group>
        <mesh position={[0, baseHeight / 2, 0]}>
          <cylinderGeometry args={[Math.min(widthFt, depthFt) * 0.4, Math.min(widthFt, depthFt) * 0.4, baseHeight, 16]} />
          <meshStandardMaterial color={palette.accent} />
        </mesh>
        <mesh position={[0, baseHeight + stemHeight / 2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, stemHeight, 12]} />
          <meshStandardMaterial color={palette.accent} />
        </mesh>
        <mesh position={[0, baseHeight + stemHeight + shadeHeight / 2, 0]}>
          <cylinderGeometry args={[Math.min(widthFt, depthFt) * 0.45, Math.min(widthFt, depthFt) * 0.55, shadeHeight, 16, 1, true]} />
          <meshStandardMaterial color={palette.primary} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  }

  if (type === 'plant') {
    return (
      <group>
        <mesh position={[0, 0.5 / 2, 0]}>
          <cylinderGeometry args={[Math.min(widthFt, depthFt) * 0.4, Math.min(widthFt, depthFt) * 0.45, 0.5, 12]} />
          <meshStandardMaterial color={palette.back} />
        </mesh>
        <mesh position={[0, 0.5 + (heightFt - 0.5) / 2, 0]}>
          <coneGeometry args={[Math.min(widthFt, depthFt) * 0.55, heightFt - 0.5, 12]} />
          <meshStandardMaterial color={palette.primary} />
        </mesh>
      </group>
    );
  }

  if (type === 'appliance') {
    return (
      <mesh position={[0, heightFt / 2, 0]}>
        <boxGeometry args={[widthFt, heightFt, depthFt]} />
        <meshStandardMaterial color={palette.primary} metalness={0.3} roughness={0.4} />
      </mesh>
    );
  }

  // Default: a generic labelled box.
  return (
    <mesh position={[0, heightFt / 2, 0]}>
      <boxGeometry args={[widthFt, heightFt, depthFt]} />
      <meshStandardMaterial color={palette.primary} />
    </mesh>
  );
}
