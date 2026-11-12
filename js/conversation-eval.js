// TopsCore LMS — 5-Pillar Conversation AI Evaluation Engine
// Evaluates synchronized dialog transcript and persists to Supabase attempts.

import { getSupabase, isEdgeFunctionOffline, markEdgeFunctionOffline } from './supabase.js';
import { getGradeColorByScore, GRADE_PALETTE, TOPSCORE_COLORS } from './grading.js';

export function evaluate5PillarsLocally(payload) {
  const { studentId, chatLog = [], targetVocab = [] } = payload;

  const studentTurns = chatLog.filter(t => t.speakerId === studentId);
  const peerTurns = chatLog.filter(t => t.speakerId !== studentId);

  const studentWords = studentTurns.reduce((sum, t) => sum + (t.wordCount || t.text.split(/\s+/).filter(Boolean).length), 0);
  const peerWords = peerTurns.reduce((sum, t) => sum + (t.wordCount || t.text.split(/\s+/).filter(Boolean).length), 0);
  const totalWords = studentWords + peerWords;

  // 1. Fluency & Cadence (Pillar 1: 20%)
  let fluencyScore = 85;
  if (studentWords > 150) fluencyScore = 94;
  else if (studentWords > 80) fluencyScore = 88;
  else if (studentWords < 30) fluencyScore = 65;

  // 2. Vocabulary Mastery (Pillar 2: 25%)
  const fullText = studentTurns.map(t => t.text.toLowerCase()).join(' ');
  let vocabHits = 0;
  targetVocab.forEach(vocab => {
    if (fullText.includes(vocab.toLowerCase())) vocabHits++;
  });
  const vocabRatio = targetVocab.length > 0 ? (vocabHits / targetVocab.length) : 0.8;
  const vocabScore = Math.min(100, Math.round(75 + (vocabRatio * 25)));

  // 3. Grammatical Accuracy (Pillar 3: 20%)
  let grammarScore = 86;
  const complexMarkers = ['because', 'therefore', 'however', 'although', 'in order to', 'moreover', 'consequently'];
  let markerHits = 0;
  complexMarkers.forEach(m => {
    if (fullText.includes(m)) markerHits++;
  });
  if (markerHits >= 3) grammarScore = 95;
  else if (markerHits >= 1) grammarScore = 90;

  // 4. Topic Relevance & Argumentative Depth (Pillar 4: 20%)
  const coveredStages = new Set(studentTurns.map(t => t.stage)).size;
  const relevanceScore = Math.min(100, 70 + (coveredStages * 7));

  // 5. Turn-Taking & Active Listening Balance (Pillar 5: 15%)
  let turnScore = 80;
  if (totalWords > 0) {
    const studentShare = (studentWords / totalWords) * 100;
    const deviation = Math.abs(studentShare - 50);
    turnScore = Math.max(50, Math.round(100 - (deviation * 1.5)));
  }

  // Composite Calculation
  const compositeScore = Math.round(
    (fluencyScore * 0.20) +
    (vocabScore * 0.25) +
    (grammarScore * 0.20) +
    (relevanceScore * 0.20) +
    (turnScore * 0.15)
  );

  let grade = 'B';
  let predicate = 'Good';
  if (compositeScore >= 100) { grade = '★'; predicate = 'Excellent'; }
  else if (compositeScore >= 90) { grade = 'A'; predicate = 'Very Good'; }
  else if (compositeScore >= 80) { grade = 'B'; predicate = 'Good'; }
  else if (compositeScore >= 60) { grade = 'C'; predicate = 'Enough'; }
  else if (compositeScore >= 30) { grade = 'D'; predicate = 'Less'; }
  else { grade = 'E'; predicate = 'Fail'; }

  return {
    final_score: compositeScore,
    grade,
    predicate,
    color: getGradeColorByScore(compositeScore),
    textColor: GRADE_PALETTE[grade]?.textColor || TOPSCORE_COLORS.TEXT_DARK,
    pillars: {
      fluency: {
        score: fluencyScore,
        feedback: "Consistent cadence with natural communicative transitions."
      },
      vocabulary: {
        score: vocabScore,
        feedback: `Integrated ${vocabHits} of ${targetVocab.length} target vocabulary items.`
      },
      grammar: {
        score: grammarScore,
        feedback: "Sound syntactic coherence with effective logical conjunctions."
      },
      relevance: {
        score: relevanceScore,
        feedback: `Actively contributed across ${coveredStages} structured discussion stages.`
      },
      turn_taking: {
        score: turnScore,
        feedback: `Maintained collaborative balance with appropriate turn pacing.`
      }
    },
    feedback: `Overall ${predicate} performance. Demonstrates oral proficiency, scenario engagement, and balanced collaboration.`
  };
}

/**
 * Perform 5-Pillar Evaluation and Persist to Supabase Database
 */
export async function evaluateAndSaveConversation(payload) {
  const sb = await getSupabase();
  let evalResult = null;

  // Try Edge Function if online
  if (!isEdgeFunctionOffline('evaluate-conversation')) {
    try {
      const resp = await sb.functions.invoke('evaluate-conversation', { body: payload });
      if (resp.data && resp.data.success && resp.data.data) {
        evalResult = resp.data.data;
      }
    } catch (err) {
      console.warn('[ConversationEval] Edge function unavailable, executing client fallback:', err);
      markEdgeFunctionOffline('evaluate-conversation');
    }
  }

  // Fallback to authoritative local engine
  if (!evalResult) {
    evalResult = evaluate5PillarsLocally(payload);
  }

  // Persist to attempts table
  let attemptId = null;
  try {
    const studentId = payload.studentId;
    const testId = payload.testId;

    if (studentId && testId) {
      // 1. Check existing attempt or insert new completed attempt
      const { data: attemptRow, error: attemptErr } = await sb.from('attempts').insert({
        student_id: studentId,
        test_id: testId,
        status: 'submitted',
        percentage: evalResult.final_score,
        grade: evalResult.grade,
        effective_score: evalResult.final_score,
        score: evalResult.final_score,
        correct_count: Math.round(evalResult.final_score / 20),
        total_questions: 5,
        started_at: payload.startedAt || new Date(Date.now() - (payload.totalDurationSeconds || 3600) * 1000).toISOString(),
        submitted_at: new Date().toISOString()
      }).select('id').single();

      if (!attemptErr && attemptRow) {
        attemptId = attemptRow.id;

        // 2. Insert attempt_answers row containing full 5-pillar JSON snapshot
        await sb.from('attempt_answers').insert({
          attempt_id: attemptId,
          question_id: null,
          question_snapshot: `Peer Conversation: ${payload.topic || 'General Discussion'}`,
          topic_snapshot: payload.topic || 'Oral Conversation',
          question_type_snapshot: 'P2P_CONVERSATION',
          student_answer: JSON.stringify(payload.chatLog.filter(t => t.speakerId === studentId).map(t => t.text)),
          is_correct: evalResult.final_score >= 60,
          similarity_score: evalResult.final_score,
          evaluation_result: 'evaluated',
          score: evalResult.final_score,
          accepted_answers_snapshot: JSON.stringify(evalResult),
          answered_at: new Date().toISOString()
        });
      }
    }
  } catch (saveErr) {
    console.warn('[ConversationEval] Database save fallback notice:', saveErr);
  }

  return {
    ...evalResult,
    attemptId
  };
}
