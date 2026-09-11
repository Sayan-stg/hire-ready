const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Session = require('../models/Session');
const User = require('../models/User');
const mongoose = require('mongoose');
const { selectKnowledge, publicCatalog } = require('../data/interviewKnowledge');

// ─── AI API Helper (Direct Google Gemini Engine with Adaptive Fallback) ───────
function generateContextualProbe(messages = [], systemPrompt = '') {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const lower = lastUserMsg.toLowerCase();

  if (!lastUserMsg || messages.length <= 1) {
    return "Hello! Welcome to your technical interview session. Can you walk me through the architecture of a high-throughput distributed system you recently designed and deployed?";
  }

  if (/\b(redis|cache|memcached|lru|ttl)\b/i.test(lower)) {
    return "When scaling that caching tier, how do you handle cache invalidation, key eviction policies, and thundering herd stampedes during sudden traffic surges?";
  }
  if (/\b(kafka|queue|event|stream|pub[- ]?sub|rabbitmq)\b/i.test(lower)) {
    return "In that event-driven design, how do you enforce message ordering, backpressure handling, and idempotency across concurrent consumer groups?";
  }
  if (/\b(sql|postgres|mysql|nosql|mongo|database|index)\b/i.test(lower)) {
    return "What partitioning strategy and index topology would you implement if query volume increases 10x, and how do you mitigate replica lag?";
  }
  if (/\b(docker|kubernetes|k8s|pod|cluster|container)\b/i.test(lower)) {
    return "How do you configure liveness probes, rolling update budgets, and circuit breakers to prevent cascading failure across service boundaries?";
  }
  if (lastUserMsg.length < 25 || /\b(i don't know|dont know|not sure|lets end it|end|ok)\b/i.test(lower)) {
    return "Let's break this down into the core engineering fundamentals: what data structures, latency bounds, and storage trade-offs would you evaluate first?";
  }

  return "That provides clear context. From a production reliability standpoint, what p99 latency SLA would you guarantee, and what is your fallback if a downstream dependency degrades?";
}

async function callClaude(messages, systemPrompt, maxTokens = 1000) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.warn('GEMINI_API_KEY not configured; engaging adaptive curriculum interview engine.');
    return generateContextualProbe(messages, systemPrompt);
  }

  // Convert messages to Gemini contents format
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

  const candidateModels = ['gemini-1.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
  let lastError = null;

  for (const model of candidateModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`Google Gemini API error (${response.status} on ${model}): ${errText}`);
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim()) {
        return text.trim();
      }
    } catch (e) {
      lastError = e;
    }
  }

  // Graceful conversational fallback if model services have temporary spikes
  console.warn('Gemini API fallback engaged:', lastError ? lastError.message : 'No response');
  return generateContextualProbe(messages, systemPrompt);
}

