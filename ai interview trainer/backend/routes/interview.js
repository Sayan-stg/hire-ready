const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Session = require('../models/Session');
const User = require('../models/User');
const mongoose = require('mongoose');

// ─── AI API Helper (Gemini & Contextual Heuristic Engine) ────────────────────
async function callClaude(messages, systemPrompt, maxTokens = 1000, demoCtx = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return generateSmartContextualResponse(messages, demoCtx.role || 'SDE', demoCtx.round || 'Technical', demoCtx.difficulty || 'Medium');
  }

  try {
    // Convert messages to Gemini format
    const geminiContents = [];
    for (const msg of messages) {
      geminiContents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    const payload = {
      contents: geminiContents,
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      ],
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      console.warn(`Gemini API returned ${response.status}. Engaging Autonomous Contextual Heuristic Engine.`);
      return generateSmartContextualResponse(messages, demoCtx.role || 'SDE', demoCtx.round || 'Technical', demoCtx.difficulty || 'Medium');
    }

    const data = await response.json();
    if (data.error) {
      console.warn(`Gemini error: ${data.error.message}. Engaging Autonomous Contextual Heuristic Engine.`);
      return generateSmartContextualResponse(messages, demoCtx.role || 'SDE', demoCtx.round || 'Technical', demoCtx.difficulty || 'Medium');
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return generateSmartContextualResponse(messages, demoCtx.role || 'SDE', demoCtx.round || 'Technical', demoCtx.difficulty || 'Medium');
    }

    return text.trim();
  } catch (err) {
    console.warn(`Gemini invocation failed: ${err.message}. Engaging Autonomous Contextual Heuristic Engine.`);
    return generateSmartContextualResponse(messages, demoCtx.role || 'SDE', demoCtx.round || 'Technical', demoCtx.difficulty || 'Medium');
  }
}

