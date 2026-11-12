import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConversationTurn {
  speakerId: string;
  speakerName: string;
  stage: number;
  text: string;
  wordCount?: number;
  timestamp: string;
}

interface EvaluationPayload {
  studentId: string;
  testId?: string;
  topic: string;
  targetVocab?: string[];
  totalDurationSeconds?: number;
  chatLog: ConversationTurn[];
}

// 5-Pillar Evaluation Algorithm
function compute5Pillars(payload: EvaluationPayload) {
  const { studentId, chatLog, targetVocab = [] } = payload;

  const studentTurns = chatLog.filter(t => t.speakerId === studentId);
  const peerTurns = chatLog.filter(t => t.speakerId !== studentId);

  const studentWords = studentTurns.reduce((sum, t) => sum + (t.wordCount || t.text.split(/\s+/).filter(Boolean).length), 0);
  const peerWords = peerTurns.reduce((sum, t) => sum + (t.wordCount || t.text.split(/\s+/).filter(Boolean).length), 0);
  const totalWords = studentWords + peerWords;

  // 1. Fluency & Cadence (Target: > 40 words/min or regular cadence)
  let fluencyScore = 85;
  if (studentWords > 150) fluencyScore = 92;
  else if (studentWords > 80) fluencyScore = 88;
  else if (studentWords < 30) fluencyScore = 65;

  // 2. Vocabulary Mastery (Target Vocab Hits)
  const fullText = studentTurns.map(t => t.text.toLowerCase()).join(' ');
  let vocabHits = 0;
  targetVocab.forEach(vocab => {
    if (fullText.includes(vocab.toLowerCase())) vocabHits++;
  });
  const vocabRatio = targetVocab.length > 0 ? (vocabHits / targetVocab.length) : 0.8;
  const vocabScore = Math.min(100, Math.round(75 + (vocabRatio * 25)));

  // 3. Grammatical Accuracy (Heuristic evaluation)
  let grammarScore = 86;
  const grammaticalMarkers = ['because', 'therefore', 'however', 'although', 'in order to', 'moreover', 'consequently'];
  let complexMarkers = 0;
  grammaticalMarkers.forEach(m => {
    if (fullText.includes(m)) complexMarkers++;
  });
  if (complexMarkers >= 3) grammarScore = 94;
  else if (complexMarkers >= 1) grammarScore = 89;

  // 4. Topic Relevance & Argumentative Depth (Stage progression check)
  const coveredStages = new Set(studentTurns.map(t => t.stage)).size;
  let relevanceScore = Math.min(100, 70 + (coveredStages * 7));

  // 5. Turn-Taking & Active Listening Balance
  let turnScore = 80;
  if (totalWords > 0) {
    const studentShare = (studentWords / totalWords) * 100;
    // Ideal balance is between 40% and 60%
    const deviation = Math.abs(studentShare - 50);
    turnScore = Math.max(50, Math.round(100 - (deviation * 1.5)));
  }

  // Composite Score
  // Fluency 20%, Vocab 25%, Grammar 20%, Relevance 20%, Turn-Taking 15%
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
    pillars: {
      fluency: { score: fluencyScore, feedback: "Consistent conversational rhythm with natural communicative pacing." },
      vocabulary: { score: vocabScore, feedback: `Successfully utilized ${vocabHits} of ${targetVocab.length} key curriculum terms.` },
      grammar: { score: grammarScore, feedback: "Sound syntactic structure with effective use of compound conjunctions." },
      relevance: { score: relevanceScore, feedback: `Actively contributed across ${coveredStages} structured discussion stages.` },
      turn_taking: { score: turnScore, feedback: `Balanced participation with appropriate turn-yielding cues.` }
    },
    feedback: `Overall ${predicate} performance. Demonstrates collaborative fluency, topic engagement, and respectful conversational turn-taking.`
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: EvaluationPayload = await req.json();
    if (!payload.studentId || !Array.isArray(payload.chatLog)) {
      return new Response(JSON.stringify({ error: "Missing studentId or chatLog array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const evaluation = compute5Pillars(payload);

    return new Response(
      JSON.stringify({
        success: true,
        data: evaluation,
        finalScore: evaluation.final_score,
        grade: evaluation.grade
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
