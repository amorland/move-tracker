-- Loan documentation timeline log
-- Run after supabase-home-planning.sql.
-- This patch is idempotent by title + date within the Loan track.

WITH loan_track AS (
  SELECT id
  FROM tracks
  WHERE key = 'loan'
),
entries (title, entry_type, status, date, time, notes, sort_index) AS (
  VALUES
    (
      'BCU loan documentation request received',
      'event',
      'complete',
      '2026-04-28',
      '10:20',
      'Terri was assigned as processor and requested income, asset, credit inquiry, earnest money, gift-fund, employer remote-work, NY closing, and rate-lock items.',
      0
    ),
    (
      'Initial explanation letters uploaded',
      'submission',
      'complete',
      '2026-04-28',
      '21:08',
      'Uploaded LOE_Employment_Gap_Andrew_Morland.pdf and LOE_Credit_Inquiries_Andrew_Morland.pdf. Credit inquiry LOE was later confirmed acceptable, and the employment gap LOE was received.',
      1
    ),
    (
      'Rate lock and 100% financing exception questions logged',
      'event',
      'complete',
      '2026-04-28',
      '23:23',
      'Jonathan confirmed the 0% down 30-year fixed option is not available. The 100% financing exception request was started, and ARM/fixed switches may be subject to worst-case pricing.',
      2
    ),
    (
      'BCU guidance received on remaining documents',
      'event',
      'complete',
      '2026-04-29',
      '09:40',
      'Employer remote-work proof can be an email from Andrew''s boss or HR if it clearly shows Greenway Health and includes the sender title. Existing email confirmation is sufficient for the other lender cancellation. Gift affidavit and paper trail are required for gift funds.',
      0
    ),
    (
      'Initial bank statements and advance proof uploaded',
      'submission',
      'complete',
      '2026-04-29',
      '22:31',
      'Uploaded Apple_Savings_Statement02282026_Tory.pdf, Apple_Savings_Statement_03312026_Tory.pdf, Chase_Checking_Statement_03172026_Andrew.pdf, Chase_Checking_Statement_04162026_Andrew.pf, and Hudson_Derm_Advance_04142026_Tory.pdf. Verify the Andrew April Chase filename extension if needed.',
      1
    ),
    (
      'Gift affidavit and earnest money check copy uploaded',
      'submission',
      'complete',
      '2026-04-30',
      '13:37',
      'Uploaded Gift Affidavit signed 04302026.pdf and Check - Home Deposit 04142026.pdf. Terri said the check copy should work, with the seller attorney as fallback if a formal copy is needed.',
      0
    ),
    (
      'Tory Chase checking statements uploaded',
      'submission',
      'complete',
      '2026-04-30',
      '19:13',
      'Uploaded Chase_Checking_Statement_03092026_Tory.pdf and Chase_Checking_Statement_04082026_Tory.pdf to support the relocation-fund trail into Apple Savings.',
      1
    ),
    (
      'Additional reserve documentation requested',
      'event',
      'complete',
      '2026-05-01',
      '08:55',
      'BCU requested CVS/Vanguard 401k statement, Fidelity withdrawal terms, Fidelity March/April statements, April Goldman/Apple Savings statement, transfer history if needed, and Andrew employer confirmation.',
      0
    ),
    (
      'Reserve and retirement documentation uploaded',
      'submission',
      'complete',
      '2026-05-01',
      '13:26',
      'Uploaded Vanguard_Quarterly_Statement_03312026_Tory.pdf, Fidelity_Terms_Of_Withdrawl_Tory.pdf, Fidelity_Monthly_Statement_04302026_Tory.pdf, Fidelity_Monthly_Statement_03312026_Tory.pdf, and Apple_Savings_Statement_04302026_Tory.pdf.',
      1
    ),
    (
      'Andrew Voya reserve documentation completed',
      'submission',
      'complete',
      '2026-05-05',
      '13:05',
      'Uploaded Voya_Quarterly_Statement_03312026_Andrew.pdf and Voya_WithdrawlRules_Andrew.pdf. Terri confirmed the withdrawal rules were acceptable.',
      0
    ),
    (
      'Appraisal report received',
      'milestone',
      'complete',
      '2026-05-07',
      NULL,
      'Appraisal was scheduled for April 29, 2026 and the report came back on May 7, 2026. Add the appraisal document link after it is saved.',
      0
    ),
    (
      'Employer remote-work confirmation pending',
      'deadline',
      'blocked',
      '2026-05-07',
      '12:12',
      'Andrew asked whether the employer confirmation is holding up the loan. Direct boss is unavailable; HR may need to provide confirmation if this is blocking underwriting.',
      1
    )
)
INSERT INTO timeline_entries (track_id, title, entry_type, status, date, time, notes, sort_index)
SELECT loan_track.id, entries.title, entries.entry_type, entries.status, entries.date, entries.time, entries.notes, entries.sort_index
FROM loan_track
CROSS JOIN entries
WHERE NOT EXISTS (
  SELECT 1
  FROM timeline_entries existing
  WHERE existing.track_id = loan_track.id
    AND existing.title = entries.title
    AND existing.date = entries.date
);

WITH loan_track AS (
  SELECT id
  FROM tracks
  WHERE key = 'loan'
),
tasks (title, description, status, owner, due_date, notes, sort_index) AS (
  VALUES
    (
      'Get employer remote-work and income-impact confirmation',
      'Obtain written confirmation from Greenway Health that Andrew is allowed to work remotely and the move to New York will not negatively impact income.',
      'Not Started',
      'Andrew',
      NULL,
      'Terri said an email from Andrew''s boss or HR is acceptable if it clearly shows Greenway Health and the sender title.',
      0
    ),
    (
      'Upload May statements for required accounts',
      'Provide May statements for all accounts BCU needs for closing costs, prepaids, and reserve verification.',
      'Not Started',
      NULL,
      NULL,
      'BCU requested complete statements, including pages marked intentionally blank.',
      1
    ),
    (
      'Provide Tory first Hudson Dermatology paycheck stub',
      'Upload Tory''s first Hudson Dermatology paycheck stub when it becomes available after closing.',
      'Not Started',
      'Tory',
      NULL,
      'Terri acknowledged this will likely be available after closing.',
      2
    ),
    (
      'Provide Apr 9 Apple Savings transfer evidence if requested',
      'Provide transaction history or the next Tory Chase statement showing the April 9, 2026 $500 transfer to Goldman/Apple Savings if BCU still needs it.',
      'Not Started',
      NULL,
      NULL,
      'This supports the deposit after the April 8 Chase statement end date.',
      3
    )
)
INSERT INTO planning_tasks (track_id, section, title, description, status, owner, due_date, notes, sort_index)
SELECT loan_track.id, 'loan', tasks.title, tasks.description, tasks.status, tasks.owner, tasks.due_date, tasks.notes, tasks.sort_index
FROM loan_track
CROSS JOIN tasks
WHERE NOT EXISTS (
  SELECT 1
  FROM planning_tasks existing
  WHERE existing.track_id = loan_track.id
    AND existing.title = tasks.title
);