// ─── Rich Demo Response Bank ──────────────────────────────────────────────────
const DEMO_QUESTIONS = {
  SDE: {
    technical: [
      "Let's start! Can you explain the difference between a stack and a queue, and give a real-world use case for each?",
      "Great. Now, how would you design a rate limiter for an API that handles 1 million requests per day?",
      "Interesting approach. Can you walk me through how you would implement a LRU (Least Recently Used) cache from scratch?",
      "Good. What is the time complexity of your solution? Can you optimize it further?",
      "Let's talk system design. How would you design a URL shortener like bit.ly? Walk me through the architecture.",
      "Nice! How do you handle race conditions in a multi-threaded environment? Give me a concrete example.",
      "Can you explain the difference between SQL and NoSQL databases? When would you choose one over the other?",
      "Walk me through how HTTP/HTTPS works. What happens between typing a URL and seeing the webpage?",
      "How would you detect a cycle in a linked list? What's the most efficient algorithm?",
      "Let's talk about microservices. What are the trade-offs compared to a monolithic architecture?",
      "How does garbage collection work in your preferred language? What are its limitations?",
      "Explain the CAP theorem. How does it affect distributed system design?",
      "How would you approach debugging a production system that's suddenly running 10x slower?",
      "What's the difference between optimistic and pessimistic locking in databases?",
      "Can you explain how a binary search tree differs from a balanced BST like AVL or Red-Black tree?",
    ],
    hr: [
      "Tell me about yourself and why you're interested in this SDE role.",
      "Describe a time when you had to meet a tight deadline. How did you manage it?",
      "Tell me about a challenging bug you encountered and how you resolved it.",
      "How do you handle disagreements with your team about technical decisions?",
      "Where do you see yourself in 5 years as a software engineer?",
      "Describe a project you're most proud of. What was your specific contribution?",
      "How do you stay updated with new technologies and industry trends?",
      "Tell me about a time you had to learn a new technology quickly for a project.",
      "How do you prioritize tasks when you have multiple deadlines?",
      "Describe a situation where you had to explain a complex technical concept to a non-technical stakeholder.",
    ],
  },
  'Data Scientist': {
    technical: [
      "Let's begin! Can you explain the difference between supervised and unsupervised learning with examples?",
      "How would you handle a dataset with 40% missing values? Walk me through your approach.",
      "Explain the bias-variance tradeoff. How do you balance it in practice?",
      "What's the difference between L1 and L2 regularization? When would you use each?",
      "How would you detect and handle outliers in a dataset?",
      "Explain how gradient descent works. What are its variants and when do you use them?",
      "What metrics would you use to evaluate a classification model on an imbalanced dataset?",
      "How would you design an A/B test for a new recommendation algorithm?",
      "Explain the difference between bagging and boosting. Give examples of algorithms for each.",
      "How does a Random Forest work? What are its advantages over a single decision tree?",
      "Walk me through how you would build a churn prediction model from scratch.",
      "What is the curse of dimensionality and how do you address it?",
      "Explain precision, recall, and F1 score. When would you prioritize recall over precision?",
      "How would you approach feature engineering for a time-series prediction problem?",
      "What's the difference between PCA and t-SNE? When would you use each?",
    ],
    hr: [
      "Tell me about yourself and your journey into data science.",
      "Describe a data project where your findings directly impacted a business decision.",
      "How do you communicate complex statistical findings to non-technical stakeholders?",
      "Tell me about a time your model didn't perform as expected. What did you do?",
      "How do you ensure your models are fair and unbiased?",
      "Describe your experience working with large datasets. What tools did you use?",
      "How do you stay current with the rapidly evolving ML landscape?",
      "Tell me about a time you had to push back on a stakeholder's request for data.",
      "How do you handle conflicting data from different sources?",
      "Where do you see AI/ML heading in the next 5 years?",
    ],
  },
  DevOps: {
    technical: [
      "Let's kick off! Can you explain the difference between Docker containers and virtual machines?",
      "How would you design a CI/CD pipeline for a microservices application?",
      "Explain Kubernetes architecture. What are pods, nodes, and clusters?",
      "How do you handle secrets management in a containerized environment?",
      "What's blue-green deployment and how does it reduce downtime?",
      "How would you monitor a distributed system? What metrics would you track?",
      "Explain infrastructure as code. What tools have you used — Terraform, Ansible?",
      "How do you approach scaling a web application that's experiencing sudden traffic spikes?",
      "What's the difference between horizontal and vertical scaling?",
      "How would you set up a disaster recovery plan for a critical production system?",
      "Explain how Kubernetes handles load balancing and service discovery.",
      "What are the key differences between Git rebase and merge? When do you use each?",
      "How do you implement zero-downtime deployments?",
      "Explain the 12-factor app methodology. Which factors do you consider most important?",
      "How would you debug a pod that keeps crashing in Kubernetes?",
    ],
    hr: [
      "Tell me about yourself and your DevOps philosophy.",
      "Describe a production outage you handled. How did you communicate with stakeholders?",
      "How do you foster a DevOps culture in a team that's traditionally siloed?",
      "Tell me about a time you automated a manual process. What was the impact?",
      "How do you balance speed of deployment with system stability?",
      "Describe your on-call experience. How do you manage alert fatigue?",
      "How do you approach documentation for infrastructure?",
      "Tell me about a security vulnerability you discovered and how you fixed it.",
      "How do you handle disagreements between dev and ops teams?",
      "Where do you see cloud infrastructure heading in the next few years?",
    ],
  },
  PM: {
    technical: [
      "Let's start! How do you prioritize features when you have limited engineering resources?",
      "Walk me through how you would write a product requirements document (PRD).",
      "How do you measure the success of a product feature after launch?",
      "Explain the difference between OKRs and KPIs. How do you use them?",
      "How would you approach building a roadmap for a product with competing stakeholder priorities?",
      "What frameworks do you use for product prioritization — RICE, MoSCoW, Kano?",
      "How do you conduct user research? What methods do you prefer and why?",
      "Walk me through how you would launch a new feature to minimize risk.",
      "How do you define and measure product-market fit?",
      "Explain how you would handle a situation where engineering says a feature will take 3x longer than expected.",
      "How do you decide when to build vs. buy vs. partner?",
      "Walk me through how you would redesign an existing product feature that users aren't engaging with.",
      "How do you balance short-term user needs vs. long-term product vision?",
      "What's your approach to competitive analysis?",
      "How do you work with data analysts to make product decisions?",
    ],
    hr: [
      "Tell me about yourself and what drew you to product management.",
      "Describe a product you launched end-to-end. What was your process?",
      "Tell me about a time a product you owned failed. What did you learn?",
      "How do you handle a disagreement with an engineer about technical feasibility?",
      "Describe how you've used data to change your mind about a product decision.",
      "How do you manage stakeholder expectations when timelines slip?",
      "Tell me about a time you advocated for users against business pressure.",
      "How do you onboard yourself to a new product domain quickly?",
      "Describe your relationship with design teams. How do you collaborate?",
      "Where do you see the product management role evolving in the next 5 years?",
    ],
  },
};

