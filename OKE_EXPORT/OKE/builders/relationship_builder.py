from OKE.contracts.builder import Builder


class RelationshipBuilder(Builder):

    def build(self, foreign_keys):
        relationships = {}

        for fk in foreign_keys:

            parent = fk["foreign_table_name"]

            child = {
                "table_name": fk["table_name"],
                "column_name": fk["column_name"],
                "foreign_column_name": fk["foreign_column_name"],
            }

            relationships.setdefault(parent, []).append(child)

        return relationships