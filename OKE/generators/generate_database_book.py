from pathlib import Path


class DatabaseBookGenerator:

    def generate(self, tables, columns=None, primary_keys=None):

        columns = columns or []
        primary_keys = primary_keys or []

        output = []

        output.append("# OPSCORE Database Book")
        output.append("")
        output.append(f"Total Tables: {len(tables)}")
        output.append(f"Total Columns: {len(columns)}")
        output.append(f"Total Primary Keys: {len(primary_keys)}")
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
            table_name = table["table_name"]

            output.append(f"# {table_name}")
            output.append("")
            output.append(f"Schema: `{table['table_schema']}`")
            output.append("")

            table_primary_keys = [
                pk for pk in primary_keys
                if pk["table_name"] == table_name
            ]

            if table_primary_keys:
                output.append("## Primary Key")
                output.append("")

                for pk in table_primary_keys:
                    output.append(
                        f"- `{pk['column_name']}` "
                        f"({pk['constraint_name']})"
                    )

                output.append("")

            table_columns = [
                c for c in columns
                if c["table_name"] == table_name
            ]

            if table_columns:
                output.append("## Columns")
                output.append("")
                output.append("| Name | Type | Nullable | Default | Primary Key |")
                output.append("|------|------|----------|----------|-------------|")

                pk_columns = {
                    pk["column_name"]
                    for pk in table_primary_keys
                }

                for column in table_columns:
                    nullable = "YES" if column["is_nullable"] == "YES" else "NO"
                    default = column["column_default"] or ""
                    is_pk = "YES" if column["column_name"] in pk_columns else ""

                    output.append(
                        f"| {column['column_name']} | "
                        f"{column['data_type']} | "
                        f"{nullable} | "
                        f"{default} | "
                        f"{is_pk} |"
                    )

                output.append("")

            output.append("---")
            output.append("")

        destination = Path("docs/database-books/OPSCORE_DATABASE_BOOK.md")
        destination.parent.mkdir(parents=True, exist_ok=True)

        destination.write_text(
            "\n".join(output),
            encoding="utf-8",
        )

        return destination