function buildInterviewerSystem(role, difficulty, pressureMode, resumeText, round, interviewMode = 'realistic', coverage = [], companyFramework = '') {
  const pressureInstructions = pressureMode
    ? `You are conducting a HIGH PRESSURE interview. Interrupt the candidate if they are overly verbose, challenge weak assumptions with skepticism ("Wait, that won't scale past 10k QPS—why not X?"), and demand rigorous justification under strict time pressure.`
    : '';

  const resumeContext = resumeText
    ? `CANDIDATE RESUME GROUNDING: The candidate's background highlights: ${resumeText.substring(0, 1200)}. Actively ground your interview questions and scenarios in their listed tech stack, architectural projects, and actual domain experience.`
    : '';

  const frameworkMap = {
    'Google System Design': 'COMPANY FRAMEWORK (GOOGLE SYSTEM DESIGN): Demand massive scale (millions of concurrent users), explicit back-of-envelope calculations (QPS, storage, network ingress/egress), P99 latency bounds, and distributed consensus (Raft/Paxos). Probe deeply on CAP theorem trade-offs and edge failure modes.',
    'Amazon Leadership': 'COMPANY FRAMEWORK (AMAZON LEADERSHIP): Interrogate the candidate using Amazon Leadership Principles (Customer Obsession, Ownership, Dive Deep, Bias for Action, Frugality). Require answers to be framed with concrete STAR evidence (Situation, Task, Action, Result) with measurable metrics.',
    'Meta Fast Execution': 'COMPANY FRAMEWORK (META FAST EXECUTION): Focus on rapid MVP velocity, pragmatic trade-offs, building scalable services quickly, and measuring real-time user engagement and telemetry metrics.',
    'Netflix Chaos Architecture': 'COMPANY FRAMEWORK (NETFLIX CHAOS ARCHITECTURE): Test resilience against arbitrary node failures, chaos engineering, circuit breakers, asynchronous event streaming (Kafka), and multi-region active-active deployments.',
    'Apple Integrated Systems': 'COMPANY FRAMEWORK (APPLE INTEGRATED SYSTEMS): Emphasize privacy-first architecture, hardware-software co-design, extreme battery/memory efficiency, and polished, deterministic failure recovery.'
  };
  const frameworkInstructions = frameworkMap[companyFramework] || '';

  const difficultyMap = {
    Easy: 'beginner-friendly, conceptual questions with guided hints if stuck',
    Medium: 'intermediate questions requiring practical production knowledge and trade-off analysis',
    Hard: 'staff/principal-level questions demanding deep distributed systems, concurrency primitives, and edge-case resilience',
  };
  const modeInstructions = interviewMode === 'practice'
    ? 'PRACTICE MODE: You may offer one short, actionable coaching hint before the next question. Never reveal a complete answer.'
    : 'REALISTIC MODE: Stay in interviewer character. Do not give hints, coaching, or scores during the interview.';
  const coverageContext = coverage.length
    ? `COMPETENCY PLAN: ${coverage.map(item => `${item.label} (${item.status})`).join('; ')}. Test the item marked up-next next; do not repeat a tested item unless requested.`
    : '';
  const curriculum = selectKnowledge(role, round, difficulty);
  const curriculumContext = `CURRICULUM ANCHOR (${curriculum.label}): Focus this interview on ${curriculum.topic}. Use this primary prompt only if the topic has not yet been covered: "${curriculum.question}". ${curriculum.probes} After the candidate addresses it, move to a related adaptive follow-up instead of repeating it. Adapt everything to the candidate's resume and prior answers; do not quote the curriculum or mention its source to the candidate.`;

  return `You are a Principal Engineering Interviewer at a top tier technology company conducting a ${round} interview for a ${role} position.
  
Interview Depth: ${difficultyMap[difficulty] || 'intermediate'}
Round: ${round}
${frameworkInstructions}
${modeInstructions}
${coverageContext}
${curriculumContext}
${pressureInstructions}

MANDATORY ACTIVE-LISTENING INSTRUCTIONS:
1. REFLECTIVE GROUNDING: Never ask disconnected, canned questions. In your very first sentence, explicitly acknowledge what the candidate just stated by referencing one specific claim, tool, algorithm, or architectural pattern they mentioned. Do not invent details. Then ask a follow-up that tests the consequence, trade-off, or failure mode of that exact claim (e.g., "You proposed Redis with consistent hashing; how would you handle hot keys?").
2. ADDRESS CLARIFICATIONS: If the candidate asked a clarifying question (e.g. read/write ratio, scale, latency budget), answer it directly with realistic production figures before asking your follow-up.
3. ADAPTIVE PROBING:
   - If their answer was vague or brief (< 2 sentences), challenge them to provide concrete implementation specifics, data structures, or code.
   - If their answer was strong, probe edge cases: race conditions, failure recovery, memory limits, or distributed network partitions.
4. CADENCE: Ask ONE focused question at a time. Keep responses concise (2 to 4 sentences maximum).
5. Do NOT give final scores, pass/fail ratings, or break character during the interview.`;
}

// Public, attribution-only catalog for product UI and administration. Question prompts stay server-side.
router.get('/curriculum', (req, res) => {
  res.json({ success: true, tracks: publicCatalog() });
});

