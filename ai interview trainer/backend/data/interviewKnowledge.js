// Original HireReady interview prompts, organized around the public learning repositories
// selected by the product team. This catalog stores no copied repository content.
const KNOWLEDGE_TRACKS = [
  {
    id: 'dsa-coding', label: 'DSA & Coding', source: 'NeetCode LeetCode', sourceUrl: 'https://github.com/neetcode-gh/leetcode',
    roles: ['sde', 'software engineer'], rounds: ['coding'],
    prompts: [
      { topic: 'hash maps and complements', question: 'Given an array of integers and a target, return the two indices whose values add to the target. Clarify duplicate handling, then justify your time and space complexity.', probes: 'Ask about no-solution input, duplicate values, and a streaming version.' },
      { topic: 'cache eviction', question: 'Design an LRU cache with O(1) get and put. Describe the data structures, eviction path, and the invariant that keeps them consistent.', probes: 'Ask about capacity zero, concurrent access, and why a heap is a poorer fit.' },
      { topic: 'sliding windows', question: 'Find the longest substring without repeating characters. Walk through the moving-window invariant before writing code.', probes: 'Ask about Unicode, empty input, and why the left pointer never moves backward.' }
    ]
  },
  {
    id: 'system-design', label: 'System Design', source: 'System Design Primer', sourceUrl: 'https://github.com/donnemartin/system-design-primer',
    roles: ['sde', 'software engineer', 'staff', 'lead'], rounds: ['technical', 'system', 'architecture'],
    prompts: [
      { topic: 'feed delivery', question: 'Design a social feed for 20 million daily active users. State your traffic assumptions, read/write ratio, storage estimate, and a push-versus-pull trade-off.', probes: 'Probe celebrity fan-out, cache invalidation, ranking freshness, and degraded reads.' },
      { topic: 'rate limiting', question: 'Design a distributed API rate limiter with regional traffic. Explain the algorithm, key schema, consistency expectations, and the response when the limiter store is unavailable.', probes: 'Probe token bucket burst behavior, clock skew, and multi-region fairness.' },
      { topic: 'durable jobs', question: 'Design a notification service that delivers email and push messages reliably at high volume. Cover idempotency, retries, observability, and dead-letter handling.', probes: 'Probe duplicate delivery, provider outage, and per-user preference changes.' }
    ]
  },
  {
    id: 'behavioral-star', label: 'Behavioral STAR', source: 'Tech Interview Handbook', sourceUrl: 'https://github.com/yangshun/tech-interview-handbook',
    roles: ['all'], rounds: ['behavioral', 'hr', 'leadership'],
    prompts: [
      { topic: 'ownership', question: 'Tell me about a time you inherited an ambiguous technical problem. Frame the situation, your ownership, the actions you took, and the measurable outcome.', probes: 'Ask what they would change and how they aligned stakeholders.' },
      { topic: 'conflict', question: 'Describe a disagreement with a teammate about a technical decision. How did you reach a decision without sacrificing trust or delivery?', probes: 'Ask for the evidence used, the trade-off accepted, and the result.' },
      { topic: 'failure and learning', question: 'Tell me about a production decision that did not work as planned. What did you do during the incident, and what changed afterward?', probes: 'Ask for customer impact, prevention mechanisms, and personal learning.' }
    ]
  },
  {
    id: 'low-level-design', label: 'Low-Level Design', source: 'Low-Level-Design-Problems', sourceUrl: 'https://github.com/faizals/Low-Level-Design-Problems',
    roles: ['sde', 'software engineer', 'mobile'], rounds: ['technical', 'design', 'ood'],
    prompts: [
      { topic: 'parking system', question: 'Model a parking lot that supports vehicle allocation, pricing, and exits. Identify the core entities, responsibilities, extension points, and concurrency risks.', probes: 'Ask how pricing strategies and new vehicle types are added without modifying core allocation logic.' },
      { topic: 'notification abstraction', question: 'Design a notification module supporting email, SMS, and push delivery. Show the interfaces and explain how retries and provider-specific failures stay isolated.', probes: 'Ask about templates, idempotency keys, and adding a new provider.' }
    ]
  },
  {
    id: 'devops-sre', label: 'DevOps & SRE', source: 'DevOps Exercises', sourceUrl: 'https://github.com/bregman-arie/devops-exercises',
    roles: ['devops', 'sre', 'cloud'], rounds: ['technical', 'system', 'architecture'],
    prompts: [
      { topic: 'incident response', question: 'A service error rate rises from 0.1% to 8% immediately after a deployment. Explain your first fifteen minutes, rollback criteria, and the telemetry you would inspect.', probes: 'Ask how they distinguish a bad release from a downstream dependency failure.' },
      { topic: 'safe delivery', question: 'Design a deployment pipeline for a customer-facing API with zero-downtime releases. Cover canaries, health checks, rollback, and secrets management.', probes: 'Ask about schema migrations, alert fatigue, and progressive traffic control.' }
    ]
  },
  {
    id: 'ml-systems', label: 'Machine Learning Systems', source: 'Machine Learning Interviews', sourceUrl: 'https://github.com/alirezadir/Machine-Learning-Interviews',
    roles: ['data', 'ml', 'machine learning'], rounds: ['technical', 'system', 'architecture'],
    prompts: [
      { topic: 'model quality', question: 'A recommendation model’s offline metric improves but online conversion drops. How would you investigate, decide whether to roll back, and update the experiment design?', probes: 'Ask about metric mismatch, delayed labels, segmentation, and guardrail metrics.' },
      { topic: 'feature freshness', question: 'Design a feature pipeline for fraud detection where freshness matters but late events are common. Explain training-serving consistency and failure behavior.', probes: 'Ask about backfills, point-in-time correctness, and feature-store availability.' }
    ]
  },
  {
    id: 'product-metrics', label: 'Product & Metrics', source: 'Product Management Interview Questions', sourceUrl: 'https://github.com/rohitg/Product-Management-Interview-Questions',
    roles: ['pm', 'product manager', 'tpm'], rounds: ['technical', 'product', 'behavioral'],
    prompts: [
      { topic: 'north-star metrics', question: 'A new collaboration feature has strong signups but weak week-four retention. Define the diagnosis plan, primary metric, guardrails, and the first experiment you would run.', probes: 'Ask how they segment users and avoid optimizing a vanity metric.' },
      { topic: 'prioritization', question: 'Choose between reducing onboarding friction, improving search relevance, and building an enterprise permission system. Explain your prioritization framework and decision with incomplete data.', probes: 'Ask for assumptions, reversibility, stakeholder alignment, and success thresholds.' }
    ]
  }
];

function normalized(value) { return String(value || '').toLowerCase(); }

function selectKnowledge(role, round, difficulty) {
  const roleValue = normalized(role);
  const roundValue = normalized(round);
  const scored = KNOWLEDGE_TRACKS.map(track => {
    const roleMatch = track.roles.includes('all') || track.roles.some(item => roleValue.includes(item));
    const roundMatch = track.rounds.some(item => roundValue.includes(item));
    return { track, score: (roleMatch ? 2 : 0) + (roundMatch ? 2 : 0) };
  }).sort((a, b) => b.score - a.score);
  const selected = scored[0]?.score ? scored[0].track : KNOWLEDGE_TRACKS[1];
  const seed = [...`${role}|${round}|${difficulty}`].reduce((total, char) => total + char.charCodeAt(0), 0);
  const prompt = selected.prompts[seed % selected.prompts.length];
  return { id: selected.id, label: selected.label, source: selected.source, sourceUrl: selected.sourceUrl, ...prompt };
}

function publicCatalog() {
  return KNOWLEDGE_TRACKS.map(({ id, label, source, sourceUrl }) => ({ id, label, source, sourceUrl }));
}

module.exports = { selectKnowledge, publicCatalog };
