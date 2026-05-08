const GOOGLE_DRIVE_FILE_PATTERNS = [
  /drive\.google\.com\/file\/d\/([^/?#]+)/i,
  /drive\.google\.com\/uc\?(?:[^#]*&)?id=([^&#]+)/i,
  /drive\.google\.com\/open\?(?:[^#]*&)?id=([^&#]+)/i,
];

const GOOGLE_DRIVE_FOLDER_PATTERNS = [
  /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([^/?#]+)/i,
];

const GOOGLE_WORKSPACE_PATTERN = /docs\.google\.com\/(document|spreadsheets|presentation|forms)\/d\/([^/?#]+)/i;

const TRACKING_PARAM_PREFIXES = ['utm_'];
const TRACKING_PARAMS = new Set(['fbclid', 'gclid', 'msclkid']);

export function getDocumentUrlKey(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  for (const pattern of GOOGLE_DRIVE_FILE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return `google-drive:file:${decodeURIComponent(match[1])}`;
  }

  for (const pattern of GOOGLE_DRIVE_FOLDER_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return `google-drive:folder:${decodeURIComponent(match[1])}`;
  }

  const workspaceMatch = trimmed.match(GOOGLE_WORKSPACE_PATTERN);
  if (workspaceMatch?.[1] && workspaceMatch[2]) {
    return `google-workspace:${workspaceMatch[1].toLowerCase()}:${decodeURIComponent(workspaceMatch[2])}`;
  }

  try {
    return normalizeGenericUrl(trimmed);
  } catch {
    return trimmed.toLowerCase();
  }
}

export function isSameDocumentUrl(a: string, b: string) {
  return getDocumentUrlKey(a) === getDocumentUrlKey(b);
}

function normalizeGenericUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();
  url.hash = '';

  const params = [...url.searchParams.entries()]
    .filter(([key]) => !isTrackingParam(key))
    .sort(([a], [b]) => a.localeCompare(b));

  url.search = '';
  for (const [key, value] of params) {
    url.searchParams.append(key, value);
  }

  const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
  return `${url.protocol}//${url.host}${pathname}${url.search}`;
}

function isTrackingParam(key: string) {
  const normalized = key.toLowerCase();
  return TRACKING_PARAMS.has(normalized)
    || TRACKING_PARAM_PREFIXES.some(prefix => normalized.startsWith(prefix));
}
