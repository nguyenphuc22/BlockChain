#!/usr/bin/env python
import json
import time
import logging

from raft_node.node import RaftNode


def setup_test_config():
    """Create test configuration file"""
    config = {
        "node1": {"host": "localhost", "port": 5000},
        "node2": {"host": "localhost", "port": 5001},
        "node3": {"host": "localhost", "port": 5002}
    }

    with open("config.json", "w") as f:
        json.dump(config, f)
    return config


def run_test_cluster():
    """Run a test cluster with 3 nodes"""
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger("TestCluster")

    # Create config
    logger.info("Creating test configuration...")
    config = setup_test_config()

    # Create nodes
    logger.info("Starting nodes...")
    nodes = []
    for node_id in config:
        node = RaftNode(node_id, "config.json")
        nodes.append(node)
        node.start()
        logger.info(f"Started {node_id}")

    try:
        # Wait for leader election
        logger.info("Waiting for leader election...")
        time.sleep(5)

        # Check states
        leader = None
        for node in nodes:
            logger.info(f"Node {node.node_id} is in state {node.state}")
            if node.state == "leader":
                leader = node

        # Submit test command if we have a leader
        if leader:
            logger.info(f"Leader found: {leader.node_id}")
            logger.info("Submitting test command...")
            success = leader.submit_command({"type": "set", "key": "x", "value": 1})
            logger.info(f"Command submission {'successful' if success else 'failed'}")
        else:
            logger.warning("No leader elected!")

        # Keep running for observation
        logger.info("Cluster running. Press Ctrl+C to stop...")
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        logger.info("Stopping cluster...")
        for node in nodes:
            node.stop()
        logger.info("Cluster stopped")


if __name__ == "__main__":
    run_test_cluster()