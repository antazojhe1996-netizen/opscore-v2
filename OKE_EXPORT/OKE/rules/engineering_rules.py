class EngineeringRules:

    def calculate_risk(self, dependency_count):

        if dependency_count >= 10:
            return "CRITICAL"

        if dependency_count >= 5:
            return "HIGH"

        if dependency_count >= 2:
            return "MEDIUM"

        return "LOW"