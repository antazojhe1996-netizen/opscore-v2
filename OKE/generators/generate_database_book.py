from pathlib import Path


class DatabaseBookGenerator:

    def generate(
        self,
        tables,
        columns=None,
        primary_keys=None,
        foreign_keys=None,
        relationships=None,
    ):

        columns = columns or []
        primary_keys = primary_keys or []
        foreign_keys = foreign_keys or []
        relationships = relationships or {}

        output = []

        output.append("# OPSCORE Database Book")
        output.append("")
        output.append(f"Total Tables: {len(tables)}")
        output.append(f"Total Columns: {len(columns)}")
        output.append(f"Total Primary Keys: {len(primary_keys)}")
        output.append(f"Total Foreign Keys: {len(foreign_keys)}")
        output.append(f"Total Referenced Tables: {len(relationships)}")
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

            table_foreign_keys = [
                fk for fk in foreign_keys
                if fk["table_name"] == table_name
            ]

            referenced_by = relationships.get(table_name, [])

            if table_primary_keys:
                output.append("## Primary Key")
                output.append("")

                for pk in table_primary_keys:
                    output.append(
                        f"- `{pk['column_name']}` "
                        f"({pk['constraint_name']})"
                    )

                output.append("")

            if table_foreign_keys:
                output.append("## Foreign Keys")
                output.append("")

                for fk in table_foreign_keys:
                    output.append(
                        f"- `{fk['column_name']}` → "
                        f"`{fk['foreign_table_schema']}.{fk['foreign_table_name']}.{fk['foreign_column_name']}` "
                        f"({fk['constraint_name']})"
                    )

                output.append("")

            if referenced_by:
                output.append("## Referenced By")
                output.append("")

                for ref in referenced_by:
                    output.append(
                        f"- `{ref['table_name']}.{ref['column_name']}` "
                        f"→ `{table_name}.{ref['foreign_column_name']}`"
                    )

                output.append("")

            table_columns = [
                c for c in columns
                if c["table_name"] == table_name
            ]

            if table_columns:
                output.append("## Columns")
                output.append("")
                output.append("| Name | Type | Nullable | Default | Primary Key | Foreign Key |")
                output.append("|------|------|----------|----------|-------------|-------------|")

                pk_columns = {
                    pk["column_name"]
                    for pk in table_primary_keys
                }

                fk_map = {
                    fk["column_name"]: (
                        f"{fk['foreign_table_schema']}."
                        f"{fk['foreign_table_name']}."
                        f"{fk['foreign_column_name']}"
                    )
                    for fk in table_foreign_keys
                }

                for column in table_columns:
                    column_name = column["column_name"]
                    nullable = "YES" if column["is_nullable"] == "YES" else "NO"
                    default = column["column_default"] or ""
                    is_pk = "YES" if column_name in pk_columns else ""
                    fk_target = fk_map.get(column_name, "")

                    output.append(
                        f"| {column_name} | "
                        f"{column['data_type']} | "
                        f"{nullable} | "
                        f"{default} | "
                        f"{is_pk} | "
                        f"{fk_target} |"
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