# node.py
import random
import time
import json
from threading import Thread, Lock
import socket
import pickle


class RaftState:
    FOLLOWER = "follower"
    CANDIDATE = "candidate"
    LEADER = "leader"


import logging

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


class RaftNode:
    def __init__(self, node_id, config_path):
        self.logger = logging.getLogger(f"Node-{node_id}")
        # Node identity
        self.node_id = node_id
        self.state = RaftState.FOLLOWER

        # Load config
        with open(config_path) as f:
            self.config = json.load(f)
        self.nodes = list(self.config.keys())

        # Persistent state
        self.current_term = 0
        self.voted_for = None
        self.log = []  # Format: [{"term": term, "command": command}]

        # Volatile state
        self.commit_index = -1
        self.last_applied = -1

        # Leader state
        self.next_index = {}  # key: node_id, value: next log index
        self.match_index = {}  # key: node_id, value: highest log matched

        # Election timer
        self.last_heartbeat = time.time()
        self.election_timeout = random.uniform(150, 300) / 1000  # 150-300ms

        # Networking
        self.addr = (self.config[node_id]["host"], self.config[node_id]["port"])
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.socket.bind(self.addr)

        # Threading
        self.running = True
        self.lock = Lock()

    def start(self):
        """Start the node's threads"""
        # Start receiver thread
        Thread(target=self._message_receiver).start()

        # Start main loop thread
        Thread(target=self._main_loop).start()

    def stop(self):
        """Stop the node"""
        self.running = False
        self.socket.close()

    def _main_loop(self):
        """Main loop checking timeouts and sending heartbeats"""
        while self.running:
            with self.lock:
                current_time = time.time()

                if self.state == RaftState.FOLLOWER:
                    # Check if we should start election
                    if current_time - self.last_heartbeat > self.election_timeout:
                        self._become_candidate()

                elif self.state == RaftState.CANDIDATE:
                    # Start election if timeout
                    if current_time - self.last_heartbeat > self.election_timeout:
                        self._start_election()

                elif self.state == RaftState.LEADER:
                    # Send heartbeats
                    if current_time - self.last_heartbeat > 0.05:  # 50ms
                        self._send_heartbeat()
                        self.last_heartbeat = current_time

            time.sleep(0.01)  # Small sleep to prevent busy waiting

    def _message_receiver(self):
        """Thread that handles incoming messages"""
        while self.running:
            try:
                data, addr = self.socket.recvfrom(4096)
                message = pickle.loads(data)

                with self.lock:
                    if message["type"] == "RequestVote":
                        self._handle_vote_request(message)
                    elif message["type"] == "RequestVoteResponse":
                        self._handle_vote_response(message)
                    elif message["type"] == "AppendEntries":
                        self._handle_append_entries(message)
                    elif message["type"] == "AppendEntriesResponse":
                        self._handle_append_entries_response(message)
            except:
                continue

    def _become_candidate(self):
        """Convert node to candidate and start election"""
        self.state = RaftState.CANDIDATE
        self.current_term += 1
        self.voted_for = self.node_id
        self.votes_received = {self.node_id}  # Vote for self
        self.logger.info(f"Node becoming candidate for term {self.current_term}")
        self._start_election()

    def _start_election(self):
        """Start a new election round"""
        self.last_heartbeat = time.time()

        request = {
            "type": "RequestVote",
            "term": self.current_term,
            "candidate_id": self.node_id,
            "last_log_index": len(self.log) - 1,
            "last_log_term": self.log[-1]["term"] if self.log else 0
        }

        # Send vote requests
        for node in self.nodes:
            if node != self.node_id:
                self._send_message(request, node)

    def _handle_vote_request(self, request):
        """Handle incoming vote request"""
        self.logger.debug(f"Received vote request from {request['candidate_id']} for term {request['term']}")
        response = {
            "type": "RequestVoteResponse",
            "term": self.current_term,
            "vote_granted": False
        }

        # Check if request term is >= current term
        if request["term"] >= self.current_term:
            # Update term if needed
            if request["term"] > self.current_term:
                self.current_term = request["term"]
                self.voted_for = None
                self.state = RaftState.FOLLOWER

            # Check if we can vote for candidate
            if (self.voted_for is None or self.voted_for == request["candidate_id"]):
                # Check if candidate's log is at least as up-to-date
                last_log_index = len(self.log) - 1
                last_log_term = self.log[-1]["term"] if self.log else 0

                if (request["last_log_term"] > last_log_term or
                        (request["last_log_term"] == last_log_term and
                         request["last_log_index"] >= last_log_index)):
                    response["vote_granted"] = True
                    self.voted_for = request["candidate_id"]
                    self.last_heartbeat = time.time()

        self._send_message(response, request["candidate_id"])

    def _handle_vote_response(self, response):
        """Handle vote response"""
        if self.state != RaftState.CANDIDATE:
            return

        if response["term"] > self.current_term:
            self.current_term = response["term"]
            self.state = RaftState.FOLLOWER
            self.voted_for = None
            return

        if response["vote_granted"]:
            self.votes_received.add(response["from"])

            # Check if we have majority
            if len(self.votes_received) > len(self.nodes) / 2:
                self._become_leader()

    def _become_leader(self):
        """Convert node to leader"""
        self.state = RaftState.LEADER
        self.logger.info(f"Node became leader for term {self.current_term}")

        # Initialize leader state
        for node in self.nodes:
            self.next_index[node] = len(self.log)
            self.match_index[node] = -1

        # Send initial heartbeat
        self._send_heartbeat()

    def _send_heartbeat(self):
        """Send heartbeat to all nodes"""
        for node in self.nodes:
            if node != self.node_id:
                self._send_append_entries(node)
        self.last_heartbeat = time.time()

    def _send_append_entries(self, to_node):
        """Send AppendEntries RPC to node"""
        next_idx = self.next_index[to_node]
        prev_log_index = next_idx - 1
        prev_log_term = self.log[prev_log_index]["term"] if prev_log_index >= 0 else 0

        request = {
            "type": "AppendEntries",
            "term": self.current_term,
            "leader_id": self.node_id,
            "prev_log_index": prev_log_index,
            "prev_log_term": prev_log_term,
            "entries": self.log[next_idx:],
            "leader_commit": self.commit_index
        }

        self._send_message(request, to_node)

    def _handle_append_entries(self, request):
        """Handle AppendEntries RPC"""
        response = {
            "type": "AppendEntriesResponse",
            "term": self.current_term,
            "success": False,
            "match_index": -1
        }

        # Check term
        if request["term"] < self.current_term:
            self._send_message(response, request["leader_id"])
            return

        # Reset election timeout
        self.last_heartbeat = time.time()

        # Step down if we discover a leader
        if self.state != RaftState.FOLLOWER:
            self.state = RaftState.FOLLOWER
            self.voted_for = None

        if request["term"] > self.current_term:
            self.current_term = request["term"]

        # Check previous log entry
        if (request["prev_log_index"] >= len(self.log) or
                (request["prev_log_index"] >= 0 and
                 self.log[request["prev_log_index"]]["term"] != request["prev_log_term"])):
            self._send_message(response, request["leader_id"])
            return

        # Process log entries
        if request["entries"]:
            # Delete conflicting entries
            self.log = self.log[:request["prev_log_index"] + 1]
            # Append new entries
            self.log.extend(request["entries"])
            response["success"] = True
            response["match_index"] = len(self.log) - 1

        # Update commit index
        if request["leader_commit"] > self.commit_index:
            self.commit_index = min(request["leader_commit"], len(self.log) - 1)

        self._send_message(response, request["leader_id"])

    def _handle_append_entries_response(self, response):
        """Handle AppendEntries response"""
        if self.state != RaftState.LEADER:
            return

        if response["term"] > self.current_term:
            self.current_term = response["term"]
            self.state = RaftState.FOLLOWER
            self.voted_for = None
            return

        if response["success"]:
            # Update matchIndex and nextIndex
            self.match_index[response["from"]] = response["match_index"]
            self.next_index[response["from"]] = response["match_index"] + 1

            # Check if we can commit any entries
            for n in range(self.commit_index + 1, len(self.log)):
                if self.log[n]["term"] == self.current_term:
                    # Count replications
                    replicated = 1  # Leader has entry
                    for node in self.nodes:
                        if node != self.node_id and self.match_index[node] >= n:
                            replicated += 1

                    # Commit if majority
                    if replicated > len(self.nodes) / 2:
                        self.commit_index = n

        else:
            # Decrement nextIndex and retry
            self.next_index[response["from"]] -= 1
            if self.next_index[response["from"]] >= 0:
                self._send_append_entries(response["from"])

    def _send_message(self, message, to_node):
        """Send message to another node"""
        message["from"] = self.node_id
        addr = (self.config[to_node]["host"], self.config[to_node]["port"])
        self.socket.sendto(pickle.dumps(message), addr)

    def submit_command(self, command):
        """Submit command to the cluster (only if leader)"""
        with self.lock:
            if self.state != RaftState.LEADER:
                return False

            # Append to log
            entry = {
                "term": self.current_term,
                "command": command
            }
            self.log.append(entry)

            # Try to replicate immediately
            self._send_heartbeat()
            return True


# Example usage:
def run_test_cluster():
    """Run a test cluster with 3 nodes"""
    logging.info("Starting test cluster with 3 nodes...")
    config = {
        "node1": {"host": "localhost", "port": 5000},
        "node2": {"host": "localhost", "port": 5001},
        "node3": {"host": "localhost", "port": 5002}
    }

    with open("config.json", "w") as f:
        json.dump(config, f)

    # Create and start nodes
    node = RaftNode("node1", "config.json")
    node.start()

    # Submit some commands if leader
    time.sleep(5)  # Wait for election
    if node.state == RaftState.LEADER:
        node.submit_command({"type": "set", "key": "x", "value": 1})