function buildCompetencyPlan(role, round) {
  const normalizedRound = (round || 'Technical').toLowerCase();
  if (normalizedRound.includes('behavioral') || normalizedRound.includes('hr')) return [
    ['story', 'Story structure & ownership'], ['impact', 'Measurable impact'], ['conflict', 'Stakeholder management'], ['reflection', 'Reflection & learning'],
  ].map(([id, label]) => ({ id, label }));
  if (normalizedRound.includes('coding')) return [
    ['clarify', 'Clarifying questions & constraints'], ['approach', 'Algorithm selection'], ['complexity', 'Time & space complexity'], ['edge-cases', 'Edge cases & testing'],
  ].map(([id, label]) => ({ id, label }));
  const roleFocus = /devops|sre/i.test(role) ? ['reliability', 'Reliability & observability'] : /product manager/i.test(role) ? ['product', 'Product trade-offs & metrics'] : /data|ml/i.test(role) ? ['data', 'Data quality & model evaluation'] : ['design', 'System design & assumptions'];
  return [['clarify', 'Clarifying questions & constraints'], roleFocus, ['trade-offs', 'Trade-offs & scaling'], ['resilience', 'Failure modes & resilience']].map(([id, label]) => ({ id, label }));
}

function deriveCoverage(plan = [], messages = []) {
  const answerCount = messages.filter(message => message.role === 'user').length;
  return plan.map((item, index) => ({ id: item.id, label: item.label, status: index < answerCount ? 'tested' : index === answerCount ? 'up-next' : 'remaining' }));
}

function buildRubricEvaluation({ userMessages, duration, tabSwitches, pasteEvents }) {
  const answers = userMessages.map(message => message.content || '');
  const allText = answers.join(' ');
  const tokens = allText.toLowerCase().match(/[\w-]+/g) || [];
  const answerCount = answers.length;
  const averageWords = answerCount ? Math.round(tokens.length / answerCount) : 0;
  const fillerWords = ['um', 'uh', 'like', 'so', 'basically', 'actually', 'literally', 'you know'];
  const fillerMap = Object.fromEntries(fillerWords.map(word => [word, 0]));
  userMessages.forEach(message => (message.fillerWords || []).forEach(word => {
    fillerMap[word] = (fillerMap[word] || 0) + 1;
  }));
  const fillerCount = Object.values(fillerMap).reduce((sum, count) => sum + count, 0);
  const hasNumbers = /\b\d+(?:\.\d+)?(?:%|ms|s|x|qps|rps|gb|mb)?\b/i.test(allText);
  const hasTradeoff = /\b(trade-?off|because|however|whereas|versus|instead|depends)\b/i.test(allText);
  const hasEdgeCase = /\b(edge case|failure|retry|race condition|fallback|limit|risk|error|partition)\b/i.test(allText);
  const hasStructure = /\b(first|second|then|finally|star|situation|task|action|result)\b/i.test(allText);
  const technicalTerms = ['cache', 'database', 'sql', 'nosql', 'index', 'latency', 'throughput', 'scale', 'distributed', 'queue', 'kafka', 'redis', 'async', 'thread', 'complexity', 'partition', 'api', 'microservices', 'concurrency', 'memory', 'heap', 'stack', 'model', 'cluster', 'kubernetes', 'docker'];
  const distinctTechnicalTerms = technicalTerms.filter(term => tokens.includes(term)).length;
  const paceWpm = Math.round(tokens.length / Math.max(0.5, duration / 60));
  const clamp = value => Math.max(0, Math.min(100, Math.round(value)));
  const rubric = {
    problemFraming: clamp(35 + (answerCount ? 20 : 0) + (hasStructure ? 20 : 0) + (averageWords >= 25 ? 15 : 0)),
    technicalDepth: clamp(30 + distinctTechnicalTerms * 7 + (hasTradeoff ? 15 : 0) + (hasEdgeCase ? 15 : 0)),
    evidenceAndImpact: clamp(25 + (hasNumbers ? 30 : 0) + (hasStructure ? 20 : 0) + (averageWords >= 20 ? 15 : 0)),
    communication: clamp(72 + (hasStructure ? 12 : 0) + (averageWords >= 15 && averageWords <= 120 ? 8 : -8) - fillerCount * 3),
  };
  const technicalAccuracy = clamp(rubric.technicalDepth * .7 + rubric.problemFraming * .3);
  const confidence = clamp(65 + (paceWpm >= 100 && paceWpm <= 170 ? 15 : 0) + (hasStructure ? 8 : 0) - fillerCount * 2);
  const overallScore = clamp(rubric.problemFraming * .20 + rubric.technicalDepth * .40 + rubric.evidenceAndImpact * .20 + rubric.communication * .20);
  const evidence = [];
  if (hasStructure) evidence.push('Used a recognizable answer structure.');
  if (hasTradeoff) evidence.push('Explained a decision or trade-off.');
  if (hasEdgeCase) evidence.push('Addressed a risk, limit, or failure case.');
  if (hasNumbers) evidence.push('Included measurable evidence or scale.');
  const improvements = [];
  if (!hasStructure) improvements.push('Start with a clear structure: assumptions, approach, trade-offs, and conclusion.');
  if (!hasTradeoff) improvements.push('Name at least one trade-off and why your chosen approach fits.');
  if (!hasEdgeCase) improvements.push('Close technical answers with an edge case, failure mode, or validation step.');
  if (!hasNumbers) improvements.push('Add a concrete metric, result, or scale estimate where it is truthful and useful.');
  return { rubric, technicalAccuracy, communication: rubric.communication, confidence, overallScore, fitScore: Number((overallScore / 10).toFixed(1)), answerQuality: clamp((rubric.problemFraming + rubric.technicalDepth) / 2), fillerMap, fillerCount, detectedFillerWords: Object.keys(fillerMap).filter(word => fillerMap[word]), paceWpm, totalWords: tokens.length, evidence, improvements, focusTelemetry: { tabSwitches, pasteEvents } };
}

