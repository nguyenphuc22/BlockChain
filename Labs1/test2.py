#!/usr/bin/env python

from raft import RaftNode
import time

address_book_fname = 'address_book.json'

if __name__ == '__main__':
    s1 = RaftNode(address_book_fname, 'node1', 'leader')
    s2 = RaftNode(address_book_fname, 'node2', 'follower')
    s3 = RaftNode(address_book_fname, 'node3', 'follower')

    s1.start()
    s2.start()
    s3.start()

    try:
        while True:
            pass
    except KeyboardInterrupt:
        s2.stop()
        s3.stop()