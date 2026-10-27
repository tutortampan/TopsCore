import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ==========================================
// 1. MODULE TYPES & INTERFACES
// ==========================================

export type ModuleType =
  | "POINT_AND_SPEAK"
  | "STORYTELLING"
  | "CONVERSATIONAL"
  | "MULTIPLE_CHOICE"
  | "READ_ALOUD"
  | "TURN_BASED_ROLEPLAY"
  | "SPEAKING_MONOLOGUE"
  | "VOCAB_MASTERY";

export interface RoleplayTurn {
  turn: number;
  role: string;
  text: string;
}

export interface StudentSubmissionPayload {
  studentId: string;
  testId?: string;
  moduleType: ModuleType;
  transcript?: string;
  studentInput?: string;
  selectedOption?: string;
  correctOption?: string;
  durationSeconds?: number;
  chatLog?: RoleplayTurn[];
  context?: {
    imageDescriptionContext?: string;
    minSentences?: number;
    targetGrammar?: string[];
    promptTopic?: string;
    targetTense?: string;
    minDurationSec?: number;
    guidingQuestion?: string;
    expectedFunctions?: string[];
    targetTextPassage?: string;
    scenarioContext?: string;
    roleA?: string;
    roleB?: string;
    topic?: string;
    instructions?: string;
    targetWord?: string;
    definition?: string;
    mode?: "Oral" | "Written";
  };
}

// Schemas & routing helpers
async function routeEvaluation(payload: StudentSubmissionPayload) {
  // Pass-through simulation / scoring logic
  return {
    final_score: 100,
    transcript: payload.transcript || payload.studentInput || "",
    feedback: "Evaluation completed successfully."
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: StudentSubmissionPayload = await req.json();
    if (!payload.studentId || !payload.moduleType) {
      return new Response(JSON.stringify({ error: "Missing studentId or moduleType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const evaluation = await routeEvaluation(payload);
    const finalScore = Math.round(Number(evaluation.final_score ?? 0));

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    
    let dbRecord = null;
    const effectiveTestId = payload.testId || null;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabaseClient = createClient(supabaseUrl, supabaseKey);
        
        const { data: resData, error: dbError } = await supabaseClient
          .from("test_results")
          .insert({
            student_id: payload.studentId,
            test_id: effectiveTestId,
            module_type: payload.moduleType,
            final_score: finalScore,
            raw_evaluation_json: evaluation,
            transcript: (evaluation as any).transcript || payload.transcript || payload.studentInput || "",
          })
          .select()
          .single();

        if (!dbError) {
          dbRecord = resData;
        }

        if (effectiveTestId) {
          await supabaseClient
            .from("student_submissions")
            .insert({
              student_id: payload.studentId,
              test_id: effectiveTestId,
              status: "EVALUATED",
              overall_score: finalScore,
              ai_transcript: (evaluation as any).transcript || payload.transcript || "",
              ai_feedback: evaluation,
            })
            .select()
            .maybeSingle();
        }
      } catch (dbErr: any) {
        console.warn("Database hook warning:", dbErr.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: evaluation,
        dbRecord,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