function buildAnswerEvaluations(messages) {
  const stopWords = new Set(['about', 'after', 'also', 'and', 'are', 'based', 'been', 'between', 'could', 'does', 'explain', 'from', 'give', 'have', 'how', 'into', 'just', 'like', 'more', 'most', 'that', 'the', 'their', 'then', 'this', 'through', 'using', 'what', 'when', 'where', 'which', 'with', 'would', 'your']);
  const terms = text => [...new Set((text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || []).filter(word => !stopWords.has(word)))];
  const clamp = value => Math.max(0, Math.min(100, Math.round(value)));
  const evaluations = [];

  messages.forEach((message, index) => {
    if (message.role !== 'user') return;
    const previousQuestion = [...messages.slice(0, index)].reverse().find(item => item.role === 'assistant')?.content || 'Interview response';
    const nextFollowUp = messages.slice(index + 1).find(item => item.role === 'assistant')?.content || '';
    const answer = message.content || '';
    const questionTerms = terms(previousQuestion);
    const answerTerms = terms(answer);
    const matchedTerms = questionTerms.filter(term => answerTerms.includes(term));
    const hasReasoning = /\b(because|therefore|trade-?off|however|depends|instead)\b/i.test(answer);
    const hasRisk = /\b(failure|risk|retry|fallback|edge case|limit|monitor|test|validate)\b/i.test(answer);
    const hasConcreteDetail = /\b\d+(?:\.\d+)?(?:%|ms|s|x|qps|rps|gb|mb)?\b/i.test(answer) || /\b(redis|kafka|sql|nosql|cache|queue|index|lock|heap|docker|kubernetes)\b/i.test(answer);
    const relevance = questionTerms.length ? matchedTerms.length / questionTerms.length : 0.5;
    const score = clamp(30 + relevance * 35 + (hasReasoning ? 15 : 0) + (hasRisk ? 10 : 0) + (hasConcreteDetail ? 10 : 0));
    const strengths = [];
    const missedPoints = [];
    const evidence = [];
    if (matchedTerms.length) {
      strengths.push('Addressed the question directly.');
      evidence.push(`Connected to: ${matchedTerms.slice(0, 3).join(', ')}.`);
    } else missedPoints.push('Connect the opening of your answer directly to the question being asked.');
    if (hasReasoning) strengths.push('Explained reasoning or a trade-off.');
    else missedPoints.push('Explain why this approach is preferable, not only what you would do.');
    if (hasRisk) strengths.push('Considered a risk, validation, or failure mode.');
    else missedPoints.push('Add one edge case, risk, or validation step.');
    if (hasConcreteDetail) strengths.push('Used a concrete implementation detail or metric.');
    else missedPoints.push('Use a concrete technical detail or measurable outcome.');
    evaluations.push({ question: previousQuestion, answer, score, strengths, missedPoints, evidence, followUpQuestion: nextFollowUp });
  });
  return evaluations;
}