// ─── Adaptive Contextual Conversational Engine (Zero-API Smart Fallback) ──────
function generateSmartContextualResponse(messages, role = 'SDE', round = 'Technical', difficulty = 'Medium') {
  const userMessages = messages.filter(m => m.role === 'user');
  const msgCount = userMessages.length;
  const roundKey = round.toLowerCase().includes('hr') ? 'hr' : 'technical';
  const bank = (DEMO_QUESTIONS[role] || DEMO_QUESTIONS['SDE'])[roundKey] || [];

  const lastUserMsg = userMessages[userMessages.length - 1]?.content || '';
  const isInternalStartPrompt = /start the interview with a brief greeting/i.test(lastUserMsg);

  // Opening message if no candidate response yet or if initializing prompt
  if (msgCount === 0 || isInternalStartPrompt) {
    return `Hello! Welcome to your ${role} ${round} evaluation. I will be your interviewer today.\n\n${bank[0] || "Can you walk me through a high-availability distributed architecture you recently designed?"}`;
  }

  const cleanTokens = lastUserMsg.toLowerCase().replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(Boolean);
  const wordCount = cleanTokens.length;

  // 1. Clarifying Question Detection (Candidate asking for constraints or requirements)
  const isQuestion = /\?$/.test(lastUserMsg.trim()) || 
    /\b(should i|can i assume|is this|are we|what is the|how many|do you prefer|would you like|is latency|read[- ]heavy|write[- ]heavy|what is the scale)\b/i.test(lastUserMsg);

  if (isQuestion) {
    if (/\b(read|write|ratio|throughput|qps|traffic)\b/i.test(lastUserMsg)) {
      return `Good clarifying question. Assume a 90:10 read-to-write ratio with roughly 50,000 read QPS and 5,000 write QPS, with strict P99 latency under 40ms. Given those constraints, how does that shape your caching tier and database replication strategy?`;
    }
    if (/\b(user|users|scale|concurrency|load|dau|mau)\b/i.test(lastUserMsg)) {
      return `We are sizing for 20 million daily active users globally, with sharp peak bursts during morning rush hours. How will you structure your stateless application tier and connection pools to prevent thread starvation under that volume?`;
    }
    if (/\b(latency|sla|p99|budget|cost|cloud|aws|gcp)\b/i.test(lastUserMsg)) {
      return `Our strict SLA is 50ms at P99 end-to-end. We operate on multi-region AWS infrastructure where cross-region network egress costs must be minimized. Which components in your flow are most prone to latency spikes, and how will you optimize them?`;
    }
    if (/\b(sql|nosql|database|db|postgres|mongo|cassandra|dynamo)\b/i.test(lastUserMsg)) {
      return `You have full architectural discretion. Select whichever storage paradigm best optimizes for your query access patterns and consistency guarantees, and walk me through the trade-offs of your choice.`;
    }
    return `Yes, you can proceed with that assumption for this scenario. Given that constraint, walk me through the exact step-by-step logic of how your service processes an incoming payload from edge to persistence.`;
  }

  // 2. Explicit Uncertainty Check
  if (/\b(don'?t know|do not know|not sure|unsure|no idea|forget|blank|can'?t recall)\b/i.test(lastUserMsg)) {
    return `No problem, let's break it down collaboratively. Imagine we just have a single in-memory server and need to store 10,000 records with fast key-value lookups. What fundamental data structure would you start with, and how would you handle hash collisions?`;
  }

  // 2B. Skip / Next Question Request
  if (/\b(next question|move on|skip|another question|different question)\b/i.test(lastUserMsg)) {
    const nextIdx = Math.min(bank.length - 1, Math.max(1, msgCount % bank.length));
    return `Understood. Let's pivot to another architectural problem:\n\n${bank[nextIdx] || "How would you design a distributed rate limiter for an API handling 100,000 requests per second?"}`;
  }

  // 3. Technical Entity Extraction & Contextual Probing
  const TECH_PROBES = [
    {
      pattern: /\b(redis|memcached|cache|caching|lru|ttl|eviction)\b/i,
      getProbe: (m) => `You highlighted using ${m} for fast retrieval. What specific eviction policy would you configure (such as volatile-lru or allkeys-lfu), and how will you protect the primary database against cache stampedes or thundering herd problems when keys expire?`
    },
    {
      pattern: /\b(kafka|rabbitmq|sqs|event|pub[- ]?sub|queue|streaming|event-driven)\b/i,
      getProbe: (m) => `Relying on ${m} for asynchronous decoupling is a solid pattern. How will you guarantee message ordering across partitions, and how do you handle dead-letter queues and consumer group lag during sudden traffic spikes?`
    },
    {
      pattern: /\b(postgres|postgresql|mysql|sql|relational|acid|transaction|foreign key)\b/i,
      getProbe: (m) => `Good choice focusing on ${m}. Under heavy concurrent write transactions, what isolation level would you select, and how will you mitigate row-level lock contention and read replica replication lag?`
    },
    {
      pattern: /\b(mongo|mongodb|nosql|cassandra|dynamodb|document)\b/i,
      getProbe: (m) => `You selected ${m} for schema flexibility. What will you choose as your primary partition / shard key to ensure uniform data distribution and avoid creating hot storage partitions?`
    },
    {
      pattern: /\b(microservice|microservices|gateway|api gateway|service mesh|rpc|grpc)\b/i,
      getProbe: (m) => `Splitting this into ${m} provides modularity, but introduces network boundaries. How do you plan to handle distributed transaction rollbacks—would you implement the Saga pattern, two-phase commit, or eventual consistency?`
    },
    {
      pattern: /\b(index|indexing|b[- ]?tree|hash index|composite index)\b/i,
      getProbe: (m) => `Adding an ${m} accelerates query lookups, but incurs write penalties. How do you analyze query execution plans (like EXPLAIN ANALYZE) to verify your index selectivity and prevent full table scans?`
    },
    {
      pattern: /\b(docker|kubernetes|k8s|container|containers|pod|pods|helm)\b/i,
      getProbe: (m) => `Deploying on ${m} handles elastic scaling. How would you configure readiness vs. liveness probes and resource limits (CPU/memory) to prevent cascading container crashes under load?`
    },
    {
      pattern: /\b(concurrency|multithreading|thread|mutex|lock|locking|race condition|semaphore|goroutine)\b/i,
      getProbe: (m) => `Concurrency management using ${m} is critical here. How would you design this to avoid deadlocks and thread starvation, and would you favor optimistic locking with versioning or pessimistic locking?`
    },
    {
      pattern: /\b(load balancer|nginx|reverse proxy|rate limit|rate limiter|token bucket|leaky bucket)\b/i,
      getProbe: (m) => `Regarding your ${m} strategy: which rate-limiting algorithm would you implement, and where will you persist state across multiple edge nodes without introducing a latency bottleneck?`
    },
    {
      pattern: /\b(cap theorem|consistency|availability|partition tolerance|eventual consistency)\b/i,
      getProbe: (m) => `Relating this to ${m}: if a network partition isolates one availability zone, does your architecture prioritize immediate consistency (CP) or high availability (AP), and what is the candidate experience during the partition?`
    },
    {
      pattern: /\b(star|situation|task|action|result|conflict|disagree|deadline|stakeholder|manager)\b/i,
      getProbe: (m) => `You framed the ${m} scenario clearly. To quantify your personal ownership: what was the specific metric or outcome achieved, and what was the most difficult trade-off you personally had to make in that situation?`
    }
  ];

  for (const item of TECH_PROBES) {
    const match = lastUserMsg.match(item.pattern);
    if (match) {
      return item.getProbe(match[0]);
    }
  }

  // 4. Vague or brief response (< 8 words)
  if (wordCount < 8) {
    return `You mentioned "${lastUserMsg.trim()}", but that is quite high-level. In a senior technical interview, we look for concrete engineering depth. Walk me through the exact data structures, algorithmic complexity, or network protocols you would implement here.`;
  }

  // 4. Fallback: Dynamic Extract & Echo Reflection
  const sentences = lastUserMsg.split(/[.!?]/).map(s => s.trim()).filter(Boolean);
  const keySnippet = sentences[0] ? sentences[0].slice(0, 55) : 'your proposed solution';

  if (round.toLowerCase().includes('hr') || round.toLowerCase().includes('behavioral')) {
    return `Understood. When you handled "${keySnippet}", how did you communicate the trade-offs to your team, and how did you resolve any disagreements?`;
  }

  // Pick sequential bank question as fallback if turns exceed 3
  if (msgCount % 2 === 0 && bank[Math.floor(msgCount / 2)]) {
    return `Understood—you noted "${keySnippet}". Now let's explore another architectural dimension:\n\n${bank[Math.floor(msgCount / 2)]}`;
  }

  return `Understood—you noted "${keySnippet}". Walk me through the potential failure modes of this approach: how does the system degrade gracefully if that component becomes unavailable in production?`;
}

