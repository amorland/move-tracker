-- Loan underwriting document import
-- Generated from exported Supabase CSVs and the Drive manifest.
-- Contains Google Drive document URLs for the committed loan import patch.
-- Run after supabase-loan-documentation-log.sql and supabase-document-dedupe.sql.

BEGIN;

-- Normalize the older broad initial package event into more specific entries.
UPDATE timeline_entries
SET title = 'Identity, residence, and contract documentation submitted'
WHERE track_id = 4
  AND title = 'Identity And Residence Documentation Submitted'
  AND date = '2026-04-14';

-- Create timeline entry: Student loan documentation submitted
INSERT INTO timeline_entries (track_id, title, entry_type, status, date, time, notes, sort_index)
SELECT 4, 'Student loan documentation submitted', 'submission', 'complete', '2026-04-16', NULL, 'Student loan statements for Andrew and Tory uploaded for underwriting review.', 0
WHERE NOT EXISTS (
  SELECT 1 FROM timeline_entries
  WHERE track_id = 4 AND title = 'Student loan documentation submitted' AND date = '2026-04-16'
);

-- Document: Hudson_Derm_Advance_04142026_Tory.pdf
INSERT INTO documents (title, provider, url, url_key, mime_type, category, notes, created_at)
SELECT 'Hudson_Derm_Advance_04142026_Tory.pdf', 'google_drive', 'https://drive.google.com/file/d/1_mnpTYEtCvu5hl2TSWGxX1azNC7FO5rd/view?usp=drivesdk', 'google-drive:file:1_mnpTYEtCvu5hl2TSWGxX1azNC7FO5rd', 'application/pdf', 'loan', 'Loan Underwriting Documentation/Paystubs/Hudson_Derm_Advance_04142026_Tory.pdf', '2026-04-30T02:15:51Z'
WHERE NOT EXISTS (
  SELECT 1 FROM documents WHERE url_key = 'google-drive:file:1_mnpTYEtCvu5hl2TSWGxX1azNC7FO5rd'
);

-- Document: CharlesSchwab 01312026 SStarzyk.pdf
INSERT INTO documents (title, provider, url, url_key, mime_type, category, notes, created_at)
SELECT 'CharlesSchwab 01312026 SStarzyk.pdf', 'google_drive', 'https://drive.google.com/file/d/1ql3Hp084pDYNqRF7C0aRSuQm05Xtj06g/view?usp=drivesdk', 'google-drive:file:1ql3Hp084pDYNqRF7C0aRSuQm05Xtj06g', 'application/pdf', 'loan', 'Loan Underwriting Documentation/Asset Account Statements/CharlesSchwab 01312026 SStarzyk.pdf', '2026-04-29T00:10:17Z'
WHERE NOT EXISTS (
  SELECT 1 FROM documents WHERE url_key = 'google-drive:file:1ql3Hp084pDYNqRF7C0aRSuQm05Xtj06g'
);

-- Document: TIAA_Quarterly_Statement_03312026_Tory.pdf
INSERT INTO documents (title, provider, url, url_key, mime_type, category, notes, created_at)
SELECT 'TIAA_Quarterly_Statement_03312026_Tory.pdf', 'google_drive', 'https://drive.google.com/file/d/1OGQWVpBkHLM6o9c2TNGy4FKG-CEIfvsv/view?usp=drivesdk', 'google-drive:file:1OGQWVpBkHLM6o9c2TNGy4FKG-CEIfvsv', 'application/pdf', 'loan', 'Loan Underwriting Documentation/Asset Account Statements/TIAA (Hyde Leadership)/TIAA_Quarterly_Statement_03312026_Tory.pdf', '2026-05-01T17:31:02Z'
WHERE NOT EXISTS (
  SELECT 1 FROM documents WHERE url_key = 'google-drive:file:1OGQWVpBkHLM6o9c2TNGy4FKG-CEIfvsv'
);

-- Document: Voya_Quarterly_Statement_03312026_Tory.pdf
INSERT INTO documents (title, provider, url, url_key, mime_type, category, notes, created_at)
SELECT 'Voya_Quarterly_Statement_03312026_Tory.pdf', 'google_drive', 'https://drive.google.com/file/d/1YvovfI7U1biPvEJUtM7dFYHAspV489kk/view?usp=drivesdk', 'google-drive:file:1YvovfI7U1biPvEJUtM7dFYHAspV489kk', 'application/pdf', 'loan', 'Loan Underwriting Documentation/Asset Account Statements/Voya (Tory)/Voya_Quarterly_Statement_03312026_Tory.pdf', '2026-05-01T17:40:22Z'
WHERE NOT EXISTS (
  SELECT 1 FROM documents WHERE url_key = 'google-drive:file:1YvovfI7U1biPvEJUtM7dFYHAspV489kk'
);