global.inMemorySessions = global.inMemorySessions || new Map();

function buildPersonalizedCoaching(answerEvaluations = []) {
  if (!answerEvaluations.length) {
    return {
      keepDoing: 'Complete a few more exchanges so the coach can identify reliable strengths.',
      fixNext: 'Give each answer a clear structure: approach, rationale, trade-off, and validation.',
      retryDrill: { question: '', instruction: 'Start another short practice session after answering at least one question.', target: 'One complete answer' },
    };
  }
  const ranked = [...answerEvaluations].sort((a, b) => b.score - a.score);
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const strongestWhy = strongest.strengths?.[0] || 'It was the most complete response in this session.';
  const weakestWhy = weakest.missedPoints?.[0] || 'It left the most room for a more direct and evidence-based answer.';
  return {
    keepDoing: `Keep doing this: ${strongestWhy}`,
    fixNext: `Fix this next: ${weakestWhy}`,
    strongestAnswer: { question: strongest.question, score: strongest.score, why: strongestWhy },
    weakestAnswer: { question: weakest.question, score: weakest.score, why: weakestWhy },
    retryDrill: {
      question: weakest.question,
      instruction: `${weakestWhy} Try again using: direct answer → rationale → trade-off or risk → concrete detail.`,
      target: 'Address the question directly, explain why, and include one risk or validation step.',
    },
  };
}

// POST /api/interview/start
router.post('/start', protect, async (req, res) => {
  try {
    const { role, difficulty, pressureMode, rounds, interviewMode, openingQuestion, retrySourceSessionId, companyFramework, resumeText } = req.body;
    const userRole = role || req.user.targetRole || 'SDE';
    const candidateResume = (typeof resumeText === 'string' && resumeText.trim()) ? resumeText.trim() : (req.user.resumeText || '');
    const selectedRound = (rounds || ['Technical'])[0];
    const selectedMode = interviewMode === 'practice' ? 'practice' : 'realistic';
    const competencyPlan = buildCompetencyPlan(userRole, selectedRound);
    const competencyCoverage = deriveCoverage(competencyPlan, []);
    const curriculum = selectKnowledge(userRole, selectedRound, difficulty || 'Medium');

    // Generate opening question
    const systemPrompt = buildInterviewerSystem(
      userRole,
      difficulty || 'Medium',
      pressureMode,
      candidateResume,
      selectedRound, selectedMode, competencyCoverage,
      companyFramework || ''
    );

    const generatedOpening = await callClaude([
      { role: 'user', content: 'Start the interview with a brief greeting and your first question.' }
    ], systemPrompt, 1000);
    const openingMsg = typeof openingQuestion === 'string' && openingQuestion.trim() ? openingQuestion.trim().slice(0, 2000) : generatedOpening;

    if (mongoose.connection.readyState === 1) {
      const session = await Session.create({
        user: req.user._id,
        role: userRole,
        difficulty: difficulty || 'Medium',
        pressureMode: !!pressureMode,
        interviewMode: selectedMode,
        companyFramework: companyFramework || '',
        resumeText: candidateResume,
        rounds: rounds || ['Technical', 'HR'],
        competencyPlan,
        competencyCoverage,
        retrySourceSessionId: mongoose.isValidObjectId(retrySourceSessionId) ? retrySourceSessionId : undefined,
        retrySourceQuestion: openingQuestion || undefined,
        messages: [{ role: 'assistant', content: openingMsg }],
        status: 'in-progress',
      });
      return res.json({ success: true, sessionId: session._id, message: openingMsg, competencyCoverage, curriculum: { id: curriculum.id, label: curriculum.label } });
    }

    // In-memory session fallback
    const sessId = 'sess_' + Date.now();
    const session = {
      _id: sessId,
      user: req.user._id,
      role: userRole,
      difficulty: difficulty || 'Medium',
      pressureMode: !!pressureMode,
      interviewMode: selectedMode,
      companyFramework: companyFramework || '',
      resumeText: candidateResume,
      rounds: rounds || ['Technical', 'HR'],
      competencyPlan,
      competencyCoverage,
      retrySourceSessionId: retrySourceSessionId || undefined,
      retrySourceQuestion: openingQuestion || undefined,
      messages: [{ role: 'assistant', content: openingMsg }],
      status: 'in-progress',
      createdAt: new Date(),
    };
    global.inMemorySessions.set(sessId, session);
    return res.json({ success: true, sessionId: sessId, message: openingMsg, competencyCoverage, curriculum: { id: curriculum.id, label: curriculum.label } });
  } catch (err) {
    console.error('Start interview error:', err);
    res.status(500).json({ error: err.message || 'Failed to start interview session.' });
  }
});