function buildInterviewerSystem(role, difficulty, pressureMode, resumeText, round) {
  const pressureInstructions = pressureMode
    ? `You are conducting a HIGH PRESSURE interview. Interrupt the candidate if they are overly verbose, challenge weak assumptions with skepticism ("Wait, that won't scale past 10k QPS—why not X?"), and demand rigorous justification under strict time pressure.`
    : '';

  const resumeContext = resumeText
    ? `The candidate's resume highlights: ${resumeText.substring(0, 500)}. Ask questions relevant to their actual experience.`
    : '';

  const difficultyMap = {
    Easy: 'beginner-friendly, conceptual questions with guided hints if stuck',
    Medium: 'intermediate questions requiring practical production knowledge and trade-off analysis',
    Hard: 'staff/principal-level questions demanding deep distributed systems, concurrency primitives, and edge-case resilience',
  };

  return `You are a Principal Engineering Interviewer at a top tier technology company conducting a ${round} interview for a ${role} position.
  
Interview Depth: ${difficultyMap[difficulty] || 'intermediate'}
Round: ${round}
${pressureInstructions}
${resumeContext}

MANDATORY ACTIVE-LISTENING INSTRUCTIONS:
1. REFLECTIVE GROUNDING: Never ask disconnected, canned questions. In your very first sentence, explicitly acknowledge what the candidate just stated by referencing specific tools, algorithms, or architectural patterns they mentioned (e.g., "You proposed using Redis with consistent hashing...", "Regarding your point on database sharding...").
2. ADDRESS CLARIFICATIONS: If the candidate asked a clarifying question (e.g. read/write ratio, scale, latency budget), answer it directly with realistic production figures before asking your follow-up.
3. ADAPTIVE PROBING:
   - If their answer was vague or brief (< 2 sentences), challenge them to provide concrete implementation specifics, data structures, or code.
   - If their answer was strong, probe edge cases: race conditions, failure recovery, memory limits, or distributed network partitions.
4. CADENCE: Ask ONE focused question at a time. Keep responses concise (2 to 4 sentences maximum).
5. Do NOT give final scores, pass/fail ratings, or break character during the interview.`;
}

