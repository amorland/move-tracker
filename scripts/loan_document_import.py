#!/usr/bin/env python3
"""Build a dry-run report and SQL patch for loan underwriting documents.

This script intentionally works from exported CSV files instead of live
Supabase access. Generated reports/SQL are written under data/generated, which
is ignored by git.
"""

from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_EXPORT_DIR = ROOT / "data" / "exports"
DEFAULT_IMPORT_DIR = ROOT / "data" / "imports"
DEFAULT_OUTPUT_DIR = ROOT / "data" / "generated"

LOAN_TRACK_KEY = "loan"
LOAN_CATEGORY = "loan"


@dataclass(frozen=True)
class Target:
    entity_type: str
    title: str
    date: str | None = None


@dataclass
class ManifestDocument:
    folder_path: str
    file_name: str
    file_url: str
    mime_type: str
    created_time: str
    modified_time: str
    file_id: str

    @property
    def url_key(self) -> str:
        return f"google-drive:file:{self.file_id}"

    @property
    def created_date(self) -> str:
        return self.created_time[:10]

    @property
    def relative_folder(self) -> str:
        return self.folder_path.replace("Loan Underwriting Documentation/", "")


TARGET_STUDENT_LOAN = Target("timeline_entry", "Student loan documentation submitted", "2026-04-16")
TARGET_INCOME = Target("timeline_entry", "Income Documentation Submitted", "2026-04-17")
TARGET_ASSETS = Target("timeline_entry", "Asset Documentation Submitted", "2026-04-17")
TARGET_ID_RESIDENCE = Target("timeline_entry", "Identity, residence, and contract documentation submitted", "2026-04-14")
TARGET_INITIAL_BANK = Target("timeline_entry", "Initial bank statements and advance proof uploaded", "2026-04-29")
TARGET_LOE = Target("timeline_entry", "Initial explanation letters uploaded", "2026-04-28")
TARGET_GIFT = Target("timeline_entry", "Gift affidavit and earnest money check copy uploaded", "2026-04-30")
TARGET_TORY_CHASE = Target("timeline_entry", "Tory Chase checking statements uploaded", "2026-04-30")
TARGET_RESERVES = Target("timeline_entry", "Reserve and retirement documentation uploaded", "2026-05-01")
TARGET_ANDREW_VOYA = Target("timeline_entry", "Andrew Voya reserve documentation completed", "2026-05-05")
TARGET_HOMEOWNERS = Target("planning_task", "Upload Homeowners Insurance to Loan Dashboard")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--exports", type=Path, default=DEFAULT_EXPORT_DIR)
    parser.add_argument("--manifest", type=Path, default=None)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()

    manifest_path = args.manifest or newest_manifest(DEFAULT_IMPORT_DIR)
    args.out.mkdir(parents=True, exist_ok=True)

    data = load_exports(args.exports)
    manifest = load_manifest(manifest_path)
    plan = build_plan(data, manifest)

    report_path = args.out / "loan-document-import-dry-run.md"
    sql_path = args.out / "loan-document-import-apply.sql"

    report_path.write_text(render_report(data, manifest_path, manifest, plan), encoding="utf-8")
    sql_path.write_text(render_sql(data, plan), encoding="utf-8")

    print(f"Wrote {report_path}")
    print(f"Wrote {sql_path}")
    print(f"Manifest documents: {len(manifest)}")
    print(f"Missing document records: {len(plan['missing_documents'])}")
    print(f"New document links: {sum(len(items) for items in plan['links_to_add'].values())}")
    print(f"Timeline entries to create: {len(plan['entries_to_create'])}")
    print(f"Timeline entries to consolidate/delete: {len(plan['entries_to_delete'])}")
    return 0


def newest_manifest(import_dir: Path) -> Path:
    manifests = sorted(import_dir.glob("loan-underwriting-documents-manifest-*.csv"))
    if not manifests:
        raise SystemExit(f"No loan underwriting manifest found in {import_dir}")
    return manifests[-1]


def load_exports(export_dir: Path) -> dict[str, list[dict[str, str]]]:
    return {
        "documents": read_csv(export_dir / "documents_rows.csv"),
        "document_links": read_csv(export_dir / "document_links_rows.csv"),
        "timeline_entries": read_csv(export_dir / "timeline_entries_rows.csv"),
        "planning_tasks": read_csv(export_dir / "planning_tasks_rows.csv"),
        "tracks": read_csv(export_dir / "tracks_rows.csv"),
    }


