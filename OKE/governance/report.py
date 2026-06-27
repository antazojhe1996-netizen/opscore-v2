from dataclasses import dataclass, field


@dataclass
class GovernanceFinding:
    category: str
    status: str
    message: str


@dataclass
class GovernanceReport:
    findings: list[GovernanceFinding] = field(default_factory=list)

    def is_pass(self):
        return all(
            finding.status == "PASS"
            for finding in self.findings
        )