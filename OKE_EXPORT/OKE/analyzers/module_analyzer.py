from dataclasses import dataclass

from OKE.knowledge.module_map import TABLE_MODULES


@dataclass
class ModuleImpact:
    modules: list[str]


class ModuleAnalyzer:

    def analyze(self, report):

        modules = set()

        # Target table
        modules.update(
            TABLE_MODULES.get(report.subject, [])
        )

        # Impacted tables
        for table in report.dependencies:
            modules.update(
                TABLE_MODULES.get(table, [])
            )

        return ModuleImpact(
            modules=sorted(modules)
        )