const express = require('express');
const router = express.Router();

// Mock Gold Calibration Dataset benchmark cases
const CALIBRATION_DATASET = [
  {
    id: 'GOLD-SDE-01',
    role: 'SDE',
    archetype: 'Staff Distributed Systems Architect',
    framework: 'Google System Design',
    goldenScore: 94,
    actualScore: 93,
    confidence: 'High',
    testedAt: '2026-09-07T14:20:00Z',
    status: 'OPTIMAL_ALIGNMENT',
    notes: 'Flawless distributed Raft consensus formulation and sub-20ms P99 storage partition strategy.',
    rubricWeights: { framing: 38, technical: 39, evidence: 18, communication: 18 }
  },
  {
    id: 'GOLD-SDE-02',
    role: 'SDE',
    archetype: 'Mid-Level Full Stack Engineer',
    framework: 'Amazon Leadership',
    goldenScore: 78,
    actualScore: 76,
    confidence: 'High',
    testedAt: '2026-09-07T14:35:00Z',
    status: 'OPTIMAL_ALIGNMENT',
    notes: 'Good STAR framing on customer obsession; slightly shallow on MySQL row-lock contention trade-offs.',
    rubricWeights: { framing: 30, technical: 28, evidence: 19, communication: 19 }
  },
  {
    id: 'GOLD-SDE-03',
    role: 'SDE',
    archetype: 'Junior Backend Developer',
    framework: 'General Industry Standard',
    goldenScore: 54,
    actualScore: 56,
    confidence: 'High',
    testedAt: '2026-09-07T15:10:00Z',
    status: 'WITHIN_TOLERANCE',
    notes: 'Vague answers on cache invalidation; model successfully probed edge cases and scored appropriately.',
    rubricWeights: { framing: 20, technical: 21, evidence: 15, communication: 18 }
  },
  {
    id: 'GOLD-ML-01',
    role: 'Data Science',
    archetype: 'Principal AI / Applied Scientist',
    framework: 'Google System Design',
    goldenScore: 91,
    actualScore: 89,
    confidence: 'High',
    testedAt: '2026-09-07T15:40:00Z',
    status: 'OPTIMAL_ALIGNMENT',
    notes: 'Exceptional vector quantization (HNSW / ScaNN) design and mathematical rigor on loss convergence.',
    rubricWeights: { framing: 35, technical: 36, evidence: 19, communication: 19 }
  },
  {
    id: 'GOLD-ML-02',
    role: 'Data Science',
    archetype: 'Computer Vision & LLM Specialist',
    framework: 'Amazon Leadership',
    goldenScore: 82,
    actualScore: 85,
    confidence: 'Medium',
    testedAt: '2026-09-07T16:15:00Z',
    status: 'WITHIN_TOLERANCE',
    notes: 'A/B sample size formulation had minor statistical variance (+3 pts), overall within boundary.',
    rubricWeights: { framing: 32, technical: 34, evidence: 19, communication: 17 }
  },
  {
    id: 'GOLD-ML-03',
    role: 'Data Science',
    archetype: 'Junior Data Analyst Transitioning to ML',
    framework: 'General Industry Standard',
    goldenScore: 48,
    actualScore: 50,
    confidence: 'High',
    testedAt: '2026-09-07T16:50:00Z',
    status: 'OPTIMAL_ALIGNMENT',
    notes: 'Confused L1 vs L2 regularization impact; AI accurately flagged lack of gradient descent depth.',
    rubricWeights: { framing: 18, technical: 18, evidence: 14, communication: 18 }
  },
  {
    id: 'GOLD-OPS-01',
    role: 'DevOps',
    archetype: 'Lead SRE & Chaos Engineer',
    framework: 'Netflix Chaos Architecture',
    goldenScore: 96,
    actualScore: 95,
    confidence: 'High',
    testedAt: '2026-09-07T17:20:00Z',
    status: 'OPTIMAL_ALIGNMENT',
    notes: 'Superb regional evacuation drill modeling, Kafka partition rebalancing, and canary analysis.',
    rubricWeights: { framing: 38, technical: 39, evidence: 18, communication: 20 }
  },
  {
    id: 'GOLD-OPS-02',
    role: 'DevOps',
    archetype: 'Cloud Infrastructure Administrator',
    framework: 'General Industry Standard',
    goldenScore: 68,
    actualScore: 65,
    confidence: 'Medium',
    testedAt: '2026-09-07T17:55:00Z',
    status: 'WITHIN_TOLERANCE',
    notes: 'Strong Terraform knowledge; weaker on Kubernetes control-plane split-brain scenarios.',
    rubricWeights: { framing: 26, technical: 24, evidence: 16, communication: 15 }
  },
  {
    id: 'GOLD-PM-01',
    role: 'PM',
    archetype: 'Senior Technical Product Manager',
    framework: 'Amazon Leadership',
    goldenScore: 88,
    actualScore: 87,
    confidence: 'High',
    testedAt: '2026-09-07T18:30:00Z',
    status: 'OPTIMAL_ALIGNMENT',
    notes: 'Rigorous PR/FAQ structure, customer obsession backwards planning, and clear 2-way door decisions.',
    rubricWeights: { framing: 34, technical: 35, evidence: 19, communication: 19 }
  },
  {
    id: 'GOLD-PM-02',
    role: 'PM',
    archetype: 'Growth & Viral Loops PM',
    framework: 'Meta Fast Execution',
    goldenScore: 72,
    actualScore: 68,
    confidence: 'Low',
    testedAt: '2026-09-07T19:05:00Z',
    status: 'REVIEW_TRIGGERED',
    notes: 'Candidate gave very short answers on technical feasibility; score delta (-4 pts) triggered audit.',
    rubricWeights: { framing: 28, technical: 22, evidence: 18, communication: 16 }
  }
];

