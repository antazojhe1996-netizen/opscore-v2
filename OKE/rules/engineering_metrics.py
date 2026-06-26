from OKE.models.engineering_metrics import EngineeringMetrics


class EngineeringMetricsCalculator:

    def calculate(
        self,
        columns,
        primary_keys,
        foreign_keys,
        referenced_by,
        dependencies,
    ):
        return EngineeringMetrics(
            relationship_count=len(referenced_by),
            dependency_count=len(dependencies),
            column_count=len(columns),
            primary_key_count=len(primary_keys),
            foreign_key_count=len(foreign_keys),
        )