from OKE.pipelines.engineering_pipeline import EngineeringPipeline
from OKE.specialists.base import BaseSpecialist


class DatabaseSpecialist(BaseSpecialist):

    name = "database"
    display_name = "Database Specialist"
    version = "1.0"

    def analyze(
        self,
        tables,
        columns,
        primary_keys,
        foreign_keys,
        table_name,
    ):

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