global.inMemorySessions = global.inMemorySessions || new Map();

// POST /api/interview/start
router.post('/start', protect, async (req, res) => {
  try {
    const { role, difficulty, pressureMode, rounds } = req.body;
    const userRole = role || req.user.targetRole || 'SDE';

    // Generate opening question
    const systemPrompt = buildInterviewerSystem(
      userRole,
      difficulty || 'Medium',
      pressureMode,
      req.user.resumeText,
      (rounds || ['Technical'])[0]
    );

    const openingMsg = await callClaude([
      { role: 'user', content: 'Start the interview with a brief greeting and your first question.' }
    ], systemPrompt, 1000, { role: userRole, round: (rounds || ['Technical'])[0] });

    if (mongoose.connection.readyState === 1) {
      const session = await Session.create({
        user: req.user._id,
        role: userRole,
        difficulty: difficulty || 'Medium',
        pressureMode: !!pressureMode,
        rounds: rounds || ['Technical', 'HR'],
        messages: [{ role: 'assistant', content: openingMsg }],
        status: 'in-progress',
      });
      return res.json({ success: true, sessionId: session._id, message: openingMsg });
    }

    // In-memory session fallback
    const sessId = 'sess_' + Date.now();
    const session = {
      _id: sessId,
      user: req.user._id,
      role: userRole,
      difficulty: difficulty || 'Medium',
      pressureMode: !!pressureMode,
      rounds: rounds || ['Technical', 'HR'],
      messages: [{ role: 'assistant', content: openingMsg }],
      status: 'in-progress',
      createdAt: new Date(),
    };
    global.inMemorySessions.set(sessId, session);

    res.json({ success: true, sessionId: sessId, message: openingMsg });
  } catch (err) {
    console.error('Start interview error:', err);
    // Even if error, return valid starting question
    const fallbackId = 'sess_' + Date.now();
    const fallbackMsg = "Welcome to the technical evaluation. Could you walk me through your experience designing distributed architectures?";
    global.inMemorySessions.set(fallbackId, {
      _id: fallbackId,
      user: req.user._id,
      role: req.body.role || 'SDE',
      difficulty: req.body.difficulty || 'Medium',
      messages: [{ role: 'assistant', content: fallbackMsg }],
      status: 'in-progress',
      createdAt: new Date(),
    });
    res.json({ success: true, sessionId: fallbackId, message: fallbackMsg });
  }
});