// Mock Flagged Transcripts for Admin Review
const FLAGGED_TRANSCRIPTS = [
  {
    sessionId: 'sess_flag_901',
    candidateAlias: 'Candidate #4102',
    role: 'SDE',
    framework: 'Google System Design',
    flagReason: 'HIGH_TAB_SWITCHES_DETECTED',
    flagSeverity: 'HIGH',
    confidence: 'Low',
    actualScore: 62,
    expectedScore: 84,
    tabSwitches: 16,
    pasteEvents: 9,
    timestamp: '2026-09-07T18:14:22Z',
    flagSummary: 'Candidate logged 16 rapid tab blur/focus cycles during the Raft distributed consensus follow-up.',
    sampleSnippet: 'Candidate: "To guarantee consensus under network partitions, Paxos uses two phases... [PASTE_EVENT 1,240 chars in 80ms] ...with phase 2a accept requests broadcast across all remaining quorums."',
    status: 'PENDING_AUDIT'
  },
  {
    sessionId: 'sess_flag_902',
    candidateAlias: 'Candidate #5291',
    role: 'DevOps',
    framework: 'Netflix Chaos Architecture',
    flagReason: 'EXTREME_BREVITY_ANOMALY',
    flagSeverity: 'MEDIUM',
    confidence: 'Low',
    actualScore: 41,
    expectedScore: 65,
    tabSwitches: 0,
    pasteEvents: 0,
    timestamp: '2026-09-07T19:42:10Z',
    flagSummary: 'Single-phrase responses across 4 consecutive architectural probes (< 5 words average).',
    sampleSnippet: 'Interviewer: "How does your consumer group handle poison pill messages?" — Candidate: "Dead letter queue." (Total words: 3)',
    status: 'PENDING_AUDIT'
  },
  {
    sessionId: 'sess_flag_903',
    candidateAlias: 'Candidate #6844',
    role: 'Data Science',
    framework: 'Amazon Leadership',
    flagReason: 'SCORE_VARIANCE_ANOMALY',
    flagSeverity: 'MEDIUM',
    confidence: 'Medium',
    actualScore: 88,
    expectedScore: 71,
    tabSwitches: 2,
    pasteEvents: 1,
    timestamp: '2026-09-07T20:18:45Z',
    flagSummary: 'High keyword density with minimal causal reasoning generated high technical subscore.',
    sampleSnippet: 'Candidate: "We leveraged BERT, RoBERTa, PyTorch, CUDA, embeddings, cosine distance, vector search, AWS SageMaker and Docker to optimize customer conversion."',
    status: 'UNDER_INVESTIGATION'
  },
  {
    sessionId: 'sess_flag_904',
    candidateAlias: 'Candidate #7730',
    role: 'PM',
    framework: 'Meta Fast Execution',
    flagReason: 'TELEMETRY_DISCONNECT_RECONNECT',
    flagSeverity: 'LOW',
    confidence: 'Medium',
    actualScore: 74,
    expectedScore: 77,
    tabSwitches: 4,
    pasteEvents: 0,
    timestamp: '2026-09-07T21:05:30Z',
    flagSummary: 'WebSocket session interrupted during audio stream for 18 seconds; candidate resumed cleanly.',
    sampleSnippet: 'Candidate: "The North Star metric was 7-day rolling retention... [RECONNECT] ...with counter-metrics measuring uninstalls."',
    status: 'AUDITED_RESOLVED'
  }
];

