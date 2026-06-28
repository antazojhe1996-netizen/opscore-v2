class Registry:

    def __init__(self):

        self._items = {}

    def register(
        self,
        category,
        name,
        value,
    ):

        self._items.setdefault(category, {})

        self._items[category][name] = value

    def get(
        self,
        category,
        name,
    ):

        return self._items.get(category, {}).get(name)

    def list(
        self,
        category,
    ):

        return list(
            self._items.get(category, {}).keys()
        )

    def categories(self):

        return list(self._items.keys())