def load_manifest(path: Path) -> list[ManifestDocument]:
    return [ManifestDocument(**row) for row in read_csv(path)]


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def build_plan(data: dict[str, list[dict[str, str]]], manifest: list[ManifestDocument]) -> dict[str, object]:
    docs_by_key = {document_key(row): row for row in data["documents"] if document_key(row)}
    links = data["document_links"]
    timeline_by_title_date = {
        (row["title"], row["date"]): row for row in data["timeline_entries"]
        if row.get("track_id") == loan_track_id(data)
    }
    planning_by_title = {row["title"]: row for row in data["planning_tasks"]}

    assignments: dict[str, list[Target]] = {}
    for document in manifest:
        assignments[document.url_key] = classify_document(document)

    missing_documents = [document for document in manifest if document.url_key not in docs_by_key]
    entries_to_create = [
        TARGET_STUDENT_LOAN
    ] if (TARGET_STUDENT_LOAN.title, TARGET_STUDENT_LOAN.date) not in timeline_by_title_date else []

    links_to_add: dict[Target, list[ManifestDocument]] = defaultdict(list)
    unresolved_targets: dict[str, list[Target]] = defaultdict(list)

    for document in manifest:
        doc_id = docs_by_key.get(document.url_key, {}).get("id")
        for target in assignments[document.url_key]:
            entity_id = target_entity_id(target, timeline_by_title_date, planning_by_title)
            if not entity_id:
                if target in entries_to_create:
                    links_to_add[target].append(document)
                else:
                    unresolved_targets[document.file_name].append(target)
                continue
            if not doc_id or not link_exists(links, doc_id, target.entity_type, entity_id):
                links_to_add[target].append(document)

    entries_to_delete = [
        row for row in data["timeline_entries"]
        if row.get("track_id") == loan_track_id(data)
        and row["title"] == "Underwriting Documentation Package Assembled"
        and row["date"] == "2026-04-17"
    ]
    coverage = coverage_after_import(
        manifest,
        docs_by_key,
        links,
        assignments,
        links_to_add,
        timeline_by_title_date,
        planning_by_title,
    )

    return {
        "assignments": assignments,
        "missing_documents": missing_documents,
        "entries_to_create": entries_to_create,
        "entries_to_delete": entries_to_delete,
        "links_to_add": links_to_add,
        "unresolved_targets": unresolved_targets,
        "coverage": coverage,
    }


def classify_document(document: ManifestDocument) -> list[Target]:
    folder = document.relative_folder
    name = document.file_name
    targets: list[Target] = []

    if folder.startswith("Student Loan Documents"):
        targets.append(TARGET_STUDENT_LOAN)
        targets.append(Target("planning_task", "Verify student loan documentation package is complete"))
    elif folder.startswith("Paystubs"):
        if name.startswith("Hudson_Derm_Advance"):
            targets.append(TARGET_INITIAL_BANK)
        else:
            targets.append(TARGET_INCOME)
    elif folder.startswith("W2s"):
        targets.append(TARGET_INCOME)
    elif folder.startswith("IDs"):
        targets.append(TARGET_ID_RESIDENCE)
    elif folder.startswith("Asset Account Statements/Chase Checking (Tory)"):
        targets.append(TARGET_TORY_CHASE)
    elif folder.startswith("Asset Account Statements/Chase Checking (Andrew)"):
        if "03172026" in name or "04162026" in name:
            targets.append(TARGET_INITIAL_BANK)
        else:
            targets.append(TARGET_ASSETS)
    elif folder.startswith("Asset Account Statements/Apple Savings"):
        if "04302026" in name:
            targets.append(TARGET_RESERVES)
        elif "02282026" in name or "03312026" in name:
            targets.append(TARGET_INITIAL_BANK)
        else:
            targets.append(TARGET_ASSETS)
    elif folder.startswith("Asset Account Statements/Fidelity"):
        if "03312026" in name or "04302026" in name or "Terms_Of_Withdrawl" in name:
            targets.append(TARGET_RESERVES)
        else:
            targets.append(TARGET_ASSETS)
    elif folder.startswith("Asset Account Statements/Voya (Andrew)"):
        if "03312026" in name or "WithdrawlRules" in name:
            targets.append(TARGET_ANDREW_VOYA)
        else:
            targets.append(TARGET_ASSETS)
    elif folder.startswith("Asset Account Statements/Voya (Tory)"):
        if "03312026" in name:
            targets.append(TARGET_RESERVES)
        else:
            targets.append(TARGET_ASSETS)
    elif folder.startswith("Asset Account Statements/Vanguard"):
        if "03312026" in name:
            targets.append(TARGET_RESERVES)
        else:
            targets.append(TARGET_ASSETS)
    elif folder.startswith("Asset Account Statements/TIAA"):
        if "03312026" in name:
            targets.append(TARGET_RESERVES)
        else:
            targets.append(TARGET_ASSETS)
    elif folder.startswith("Asset Account Statements"):
        if "CharlesSchwab" in name:
            targets.append(TARGET_GIFT)
        else:
            targets.append(TARGET_ASSETS)
    elif folder.startswith("Other Documentation"):
        if name.startswith("LOE_"):
            targets.append(TARGET_LOE)
        elif "Gift Affidavit" in name or "Home Deposit" in name:
            targets.append(TARGET_GIFT)
        elif name == "PolicyDocument.pdf":
            targets.append(TARGET_HOMEOWNERS)
        elif name == "HD Final Contract.pdf":
            targets.append(TARGET_INCOME)
        elif "Lease" in name or "lease" in name or "rent" in name or "Rent" in name or "25 Chestnut" in name:
            targets.append(TARGET_ID_RESIDENCE)
        else:
            targets.append(TARGET_ID_RESIDENCE)

    return targets or [TARGET_ASSETS]