// POST /api/interview/message
router.post('/message', protect, async (req, res) => {
  try {
    const sessionId = req.body.sessionId;
    const content = req.body.content || req.body.message;
    if (!content?.trim()) return res.status(400).json({ error: 'Message cannot be empty.' });

    // Detect filler words with punctuation stripped
    const fillerWords = ['um', 'uh', 'like', 'so', 'basically', 'actually', 'literally', 'you know'];
    const cleanTokens = content.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
    const detected = fillerWords.filter(w => cleanTokens.includes(w));

    let session = null;
    if (mongoose.connection.readyState === 1) {
      session = await Session.findOne({ _id: sessionId, user: req.user._id });
    }
    if (!session && global.inMemorySessions.has(sessionId)) {
      session = global.inMemorySessions.get(sessionId);
    }

    if (!session) {
      // Auto-create session if missing
      session = {
        _id: sessionId,
        user: req.user._id,
        role: 'SDE',
        difficulty: 'Medium',
        pressureMode: typeof req.body.pressureMode === 'boolean' ? req.body.pressureMode : false,
        messages: [],
        status: 'in-progress'
      };
      global.inMemorySessions.set(sessionId, session);
    } else if (typeof req.body.pressureMode === 'boolean') {
      session.pressureMode = req.body.pressureMode;
    }

    session.messages.push({ role: 'user', content, fillerWords: detected, timestamp: new Date() });

    const claudeMsgs = session.messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const systemPrompt = buildInterviewerSystem(
      session.role || 'SDE', session.difficulty || 'Medium', session.pressureMode || false,
      req.user.resumeText, session.rounds?.[0] || 'Technical'
    );

    const aiResponse = await callClaude(claudeMsgs, systemPrompt, 1000, {
      role: session.role || 'SDE',
      round: session.rounds?.[0] || 'Technical',
      difficulty: session.difficulty || 'Medium'
    });

    session.messages.push({ role: 'assistant', content: aiResponse, timestamp: new Date() });
    if (session.save) await session.save();

    res.json({ success: true, message: aiResponse, fillerWords: detected });
  } catch (err) {
    console.error('Message error:', err);
    const fallbackResponse = generateSmartContextualResponse(
      session?.messages || [{ role: 'user', content }],
      session?.role || 'SDE',
      session?.rounds?.[0] || 'Technical',
      session?.difficulty || 'Medium'
    );
    res.json({
      success: true,
      message: fallbackResponse,
      fillerWords: []
    });
  }
});

// GET /api/interview/status
router.get('/status', (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';
  res.json({
    success: true,
    hasKey,
    engine: hasKey ? 'Neural Gemini 3.5 Flash (Cloud Active)' : 'Autonomous Heuristic Adaptive Engine (Local Active)',
    model: hasKey ? 'gemini-3.5-flash-lite' : 'local-nlp-adaptive',
    description: hasKey ? 'Real-time multi-turn generative AI evaluation via Google Gemini' : 'Zero-latency entity extraction & contextual grounding'
  });
});

// POST /api/interview/test-key
router.post('/test-key', protect, async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || !apiKey.trim()) return res.status(400).json({ error: 'API key is required.' });
  try {
    const testRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey.trim()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Ping. Respond with "Neural link verified".' }] }]
        })
      }
    );

    if (!testRes.ok) {
      const errText = await testRes.text();
      return res.status(400).json({ error: 'Gemini verification failed (' + testRes.status + '): ' + errText });
    }

    process.env.GEMINI_API_KEY = apiKey.trim();
    res.json({ success: true, message: 'Neural link verified successfully! Gemini 3.5 Flash is now active for all interview rounds.' });
  } catch (err) {
    res.status(500).json({ error: 'Connection to Gemini failed: ' + err.message });
  }
});

