class NetworkManager:
    def __init__(self):
        self.partitioned_nodes = set()

    def partition_network(self, node_addresses):
        """Simulate network partition by blocking communication with specified nodes"""
        self.partitioned_nodes = set(node_addresses)

    def heal_network(self):
        """Heal network partition by restoring all connections"""
        self.partitioned_nodes.clear()

    def can_communicate(self, target_address):
        """Check if communication with target node is allowed"""
        return target_address not in self.partitioned_nodes