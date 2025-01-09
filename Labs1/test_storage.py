#!/usr/bin/env python

from raft import RaftNode
import json
import time
import os
import sqlite3


def cleanup_db_files():
    """Clean up old database files"""
    for file in os.listdir('.'):
        if file.startswith('raft_node_') and file.endswith('.db'):
            os.remove(file)


def setup_cluster():
    """Setup a basic 3-node cluster configuration"""
    config = {
        "node0": {"ip": "127.0.0.1", "port": "5567"},
        "node1": {"ip": "127.0.0.1", "port": "5566"},
        "node2": {"ip": "127.0.0.1", "port": "5565"}
    }
    return config


def test_basic_commit():
    """Test 1: Basic commit functionality"""
    print("\n=== Test 1: Basic Commit ===")

    config = setup_cluster()
    nodes = []

    # Start nodes
    for node_id in config:
        node = RaftNode(config, node_id)
        node.start()
        nodes.append(node)

    # Wait for leader election
    time.sleep(2)

    # Find current leader
    leader = None
    for node in nodes:
        if node.check_role() == 'leader':
            leader = node
            break

    if not leader:
        print("No leader elected!")
        return

    print(f"Leader is {leader.name}")

    # Send test data
    test_data = {'key': 'test1', 'value': 'hello world'}
    print(f"Sending test data: {test_data}")
    leader.client_request(test_data)

    # Wait for commit
    time.sleep(3)

    # Verify data is committed
    for node in nodes:
        value = node.storage.get_value('test1')
        print(f"Node {node.name} has value: {value}")

    # Cleanup
    for node in nodes:
        node.stop()
    time.sleep(1)


def test_persistence():
    """Test 2: Data persistence across restarts"""
    print("\n=== Test 2: Data Persistence ===")

    config = setup_cluster()

    # Start initial cluster and write data
    print("Starting initial cluster...")
    nodes = []
    for node_id in config:
        node = RaftNode(config, node_id)
        node.start()
        nodes.append(node)

    time.sleep(2)

    # Find leader and write data
    leader = None
    for node in nodes:
        if node.check_role() == 'leader':
            leader = node
            break

    if leader:
        test_data = {'key': 'persist_test', 'value': 'persist_value'}
        print(f"Leader {leader.name} writing data: {test_data}")
        leader.client_request(test_data)
        time.sleep(3)

    # Stop all nodes
    for node in nodes:
        node.stop()
    time.sleep(1)

    print("\nRestarting nodes to test persistence...")

    # Restart nodes
    new_nodes = []
    for node_id in config:
        node = RaftNode(config, node_id)
        node.start()
        new_nodes.append(node)

    time.sleep(2)

    # Check if data persisted
    for node in new_nodes:
        value = node.storage.get_value('persist_test')
        print(f"Node {node.name} has persisted value: {value}")

    # Cleanup
    for node in new_nodes:
        node.stop()
    time.sleep(1)


def test_concurrent_commits():
    """Test 3: Multiple concurrent commits"""
    print("\n=== Test 3: Concurrent Commits ===")

    config = setup_cluster()
    nodes = []

    # Start nodes
    for node_id in config:
        node = RaftNode(config, node_id)
        node.start()
        nodes.append(node)

    time.sleep(2)

    # Find leader
    leader = None
    for node in nodes:
        if node.check_role() == 'leader':
            leader = node
            break

    if not leader:
        print("No leader elected!")
        return

    print(f"Leader is {leader.name}")

    # Send multiple concurrent requests
    test_data = [
        {'key': f'concurrent_key_{i}', 'value': f'value_{i}'}
        for i in range(5)
    ]

    print("Sending concurrent requests...")
    for data in test_data:
        leader.client_request(data)

    # Wait for commits
    time.sleep(5)

    # Verify all data was committed
    for node in nodes:
        print(f"\nChecking Node {node.name}:")
        for i in range(5):
            key = f'concurrent_key_{i}'
            value = node.storage.get_value(key)
            print(f"{key}: {value}")

    # Cleanup
    for node in nodes:
        node.stop()
    time.sleep(1)


if __name__ == '__main__':
    try:
        # Clean up any old database files
        cleanup_db_files()

        # Run tests
        test_basic_commit()
        test_persistence()
        test_concurrent_commits()

    except Exception as e:
        print(f"Test failed with error: {e}")
    finally:
        # Final cleanup
        cleanup_db_files()