-- Document: Voya_WithdrawlRules_Andrew.pdf
INSERT INTO documents (title, provider, url, url_key, mime_type, category, notes, created_at)
SELECT 'Voya_WithdrawlRules_Andrew.pdf', 'google_drive', 'https://drive.google.com/file/d/1Wat22DRcs1w7c1xl6fv1IKJlNiBrGwWe/view?usp=drivesdk', 'google-drive:file:1Wat22DRcs1w7c1xl6fv1IKJlNiBrGwWe', 'application/pdf', 'loan', 'Loan Underwriting Documentation/Asset Account Statements/Voya (Andrew)/Voya_WithdrawlRules_Andrew.pdf', '2026-05-05T17:03:59Z'
WHERE NOT EXISTS (
  SELECT 1 FROM documents WHERE url_key = 'google-drive:file:1Wat22DRcs1w7c1xl6fv1IKJlNiBrGwWe'
);

-- Document: Voya_Quarterly_Statement_03312026_Andrew.pdf
INSERT INTO documents (title, provider, url, url_key, mime_type, category, notes, created_at)
SELECT 'Voya_Quarterly_Statement_03312026_Andrew.pdf', 'google_drive', 'https://drive.google.com/file/d/1xa-fzJAiAAQfYyhWFzmmGbL8OX_scaf9/view?usp=drivesdk', 'google-drive:file:1xa-fzJAiAAQfYyhWFzmmGbL8OX_scaf9', 'application/pdf', 'loan', 'Loan Underwriting Documentation/Asset Account Statements/Voya (Andrew)/Voya_Quarterly_Statement_03312026_Andrew.pdf', '2026-05-01T17:36:23Z'
WHERE NOT EXISTS (
  SELECT 1 FROM documents WHERE url_key = 'google-drive:file:1xa-fzJAiAAQfYyhWFzmmGbL8OX_scaf9'
);

-- Document: Apple_Savings_Statement_04302026_Tory.pdf
INSERT INTO documents (title, provider, url, url_key, mime_type, category, notes, created_at)
SELECT 'Apple_Savings_Statement_04302026_Tory.pdf', 'google_drive', 'https://drive.google.com/file/d/1QZTjroV1WQoNOL2iFCTCoMedxDWroz89/view?usp=drivesdk', 'google-drive:file:1QZTjroV1WQoNOL2iFCTCoMedxDWroz89', 'application/pdf', 'loan', 'Loan Underwriting Documentation/Asset Account Statements/Apple Savings/Apple_Savings_Statement_04302026_Tory.pdf', '2026-05-01T17:19:57Z'
WHERE NOT EXISTS (
  SELECT 1 FROM documents WHERE url_key = 'google-drive:file:1QZTjroV1WQoNOL2iFCTCoMedxDWroz89'
);

-- Document: Vanguard_Quarterly_Statement_03312026_Tory.pdf
INSERT INTO documents (title, provider, url, url_key, mime_type, category, notes, created_at)
SELECT 'Vanguard_Quarterly_Statement_03312026_Tory.pdf', 'google_drive', 'https://drive.google.com/file/d/1Xb5aa6WPBGhDm4_1zjPNMbXp_KpzwulF/view?usp=drivesdk', 'google-drive:file:1Xb5aa6WPBGhDm4_1zjPNMbXp_KpzwulF', 'application/pdf', 'loan', 'Loan Underwriting Documentation/Asset Account Statements/Vanguard (CVS)/Vanguard_Quarterly_Statement_03312026_Tory.pdf', '2026-05-01T16:47:21Z'
WHERE NOT EXISTS (
  SELECT 1 FROM documents WHERE url_key = 'google-drive:file:1Xb5aa6WPBGhDm4_1zjPNMbXp_KpzwulF'
);

-- Document: Chase_Checking_Statement_03092026_Tory.pdf
INSERT INTO documents (title, provider, url, url_key, mime_type, category, notes, created_at)
SELECT 'Chase_Checking_Statement_03092026_Tory.pdf', 'google_drive', 'https://drive.google.com/file/d/1zniOK8p90zz-BnBdZY7hIfF7uijHyFf3/view?usp=drivesdk', 'google-drive:file:1zniOK8p90zz-BnBdZY7hIfF7uijHyFf3', 'application/pdf', 'loan', 'Loan Underwriting Documentation/Asset Account Statements/Chase Checking (Tory)/Chase_Checking_Statement_03092026_Tory.pdf', '2026-04-30T23:10:51Z'
WHERE NOT EXISTS (
  SELECT 1 FROM documents WHERE url_key = 'google-drive:file:1zniOK8p90zz-BnBdZY7hIfF7uijHyFf3'
);

