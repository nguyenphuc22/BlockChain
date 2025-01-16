import random
import time
import json
from threading import Thread, Lock
import grpc
from concurrent import futures
import logging

import raft_pb2
import raft_pb2_grpc

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


class RaftState:
    FOLLOWER = "follower"
    CANDIDATE = "candidate"
    LEADER = "leader"


class RaftServicer(raft_pb2_grpc.RaftServiceServicer):
    def __init__(self, node):
        self.node = node

    def RequestVote(self, request, context):
        with self.node.lock:
            # Process vote request
            vote_response = self.node._handle_vote_request({
                "term": request.term,
                "candidate_id": request.candidate_id,
                "last_log_index": request.last_log_index,
                "last_log_term": request.last_log_term
            })

            # Return gRPC response
            return raft_pb2.RequestVoteResponse(
                term=vote_response["term"],
                vote_granted=vote_response.get("vote_granted", False)
            )

    def AppendEntries(self, request, context):
        with self.node.lock:
            # Convert entries from protobuf to internal format
            entries = []
            for entry in request.entries:
                entries.append({
                    "term": entry.term,
                    "command": entry.data
                })

            # Process append entries request
            append_response = self.node._handle_append_entries({
                "term": request.term,
                "leader_id": request.leader_id,
                "prev_log_index": request.prev_log_index,
                "prev_log_term": request.prev_log_term,
                "entries": entries,
                "leader_commit": request.leader_commit
            })

            # Return gRPC response
            return raft_pb2.AppendEntriesResponse(
                term=append_response["term"],
                success=append_response["success"]
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

        # Threading
        self.running = True
        self.lock = Lock()

        # gRPC server
        self.server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
        raft_pb2_grpc.add_RaftServiceServicer_to_server(RaftServicer(self), self.server)

        # gRPC clients for other nodes
        self.peers = {}
        for peer_id, peer_info in self.config.items():
            if peer_id != self.node_id:
                channel = grpc.insecure_channel(f"{peer_info['host']}:{peer_info['port']}")
                self.peers[peer_id] = raft_pb2_grpc.RaftServiceStub(channel)

    def start(self):
        """Start the node's threads"""
        # Start gRPC server
        server_addr = f"{self.config[self.node_id]['host']}:{self.config[self.node_id]['port']}"
        self.server.add_insecure_port(server_addr)
        self.server.start()
        self.logger.info(f"Started gRPC server on {server_addr}")

        # Start main loop thread
        Thread(target=self._main_loop).start()

    def stop(self):
        """Stop the node"""
        self.running = False
        self.server.stop(0)

    def _main_loop(self):
        """Main loop checking timeouts and sending heartbeats"""
        while self.running:
            with self.lock:
                current_time = time.time()

                if self.state == RaftState.FOLLOWER:
                    if current_time - self.last_heartbeat > self.election_timeout:
                        self._become_candidate()

                elif self.state == RaftState.CANDIDATE:
                    if current_time - self.last_heartbeat > self.election_timeout:
                        self._start_election()

                elif self.state == RaftState.LEADER:
                    if current_time - self.last_heartbeat > 0.05:  # 50ms
                        self._send_heartbeat()
                        self.last_heartbeat = current_time

            time.sleep(0.01)

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
        last_log_index = len(self.log) - 1
        last_log_term = self.log[-1]["term"] if self.log else 0

        for peer_id, stub in self.peers.items():
            try:
                request = raft_pb2.RequestVoteRequest(
                    term=self.current_term,
                    candidate_id=self.node_id,
                    last_log_index=last_log_index,
                    last_log_term=last_log_term
                )
                response = stub.RequestVote(request)
                self._handle_vote_response({
                    "term": response.term,
                    "vote_granted": response.vote_granted,
                    "from": peer_id
                })
            except grpc.RpcError as e:
                self.logger.warning(f"Failed to send vote request to {peer_id}: {e}")

    def _handle_vote_request(self, request):
        """Handle incoming vote request"""
        response = {
            "term": self.current_term,
            "vote_granted": False
        }

        if request["term"] >= self.current_term:
            if request["term"] > self.current_term:
                self.current_term = request["term"]
                self.voted_for = None
                self.state = RaftState.FOLLOWER

            if (self.voted_for is None or self.voted_for == request["candidate_id"]):
                last_log_index = len(self.log) - 1
                last_log_term = self.log[-1]["term"] if self.log else 0

                if (request["last_log_term"] > last_log_term or
                        (request["last_log_term"] == last_log_term and
                         request["last_log_index"] >= last_log_index)):
                    response["vote_granted"] = True
                    self.voted_for = request["candidate_id"]
                    self.last_heartbeat = time.time()

        return response

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
            if len(self.votes_received) > len(self.nodes) / 2:
                self._become_leader()

    def _become_leader(self):
        """Convert node to leader"""
        if self.state == RaftState.CANDIDATE:
            self.state = RaftState.LEADER
            self.logger.info(f"Node became leader for term {self.current_term}")

            for node_id in self.nodes:
                if node_id != self.node_id:
                    self.next_index[node_id] = len(self.log)
                    self.match_index[node_id] = -1

            self._send_heartbeat()

    def _send_heartbeat(self):
        """Send heartbeat to all nodes"""
        for peer_id, stub in self.peers.items():
            prev_index = self.next_index.get(peer_id, len(self.log)) - 1
            prev_term = self.log[prev_index]["term"] if prev_index >= 0 and self.log else 0

            try:
                entries = []
                if prev_index + 1 < len(self.log):
                    # Convert log entries to protobuf format
                    for entry in self.log[prev_index + 1:]:
                        entries.append(raft_pb2.LogEntry(
                            term=entry["term"],
                            data=json.dumps(entry["command"]),
                            index=prev_index + 1
                        ))

                request = raft_pb2.AppendEntriesRequest(
                    term=self.current_term,
                    leader_id=self.node_id,
                    prev_log_index=prev_index,
                    prev_log_term=prev_term,
                    entries=entries,
                    leader_commit=self.commit_index
                )

                response = stub.AppendEntries(request)
                self._handle_append_entries_response(peer_id, response)
            except grpc.RpcError as e:
                self.logger.warning(f"Failed to send heartbeat to {peer_id}: {e}")

    def _handle_append_entries(self, request):
        """Handle AppendEntries RPC"""
        response = {
            "term": self.current_term,
            "success": False
        }

        if request["term"] < self.current_term:
            return response

        self.last_heartbeat = time.time()

        if self.state != RaftState.FOLLOWER:
            self.state = RaftState.FOLLOWER
            self.voted_for = None

        if request["term"] > self.current_term:
            self.current_term = request["term"]

        # Check previous log entry
        if (request["prev_log_index"] >= len(self.log) or
                (request["prev_log_index"] >= 0 and
                 self.log[request["prev_log_index"]]["term"] != request["prev_log_term"])):
            return response

        # Process log entries
        if request["entries"]:
            # Delete conflicting entries
            self.log = self.log[:request["prev_log_index"] + 1]
            # Append new entries
            self.log.extend(request["entries"])
            response["success"] = True

        # Update commit index
        if request["leader_commit"] > self.commit_index:
            self.commit_index = min(request["leader_commit"], len(self.log) - 1)

        return response

    def _handle_append_entries_response(self, peer_id, response):
        """Handle AppendEntries response"""
        if self.state != RaftState.LEADER:
            return

        if response.term > self.current_term:
            self.current_term = response.term
            self.state = RaftState.FOLLOWER
            self.voted_for = None
            return

        if response.success:
            self.next_index[peer_id] = len(self.log)
            self.match_index[peer_id] = len(self.log) - 1

            # Check if we can commit any entries
            for n in range(self.commit_index + 1, len(self.log)):
                if self.log[n]["term"] == self.current_term:
                    # Count replications
                    replicated = 1  # Leader has entry
                    for node_id in self.nodes:
                        if node_id != self.node_id and self.match_index.get(node_id, -1) >= n:
                            replicated += 1

                    # Commit if majority
                    if replicated > len(self.nodes) / 2:
                        self.commit_index = n
        else:
            # Decrement nextIndex and retry
            self.next_index[peer_id] = max(0, self.next_index[peer_id] - 1)

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