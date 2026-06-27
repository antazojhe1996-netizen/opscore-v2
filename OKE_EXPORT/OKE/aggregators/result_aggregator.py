from dataclasses import dataclass


@dataclass
class AggregatedResult:
    specialists: list[str]
    results: dict


class ResultAggregator:

    def aggregate(self, specialist_results):

        return AggregatedResult(
            specialists=sorted(specialist_results.keys()),
            results=specialist_results,
        )