const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Optional auth helper: extracts user if token present, but does not block
const optionalAuth = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_dev');
      req.user = decoded;
    } catch (e) {}
  }
  next();
};

const RESOURCES = [
  {
    id: 1,
    category: 'DSA',
    title: 'Arrays & Two-Pointer Sliding Window Masterclass',
    description: 'Master fast-and-slow pointers, dynamic sliding windows, and in-place memory mutations for high-performance array operations.',
    type: 'article',
    difficulty: 'Easy',
    duration: '30 min',
    url: 'https://leetcode.com/explore/learn/card/array-and-string/',
    tags: ['SDE', 'Data Scientist']
  },
  {
    id: 2,
    category: 'DSA',
    title: 'Dynamic Programming Patterns: Memoization to Tabulation',
    description: 'Deconstruct complex recurrence relations into bottom-up optimal substructures, 1D space optimizations, and state-space pruning.',
    type: 'video',
    difficulty: 'Hard',
    duration: '2 hr',
    url: 'https://www.youtube.com/watch?v=oBt53YbR9Kk',
    tags: ['SDE']
  },
  {
    id: 3,
    category: 'System Design',
    title: 'Designing High-Throughput Distributed Systems',
    description: 'Complete blueprint for horizontal scaling, message broker decoupling, distributed caching, and database read-replicas.',
    type: 'article',
    difficulty: 'Medium',
    duration: '45 min',
    url: 'https://github.com/donnemartin/system-design-primer',
    tags: ['SDE', 'DevOps']
  },
  {
    id: 4,
    category: 'Behavioral',
    title: 'Executive STAR Method for Leadership & Conflict',
    description: 'Structure behavioral telemetry with crisp Situation, Task, Action, and quantifiable Result vectors. Eliminate filler speech.',
    type: 'guide',
    difficulty: 'Easy',
    duration: '20 min',
    url: 'https://www.indeed.com/career-advice/interviewing/how-to-use-the-star-interview-response-technique',
    tags: ['SDE', 'PM', 'Data Scientist', 'DevOps']
  },
  {
    id: 5,
    category: 'ML/AI',
    title: 'Machine Learning Engineering Fundamentals',
    description: 'End-to-end model training pipelines, feature engineering, loss surface convergence, evaluation curves, and inference latency.',
    type: 'course',
    difficulty: 'Medium',
    duration: '3 hr',
    url: 'https://www.kaggle.com/learn',
    tags: ['Data Scientist']
  },
  {
    id: 6,
    category: 'DevOps',
    title: 'Docker Topologies & Kubernetes Cluster Orchestration',
    description: 'Container daemon internals, multi-stage alpine builds, ingress routing, pod autoscaling, and resilient volume persistence.',
    type: 'video',
    difficulty: 'Medium',
    duration: '1.5 hr',
    url: 'https://www.youtube.com/watch?v=PziYflu8cB8',
    tags: ['DevOps']
  },
  {
    id: 7,
    category: 'PM',
    title: 'Product Sense & Strategic Prioritization Matrix',
    description: 'Frameworks for evaluating ambiguity, user pain points, TAM sizing, trade-off matrices, and product lifecycle velocity.',
    type: 'guide',
    difficulty: 'Medium',
    duration: '1 hr',
    url: 'https://www.productalliance.com/',
    tags: ['PM']
  },
  {
    id: 8,
    category: 'DSA',
    title: 'Graph Algorithms: BFS, DFS, Dijkstra & Topological Sort',
    description: 'Cycle detection in directed graphs, minimum spanning trees, bipartite checks, and shortest paths in weighted networks.',
    type: 'article',
    difficulty: 'Hard',
    duration: '1 hr',
    url: 'https://cp-algorithms.com/graph/',
    tags: ['SDE']
  },
  {
    id: 9,
    category: 'Behavioral',
    title: 'Composure & Articulation Under Intense Pressure',
    description: 'Vocal pacing techniques, pausing strategies, active listening cues, and tactical framing when facing unfamiliar system questions.',
    type: 'video',
    difficulty: 'Easy',
    duration: '15 min',
    url: 'https://www.youtube.com/watch?v=DHDrj0_bMQ0',
    tags: ['SDE', 'PM', 'Data Scientist', 'DevOps']
  },
  {
    id: 10,
    category: 'System Design',
    title: 'Relational vs NoSQL Partitioning & Sharding',
    description: 'B-Tree vs LSM-Tree storage engines, consistent hashing rings, partition keys, hot shard mitigation, and secondary index penalties.',
    type: 'article',
    difficulty: 'Hard',
    duration: '1 hr',
    url: 'https://www.vertabelo.com/blog/database-design-patterns/',
    tags: ['SDE', 'Data Scientist']
  },
  {
    id: 11,
    category: 'ML/AI',
    title: 'Probabilistic Modeling & Hypothesis Verification',
    description: 'Bayesian updating, Gaussian distributions, p-value sensitivity, A/B experiment sample sizing, and variance reduction.',
    type: 'course',
    difficulty: 'Medium',
    duration: '2 hr',
    url: 'https://www.khanacademy.org/math/statistics-probability',
    tags: ['Data Scientist']
  },
  {
    id: 12,
    category: 'DevOps',
    title: 'Production CI/CD Pipelines & Canary Deployments',
    description: 'Zero-downtime rolling upgrades, blue-green cutovers, automated smoke testing gates, and rollback triggers on error budget burns.',
    type: 'guide',
    difficulty: 'Medium',
    duration: '45 min',
    url: 'https://www.atlassian.com/continuous-delivery/principles/continuous-integration-vs-delivery-vs-deployment',
    tags: ['DevOps']
  },
  {
    id: 13,
    category: 'PM',
    title: 'North Star KPI Formulation & Experiment Design',
    description: 'Distinguish input vs output metrics, cohort retention curves, counter-metrics against churn, and statistical significance criteria.',
    type: 'article',
    difficulty: 'Hard',
    duration: '1 hr',
    url: 'https://www.productplan.com/learn/product-metrics/',
    tags: ['PM']
  },
  {
    id: 14,
    category: 'DSA',
    title: 'NeetCode 75 Core Technical Interview Index',
    description: 'Comprehensive taxonomy of essential algorithmic problem archetypes covering all high-frequency FAANG interview patterns.',
    type: 'guide',
    difficulty: 'Medium',
    duration: '10 hr',
    url: 'https://neetcode.io/',
    tags: ['SDE', 'Data Scientist']
  },
  {
    id: 15,
    category: 'System Design',
    title: 'CAP Theorem & Eventual Consistency Trade-Offs',
    description: 'Deconstruct CP vs AP architectures, quorum consistency (W + R > N), distributed consensus via Raft, and split-brain resolution.',
    type: 'article',
    difficulty: 'Hard',
    duration: '30 min',
    url: 'https://www.ibm.com/topics/cap-theorem',
    tags: ['SDE', 'DevOps']
  },
  {
    id: 16,
    category: 'System Design',
    title: 'Distributed Tracing & OpenTelemetry Standards',
    description: 'Trace propagation, span context baggage, sampling ratios, and identifying tail-latency bottlenecks across microservices.',
    type: 'guide',
    difficulty: 'Hard',
    duration: '45 min',
    url: 'https://opentelemetry.io/docs/concepts/what-is-opentelemetry/',
    tags: ['SDE', 'DevOps']
  },
  {
    id: 17,
    category: 'Behavioral',
    title: 'Navigating Cross-Functional Disagreements',
    description: 'Executive alignment tactics, disagree-and-commit protocols, data-backed persuasion, and building long-term organizational trust.',
    type: 'article',
    difficulty: 'Medium',
    duration: '25 min',
    url: 'https://hbr.org/2021/01/how-to-disagree-with-someone-more-powerful-than-you',
    tags: ['SDE', 'PM', 'DevOps']
  },
  {
    id: 18,
    category: 'DSA',
    title: 'Lock-Free Data Structures & Atomic Primitives',
    description: 'Compare-and-swap (CAS), memory barriers, ABA problem mitigation, lock-free queues, and concurrent hash table internals.',
    type: 'article',
    difficulty: 'Hard',
    duration: '1.5 hr',
    url: 'https://preshing.com/20120612/an-introduction-to-lock-free-programming/',
    tags: ['SDE']
  },
  {
    id: 19,
    category: 'System Design',
    title: 'Kafka Event-Driven Architecture & Consumer Groups',
    description: 'Log-structured append-only storage, partition offsets, rebalancing protocols, idempotency semantics, and exactly-once delivery.',
    type: 'video',
    difficulty: 'Hard',
    duration: '2 hr',
    url: 'https://www.confluent.io/resources/white-paper/kafka-architecture-guide/',
    tags: ['SDE', 'DevOps']
  },
  {
    id: 20,
    category: 'ML/AI',
    title: 'Transformer Architectures & Attention Mechanisms',
    description: 'Self-attention matrices, positional encodings, multi-head projections, KV-cache latency optimizations, and LLM inference sizing.',
    type: 'course',
    difficulty: 'Hard',
    duration: '2.5 hr',
    url: 'https://jalammar.github.io/illustrated-transformer/',
    tags: ['Data Scientist']
  },
  {
    id: 21,
    category: 'DevOps',
    title: 'Infrastructure as Code with Terraform & AWS',
    description: 'Declarative state management, immutable infrastructure, remote state locking with DynamoDB, and modularized cloud topologies.',
    type: 'guide',
    difficulty: 'Medium',
    duration: '1 hr',
    url: 'https://developer.hashicorp.com/terraform/intro',
    tags: ['DevOps']
  },
  {
    id: 22,
    category: 'PM',
    title: 'Root Cause Analysis & Incident Post-Mortem Leadership',
    description: '5 Whys methodology, blameless post-mortem orchestration, customer-facing communications, and defensive preventive engineering.',
    type: 'guide',
    difficulty: 'Medium',
    duration: '40 min',
    url: 'https://sre.google/sre-book/postmortem-culture/',
    tags: ['PM', 'DevOps']
  },
  {
    id: 23,
    category: 'DSA',
    title: 'Tries, Radix Trees & Bit Manipulation Tricks',
    description: 'Prefix matching, bitwise masking, Hamming weights, XOR swaps, and high-speed string search index structures.',
    type: 'article',
    difficulty: 'Medium',
    duration: '45 min',
    url: 'https://cp-algorithms.com/string/prefix-function.html',
    tags: ['SDE']
  },
  {
    id: 24,
    category: 'System Design',
    title: 'Redis Topologies: Sentinel, Cluster, & Persistence',
    description: 'In-memory single-threaded event loop, RDB vs AOF durability, hash slot distribution, and failover consensus mechanics.',
    type: 'guide',
    difficulty: 'Hard',
    duration: '1 hr',
    url: 'https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/',
    tags: ['SDE', 'DevOps']
  }
];

// GET /api/resources
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { role, category, difficulty, search } = req.query;

    let filtered = [...RESOURCES];
    if (role && role !== 'all') {
      filtered = filtered.filter(r => r.tags.some(t => t.toLowerCase() === role.toLowerCase()));
    }
    if (category && category !== 'all') {
      filtered = filtered.filter(r => r.category.toLowerCase() === category.toLowerCase());
    }
    if (difficulty && difficulty !== 'all') {
      filtered = filtered.filter(r => r.difficulty.toLowerCase() === difficulty.toLowerCase());
    }
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        r.category.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    const categories = [...new Set(RESOURCES.map(r => r.category))];

    res.json({ success: true, resources: filtered, categories, total: filtered.length, grandTotal: RESOURCES.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resources.' });
  }
});

module.exports = router;
