-- Loan documentation timeline log
-- Run after supabase-home-planning.sql.
-- This patch is idempotent by title + date within the Loan track.
--
-- Notes are dollar-quoted to avoid escaping issues when pasted into the
-- Supabase SQL editor.

WITH loan_track AS (
  SELECT id
  FROM tracks
  WHERE key = $sql$loan$sql$
),
entries (title, entry_type, status, date, time, notes, sort_index) AS (
  VALUES
    (
      $sql$BCU loan documentation request received$sql$,
      $sql$event$sql$,
      $sql$complete$sql$,
      $sql$2026-04-28$sql$,
      $sql$10:20$sql$,
      $sql$Terri was assigned as processor and requested income, asset, credit inquiry, earnest money, gift-fund, employer remote-work, NY closing, and rate-lock items.$sql$,
      0
    ),
    (
      $sql$Initial explanation letters uploaded$sql$,
      $sql$submission$sql$,
      $sql$complete$sql$,
      $sql$2026-04-28$sql$,
      $sql$21:08$sql$,
      $sql$Uploaded LOE_Employment_Gap_Andrew_Morland.pdf and LOE_Credit_Inquiries_Andrew_Morland.pdf. Credit inquiry LOE was later confirmed acceptable, and the employment gap LOE was received.$sql$,
      1
    ),
    (
      $sql$Rate lock and 100% financing exception questions logged$sql$,
      $sql$event$sql$,
      $sql$complete$sql$,
      $sql$2026-04-28$sql$,
      $sql$23:23$sql$,
      $sql$Jonathan confirmed the 0% down 30-year fixed option is not available. The 100% financing exception request was started, and ARM/fixed switches may be subject to worst-case pricing.$sql$,
      2
    ),
    (
      $sql$BCU guidance received on remaining documents$sql$,
      $sql$event$sql$,
      $sql$complete$sql$,
      $sql$2026-04-29$sql$,
      $sql$09:40$sql$,
      $sql$Employer remote-work proof can be an email from Andrew's boss or HR if it clearly shows Greenway Health and includes the sender title. Existing email confirmation is sufficient for the other lender cancellation. Gift affidavit and paper trail are required for gift funds.$sql$,
      0
    ),
    (
      $sql$Initial bank statements and advance proof uploaded$sql$,
      $sql$submission$sql$,
      $sql$complete$sql$,
      $sql$2026-04-29$sql$,
      $sql$22:31$sql$,
      $sql$Uploaded Apple_Savings_Statement02282026_Tory.pdf, Apple_Savings_Statement_03312026_Tory.pdf, Chase_Checking_Statement_03172026_Andrew.pdf, Chase_Checking_Statement_04162026_Andrew.pf, and Hudson_Derm_Advance_04142026_Tory.pdf. Verify the Andrew April Chase filename extension if needed.$sql$,
      1
    ),
    (
      $sql$Gift affidavit and earnest money check copy uploaded$sql$,
      $sql$submission$sql$,
      $sql$complete$sql$,
      $sql$2026-04-30$sql$,
      $sql$13:37$sql$,
      $sql$Uploaded Gift Affidavit signed 04302026.pdf and Check - Home Deposit 04142026.pdf. Terri said the check copy should work, with the seller attorney as fallback if a formal copy is needed.$sql$,
      0
    ),
    (
      $sql$Tory Chase checking statements uploaded$sql$,
      $sql$submission$sql$,
      $sql$complete$sql$,
      $sql$2026-04-30$sql$,
      $sql$19:13$sql$,
      $sql$Uploaded Chase_Checking_Statement_03092026_Tory.pdf and Chase_Checking_Statement_04082026_Tory.pdf to support the relocation-fund trail into Apple Savings.$sql$,
      1
    ),
    (
      $sql$Additional reserve documentation requested$sql$,
      $sql$event$sql$,
      $sql$complete$sql$,
      $sql$2026-05-01$sql$,
      $sql$08:55$sql$,
      $sql$BCU requested CVS/Vanguard 401k statement, Fidelity withdrawal terms, Fidelity March/April statements, April Goldman/Apple Savings statement, transfer history if needed, and Andrew employer confirmation.$sql$,
      0
    ),
    (
      $sql$Reserve and retirement documentation uploaded$sql$,
      $sql$submission$sql$,
      $sql$complete$sql$,
      $sql$2026-05-01$sql$,
      $sql$13:26$sql$,
      $sql$Uploaded Vanguard_Quarterly_Statement_03312026_Tory.pdf, Fidelity_Terms_Of_Withdrawl_Tory.pdf, Fidelity_Monthly_Statement_04302026_Tory.pdf, Fidelity_Monthly_Statement_03312026_Tory.pdf, and Apple_Savings_Statement_04302026_Tory.pdf.$sql$,
      1
    ),
    (
      $sql$Andrew Voya reserve documentation completed$sql$,
      $sql$submission$sql$,
      $sql$complete$sql$,
      $sql$2026-05-05$sql$,
      $sql$13:05$sql$,
      $sql$Uploaded Voya_Quarterly_Statement_03312026_Andrew.pdf and Voya_WithdrawlRules_Andrew.pdf. Terri confirmed the withdrawal rules were acceptable.$sql$,
      0
    ),
    (
      $sql$Appraisal report received$sql$,
      $sql$milestone$sql$,
      $sql$complete$sql$,
      $sql$2026-05-07$sql$,
      NULL,
      $sql$Appraisal was scheduled for April 29, 2026 and the report came back on May 7, 2026. Add the appraisal document link after it is saved.$sql$,
      0
    ),
    (
      $sql$Employer remote-work confirmation pending$sql$,
      $sql$deadline$sql$,
      $sql$blocked$sql$,
      $sql$2026-05-07$sql$,
      $sql$12:12$sql$,
      $sql$Andrew asked whether the employer confirmation is holding up the loan. Direct boss is unavailable; HR may need to provide confirmation if this is blocking underwriting.$sql$,
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
  WHERE key = $sql$loan$sql$
),
tasks (title, description, status, owner, due_date, notes, sort_index) AS (
  VALUES
    (
      $sql$Get employer remote-work and income-impact confirmation$sql$,
      $sql$Obtain written confirmation from Greenway Health that Andrew is allowed to work remotely and the move to New York will not negatively impact income.$sql$,
      $sql$Not Started$sql$,
      $sql$Andrew$sql$,
      NULL,
      $sql$Terri said an email from Andrew's boss or HR is acceptable if it clearly shows Greenway Health and the sender title.$sql$,
      0
    ),
    (
      $sql$Upload May statements for required accounts$sql$,
      $sql$Provide May statements for all accounts BCU needs for closing costs, prepaids, and reserve verification.$sql$,
      $sql$Not Started$sql$,
      NULL,
      NULL,
      $sql$BCU requested complete statements, including pages marked intentionally blank.$sql$,
      1
    ),
    (
      $sql$Provide Tory first Hudson Dermatology paycheck stub$sql$,
      $sql$Upload Tory's first Hudson Dermatology paycheck stub when it becomes available after closing.$sql$,
      $sql$Not Started$sql$,
      $sql$Tory$sql$,
      NULL,
      $sql$Terri acknowledged this will likely be available after closing.$sql$,
      2
    ),
    (
      $sql$Provide Apr 9 Apple Savings transfer evidence if requested$sql$,
      $sql$Provide transaction history or the next Tory Chase statement showing the April 9, 2026 $500 transfer to Goldman/Apple Savings if BCU still needs it.$sql$,
      $sql$Not Started$sql$,
      NULL,
      NULL,
      $sql$This supports the deposit after the April 8 Chase statement end date.$sql$,
      3
    )
)
INSERT INTO planning_tasks (track_id, section, title, description, status, owner, due_date, notes, sort_index)
SELECT loan_track.id, $sql$loan$sql$, tasks.title, tasks.description, tasks.status, tasks.owner, tasks.due_date, tasks.notes, tasks.sort_index
FROM loan_track
CROSS JOIN tasks
WHERE NOT EXISTS (
  SELECT 1
  FROM planning_tasks existing
  WHERE existing.track_id = loan_track.id
    AND existing.title = tasks.title
);