-- Document: Chase_Checking_Statement_04082026_Tory.pdf
INSERT INTO documents (title, provider, url, url_key, mime_type, category, notes, created_at)
SELECT 'Chase_Checking_Statement_04082026_Tory.pdf', 'google_drive', 'https://drive.google.com/file/d/1f3UrTKeto51WGNOKAYFMQuztZiM_MjRu/view?usp=drivesdk', 'google-drive:file:1f3UrTKeto51WGNOKAYFMQuztZiM_MjRu', 'application/pdf', 'loan', 'Loan Underwriting Documentation/Asset Account Statements/Chase Checking (Tory)/Chase_Checking_Statement_04082026_Tory.pdf', '2026-04-30T23:10:53Z'
WHERE NOT EXISTS (
  SELECT 1 FROM documents WHERE url_key = 'google-drive:file:1f3UrTKeto51WGNOKAYFMQuztZiM_MjRu'
);

-- Document: Fidelity_Terms_Of_Withdrawl_Tory.pdf
INSERT INTO documents (title, provider, url, url_key, mime_type, category, notes, created_at)
SELECT 'Fidelity_Terms_Of_Withdrawl_Tory.pdf', 'google_drive', 'https://drive.google.com/file/d/1CpKCreUBAN8LhEHxU_GOAQokZYIowM2i/view?usp=drivesdk', 'google-drive:file:1CpKCreUBAN8LhEHxU_GOAQokZYIowM2i', 'application/pdf', 'loan', 'Loan Underwriting Documentation/Asset Account Statements/Fidelity (Providence Health)/Fidelity_Terms_Of_Withdrawl_Tory.pdf', '2026-05-01T17:13:41Z'
WHERE NOT EXISTS (
  SELECT 1 FROM documents WHERE url_key = 'google-drive:file:1CpKCreUBAN8LhEHxU_GOAQokZYIowM2i'
);

-- Document: Fidelity_Monthly_Statement_03312026_Tory.pdf
INSERT INTO documents (title, provider, url, url_key, mime_type, category, notes, created_at)
SELECT 'Fidelity_Monthly_Statement_03312026_Tory.pdf', 'google_drive', 'https://drive.google.com/file/d/1LPIJfj-xbKeXtBOG7PHlKwMIW03e2I2K/view?usp=drivesdk', 'google-drive:file:1LPIJfj-xbKeXtBOG7PHlKwMIW03e2I2K', 'application/pdf', 'loan', 'Loan Underwriting Documentation/Asset Account Statements/Fidelity (Providence Health)/Fidelity_Monthly_Statement_03312026_Tory.pdf', '2026-05-01T17:06:33Z'
WHERE NOT EXISTS (
  SELECT 1 FROM documents WHERE url_key = 'google-drive:file:1LPIJfj-xbKeXtBOG7PHlKwMIW03e2I2K'
);

-- Document: Fidelity_Monthly_Statement_04302026_Tory
INSERT INTO documents (title, provider, url, url_key, mime_type, category, notes, created_at)
SELECT 'Fidelity_Monthly_Statement_04302026_Tory', 'google_drive', 'https://drive.google.com/file/d/1VT37kRJ5X1QRHXOJ0DPtAKRCpUHVGFjh/view?usp=drivesdk', 'google-drive:file:1VT37kRJ5X1QRHXOJ0DPtAKRCpUHVGFjh', 'application/pdf', 'loan', 'Loan Underwriting Documentation/Asset Account Statements/Fidelity (Providence Health)/Fidelity_Monthly_Statement_04302026_Tory', '2026-05-01T17:06:02Z'
WHERE NOT EXISTS (
  SELECT 1 FROM documents WHERE url_key = 'google-drive:file:1VT37kRJ5X1QRHXOJ0DPtAKRCpUHVGFjh'
);

-- Document: Fidelity_Quarterly_Statement_03312026_Tory.pdf
INSERT INTO documents (title, provider, url, url_key, mime_type, category, notes, created_at)
SELECT 'Fidelity_Quarterly_Statement_03312026_Tory.pdf', 'google_drive', 'https://drive.google.com/file/d/1aCk7nEXpoxdXZUlJU5afAy3kPEyrB3cd/view?usp=drivesdk', 'google-drive:file:1aCk7nEXpoxdXZUlJU5afAy3kPEyrB3cd', 'application/pdf', 'loan', 'Loan Underwriting Documentation/Asset Account Statements/Fidelity (Providence Health)/Fidelity_Quarterly_Statement_03312026_Tory.pdf', '2026-05-01T16:56:13Z'
WHERE NOT EXISTS (
  SELECT 1 FROM documents WHERE url_key = 'google-drive:file:1aCk7nEXpoxdXZUlJU5afAy3kPEyrB3cd'
);

