from OKE.builders.dependency_builder import DependencyBuilder
from OKE.builders.relationship_builder import RelationshipBuilder
from OKE.models.engineering_report import EngineeringReport
from OKE.rules.engineering_rules import EngineeringRules


class EngineeringReportService:

    def build(
        self,
        tables,
        columns,
        primary_keys,
        foreign_keys,
        table_name,
    ):

        relationships = RelationshipBuilder().build(foreign_keys)
        dependency_graph = DependencyBuilder().build(relationships)

        table_columns = [
            c for c in columns
            if c["table_name"] == table_name
        ]

        table_primary_keys = [
            pk for pk in primary_keys
            if pk["table_name"] == table_name
        ]

        table_foreign_keys = [
            fk for fk in foreign_keys
            if fk["table_name"] == table_name
        ]

        referenced_by = relationships.get(table_name, [])
        dependencies = dependency_graph.get(table_name, [])

        rules = EngineeringRules()
        risk = rules.calculate_risk(len(dependencies))

        return EngineeringReport(
            subject=table_name,
            risk=risk,
            columns=table_columns,
            primary_keys=table_primary_keys,
            foreign_keys=table_foreign_keys,
            referenced_by=referenced_by,
            dependencies=dependencies,
        )