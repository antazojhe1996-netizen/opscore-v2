from OKE.models.database_schema import DatabaseSchema


class DatabaseSchemaBuilder:
    """
    Converts raw database metadata
    into the internal DatabaseSchema model.
    """

    def build(self, metadata) -> DatabaseSchema:
        schema = DatabaseSchema()

        # TODO:
        # Convert metadata into DatabaseSchema

        return schema