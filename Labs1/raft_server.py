import grpc
from concurrent import futures
import raft_pb2
import raft_pb2_grpc
import time
import threading


class RaftServer(raft_pb2_grpc.RaftServiceServicer):
    def __init__(self, node):
        self.node = node

    def RequestVote(self, request, context):
        # Chuyển đổi request từ gRPC sang internal format
        vote_request = {
            'term': request.term,
            'candidate_id': request.candidate_id,
            'last_log_index': request.last_log_index,
            'last_log_term': request.last_log_term
        }

        # Xử lý request vote theo logic hiện tại của node
        result = self.node.handle_vote_request(vote_request)

        # Trả về response theo format gRPC
        return raft_pb2.RequestVoteResponse(
            term=result['term'],
            vote_granted=result['vote_granted']
        )

    def AppendEntries(self, request, context):
        # Chuyển đổi request từ gRPC sang internal format
        entries = [{
            'term': entry.term,
            'data': entry.data,
            'index': entry.index
        } for entry in request.entries]

        append_request = {
            'term': request.term,
            'leader_id': request.leader_id,
            'prev_log_index': request.prev_log_index,
            'prev_log_term': request.prev_log_term,
            'entries': entries,
            'leader_commit': request.leader_commit
        }

        # Xử lý append entries theo logic hiện tại của node
        result = self.node.handle_append_entries(append_request)

        # Trả về response theo format gRPC
        return raft_pb2.AppendEntriesResponse(
            term=result['term'],
            success=result['success']
        )


# node.py
class RaftNode:
    def __init__(self, config, node_id):
        self.node_id = node_id
        self.peers = {}  # Lưu các gRPC stubs cho peers
        self.current_term = 0
        self.voted_for = None
        self.log = []
        self.commit_index = 0
        self.last_applied = 0

        # Khởi tạo gRPC server
        self.server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
        raft_pb2_grpc.add_RaftServiceServicer_to_server(RaftServer(self), self.server)

        # Load config và tạo kết nối tới các peers
        self.load_config(config)

    def load_config(self, config):
        """Load config và tạo gRPC channel tới các peers"""
        for peer_id, peer_info in config.items():
            if peer_id != self.node_id:
                channel = grpc.insecure_channel(f"{peer_info['ip']}:{peer_info['port']}")
                self.peers[peer_id] = raft_pb2_grpc.RaftServiceStub(channel)

    def start(self):
        """Start gRPC server và bắt đầu election timer"""
        # Start server
        port = self.config[self.node_id]['port']
        self.server.add_insecure_port(f'[::]:{port}')
        self.server.start()

        # Start election timer trong thread riêng
        self.election_timer = threading.Thread(target=self.run_election_timer)
        self.election_timer.start()

    def stop(self):
        """Stop server và cleanup"""
        self.server.stop(0)
        self.election_timer.join()

    def request_vote(self, peer_id, request):
        """Send RequestVote RPC tới peer"""
        try:
            response = self.peers[peer_id].RequestVote(
                raft_pb2.RequestVoteRequest(
                    term=request['term'],
                    candidate_id=request['candidate_id'],
                    last_log_index=request['last_log_index'],
                    last_log_term=request['last_log_term']
                )
            )
            return {
                'term': response.term,
                'vote_granted': response.vote_granted
            }
        except grpc.RpcError:
            return None

    def append_entries(self, peer_id, request):
        """Send AppendEntries RPC tới peer"""
        try:
            entries = [
                raft_pb2.LogEntry(
                    term=e['term'],
                    data=e['data'],
                    index=e['index']
                ) for e in request['entries']
            ]

            response = self.peers[peer_id].AppendEntries(
                raft_pb2.AppendEntriesRequest(
                    term=request['term'],
                    leader_id=request['leader_id'],
                    prev_log_index=request['prev_log_index'],
                    prev_log_term=request['prev_log_term'],
                    entries=entries,
                    leader_commit=request['leader_commit']
                )
            )
            return {
                'term': response.term,
                'success': response.success
            }
        except grpc.RpcError:
            return None