// POST /api/interview/message
router.post('/message', protect, async (req, res) => {
  try {
    const sessionId = req.body.sessionId;
    const content = req.body.content || req.body.message;
    if (!content?.trim()) return res.status(400).json({ error: 'Message cannot be empty.' });

    // Detect filler words
    const fillerWords = ['um', 'uh', 'like', 'so', 'basically', 'actually', 'literally', 'you know'];
    const cleanTokens = content.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
    const detected = fillerWords.filter(w => cleanTokens.includes(w));

    let session = null;
    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(sessionId)) {
      session = await Session.findOne({ _id: sessionId, user: req.user._id });
    }
    if (!session && global.inMemorySessions && global.inMemorySessions.has(sessionId)) {
      session = global.inMemorySessions.get(sessionId);
    }

    if (!session) {
      session = {
        _id: sessionId,
        user: req.user._id,
        role: req.body.role || 'SDE',
        difficulty: 'Medium',
        pressureMode: typeof req.body.pressureMode === 'boolean' ? req.body.pressureMode : false,
        interviewMode: req.body.interviewMode === 'practice' ? 'practice' : 'realistic',
        companyFramework: req.body.companyFramework || '',
        resumeText: req.body.resumeText || req.user.resumeText || '',
        competencyPlan: buildCompetencyPlan(req.body.role || 'SDE', 'Technical'),
        messages: [],
        status: 'in-progress'
      };
      if (global.inMemorySessions) global.inMemorySessions.set(sessionId, session);
    }

    session.messages.push({ role: 'user', content, fillerWords: detected, timestamp: new Date() });
    session.competencyCoverage = deriveCoverage(session.competencyPlan || buildCompetencyPlan(session.role || 'SDE', session.rounds?.[0]), session.messages);

    const claudeMsgs = session.messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const systemPrompt = buildInterviewerSystem(
      session.role || 'SDE',
      session.difficulty || 'Medium',
      session.pressureMode || false,
      session.resumeText || req.user.resumeText || '',
      session.rounds?.[0] || 'Technical',
      session.interviewMode || 'realistic',
      session.competencyCoverage,
      session.companyFramework || ''
    );

    const aiResponse = await callClaude(claudeMsgs, systemPrompt, 1000);

    session.messages.push({ role: 'assistant', content: aiResponse, timestamp: new Date() });
    if (session.save) await session.save();
    res.json({ success: true, message: aiResponse, fillerWords: detected, competencyCoverage: session.competencyCoverage, interviewMode: session.interviewMode || 'realistic' });
  } catch (err) {
    console.error('Message error:', err);
    res.status(500).json({ error: err.message || 'AI message processing failed.' });
  }
});

// GET /api/interview/status
router.get('/status', (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';
  res.json({
    success: true,
    hasKey,
    engine: hasKey ? 'Google Gemini 1.5 Flash' : 'Adaptive Curriculum Engine',
    model: hasKey ? 'gemini-1.5-flash' : 'adaptive-curriculum',
    description: hasKey ? 'Real-time multi-turn generative AI evaluation via Google Gemini' : 'Adaptive curriculum interview evaluation active'
  });
});