def render_report(
    data: dict[str, list[dict[str, str]]],
    manifest_path: Path,
    manifest: list[ManifestDocument],
    plan: dict[str, object],
) -> str:
    docs_by_key = {document_key(row): row for row in data["documents"] if document_key(row)}
    lines: list[str] = [
        "# Loan Document Import Dry Run",
        "",
        f"Manifest: `{manifest_path}`",
        f"Manifest documents: {len(manifest)}",
        f"Existing document records: {len(data['documents'])}",
        f"Missing document records to create: {len(plan['missing_documents'])}",
        f"Timeline entries to create: {len(plan['entries_to_create'])}",
        f"Timeline entries to consolidate/delete: {len(plan['entries_to_delete'])}",
        f"Manifest documents covered after import: {len(plan['coverage']['covered'])}/{len(manifest)}",
        "",
        "## Timeline Consolidation",
        "",
    ]

    if plan["entries_to_delete"]:
        lines.append("- Delete `Underwriting Documentation Package Assembled` on 2026-04-17 after its attachments are represented by the more specific income, asset, and identity/residence entries.")
    else:
        lines.append("- No duplicate timeline entries selected for deletion.")

    lines.extend(["", "## Missing Documents To Create", ""])
    missing = plan["missing_documents"]
    if missing:
        for document in missing:
            lines.append(f"- `{document.file_name}` ({document.created_date}) from `{document.relative_folder}`")
    else:
        lines.append("- None.")

    lines.extend(["", "## Attachments To Add By Target", ""])
    for target, documents in sorted(plan["links_to_add"].items(), key=lambda item: target_sort_key(item[0])):
        lines.append(f"### {target_label(target)}")
        for document in sorted(documents, key=lambda item: (item.created_time, item.file_name)):
            status = "existing" if document.url_key in docs_by_key else "new"
            lines.append(f"- `{document.file_name}` ({status}, Drive created {document.created_date})")
        lines.append("")

    lines.extend(["## Already Catalogued Manifest Documents", ""])
    for document in sorted(manifest, key=lambda item: (item.created_time, item.file_name)):
        if document.url_key in docs_by_key:
            lines.append(f"- `{document.file_name}` -> document id {docs_by_key[document.url_key]['id']}")

    unresolved = plan["unresolved_targets"]
    if unresolved:
        lines.extend(["", "## Unresolved Targets", ""])
        for file_name, targets in unresolved.items():
            lines.append(f"- `{file_name}`: {', '.join(target_label(target) for target in targets)}")

    uncovered = plan["coverage"]["uncovered"]
    lines.extend(["", "## Coverage Warnings", ""])
    if uncovered:
        for document in uncovered:
            lines.append(f"- `{document.file_name}` has no confirmed existing or planned attachment.")
    else:
        lines.append("- None. Every manifest document is either already linked or included in this import plan.")

    return "\n".join(lines) + "\n"