// GET /api/admin/calibration
router.get('/calibration', async (req, res) => {
  try {
    const deltas = CALIBRATION_DATASET.map(c => Math.abs(c.actualScore - c.goldenScore));
    const mae = Number((deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(2));
    const withinTolerance = CALIBRATION_DATASET.filter(c => Math.abs(c.actualScore - c.goldenScore) <= 4).length;
    const consistencyIndex = Number(((withinTolerance / CALIBRATION_DATASET.length) * 100).toFixed(1));

    const confCounts = { High: 0, Medium: 0, Low: 0 };
    CALIBRATION_DATASET.forEach(c => {
      if (confCounts[c.confidence] !== undefined) confCounts[c.confidence]++;
    });

    res.json({
      success: true,
      engine: 'Sixth Bit Neural Model HR-1',
      version: 'v4.2.0-specialization',
      lastCalibration: new Date().toISOString(),
      kpis: {
        mae,
        maeTarget: '< 3.0 pts',
        consistencyIndex,
        consistencyTarget: '> 95.0%',
        totalGoldCases: CALIBRATION_DATASET.length,
        driftStatus: mae < 2.5 ? 'NOMINAL // ZERO_DRIFT' : 'EVALUATION_WARNED',
        flaggedRate: '2.8%',
        p99LatencyMs: 1120
      },
      confidenceDistribution: {
        highPct: Math.round((confCounts.High / CALIBRATION_DATASET.length) * 100),
        medPct: Math.round((confCounts.Medium / CALIBRATION_DATASET.length) * 100),
        lowPct: Math.round((confCounts.Low / CALIBRATION_DATASET.length) * 100)
      },
      calibrationDataset: CALIBRATION_DATASET.map(c => ({
        ...c,
        delta: Number((c.actualScore - c.goldenScore).toFixed(1)),
        deltaPct: Number((((c.actualScore - c.goldenScore) / c.goldenScore) * 100).toFixed(1))
      })),
      flaggedTranscripts: FLAGGED_TRANSCRIPTS
    });
  } catch (err) {
    console.error('Admin calibration error:', err);
    res.status(500).json({ error: 'Failed to retrieve calibration analytics.' });
  }
});

// POST /api/admin/flag-review
router.post('/flag-review', (req, res) => {
  const { sessionId, resolution, notes } = req.body;
  const item = FLAGGED_TRANSCRIPTS.find(t => t.sessionId === sessionId);
  if (item) {
    item.status = resolution || 'AUDITED_RESOLVED';
    item.adminNotes = notes || 'Reviewed by Quality Control team.';
    return res.json({ success: true, message: `Session ${sessionId} marked as ${item.status}.`, item });
  }
  res.json({ success: true, message: `Action recorded for session ${sessionId}.` });
});

// POST /api/admin/recalibrate
router.post('/recalibrate', (req, res) => {
  res.json({
    success: true,
    message: 'Recalibration run dispatched against all Gold benchmarks. Tolerance checks nominal.',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