-- Document: Check - Home Deposit 04142026.pdf
INSERT INTO documents (title, provider, url, url_key, mime_type, category, notes, created_at)
SELECT 'Check - Home Deposit 04142026.pdf', 'google_drive', 'https://drive.google.com/file/d/1kHea2rRlihuR4WIKZmxqKuAmXDqCDk8u/view?usp=drivesdk', 'google-drive:file:1kHea2rRlihuR4WIKZmxqKuAmXDqCDk8u', 'application/pdf', 'loan', 'Loan Underwriting Documentation/Other Documentation/Check - Home Deposit 04142026.pdf', '2026-04-30T17:17:36Z'
WHERE NOT EXISTS (
  SELECT 1 FROM documents WHERE url_key = 'google-drive:file:1kHea2rRlihuR4WIKZmxqKuAmXDqCDk8u'
);

-- Document: Gift Affidavit signed 04302026.pdf
INSERT INTO documents (title, provider, url, url_key, mime_type, category, notes, created_at)
SELECT 'Gift Affidavit signed 04302026.pdf', 'google_drive', 'https://drive.google.com/file/d/1Sq_RGH9WHjDscWZlV2Zfy4vgRG9p-y6c/view?usp=drivesdk', 'google-drive:file:1Sq_RGH9WHjDscWZlV2Zfy4vgRG9p-y6c', 'application/pdf', 'loan', 'Loan Underwriting Documentation/Other Documentation/Gift Affidavit signed 04302026.pdf', '2026-04-30T15:07:45Z'
WHERE NOT EXISTS (
  SELECT 1 FROM documents WHERE url_key = 'google-drive:file:1Sq_RGH9WHjDscWZlV2Zfy4vgRG9p-y6c'
);

-- Attach Copy of 25 Chestnut St - FEK.pdf to timeline `Identity, residence, and contract documentation submitted` (2026-04-14)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Identity, residence, and contract documentation submitted'
  AND target.date = '2026-04-14'
WHERE documents.url_key = 'google-drive:file:19oSE4zMwvl0LndrmInoQy8QiXjWTbeck'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Add import summary to Identity, residence, and contract documentation submitted
UPDATE timeline_entries
SET notes = CASE
  WHEN notes IS NULL OR notes = '' THEN 'Documents attached by import: 1 files: Copy of 25 Chestnut St - FEK.pdf'
  WHEN notes NOT LIKE '%Documents attached by import:%' THEN notes || E'\n\n' || 'Documents attached by import: 1 files: Copy of 25 Chestnut St - FEK.pdf'
  ELSE notes
END
WHERE track_id = 4
  AND title = 'Identity, residence, and contract documentation submitted'
  AND date = '2026-04-14';

-- Attach Student_Loan_Statement_03212026_Andrew.pdf to timeline `Student loan documentation submitted` (2026-04-16)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Student loan documentation submitted'
  AND target.date = '2026-04-16'
WHERE documents.url_key = 'google-drive:file:1Aa5tC9pFhYrH3sPEVC_YMQ0PnkE5QuYn'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Student_Loan_Statement_04152026_Tory.pdf to timeline `Student loan documentation submitted` (2026-04-16)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Student loan documentation submitted'
  AND target.date = '2026-04-16'
WHERE documents.url_key = 'google-drive:file:1wtaltZ4OCfZj68NZ3UUrxOCegCuS91Bq'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Add import summary to Student loan documentation submitted
UPDATE timeline_entries
SET notes = CASE
  WHEN notes IS NULL OR notes = '' THEN 'Documents attached by import: 2 files: Student_Loan_Statement_03212026_Andrew.pdf; Student_Loan_Statement_04152026_Tory.pdf'
  WHEN notes NOT LIKE '%Documents attached by import:%' THEN notes || E'\n\n' || 'Documents attached by import: 2 files: Student_Loan_Statement_03212026_Andrew.pdf; Student_Loan_Statement_04152026_Tory.pdf'
  ELSE notes
END
WHERE track_id = 4
  AND title = 'Student loan documentation submitted'
  AND date = '2026-04-16';