// POST /api/interview/end
router.post('/end', protect, async (req, res) => {
  try {
    const { sessionId, duration, tabSwitches = 0, pasteEvents = 0 } = req.body;

    let session = null;
    if (mongoose.connection.readyState === 1) {
      session = await Session.findOne({ _id: sessionId, user: req.user._id });
    }
    if (!session && global.inMemorySessions.has(sessionId)) {
      session = global.inMemorySessions.get(sessionId);
    }

    if (!session) {
      session = {
        _id: sessionId || 'sess_' + Date.now(),
        user: req.user._id,
        role: 'SDE',
        messages: [],
        status: 'completed'
      };
      global.inMemorySessions.set(session._id, session);
    }

    session.status = 'completed';
    session.duration = duration || 120;
    session.completedAt = new Date();

    // ─── Real-Time Performance Analytics ───
    const userMessages = (session.messages || []).filter(m => m.role === 'user');
    const allUserText = userMessages.map(m => m.content).join(' ');
    const totalWords = allUserText.split(/\s+/).filter(Boolean).length;
    const wordCountPerAnswer = userMessages.length ? Math.round(totalWords / userMessages.length) : 0;

    // Real filler words tally
    const fillerMap = { um: 0, uh: 0, like: 0, so: 0, basically: 0, actually: 0, literally: 0 };
    let fillerCount = 0;
    const detectedFillerWords = [];
    userMessages.forEach(m => {
      (m.fillerWords || []).forEach(w => {
        fillerCount++;
        fillerMap[w] = (fillerMap[w] || 0) + 1;
        if (!detectedFillerWords.includes(w)) detectedFillerWords.push(w);
      });
    });

    // Technical domain keyword parsing
    const techKeywords = ['cache', 'database', 'sql', 'nosql', 'index', 'latency', 'throughput', 'scale', 'distributed', 'queue', 'kafka', 'redis', 'async', 'thread', 'complexity', 'o(n)', 'partition', 'api', 'http', 'microservices', 'container', 'concurrency', 'deadlock', 'lock', 'memory', 'heap', 'stack', 'model', 'gradient', 'cluster', 'kubernetes', 'docker'];
    const wordsLower = allUserText.toLowerCase().split(/\W+/);
    const matchedKeywords = techKeywords.filter(k => wordsLower.includes(k));
    const techDensity = Math.min(100, Math.round((matchedKeywords.length / 8) * 100));

    // Dynamic Real Scores Calculation
    const technicalAccuracy = Math.min(98, Math.max(45, 55 + Math.round(techDensity * 0.35) + (wordCountPerAnswer > 30 ? 8 : -8)));
    const communication = Math.min(98, Math.max(40, 86 - (fillerCount * 4) + (wordCountPerAnswer >= 20 ? 8 : -12)));
    const paceWpm = Math.round(totalWords / Math.max(0.5, (duration || 60) / 60));
    const confidence = Math.min(98, Math.max(45, 78 + (paceWpm >= 100 && paceWpm <= 170 ? 10 : -8) - (fillerCount * 2)));
    const fitScore = Math.min(9.9, Math.max(4.0, Number(((technicalAccuracy * 0.45 + communication * 0.35 + confidence * 0.2) / 10).toFixed(1))));
    const overallScore = Math.round(technicalAccuracy * 0.45 + communication * 0.35 + confidence * 0.2);

    const strengths = [];
    if (matchedKeywords.length > 0) strengths.push(`Explicitly referenced architecture primitives (${matchedKeywords.slice(0, 3).join(', ')})`);
    if (communication >= 75) strengths.push('Direct, structured articulation with crisp delivery');
    if (paceWpm >= 100 && paceWpm <= 170) strengths.push(`Controlled vocal cadence (${paceWpm} wpm)`);
    if (strengths.length === 0) strengths.push('Good composure and responsive answers');

    const weaknesses = [];
    if (fillerCount > 2) weaknesses.push(`Filler word density (${fillerCount} occurrences detected: ${detectedFillerWords.join(', ')})`);
    if (techDensity < 30) weaknesses.push('Answers could incorporate more specific system trade-offs');
    if (wordCountPerAnswer < 20) weaknesses.push('Answers were brief; elaborate further on edge cases and failure modes');
    if (weaknesses.length === 0) weaknesses.push('Deepen quantitative metric articulation (e.g. latency deltas)');

    const integrityScore = Math.max(60, 100 - (tabSwitches * 10) - (pasteEvents * 5));

    const evaluation = {
      technicalAccuracy,
      communication,
      confidence,
      overallScore,
      fitScore,
      breakdown: {
        technicalAccuracy,
        communication,
        confidence,
        cultureFit: Math.min(100, Math.round(confidence * 0.95))
      },
      answerQuality: Math.round((technicalAccuracy + communication) / 2),
      strengths,
      weaknesses,
      fillerWordCount: fillerCount,
      detectedFillerWords,
      fillerMap,
      paceWpm,
      totalWords,
      tabSwitches,
      pasteEvents,
      integrityScore,
      improvementRoadmap: [
        weaknesses[0] ? `Focus: ${weaknesses[0]}` : 'Distributed cache invalidation patterns',
        'STAR Framing: Quantify throughput improvements and percentiles',
        'System Architecture: Lock-free concurrency benchmarks'
      ],
      feedback: `Session completed with ${userMessages.length} candidate exchanges over ${Math.floor((duration || 0)/60)}m ${Math.floor((duration || 0)%60)}s. Technical Rigor calibrated at ${technicalAccuracy}%, Communication at ${communication}%.`,
      trend: overallScore >= 75 ? 'positive' : 'stable'
    };

    session.evaluation = evaluation;
    if (session.save) await session.save();

    // Update user stats
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user._id);
      if (user) {
        user.totalSessions = (user.totalSessions || 0) + 1;
        user.totalPoints = (user.totalPoints || 0) + Math.floor(evaluation.overallScore * 10);
        user.updateStreak();
        await user.save();
      }
    } else {
      req.user.totalSessions = (req.user.totalSessions || 0) + 1;
      req.user.totalPoints = (req.user.totalPoints || 0) + Math.floor(evaluation.overallScore * 10);
      req.user.streak = Math.max(1, (req.user.streak || 0) + 1);
      if (global.inMemoryUsers) global.inMemoryUsers.set(req.user.email, req.user);
    }

    res.json({ success: true, evaluation, sessionId: session._id, transcript: session.messages });
  } catch (err) {
    console.error('End session error:', err);
    res.status(500).json({ error: 'Failed to end session.' });
  }
});

