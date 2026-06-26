from OKE.contracts.builder import Builder


class DependencyBuilder(Builder):

    def build(self, relationships):
        dependency_graph = {}

        for parent_table, children in relationships.items():

            dependency_graph[parent_table] = sorted(
                child["table_name"]
                for child in children
            )

        return dependency_graph