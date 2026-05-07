import { DocumentLink, TimelineEntry } from '@/lib/types';
import { TimelineAsset } from './timelineAssets';

export type TimelineFormMode = 'move_event' | 'track_entry';

export type TimelineFormPayload = {
  mode: TimelineFormMode;
  title: string;
  date: string;
  time: string | null;
  notes: string | null;
  status: TimelineEntry['status'];
  trackId: number;
  entryType: TimelineEntry['entryType'];
};

type LinkTarget = {
  entityType: 'event' | 'timeline_entry';
  entityId: number;
};

export async function saveTimelineAsset(existing: TimelineAsset | undefined, payload: TimelineFormPayload) {
  if (!existing) {
    await createTimelineAsset(payload);
    return;
  }

  if (existing.rawEvent) {
    if (payload.mode === 'move_event') {
      await patchMoveEvent(existing.rawEvent.id, payload);
      return;
    }
    const created = await createTimelineEntry(payload);
    await moveDocumentLinks(
      { entityType: 'event', entityId: existing.rawEvent.id },
      { entityType: 'timeline_entry', entityId: Number(created.id) }
    );
    await deleteMoveEvent(existing.rawEvent.id);
    return;
  }

  if (existing.rawTimelineEntry) {
    if (payload.mode === 'track_entry') {
      await patchTimelineEntry(existing.rawTimelineEntry.id, payload);
      return;
    }
    const created = await createMoveEvent(payload);
    await moveDocumentLinks(
      { entityType: 'timeline_entry', entityId: existing.rawTimelineEntry.id },
      { entityType: 'event', entityId: Number(created.id) }
    );
    await deleteTimelineEntry(existing.rawTimelineEntry.id);
  }
}

async function createTimelineAsset(payload: TimelineFormPayload) {
  if (payload.mode === 'move_event') {
    await createMoveEvent(payload);
  } else {
    await createTimelineEntry(payload);
  }
}

async function createMoveEvent(payload: TimelineFormPayload) {
  return writeJson('/api/events', 'POST', {
    title: payload.title,
    date: payload.date,
    time: payload.time,
    is_confirmed: payload.status === 'confirmed' || payload.status === 'complete',
    notes: payload.notes,
  });
}

async function patchMoveEvent(id: number, payload: TimelineFormPayload) {
  return writeJson('/api/events', 'PATCH', {
    id,
    title: payload.title,
    date: payload.date,
    time: payload.time,
    is_confirmed: payload.status === 'confirmed' || payload.status === 'complete',
    notes: payload.notes,
  });
}

async function deleteMoveEvent(id: number) {
  return writeJson(`/api/events?id=${id}`, 'DELETE');
}

async function createTimelineEntry(payload: TimelineFormPayload) {
  return writeJson('/api/timeline', 'POST', {
    trackId: payload.trackId,
    title: payload.title,
    date: payload.date,
    time: payload.time,
    status: payload.status,
    notes: payload.notes,
    entryType: payload.entryType,
  });
}

async function patchTimelineEntry(id: number, payload: TimelineFormPayload) {
  return writeJson('/api/timeline', 'PATCH', {
    id,
    trackId: payload.trackId,
    title: payload.title,
    date: payload.date,
    time: payload.time,
    status: payload.status,
    notes: payload.notes,
    entryType: payload.entryType,
  });
}

async function deleteTimelineEntry(id: number) {
  return writeJson(`/api/timeline?id=${id}`, 'DELETE');
}

async function moveDocumentLinks(source: LinkTarget, target: LinkTarget) {
  const links = await getDocumentLinks(source);
  await Promise.all(links.map(link =>
    writeJson('/api/document-links', 'POST', {
      documentId: link.documentId,
      entityType: target.entityType,
      entityId: target.entityId,
      label: link.label,
    })
  ));
  await Promise.all(links.map(link => writeJson(`/api/document-links?id=${link.id}`, 'DELETE')));
}

async function getDocumentLinks(target: LinkTarget): Promise<DocumentLink[]> {
  const res = await fetch(`/api/document-links?entityType=${target.entityType}&entityId=${target.entityId}`);
  if (!res.ok) {
    const body = await safeJson(res);
    throw new Error(body.error || 'Could not read document links.');
  }
  return res.json();
}

async function writeJson(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: Record<string, unknown>) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const responseBody = await safeJson(res);
    throw new Error(responseBody.error || 'Request failed.');
  }
  if (method === 'DELETE') return { success: true };
  return res.json();
}

async function safeJson(res: Response): Promise<{ error?: string }> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}
