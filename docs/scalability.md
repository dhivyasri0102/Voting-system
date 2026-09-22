# Scalability & Deployment Architecture

## 1. Load Topology for National Scale (100M+ Voters)

```
[Internet Anycast DNS / CDN / Cloudflare DDOS Shield]
                         │
                         ▼
             [Nginx Edge Ingress Proxy]
       SSL Termination & Rate-Limiting Filter
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
[Node.js API Pods 1..N]          [Node.js API Pods N+1..2N]
Stateless Express Workers        Stateless Express Workers
        │                                 │
        └────────────────┬────────────────┘
                         ▼
             [Redis Cluster (v7.2+)]
        Distributed Locks & Rate-Limiting Tokens
                         │
                         ▼
          [PostgreSQL Multi-AZ Primary + Read Replicas]
          Identity Registries & Electoral Partitioning
                         │
                         ▼
        [Hyperledger Fabric Raft Orderer & Peer Ring]
          Channel: election-channel (Consensus Level 1)
```

## 2. Benchmark Projections
- **Concurrent Polling Capacity**: 10,000 requests/sec across 20 containerized API pods.
- **Ledger Throughput**: Hyperledger Fabric Raft batches up to 500 transactions per block every 250ms (~2,000 TPS on dedicated NVMe peer nodes).
- **Graceful Degradation**: If UIDAI gateway experiences latency spikes, identity tokens are queued with back-pressure notifications while active voting on the ballot gateway continues uninterrupted.