-- Attach Apple_Savings_Statement_12312025_Tory.pdf to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:1_nZagiBN-zF6yxT0lSdR0t_V7NWa3C0L'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Apple_Savings_Tory to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:1hs8V9rQNKMRlaQn4XSmQb86GgqlWGX0L'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Apple_Savings_Tory.pdf to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:1E7PxNSJPCARmv7D7pR5GTO6b99zqPdxP'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Chase_Checking_Statement_01202026_Andrew.pdf to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:15UMh6aXn3htfKS6VvT4DurjoRMsxO7A0'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Chase_Checking_Statement_02182026_Andrew.pdf to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:12NCUuOA_HVTt2SvEYeB34Ae59mZzqqn-'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Chase_Checking_Statement_12162025_Andrew to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:1POFId_fKPcGLx5VKbTKIvmv6OIhzD1vs'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Fidelity_Available_To_Withdraw_Tory.pdf to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:1uAgxVbYxpefSfikCfMeVycTF1ESEElGi'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Fidelity_Monthly_Statement_01312026_Tory.pdf to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:1pW_1hLEeP5u6SNX5l3X3WtvF2LAcMg14'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Fidelity_SPD_Tory.pdf to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:1vrASMkNL19RosBTOoZ-Ag8f1QVE7rE-a'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach TIAA_Available_To_Withdraw_Tory.pdf to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:1q4Jnr6rlyPUZ63kBoyloZHWB7LTNIT5j'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach TIAA_CREF_SPD_Tory.pdf to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:14XU8KZTWxRaXx0RiCGKZR4NrTyvTv5Pl'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach TIAA_Contract_Documentation_Tory.pdf to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:1ZrYkacjMo5th487xWuhm_lO67RuMHrZu'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach TIAA_VA_SPD_Tory.pdf to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:1Sc1TpC3BPlA7n8d43vdtHOtnhlsb9865'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Vanguard_Available_To_Withdraw_Tory.pdf to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:1X_ctpK87XO_8Hs25hF8mmbi_2lUPr6tP'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Vanguard_SPD_Tory.pdf to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:1FM9_sBKvBSsaEHrx_oxJ_-BAKfvxc6vL'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Voya_Available_To_Withdraw_Andrew.pdf to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:1OIfL9Ae6-YbHBTdoaQAiivkswEfPwYDI'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Voya_Available_To_Withdraw_Tory.pdf to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:1NrtLc-XB1qaUTfZqJau1XnVdBpEuTz7d'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Voya_Quarterly_Statement_12312025_Andrew.pdf to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:1-LxyQeDar00V-KyA20u9CTyGPBr6U8_s'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Voya_Quarterly_Statement_12312025_Tory.pdf to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:1c3dg-hPv3nzihP73BNjANihLCykMDOe3'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Voya_SPD_Tory.pdf to timeline `Asset Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Asset Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:1edqz-RClYKSm6Q91vhtUDkM2EG-ZySxw'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Add import summary to Asset Documentation Submitted
UPDATE timeline_entries
SET notes = CASE
  WHEN notes IS NULL OR notes = '' THEN 'Documents attached by import: 20 files: Apple_Savings_Statement_12312025_Tory.pdf; Apple_Savings_Tory; Apple_Savings_Tory.pdf; Chase_Checking_Statement_01202026_Andrew.pdf; Chase_Checking_Statement_02182026_Andrew.pdf; Chase_Checking_Statement_12162025_Andrew; Fidelity_Available_To_Withdraw_Tory.pdf; Fidelity_Monthly_Statement_01312026_Tory.pdf; Fidelity_SPD_Tory.pdf; TIAA_Available_To_Withdraw_Tory.pdf; TIAA_CREF_SPD_Tory.pdf; TIAA_Contract_Documentation_Tory.pdf; TIAA_VA_SPD_Tory.pdf; Vanguard_Available_To_Withdraw_Tory.pdf; Vanguard_SPD_Tory.pdf; Voya_Available_To_Withdraw_Andrew.pdf; Voya_Available_To_Withdraw_Tory.pdf; Voya_Quarterly_Statement_12312025_Andrew.pdf; Voya_Quarterly_Statement_12312025_Tory.pdf; Voya_SPD_Tory.pdf'
  WHEN notes NOT LIKE '%Documents attached by import:%' THEN notes || E'\n\n' || 'Documents attached by import: 20 files: Apple_Savings_Statement_12312025_Tory.pdf; Apple_Savings_Tory; Apple_Savings_Tory.pdf; Chase_Checking_Statement_01202026_Andrew.pdf; Chase_Checking_Statement_02182026_Andrew.pdf; Chase_Checking_Statement_12162025_Andrew; Fidelity_Available_To_Withdraw_Tory.pdf; Fidelity_Monthly_Statement_01312026_Tory.pdf; Fidelity_SPD_Tory.pdf; TIAA_Available_To_Withdraw_Tory.pdf; TIAA_CREF_SPD_Tory.pdf; TIAA_Contract_Documentation_Tory.pdf; TIAA_VA_SPD_Tory.pdf; Vanguard_Available_To_Withdraw_Tory.pdf; Vanguard_SPD_Tory.pdf; Voya_Available_To_Withdraw_Andrew.pdf; Voya_Available_To_Withdraw_Tory.pdf; Voya_Quarterly_Statement_12312025_Andrew.pdf; Voya_Quarterly_Statement_12312025_Tory.pdf; Voya_SPD_Tory.pdf'
  ELSE notes