// GET /api/interview/sessions
router.get('/sessions', protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const sessions = await Session.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('-messages -codeSubmissions');
      return res.json({ success: true, sessions });
    }

    // In-memory sessions
    const userSess = [];
    for (const s of global.inMemorySessions.values()) {
      if (s.user?.toString() === req.user._id?.toString() && s.status === 'completed') {
        userSess.push(s);
      }
    }
    userSess.sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
    res.json({ success: true, sessions: userSess.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions.' });
  }
});

// GET /api/interview/sessions/:id
router.get('/sessions/:id', protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const session = await Session.findOne({ _id: req.params.id, user: req.user._id });
      if (session) return res.json({ success: true, session });
    }

    if (global.inMemorySessions.has(req.params.id)) {
      return res.json({ success: true, session: global.inMemorySessions.get(req.params.id) });
    }

    res.status(404).json({ error: 'Session not found.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session.' });
  }
});

// GET /api/interview/sessions/:id
router.get('/sessions/:id', protect, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session.' });
  }
});

// POST /api/interview/anti-cheat
router.post('/anti-cheat', protect, async (req, res) => {
  try {
    const { sessionId, event } = req.body; // event: 'tab-switch' | 'paste'
    const update = {};
    if (event === 'tab-switch') update['antiCheat.tabSwitches'] = 1;
    if (event === 'paste') update['antiCheat.pasteAttempts'] = 1;

    await Session.findOneAndUpdate(
      { _id: sessionId, user: req.user._id },
      { $inc: update }
    );

    // Flag if too many violations
    const session = await Session.findById(sessionId);
    if (session && (session.antiCheat.tabSwitches >= 3 || session.antiCheat.pasteAttempts >= 3)) {
      session.antiCheat.flagged = true;
      await session.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Anti-cheat logging failed.' });
  }
});

module.exports = router;
