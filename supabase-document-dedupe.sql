-- Document reuse and duplicate cleanup
-- Run after supabase-home-planning.sql.
--
-- This patch adds a normalized document URL key, merges existing duplicate
-- document rows that point to the same URL, and adds uniqueness guards so a
-- document can be attached to many records without creating duplicate document
-- records or duplicate attachments to the same record.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS url_key TEXT;

CREATE OR REPLACE FUNCTION public.document_url_key(input_url TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  trimmed TEXT;
  lowered TEXT;
  match TEXT[];
BEGIN
  trimmed := btrim(coalesce(input_url, ''));
  IF trimmed = '' THEN
    RETURN NULL;
  END IF;

  lowered := lower(trimmed);

  match := regexp_match(trimmed, 'drive\.google\.com/file/d/([^/?#]+)', 'i');
  IF match IS NOT NULL THEN
    RETURN 'google-drive:file:' || match[1];
  END IF;

  match := regexp_match(trimmed, 'drive\.google\.com/drive/(?:u/[0-9]+/)?folders/([^/?#]+)', 'i');
  IF match IS NOT NULL THEN
    RETURN 'google-drive:folder:' || match[1];
  END IF;

  match := regexp_match(trimmed, 'drive\.google\.com/(?:uc|open)\?[^#]*[?&]?id=([^&#]+)', 'i');
  IF match IS NOT NULL THEN
    RETURN 'google-drive:file:' || match[1];
  END IF;

  match := regexp_match(trimmed, 'docs\.google\.com/(document|spreadsheets|presentation|forms)/d/([^/?#]+)', 'i');
  IF match IS NOT NULL THEN
    RETURN 'google-workspace:' || lower(match[1]) || ':' || match[2];
  END IF;

  RETURN regexp_replace(lowered, '/+$', '');
END;
$$;

UPDATE documents
SET url_key = public.document_url_key(url)
WHERE url_key IS NULL OR url_key IS DISTINCT FROM public.document_url_key(url);

WITH document_counts AS (
  SELECT
    documents.id,
    documents.url_key,
    documents.created_at,
    count(document_links.id) AS link_count
  FROM documents
  LEFT JOIN document_links ON document_links.document_id = documents.id
  WHERE documents.url_key IS NOT NULL
  GROUP BY documents.id
),
ranked_documents AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY url_key
      ORDER BY link_count DESC, created_at ASC, id ASC
    ) AS keeper_id
  FROM document_counts
),
duplicate_documents AS (
  SELECT id AS duplicate_id, keeper_id
  FROM ranked_documents
  WHERE id <> keeper_id
)
UPDATE document_links
SET document_id = duplicate_documents.keeper_id
FROM duplicate_documents
WHERE document_links.document_id = duplicate_documents.duplicate_id;

DELETE FROM document_links older
USING document_links newer
WHERE older.id > newer.id
  AND older.document_id = newer.document_id
  AND older.entity_type = newer.entity_type
  AND older.entity_id = newer.entity_id;

WITH document_counts AS (
  SELECT
    documents.id,
    documents.url_key,
    documents.created_at,
    count(document_links.id) AS link_count
  FROM documents
  LEFT JOIN document_links ON document_links.document_id = documents.id
  WHERE documents.url_key IS NOT NULL
  GROUP BY documents.id
),
ranked_documents AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY url_key
      ORDER BY link_count DESC, created_at ASC, id ASC
    ) AS keeper_id
  FROM document_counts
),
duplicate_documents AS (
  SELECT id AS duplicate_id
  FROM ranked_documents
  WHERE id <> keeper_id
)
DELETE FROM documents
USING duplicate_documents
WHERE documents.id = duplicate_documents.duplicate_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_url_key_unique
  ON documents(url_key)
  WHERE url_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_links_unique_entity
  ON document_links(document_id, entity_type, entity_id);
