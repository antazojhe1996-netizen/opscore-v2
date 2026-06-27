from OKE.pipelines.engineering_pipeline import EngineeringPipeline
from OKE.specialists.base import BaseSpecialist


class DatabaseSpecialist(BaseSpecialist):

    name = "database"
    display_name = "Database Specialist"
    version = "1.0"

    def analyze(
        self,
        tables=None,
        columns=None,
        primary_keys=None,
        foreign_keys=None,
        table_name=None,
        context=None,
    ):

        if context and context.database:
            database = context.database

            tables = database.tables
            columns = database.columns
            primary_keys = database.primary_keys
            foreign_keys = database.foreign_keys
            table_name = database.table_name

        return EngineeringPipeline().run(
            tables=tables,
            columns=columns,
            primary_keys=primary_keys,
            foreign_keys=foreign_keys,
            table_name=table_name,
        )

    def describe(self):

        return {
            "name": self.name,
            "display_name": self.display_name,
            "version": self.version,
            "responsibility": [
                "Database Discovery",
                "Relationship Analysis",
                "Dependency Analysis",
                "Impact Analysis",
                "Regression Planning",
                "Engineering Recommendation",
            ],
        }