END
WHERE track_id = 4
  AND title = 'Asset Documentation Submitted'
  AND date = '2026-04-17';

-- Attach HD Final Contract.pdf to timeline `Income Documentation Submitted` (2026-04-17)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Income Documentation Submitted'
  AND target.date = '2026-04-17'
WHERE documents.url_key = 'google-drive:file:14hePy36zIa3MsW66n6D18pHxxk0ZfNcH'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Add import summary to Income Documentation Submitted
UPDATE timeline_entries
SET notes = CASE
  WHEN notes IS NULL OR notes = '' THEN 'Documents attached by import: 1 files: HD Final Contract.pdf'
  WHEN notes NOT LIKE '%Documents attached by import:%' THEN notes || E'\n\n' || 'Documents attached by import: 1 files: HD Final Contract.pdf'
  ELSE notes
END
WHERE track_id = 4
  AND title = 'Income Documentation Submitted'
  AND date = '2026-04-17';

-- Attach Apple_Savings_Statement_02282026_Tory.pdf to timeline `Initial bank statements and advance proof uploaded` (2026-04-29)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Initial bank statements and advance proof uploaded'
  AND target.date = '2026-04-29'
WHERE documents.url_key = 'google-drive:file:11aCA8XOg_nNmB4ZLoNHmQ595OzYv_9VZ'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Apple_Savings_Statement_03312026_Tory.pdf to timeline `Initial bank statements and advance proof uploaded` (2026-04-29)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Initial bank statements and advance proof uploaded'
  AND target.date = '2026-04-29'
WHERE documents.url_key = 'google-drive:file:1B2JHctvPVRqo5UHsd3LwUj1E_D7Nz-8W'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Chase_Checking_Statement_03172026_Andrew to timeline `Initial bank statements and advance proof uploaded` (2026-04-29)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Initial bank statements and advance proof uploaded'
  AND target.date = '2026-04-29'
WHERE documents.url_key = 'google-drive:file:1vkVWWimwWe_ZwpXVd50RcapwPluChrZs'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Chase_Checking_Statement_04162026_Andrew to timeline `Initial bank statements and advance proof uploaded` (2026-04-29)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Initial bank statements and advance proof uploaded'
  AND target.date = '2026-04-29'
WHERE documents.url_key = 'google-drive:file:10g_N_LtjyqcCZpjNGRP56js0XSmB6I-O'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Hudson_Derm_Advance_04142026_Tory.pdf to timeline `Initial bank statements and advance proof uploaded` (2026-04-29)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Initial bank statements and advance proof uploaded'
  AND target.date = '2026-04-29'
WHERE documents.url_key = 'google-drive:file:1_mnpTYEtCvu5hl2TSWGxX1azNC7FO5rd'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Add import summary to Initial bank statements and advance proof uploaded
UPDATE timeline_entries
SET notes = CASE
  WHEN notes IS NULL OR notes = '' THEN 'Documents attached by import: 5 files: Apple_Savings_Statement_02282026_Tory.pdf; Apple_Savings_Statement_03312026_Tory.pdf; Chase_Checking_Statement_03172026_Andrew; Chase_Checking_Statement_04162026_Andrew; Hudson_Derm_Advance_04142026_Tory.pdf'
  WHEN notes NOT LIKE '%Documents attached by import:%' THEN notes || E'\n\n' || 'Documents attached by import: 5 files: Apple_Savings_Statement_02282026_Tory.pdf; Apple_Savings_Statement_03312026_Tory.pdf; Chase_Checking_Statement_03172026_Andrew; Chase_Checking_Statement_04162026_Andrew; Hudson_Derm_Advance_04142026_Tory.pdf'
  ELSE notes
END
WHERE track_id = 4
  AND title = 'Initial bank statements and advance proof uploaded'
  AND date = '2026-04-29';

-- Attach CharlesSchwab 01312026 SStarzyk.pdf to timeline `Gift affidavit and earnest money check copy uploaded` (2026-04-30)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Gift affidavit and earnest money check copy uploaded'
  AND target.date = '2026-04-30'
WHERE documents.url_key = 'google-drive:file:1ql3Hp084pDYNqRF7C0aRSuQm05Xtj06g'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Check - Home Deposit 04142026.pdf to timeline `Gift affidavit and earnest money check copy uploaded` (2026-04-30)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Gift affidavit and earnest money check copy uploaded'
  AND target.date = '2026-04-30'
