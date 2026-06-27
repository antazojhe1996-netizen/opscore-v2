from OKE.specialists.base import BaseSpecialist

# Import specialists para ma-register sila
from OKE.specialists.database.specialist import DatabaseSpecialist


class SpecialistRegistry:

    def get(self, specialist_name):

        registry = BaseSpecialist.registry()

        specialist_class = registry.get(specialist_name)

        if specialist_class is None:
            raise ValueError(
                f"Unknown specialist: {specialist_name}"
            )

        return specialist_class

    def list(self):
        return sorted(BaseSpecialist.registry().keys())