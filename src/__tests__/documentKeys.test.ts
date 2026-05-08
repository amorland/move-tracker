import { describe, expect, it } from 'vitest';
import { getDocumentUrlKey, isSameDocumentUrl } from '@/features/documents/documentKeys';

describe('getDocumentUrlKey', () => {
  it('uses stable Google Drive file ids across URL shapes', () => {
    expect(getDocumentUrlKey('https://drive.google.com/file/d/AbC123/view?usp=sharing')).toBe('google-drive:file:AbC123');
    expect(getDocumentUrlKey('https://drive.google.com/open?id=AbC123')).toBe('google-drive:file:AbC123');
    expect(getDocumentUrlKey('https://drive.google.com/uc?id=AbC123&export=download')).toBe('google-drive:file:AbC123');
  });

  it('uses stable Google Drive folder ids', () => {
    expect(getDocumentUrlKey('https://drive.google.com/drive/u/0/folders/Folder123?usp=drive_link')).toBe('google-drive:folder:Folder123');
  });

  it('uses stable Google Workspace document ids', () => {
    expect(getDocumentUrlKey('https://docs.google.com/document/d/Doc123/edit')).toBe('google-workspace:document:Doc123');
    expect(getDocumentUrlKey('https://docs.google.com/spreadsheets/d/Sheet123/edit#gid=0')).toBe('google-workspace:spreadsheets:Sheet123');
  });

  it('normalizes generic URLs conservatively', () => {
    expect(getDocumentUrlKey('HTTPS://Example.com/a/path/?utm_source=test&b=2&a=1#section')).toBe('https://example.com/a/path?a=1&b=2');
  });
});

describe('isSameDocumentUrl', () => {
  it('matches different links to the same Google Drive file', () => {
    expect(isSameDocumentUrl(
      'https://drive.google.com/file/d/AbC123/view?usp=sharing',
      'https://drive.google.com/open?id=AbC123',
    )).toBe(true);
  });
});
