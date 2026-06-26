from OKE.models.database_schema import (
    DatabaseSchema,
    DatabaseTable,
    DatabaseColumn,
)

from OKE.adapters.database_adapter import DatabaseAdapter


class DummyAdapter(DatabaseAdapter):

    def load(self) -> DatabaseSchema:

        schema = DatabaseSchema()

        table = DatabaseTable(
            schema="public",
            name="employees",
        )

        table.columns.append(
            DatabaseColumn(
                name="id",
                data_type="uuid",
                nullable=False,
                ordinal_position=1,
            )
        )

        table.columns.append(
            DatabaseColumn(
                name="name",
                data_type="text",
                nullable=False,
                ordinal_position=2,
            )
        )

        table.columns.append(
            DatabaseColumn(
                name="department",
                data_type="text",
                nullable=True,
                ordinal_position=3,
            )
        )

        schema.tables.append(table)

        return schema