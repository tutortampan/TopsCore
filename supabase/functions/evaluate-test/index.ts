import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ==========================================
// 1. MODULE TYPES & INTERFACES (SSOT §2.11)
// Class-Bound Module Isolation Invariant
// ==========================================

export type CanonicalModuleType =
  // Vocabulary Mastery Modules (Eksklusif Kelas Vocabulary)
  | "RECOGNITION"
  | "SPOKEN"
  | "WRITTEN"
  // Modul Khusus Kelas Lainnya
  | "DESCRIPTION"   // Basic English (Visual Context)
  | "SPEECH"        // Public Speaking (5-Pillar Assessment)
  | "MONOLOGUE"     // Storytelling (Narrative Speech)
  | "DIALOGUE"      // Conversation (Roleplay & Pair Live Room)
  | "INTERVIEW";    // Guided Sequential Q&A

export type LegacyModuleType =
  | "POINT_AND_SPEAK"
  | "STORYTELLING"
  | "CONVERSATIONAL"
  | "MULTIPLE_CHOICE"
  | "READ_ALOUD"
  | "TURN_BASED_ROLEPLAY"
  | "SPEAKING_MONOLOGUE"
  | "VOCAB_MASTERY";

export type ModuleType = CanonicalModuleType | LegacyModuleType;

export const MODULE_CLASS_BINDINGS: Record<CanonicalModuleType, string> = {
  RECOGNITION: "VOCABULARY",
  SPOKEN: "VOCABULARY",
  WRITTEN: "VOCABULARY",
  DESCRIPTION: "BASIC",
  SPEECH: "SPEAKING",
  MONOLOGUE: "STORYTELLING",
  DIALOGUE: "CONVERSATION",
  INTERVIEW: "INTERVIEW",
};

export function normalizeModuleType(raw: string): CanonicalModuleType {
  const norm = (raw || "").toUpperCase().replace(/[\s-]/g, "_");
  if (norm === "POINT_AND_SPEAK") return "DESCRIPTION";
  if (norm === "STORYTELLING" || norm === "SPEAKING_MONOLOGUE") return "MONOLOGUE";
  if (norm === "CONVERSATIONAL" || norm === "TURN_BASED_ROLEPLAY") return "DIALOGUE";
  if (norm === "READ_ALOUD") return "SPOKEN";
  if (norm === "MULTIPLE_CHOICE" || norm === "VOCAB_MASTERY") return "RECOGNITION";
  return norm as CanonicalModuleType;
}

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

// ==========================================
// 2. CLASS-BOUND MODULE GUARD (Lapis 3 — Backend Isolation Invariant)
// Rejects any evaluation request where the moduleType does not match
// the declared classType in the payload context.
// ==========================================

/**
 * Infer class discipline key from a class code string (mirrors grading.js detectClassDiscipline).
 * Returns 'VOCABULARY' | 'BASIC' | 'SPEAKING' | 'STORYTELLING' | 'GENERAL'
 */
function inferDisciplineFromCode(classCode: string): string {
  const c = (classCode || "").toUpperCase();
  if (/-([0-9]*VCB|VOCAB)\b/.test(c)) return "VOCABULARY";
  if (/-([0-9]*BSC|BASIC)\b/.test(c)) return "BASIC";
  if (/-([0-9]*SPK|SPEAK)\b/.test(c)) return "SPEAKING";
  if (/-([0-9]*STT|STORY)\b/.test(c)) return "STORYTELLING";
  return "GENERAL";
}

/**
 * Lapis 3 Guard: validate that the canonical moduleType is permitted for
 * the given class discipline. Returns null if valid, or an error string.
 */
function validateModuleClassBinding(
  canonical: CanonicalModuleType,
  classDiscipline: string
): string | null {
  // If class discipline is GENERAL or unknown, allow all (graceful pass-through)
  if (!classDiscipline || classDiscipline === "GENERAL") return null;

  const permittedDiscipline = MODULE_CLASS_BINDINGS[canonical];
  // Normalize binding key: BASIC_ENGLISH → BASIC for consistent comparison
  const normalizedPermitted = (permittedDiscipline || "").replace("_ENGLISH", "");
  const normalizedClass = (classDiscipline || "").replace("_ENGLISH", "");

  if (normalizedPermitted && normalizedPermitted !== normalizedClass) {
    return `Module '${canonical}' (bound to ${permittedDiscipline}) is not permitted for class discipline '${classDiscipline}'. Cross-class module injection blocked (Triple-Lock Lapis 3).`;
  }
  return null;
}

// Schemas & routing helpers
async function routeEvaluation(payload: StudentSubmissionPayload, classDiscipline?: string) {
  // Lapis 3 Guard: validate module-class binding
  if (payload.moduleType && classDiscipline) {
    const canonical = normalizeModuleType(payload.moduleType as string);
    const bindingError = validateModuleClassBinding(canonical, classDiscipline);
    if (bindingError) {
      throw new Error(bindingError);
    }
  }

  // Pass-through simulation / scoring logic
  // TODO: Route to actual evaluation engines per canonical module type
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

    // Infer class discipline from optional classCode in payload context
    const classDiscipline = payload.context
      ? inferDisciplineFromCode((payload.context as any).classCode || "")
      : "GENERAL";
    const evaluation = await routeEvaluation(payload, classDiscipline);
    const finalScore = Math.round(Number(evaluation.final_score ?? 0));

    return new Response(
      JSON.stringify({
        success: true,
        data: evaluation,
        finalScore,
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
