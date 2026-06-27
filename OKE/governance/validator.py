from OKE.governance.rules.specialist_rule import SpecialistRule

# Import specialists to trigger BaseSpecialist auto-registration
from OKE.specialists.database.specialist import DatabaseSpecialist


class GovernanceValidator:

    def __init__(self):

        self.rules = [
            SpecialistRule(),
        ]

    def validate(self):

        findings = []

        for rule in self.rules:
            findings.extend(rule.validate())

        return findings


def main():

    validator = GovernanceValidator()

    findings = validator.validate()

    print("=" * 60)
    print("OKE GOVERNANCE REPORT")
    print("=" * 60)
    print()

    passed = 0
    failed = 0

    for finding in findings:

        print(f"[{finding.status}] {finding.category}")
        print(f"  {finding.message}")
        print()

        if finding.status == "PASS":
            passed += 1
        else:
            failed += 1

    print("-" * 60)
    print(f"PASS : {passed}")
    print(f"FAIL : {failed}")


if __name__ == "__main__":
    main()