import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const { data: user, error: userError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) throw new Error("Unauthorized");

    const { data: userData } = await supabaseClient.from("users").select("role").eq("id", user.user.id).single();
    if (!userData || (userData.role !== "teacher" && userData.role !== "admin")) {
      return new Response(JSON.stringify({ error: "Forbidden: insufficient permissions" }), { status: 403 });
    }

    const { testId, newProgramId, newBatchId, overrideName } = await req.json();
    if (!testId) throw new Error("testId is required");

    // Fetch existing test
    const { data: original, error: fetchError } = await supabaseClient
      .from("tests")
      .select("*")
      .eq("id", testId)
      .single();

    if (fetchError || !original) throw new Error("Test not found");

    const newTest = {
      module_id: original.module_id,
      institution_id: original.institution_id,
      program_id: newProgramId || original.program_id,
      batch_id: newBatchId || original.batch_id,
      title: overrideName || `${original.title} (Copy)`,
      test_type: original.test_type,
      test_subtype: original.test_subtype,
      availability_start: original.availability_start,
      availability_end: original.availability_end,
      working_duration_minutes: original.working_duration_minutes,
      payload: original.payload,
      prerequisite_test_id: original.prerequisite_test_id
    };

    const { data: duplicated, error: insertError } = await supabaseClient
      .from("tests")
      .insert(newTest)
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, duplicatedTest: duplicated }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
