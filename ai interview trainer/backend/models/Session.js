const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  fillerWords: [String],
  sentiment: String,
});

const evaluationSchema = new mongoose.Schema({
  technicalAccuracy: { type: Number, min: 0, max: 100 },
  communication: { type: Number, min: 0, max: 100 },
  confidence: { type: Number, min: 0, max: 100 },
  overallScore: { type: Number, min: 0, max: 100 },
  fitScore: { type: Number, min: 0, max: 10 },
  answerQuality: { type: Number, min: 0, max: 100 },
  breakdown: {
    technicalAccuracy: Number,
    communication: Number,
    confidence: Number,
    cultureFit: Number,
  },
  rubric: {
    problemFraming: { type: Number, min: 0, max: 100 },
    technicalDepth: { type: Number, min: 0, max: 100 },
    evidenceAndImpact: { type: Number, min: 0, max: 100 },
    communication: { type: Number, min: 0, max: 100 },
  },
  evidence: [String],
  coaching: {
    keepDoing: String,
    fixNext: String,
    strongestAnswer: { question: String, score: Number, why: String },
    weakestAnswer: { question: String, score: Number, why: String },
    retryDrill: { question: String, instruction: String, target: String },
    retryComparison: { previousScore: Number, newScore: Number, change: Number },
  },
  answerEvaluations: [{
    question: String,
    answer: String,
    score: { type: Number, min: 0, max: 100 },
    strengths: [String],
    missedPoints: [String],
    evidence: [String],
    followUpQuestion: String,
  }],
  strengths: [String],
  weaknesses: [String],
  fillerWordCount: { type: Number, default: 0 },
  detectedFillerWords: [String],
  fillerMap: { type: Map, of: Number, default: {} },
  paceWpm: Number,
  totalWords: Number,
  tabSwitches: { type: Number, default: 0 },
  pasteEvents: { type: Number, default: 0 },
  focusTelemetry: {
    tabSwitches: { type: Number, default: 0 },
    pasteEvents: { type: Number, default: 0 },
  },
  improvementRoadmap: [String],
  feedback: String,
  trend: String,
  completedAt: { type: Date, default: Date.now },
});

const sessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  pressureMode: { type: Boolean, default: false },
  interviewMode: { type: String, enum: ['practice', 'realistic'], default: 'realistic' },
  companyFramework: { type: String, default: '' },
  resumeText: { type: String, default: '' },
  rounds: [{ type: String }], // e.g. ['Technical', 'HR']
  competencyPlan: [{ id: String, label: String }],
  competencyCoverage: [{ id: String, label: String, status: { type: String, enum: ['up-next', 'tested', 'remaining'] } }],
  retrySourceSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  retrySourceQuestion: String,
  messages: [messageSchema],
  codeSubmissions: [{
    language: String,
    code: String,
    question: String,
    aiReview: String,
    submittedAt: { type: Date, default: Date.now },
  }],
  evaluation: evaluationSchema,
  status: { type: String, enum: ['in-progress', 'completed', 'abandoned'], default: 'in-progress' },
  duration: { type: Number, default: 0 }, // seconds
  // Practice telemetry is informational only. It must never be used to infer
  // dishonesty: accessibility tools, note taking, and mobile interruptions can
  // all produce these events.
  focusTelemetry: {
    tabSwitches: { type: Number, default: 0 },
    pasteEvents: { type: Number, default: 0 },
  },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