// POST /api/interview/end
router.post('/end', protect, async (req, res) => {
  try {
    const { sessionId, duration, tabSwitches = 0, pasteEvents = 0, messages: clientMessages } = req.body;

    let session = null;
    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(sessionId)) {
      session = await Session.findOne({ _id: sessionId, user: req.user._id });
    }
    if (!session && global.inMemorySessions && global.inMemorySessions.has(sessionId)) {
      session = global.inMemorySessions.get(sessionId);
    }

    if (!session) {
      session = {
        _id: sessionId || 'sess_' + Date.now(),
        user: req.user._id,
        role: req.body.role || 'SDE',
        difficulty: req.body.difficulty || 'Medium',
        pressureMode: typeof req.body.pressureMode === 'boolean' ? req.body.pressureMode : false,
        interviewMode: req.body.interviewMode || 'realistic',
        companyFramework: req.body.companyFramework || '',
        resumeText: req.body.resumeText || '',
        messages: [],
        status: 'completed'
      };
      if (global.inMemorySessions) global.inMemorySessions.set(session._id, session);
    }

    // Hydrate messages from client if session on backend had few/no messages
    if (Array.isArray(clientMessages) && clientMessages.length > 0) {
      if (!session.messages || session.messages.length <= 1) {
        session.messages = clientMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content || '',
          timestamp: m.timestamp || new Date()
        }));
      }
    }

    session.status = 'completed';
    session.duration = duration || 120;
    session.completedAt = new Date();

    // ─── Performance evaluation ───
    const userMessages = (session.messages || []).filter(m => m.role === 'user');
    const answerEvaluations = buildAnswerEvaluations(session.messages || []);
    const coaching = buildPersonalizedCoaching(answerEvaluations);
    if (session.retrySourceSessionId && mongoose.connection.readyState === 1 && mongoose.isValidObjectId(session.retrySourceSessionId)) {
      const source = await Session.findOne({ _id: session.retrySourceSessionId, user: req.user._id });
      const previousScore = source?.evaluation?.coaching?.weakestAnswer?.score;
      if (Number.isFinite(previousScore)) {
        coaching.retryComparison = { previousScore, newScore: 0, change: 0 };
      }
    }
    const allUserText = userMessages.map(m => m.content).join(' ');
    const rubricEvaluation = buildRubricEvaluation({ userMessages, duration: duration || 120, tabSwitches, pasteEvents });
    const totalWords = rubricEvaluation.totalWords;
    const wordCountPerAnswer = userMessages.length ? Math.round(totalWords / userMessages.length) : 0;

    // Real filler words tally
    const { fillerMap, fillerCount, detectedFillerWords } = rubricEvaluation;

    // Technical domain keyword parsing
    const techKeywords = ['cache', 'database', 'sql', 'nosql', 'index', 'latency', 'throughput', 'scale', 'distributed', 'queue', 'kafka', 'redis', 'async', 'thread', 'complexity', 'o(n)', 'partition', 'api', 'http', 'microservices', 'container', 'concurrency', 'deadlock', 'lock', 'memory', 'heap', 'stack', 'model', 'gradient', 'cluster', 'kubernetes', 'docker'];
    const wordsLower = allUserText.toLowerCase().split(/\W+/);
    const matchedKeywords = techKeywords.filter(k => wordsLower.includes(k));
    const { technicalAccuracy, communication, confidence, fitScore, overallScore, paceWpm } = rubricEvaluation;
    if (coaching.retryComparison) {
      coaching.retryComparison.newScore = overallScore;
      coaching.retryComparison.change = overallScore - coaching.retryComparison.previousScore;
    }

    const strengths = [];
    if (matchedKeywords.length > 0) strengths.push(`Explicitly referenced architecture primitives (${matchedKeywords.slice(0, 3).join(', ')})`);
    if (communication >= 75) strengths.push('Direct, structured articulation with crisp delivery');
    if (paceWpm >= 100 && paceWpm <= 170) strengths.push(`Controlled vocal cadence (${paceWpm} wpm)`);
    if (strengths.length === 0) strengths.push('Good composure and responsive answers');

    const weaknesses = [];
    if (fillerCount > 2) weaknesses.push(`Filler word density (${fillerCount} occurrences detected: ${detectedFillerWords.join(', ')})`);
    if (!rubricEvaluation.evidence.some(item => item.includes('trade-off'))) weaknesses.push('Answers could incorporate more specific system trade-offs');
    if (wordCountPerAnswer < 20) weaknesses.push('Answers were brief; elaborate further on edge cases and failure modes');
    if (weaknesses.length === 0) weaknesses.push('Deepen quantitative metric articulation (e.g. latency deltas)');

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
      rubric: rubricEvaluation.rubric,
      evidence: rubricEvaluation.evidence,
      answerEvaluations,
      coaching,
      answerQuality: rubricEvaluation.answerQuality,
      strengths,
      weaknesses,
      fillerWordCount: fillerCount,
      detectedFillerWords,
      fillerMap,
      paceWpm,
      totalWords,
      tabSwitches,
      pasteEvents,
      focusTelemetry: rubricEvaluation.focusTelemetry,
      improvementRoadmap: [
        ...rubricEvaluation.improvements.slice(0, 3),
        ...(weaknesses[0] ? [`Focus: ${weaknesses[0]}`] : [])
      ],
      feedback: `Session completed with ${userMessages.length} candidate exchanges over ${Math.floor((duration || 0)/60)}m ${Math.floor((duration || 0)%60)}s. Technical Rigor calibrated at ${technicalAccuracy}%, Communication at ${communication}%.`,
      trend: overallScore >= 75 ? 'positive' : 'stable'
    };

    session.evaluation = evaluation;

    // Persist to MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      if (session.save) {
        await session.save();
      } else {
        const dbSession = new Session({
          user: req.user._id,
          role: session.role || req.body.role || 'SDE',
          difficulty: session.difficulty || req.body.difficulty || 'Medium',
          pressureMode: !!session.pressureMode,
          interviewMode: session.interviewMode || 'realistic',
          companyFramework: session.companyFramework || '',
          resumeText: session.resumeText || '',
          messages: session.messages || [],
          evaluation: evaluation,
          status: 'completed',
          duration: session.duration || duration || 120,
          completedAt: session.completedAt || new Date()
        });
        await dbSession.save();
        if (global.inMemorySessions) {
          if (sessionId) global.inMemorySessions.set(sessionId, dbSession);
          global.inMemorySessions.set(dbSession._id.toString(), dbSession);
        }
        session = dbSession;
      }
    }

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
    let sessions = [];
    if (mongoose.connection.readyState === 1) {
      sessions = await Session.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('-messages -codeSubmissions');
    }

    // In-memory sessions
    if (global.inMemorySessions) {
      for (const s of global.inMemorySessions.values()) {
        if (s.user?.toString() === req.user._id?.toString() && (s.status === 'completed' || s.evaluation)) {
          if (!sessions.some(existing => existing._id?.toString() === s._id?.toString())) {
            sessions.push(s);
          }
        }
      }
    }
    sessions.sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
    res.json({ success: true, sessions: sessions.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions.' });
  }
});

// GET /api/interview/sessions/:id
router.get('/sessions/:id', protect, async (req, res) => {
  try {
    const id = req.params.id;
    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(id)) {
      const session = await Session.findOne({ _id: id, user: req.user._id });
      if (session) return res.json({ success: true, session });
    }

    if (global.inMemorySessions && global.inMemorySessions.has(id)) {
      const s = global.inMemorySessions.get(id);
      return res.json({ success: true, session: s });
    }

    res.status(404).json({ error: 'Session not found.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session.' });
  }
});

// POST /api/interview/focus-events
router.post('/focus-events', protect, async (req, res) => {
  try {
    const { sessionId, event } = req.body; // event: 'tab-switch' | 'paste'
    const update = {};
    if (event === 'tab-switch') update['focusTelemetry.tabSwitches'] = 1;
    if (event === 'paste') update['focusTelemetry.pasteEvents'] = 1;

    await Session.findOneAndUpdate(
      { _id: sessionId, user: req.user._id },
      { $inc: update }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Focus telemetry logging failed.' });
  }
});

module.exports = router;