def render_sql(data: dict[str, list[dict[str, str]]], plan: dict[str, object]) -> str:
    loan_id = loan_track_id(data)
    timeline_updates = timeline_note_summaries(plan["links_to_add"])
    lines = [
        "-- Loan underwriting document import",
        "-- Generated from exported Supabase CSVs and the Drive manifest.",
        "-- Review data/generated/loan-document-import-dry-run.md before running.",
        "",
        "BEGIN;",
        "",
    ]

    lines.extend([
        "-- Normalize the older broad initial package event into more specific entries.",
        "UPDATE timeline_entries",
        "SET title = 'Identity, residence, and contract documentation submitted'",
        f"WHERE track_id = {loan_id}",
        "  AND title = 'Identity And Residence Documentation Submitted'",
        "  AND date = '2026-04-14';",
        "",
    ])

    for entry in plan["entries_to_create"]:
        lines.extend(render_timeline_insert(entry, loan_id))

    for document in plan["missing_documents"]:
        lines.extend(render_document_insert(document))

    for target, documents in sorted(plan["links_to_add"].items(), key=lambda item: target_sort_key(item[0])):
        for document in sorted(documents, key=lambda item: item.file_name):
            lines.extend(render_link_insert(document, target, loan_id))
        if target.entity_type == "timeline_entry":
            summary = timeline_updates.get(target)
            if summary:
                lines.extend(render_note_update(target, loan_id, summary))

    for entry in plan["entries_to_delete"]:
        lines.extend(render_entry_delete(entry, loan_id))

    lines.extend([
        "COMMIT;",
        "",
    ])
    return "\n".join(lines)


def render_timeline_insert(target: Target, loan_id: str) -> list[str]:
    return [
        f"-- Create timeline entry: {target.title}",
        "INSERT INTO timeline_entries (track_id, title, entry_type, status, date, time, notes, sort_index)",
        f"SELECT {loan_id}, {sql(target.title)}, 'submission', 'complete', {sql(target.date or '')}, NULL, {sql('Student loan statements for Andrew and Tory uploaded for underwriting review.')}, 0",
        "WHERE NOT EXISTS (",
        "  SELECT 1 FROM timeline_entries",
        f"  WHERE track_id = {loan_id} AND title = {sql(target.title)} AND date = {sql(target.date or '')}",
        ");",
        "",
    ]


def render_document_insert(document: ManifestDocument) -> list[str]:
    return [
        f"-- Document: {document.file_name}",
        "INSERT INTO documents (title, provider, url, url_key, mime_type, category, notes, created_at)",
        f"SELECT {sql(document.file_name)}, 'google_drive', {sql(document.file_url)}, {sql(document.url_key)}, {sql(document.mime_type)}, {sql(LOAN_CATEGORY)}, {sql(document.folder_path + '/' + document.file_name)}, {sql(document.created_time)}",
        "WHERE NOT EXISTS (",
        f"  SELECT 1 FROM documents WHERE url_key = {sql(document.url_key)}",
        ");",
        "",
    ]


def render_link_insert(document: ManifestDocument, target: Target, loan_id: str) -> list[str]:
    if target.entity_type == "timeline_entry":
        target_join = [
            "JOIN timeline_entries target ON target.track_id = " + str(loan_id),
            f"  AND target.title = {sql(target.title)}",
            f"  AND target.date = {sql(target.date or '')}",
        ]
    else:
        target_join = [
            "JOIN planning_tasks target ON target.track_id = " + str(loan_id),
            f"  AND target.title = {sql(target.title)}",
        ]
    return [
        f"-- Attach {document.file_name} to {target_label(target)}",
        "INSERT INTO document_links (document_id, entity_type, entity_id, label, created_at)",
        f"SELECT documents.id, {sql(target.entity_type)}, target.id, NULL, now()",
        "FROM documents",
        *target_join,
        f"WHERE documents.url_key = {sql(document.url_key)}",
        "  AND NOT EXISTS (",
        "    SELECT 1 FROM document_links existing",
        "    WHERE existing.document_id = documents.id",
        f"      AND existing.entity_type = {sql(target.entity_type)}",
        "      AND existing.entity_id = target.id",
        "  );",
        "",
    ]


def render_note_update(target: Target, loan_id: str, summary: str) -> list[str]:
    return [
        f"-- Add import summary to {target.title}",
        "UPDATE timeline_entries",
        "SET notes = CASE",
        "  WHEN notes IS NULL OR notes = '' THEN " + sql(summary),
        "  WHEN notes NOT LIKE '%Documents attached by import:%' THEN notes || E'\\n\\n' || " + sql(summary),
        "  ELSE notes",
        "END",
        f"WHERE track_id = {loan_id}",
        f"  AND title = {sql(target.title)}",
        f"  AND date = {sql(target.date or '')};",
        "",
    ]


