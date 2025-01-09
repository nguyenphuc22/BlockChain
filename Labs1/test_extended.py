#!/usr/bin/env python
from raft import RaftNode
import json
import time


def setup_5_node_cluster():
    """Setup a 5 node RAFT cluster"""
    d = {
        "node0": {"ip": "127.0.0.1", "port": "5567"},
        "node1": {"ip": "127.0.0.1", "port": "5566"},
        "node2": {"ip": "127.0.0.1", "port": "5565"},
        "node3": {"ip": "127.0.0.1", "port": "5564"},
        "node4": {"ip": "127.0.0.1", "port": "5563"}
    }

    nodes = []
    for node_id in d:
        node = RaftNode(d, node_id)
        node.start()
        nodes.append(node)
    return nodes


def wait_for_leader(nodes, timeout=10):
    """Wait for leader election with timeout"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        for node in nodes:
            if node.check_role() == 'leader':
                return node
        time.sleep(0.5)
    return None


def test_leader_failure(nodes):
    """Test leader failure scenario"""
    print("Waiting for initial leader election...")
    leader = wait_for_leader(nodes)

    if leader is None:
        print("Failed to elect leader within timeout")
        return None

    print(f"Current leader: {leader.name}")

    # Simulate leader failure
    leader.pause()
    print("Leader paused, waiting for new election...")

    # Give more time for new election
    time.sleep(5)

    # Check new leader emerged
    new_leader = wait_for_leader([n for n in nodes if n != leader])

    if new_leader is None:
        print("Failed to elect new leader after failure")
    else:
        print(f"New leader: {new_leader.name}")

    return new_leader


def test_network_partition(nodes):
    """Test network partition scenario"""
    # First ensure we have a leader
    current_leader = wait_for_leader(nodes)
    if current_leader is None:
        print("No leader found before partition test")
        return

    # Split nodes into two groups
    group1 = nodes[:3]  # Majority
    group2 = nodes[3:]  # Minority

    print(f"Creating network partition:")
    print(f"Group 1 (majority): {[n.name for n in group1]}")
    print(f"Group 2 (minority): {[n.name for n in group2]}")

    # Simulate network partition
    for node in group1:
        for target in group2:
            node.pause()  # TODO: Replace with proper network partition simulation

    time.sleep(5)  # Give time for the system to react to partition

    # Check leaders in each partition
    leader_group1 = wait_for_leader(group1)
    leader_group2 = wait_for_leader(group2)

    print("\nAfter partition:")
    print(f"Leader in majority group: {leader_group1.name if leader_group1 else 'None'}")
    print(f"Leader in minority group: {leader_group2.name if leader_group2 else 'None'}")

    # Heal the partition
    for node in nodes:
        node.un_pause()  # TODO: Replace with proper network healing

    print("\nHealing network partition...")
    time.sleep(5)  # Give time for cluster to stabilize

    # Check final leader
    final_leader = wait_for_leader(nodes)
    print(f"Final leader after healing: {final_leader.name if final_leader else 'None'}")


def test_data_replication(nodes):
    """Test data replication across nodes"""
    leader = wait_for_leader(nodes)
    if leader is None:
        print("No leader available for data replication test")
        return

    print(f"\nTesting data replication with leader {leader.name}")

    # Send test data
    test_data = {'test_key': 'test_value'}
    print(f"Sending test data: {test_data}")
    leader.client_request(test_data)

    # Give time for replication
    time.sleep(3)

    # Verify replication
    print("\nChecking data replication across nodes:")
    for node in nodes:
        data = node.check_committed_entry()
        print(f"Node {node.name}: {data}")


if __name__ == '__main__':
    print("Setting up 5-node RAFT cluster...")
    nodes = setup_5_node_cluster()

    try:
        # Give initial time for cluster to stabilize
        time.sleep(3)

        # Test leader election
        print("\n=== Testing Leader Election ===")
        test_leader_failure(nodes)

        # Test network partition
        print("\n=== Testing Network Partition ===")
        test_network_partition(nodes)

        # Test data replication
        print("\n=== Testing Data Replication ===")
        test_data_replication(nodes)

    except Exception as e:
        print(f"Test failed with error: {e}")
    finally:
        print("\nShutting down nodes...")
        for node in nodes:
            node.stop()
        print("Test complete")