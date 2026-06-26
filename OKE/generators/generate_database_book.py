from pathlib import Path


class DatabaseBookGenerator:
    def generate(self, tables):
        output = []

        output.append("# OPSCORE Database Book")
        output.append("")
        output.append(f"Total Tables: {len(tables)}")
        output.append("")
        output.append("---")
        output.append("")
        output.append("## Tables")
        output.append("")

        for table in tables:
            output.append(f"- `{table['table_schema']}.{table['table_name']}`")

        output.append("")
        output.append("---")
        output.append("")

        for table in tables:
            output.append(f"## {table['table_name']}")
            output.append("")
            output.append(f"Schema: `{table['table_schema']}`")
            output.append("")

        destination = Path("docs/database-books/OPSCORE_DATABASE_BOOK.md")
        destination.parent.mkdir(parents=True, exist_ok=True)

        destination.write_text(
            "\n".join(output),
            encoding="utf-8",
        )

        return destination