WHERE documents.url_key = 'google-drive:file:1kHea2rRlihuR4WIKZmxqKuAmXDqCDk8u'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Gift Affidavit signed 04302026.pdf to timeline `Gift affidavit and earnest money check copy uploaded` (2026-04-30)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Gift affidavit and earnest money check copy uploaded'
  AND target.date = '2026-04-30'
WHERE documents.url_key = 'google-drive:file:1Sq_RGH9WHjDscWZlV2Zfy4vgRG9p-y6c'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Add import summary to Gift affidavit and earnest money check copy uploaded
UPDATE timeline_entries
SET notes = CASE
  WHEN notes IS NULL OR notes = '' THEN 'Documents attached by import: 3 files: CharlesSchwab 01312026 SStarzyk.pdf; Check - Home Deposit 04142026.pdf; Gift Affidavit signed 04302026.pdf'
  WHEN notes NOT LIKE '%Documents attached by import:%' THEN notes || E'\n\n' || 'Documents attached by import: 3 files: CharlesSchwab 01312026 SStarzyk.pdf; Check - Home Deposit 04142026.pdf; Gift Affidavit signed 04302026.pdf'
  ELSE notes
END
WHERE track_id = 4
  AND title = 'Gift affidavit and earnest money check copy uploaded'
  AND date = '2026-04-30';

-- Attach Chase_Checking_Statement_03092026_Tory.pdf to timeline `Tory Chase checking statements uploaded` (2026-04-30)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Tory Chase checking statements uploaded'
  AND target.date = '2026-04-30'
WHERE documents.url_key = 'google-drive:file:1zniOK8p90zz-BnBdZY7hIfF7uijHyFf3'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Chase_Checking_Statement_04082026_Tory.pdf to timeline `Tory Chase checking statements uploaded` (2026-04-30)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Tory Chase checking statements uploaded'
  AND target.date = '2026-04-30'
WHERE documents.url_key = 'google-drive:file:1f3UrTKeto51WGNOKAYFMQuztZiM_MjRu'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Add import summary to Tory Chase checking statements uploaded
UPDATE timeline_entries
SET notes = CASE
  WHEN notes IS NULL OR notes = '' THEN 'Documents attached by import: 2 files: Chase_Checking_Statement_03092026_Tory.pdf; Chase_Checking_Statement_04082026_Tory.pdf'
  WHEN notes NOT LIKE '%Documents attached by import:%' THEN notes || E'\n\n' || 'Documents attached by import: 2 files: Chase_Checking_Statement_03092026_Tory.pdf; Chase_Checking_Statement_04082026_Tory.pdf'
  ELSE notes
END
WHERE track_id = 4
  AND title = 'Tory Chase checking statements uploaded'
  AND date = '2026-04-30';

-- Attach Apple_Savings_Statement_04302026_Tory.pdf to timeline `Reserve and retirement documentation uploaded` (2026-05-01)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Reserve and retirement documentation uploaded'
  AND target.date = '2026-05-01'
WHERE documents.url_key = 'google-drive:file:1QZTjroV1WQoNOL2iFCTCoMedxDWroz89'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Fidelity_Monthly_Statement_03312026_Tory.pdf to timeline `Reserve and retirement documentation uploaded` (2026-05-01)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Reserve and retirement documentation uploaded'
  AND target.date = '2026-05-01'
WHERE documents.url_key = 'google-drive:file:1LPIJfj-xbKeXtBOG7PHlKwMIW03e2I2K'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Fidelity_Monthly_Statement_04302026_Tory to timeline `Reserve and retirement documentation uploaded` (2026-05-01)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Reserve and retirement documentation uploaded'
  AND target.date = '2026-05-01'
WHERE documents.url_key = 'google-drive:file:1VT37kRJ5X1QRHXOJ0DPtAKRCpUHVGFjh'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Fidelity_Quarterly_Statement_03312026_Tory.pdf to timeline `Reserve and retirement documentation uploaded` (2026-05-01)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Reserve and retirement documentation uploaded'
  AND target.date = '2026-05-01'
WHERE documents.url_key = 'google-drive:file:1aCk7nEXpoxdXZUlJU5afAy3kPEyrB3cd'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Fidelity_Terms_Of_Withdrawl_Tory.pdf to timeline `Reserve and retirement documentation uploaded` (2026-05-01)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Reserve and retirement documentation uploaded'
  AND target.date = '2026-05-01'
WHERE documents.url_key = 'google-drive:file:1CpKCreUBAN8LhEHxU_GOAQokZYIowM2i'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach TIAA_Quarterly_Statement_03312026_Tory.pdf to timeline `Reserve and retirement documentation uploaded` (2026-05-01)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Reserve and retirement documentation uploaded'
  AND target.date = '2026-05-01'
