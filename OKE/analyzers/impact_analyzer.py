from dataclasses import dataclass


@dataclass
class ImpactReport:
    table: str
    affected_tables: list[str]
    risk: str


class ImpactAnalyzer:

    def analyze(self, report):

        return ImpactReport(
            table=report.subject,
            affected_tables=sorted(report.dependencies),
            risk=report.risk,
        )