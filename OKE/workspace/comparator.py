class SnapshotComparator:

    def compare(
        self,
        previous,
        current,
    ):

        previous = previous or {}
        current = current or {}

        previous_columns = set(
            previous.get("snapshot", {}).get("columns", [])
        )

        current_columns = set(
            current.get("snapshot", {}).get("columns", [])
        )

        return {
            "added_columns": sorted(
                current_columns - previous_columns
            ),
            "removed_columns": sorted(
                previous_columns - current_columns
            ),
            "changed": previous_columns != current_columns,
        }