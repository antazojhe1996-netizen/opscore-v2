import csv
import sys
from pathlib import Path
from datetime import datetime
from collections import defaultdict

def main():
    if len(sys.argv) < 2:
        print("Usage: python knowledge/python/generate_database_book.py <schema_csv_path>")
        sys.exit(1)

    csv_path = Path(sys.argv[1])
    if not csv_path.exists():
        print(f"CSV not found: {csv_path}")
        sys.exit(1)

    root = Path.cwd()
    out_dir = root / "docs" / "database-books"
    out_dir.mkdir(parents=True, exist_ok=True)

    now = datetime.now()
    latest_path = out_dir / "OPSCORE_DATABASE_BOOK_LATEST.md"
    versioned_path = out_dir / f"OPSCORE_DATABASE_BOOK_{now.strftime('%Y-%m-%d_%H-%M')}.md"

    rows = []
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    tables = defaultdict(list)
    for row in rows:
        table = row.get("table_name", "").strip()
        if table:
            tables[table].append(row)

    total_tables = len(tables)
    total_columns = len(rows)

    lines = []
    lines.append("# OPSCORE DATABASE BOOK")
    lines.append("")
    lines.append(f"Generated: {now.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- Tables: {total_tables}")
    lines.append(f"- Columns: {total_columns}")
    lines.append("")
    lines.append("## Purpose")
    lines.append("")
    lines.append("This file is the database schema snapshot of OPSCORE V3 for audit, refactor planning, source validation, and relation mapping.")
    lines.append("")
    lines.append("## Rules")
    lines.append("")
    lines.append("- No guessing.")
    lines.append("- Database schema must be checked before changing engine fields.")
    lines.append("- Source Book and Database Book must agree before major refactors.")
    lines.append("")

    lines.append("## Tables")
    lines.append("")
    for table_name in sorted(tables.keys()):
        lines.append(f"- [{table_name}](#{table_name.lower().replace('_', '-')})")
    lines.append("")

    for table_name in sorted(tables.keys()):
        columns = sorted(
            tables[table_name],
            key=lambda r: int(r.get("ordinal_position") or 0)
        )

        lines.append("---")
        lines.append("")
        lines.append(f"## {table_name}")
        lines.append("")
        lines.append("### Columns")
        lines.append("")
        lines.append("| # | Column | Type | Nullable | Default |")
        lines.append("|---:|---|---|---|---|")

        for col in columns:
            pos = col.get("ordinal_position", "")
            name = col.get("column_name", "")
            dtype = col.get("data_type", "") or col.get("udt_name", "")
            nullable = col.get("is_nullable", "")
            default = col.get("column_default", "") or ""

            default = default.replace("|", "\\|")

            lines.append(f"| {pos} | `{name}` | `{dtype}` | {nullable} | `{default}` |")

        lines.append("")
        lines.append("### Related Modules")
        lines.append("")
        lines.append("TBD by Relation Book.")
        lines.append("")

    output = "\n".join(lines)

    latest_path.write_text(output, encoding="utf-8")
    versioned_path.write_text(output, encoding="utf-8")

    print("Database Book generated successfully.")
    print(f"Latest: {latest_path}")
    print(f"Versioned: {versioned_path}")
    print(f"Tables: {total_tables}")
    print(f"Columns: {total_columns}")

if __name__ == "__main__":
    main()