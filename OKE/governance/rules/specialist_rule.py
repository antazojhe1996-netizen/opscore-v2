from OKE.governance.report import GovernanceFinding
from OKE.governance.rules.base_rule import BaseGovernanceRule
from OKE.specialists.base import BaseSpecialist


class SpecialistRule(BaseGovernanceRule):

    name = "specialist_contract"
    category = "Specialists"

    def validate(self):

        findings = []

        registry = BaseSpecialist.registry()

        if not registry:
            findings.append(
                GovernanceFinding(
                    category=self.category,
                    status="FAIL",
                    message="No specialists registered.",
                )
            )
            return findings

        for name, specialist_class in registry.items():

            if not hasattr(specialist_class, "analyze"):
                findings.append(
                    GovernanceFinding(
                        category=self.category,
                        status="FAIL",
                        message=f"{name} is missing analyze().",
                    )
                )
                continue

            if not hasattr(specialist_class, "describe"):
                findings.append(
                    GovernanceFinding(
                        category=self.category,
                        status="FAIL",
                        message=f"{name} is missing describe().",
                    )
                )
                continue

            findings.append(
                GovernanceFinding(
                    category=self.category,
                    status="PASS",
                    message=f"{name} specialist passes contract.",
                )
            )

        return findings