WHERE documents.url_key = 'google-drive:file:1OGQWVpBkHLM6o9c2TNGy4FKG-CEIfvsv'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Vanguard_Quarterly_Statement_03312026_Tory.pdf to timeline `Reserve and retirement documentation uploaded` (2026-05-01)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Reserve and retirement documentation uploaded'
  AND target.date = '2026-05-01'
WHERE documents.url_key = 'google-drive:file:1Xb5aa6WPBGhDm4_1zjPNMbXp_KpzwulF'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Voya_Quarterly_Statement_03312026_Tory.pdf to timeline `Reserve and retirement documentation uploaded` (2026-05-01)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Reserve and retirement documentation uploaded'
  AND target.date = '2026-05-01'
WHERE documents.url_key = 'google-drive:file:1YvovfI7U1biPvEJUtM7dFYHAspV489kk'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Add import summary to Reserve and retirement documentation uploaded
UPDATE timeline_entries
SET notes = CASE
  WHEN notes IS NULL OR notes = '' THEN 'Documents attached by import: 8 files: Apple_Savings_Statement_04302026_Tory.pdf; Fidelity_Monthly_Statement_03312026_Tory.pdf; Fidelity_Monthly_Statement_04302026_Tory; Fidelity_Quarterly_Statement_03312026_Tory.pdf; Fidelity_Terms_Of_Withdrawl_Tory.pdf; TIAA_Quarterly_Statement_03312026_Tory.pdf; Vanguard_Quarterly_Statement_03312026_Tory.pdf; Voya_Quarterly_Statement_03312026_Tory.pdf'
  WHEN notes NOT LIKE '%Documents attached by import:%' THEN notes || E'\n\n' || 'Documents attached by import: 8 files: Apple_Savings_Statement_04302026_Tory.pdf; Fidelity_Monthly_Statement_03312026_Tory.pdf; Fidelity_Monthly_Statement_04302026_Tory; Fidelity_Quarterly_Statement_03312026_Tory.pdf; Fidelity_Terms_Of_Withdrawl_Tory.pdf; TIAA_Quarterly_Statement_03312026_Tory.pdf; Vanguard_Quarterly_Statement_03312026_Tory.pdf; Voya_Quarterly_Statement_03312026_Tory.pdf'
  ELSE notes
END
WHERE track_id = 4
  AND title = 'Reserve and retirement documentation uploaded'
  AND date = '2026-05-01';

-- Attach Voya_Quarterly_Statement_03312026_Andrew.pdf to timeline `Andrew Voya reserve documentation completed` (2026-05-05)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Andrew Voya reserve documentation completed'
  AND target.date = '2026-05-05'
WHERE documents.url_key = 'google-drive:file:1xa-fzJAiAAQfYyhWFzmmGbL8OX_scaf9'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Attach Voya_WithdrawlRules_Andrew.pdf to timeline `Andrew Voya reserve documentation completed` (2026-05-05)
INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)
SELECT documents.id, 'timeline_entry', target.id, NULL, now()
FROM documents
JOIN timeline_entries target ON target.track_id = 4
  AND target.title = 'Andrew Voya reserve documentation completed'
  AND target.date = '2026-05-05'
WHERE documents.url_key = 'google-drive:file:1Wat22DRcs1w7c1xl6fv1IKJlNiBrGwWe'
  AND NOT EXISTS (
    SELECT 1 FROM document_links existing
    WHERE existing.document_id = documents.id
      AND existing.entity_type = 'timeline_entry'
      AND existing.entity_id = target.id
  );

-- Add import summary to Andrew Voya reserve documentation completed
UPDATE timeline_entries
SET notes = CASE
  WHEN notes IS NULL OR notes = '' THEN 'Documents attached by import: 2 files: Voya_Quarterly_Statement_03312026_Andrew.pdf; Voya_WithdrawlRules_Andrew.pdf'
  WHEN notes NOT LIKE '%Documents attached by import:%' THEN notes || E'\n\n' || 'Documents attached by import: 2 files: Voya_Quarterly_Statement_03312026_Andrew.pdf; Voya_WithdrawlRules_Andrew.pdf'
  ELSE notes
END
WHERE track_id = 4
  AND title = 'Andrew Voya reserve documentation completed'
  AND date = '2026-05-05';

-- Remove duplicate broad event: Underwriting Documentation Package Assembled
DELETE FROM document_links
WHERE entity_type = 'timeline_entry'
  AND entity_id IN (
    SELECT id FROM timeline_entries
    WHERE track_id = 4
      AND title = 'Underwriting Documentation Package Assembled'
      AND date = '2026-04-17'
  );
DELETE FROM timeline_entries
WHERE track_id = 4
  AND title = 'Underwriting Documentation Package Assembled'
  AND date = '2026-04-17';

COMMIT;