def render_entry_delete(entry: dict[str, str], loan_id: str) -> list[str]:
    return [
        f"-- Remove duplicate broad event: {entry['title']}",
        "DELETE FROM document_links",
        "WHERE entity_type = 'timeline_entry'",
        "  AND entity_id IN (",
        "    SELECT id FROM timeline_entries",
        f"    WHERE track_id = {loan_id}",
        f"      AND title = {sql(entry['title'])}",
        f"      AND date = {sql(entry['date'])}",
        "  );",
        "DELETE FROM timeline_entries",
        f"WHERE track_id = {loan_id}",
        f"  AND title = {sql(entry['title'])}",
        f"  AND date = {sql(entry['date'])};",
        "",
    ]


def timeline_note_summaries(links_to_add: dict[Target, list[ManifestDocument]]) -> dict[Target, str]:
    summaries: dict[Target, str] = {}
    for target, documents in links_to_add.items():
        if target.entity_type != "timeline_entry":
            continue
        names = [document.file_name for document in sorted(documents, key=lambda item: item.file_name)]
        if names:
            summaries[target] = f"Documents attached by import: {len(names)} files: " + "; ".join(names)
    return summaries


def target_entity_id(
    target: Target,
    timeline_by_title_date: dict[tuple[str, str], dict[str, str]],
    planning_by_title: dict[str, dict[str, str]],
) -> str | None:
    if target.entity_type == "timeline_entry":
        row = timeline_by_title_date.get((target.title, target.date or ""))
        if not row and target.title == TARGET_ID_RESIDENCE.title:
            row = timeline_by_title_date.get(("Identity And Residence Documentation Submitted", target.date or ""))
        return row["id"] if row else None
    row = planning_by_title.get(target.title)
    return row["id"] if row else None


def coverage_after_import(
    manifest: list[ManifestDocument],
    docs_by_key: dict[str, dict[str, str]],
    links: list[dict[str, str]],
    assignments: dict[str, list[Target]],
    links_to_add: dict[Target, list[ManifestDocument]],
    timeline_by_title_date: dict[tuple[str, str], dict[str, str]],
    planning_by_title: dict[str, dict[str, str]],
) -> dict[str, list[ManifestDocument]]:
    covered: list[ManifestDocument] = []
    uncovered: list[ManifestDocument] = []

    for document in manifest:
        doc_id = docs_by_key.get(document.url_key, {}).get("id")
        has_coverage = False

        for target in assignments[document.url_key]:
            entity_id = target_entity_id(target, timeline_by_title_date, planning_by_title)
            already_linked = bool(doc_id and entity_id and link_exists(links, doc_id, target.entity_type, entity_id))
            planned_link = any(item.file_id == document.file_id for item in links_to_add.get(target, []))
            if already_linked or planned_link:
                has_coverage = True
                break

        if has_coverage:
            covered.append(document)
        else:
            uncovered.append(document)

    return {"covered": covered, "uncovered": uncovered}


def link_exists(links: Iterable[dict[str, str]], document_id: str, entity_type: str, entity_id: str) -> bool:
    return any(
        row["document_id"] == document_id
        and row["entity_type"] == entity_type
        and row["entity_id"] == entity_id
        for row in links
    )


def document_key(row: dict[str, str]) -> str:
    return row.get("url_key") or drive_key_from_url(row.get("url", ""))


def drive_key_from_url(url: str) -> str:
    marker = "/file/d/"
    if marker in url:
        return "google-drive:file:" + url.split(marker, 1)[1].split("/", 1)[0]
    return url


def loan_track_id(data: dict[str, list[dict[str, str]]]) -> str:
    for row in data["tracks"]:
        if row["key"] == LOAN_TRACK_KEY:
            return row["id"]
    raise SystemExit("Loan track not found in tracks export")


def target_label(target: Target) -> str:
    if target.entity_type == "timeline_entry":
        return f"timeline `{target.title}` ({target.date})"
    return f"task `{target.title}`"


def target_sort_key(target: Target) -> tuple[str, str, str]:
    return (target.date or "9999-99-99", target.entity_type, target.title)


def sql(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


if __name__ == "__main__":
    raise SystemExit(main())
