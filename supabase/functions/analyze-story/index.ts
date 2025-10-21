import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storyId } = await req.json();
    console.log("Analyzing story:", storyId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the story
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("*")
      .eq("id", storyId)
      .single();

    if (storyError) throw storyError;

    // Fetch selected memories
    let memoriesContext = "";
    if (story.memory_ids && story.memory_ids.length > 0) {
      const { data: memories, error: memoriesError } = await supabase
        .from("memory_captures")
        .select("*, template_questions(question_text)")
        .in("id", story.memory_ids);

      if (!memoriesError && memories) {
        memoriesContext = memories
          .map(
            (m: any) =>
              `${m.template_questions?.question_text}: ${m.answer_text}`
          )
          .join("\n");
      }
    }

    const fullContext = memoriesContext
      ? `Story: ${story.story_text}\n\nMemories:\n${memoriesContext}`
      : `Story: ${story.story_text}`;

    console.log("Asking AI to analyze story...");

    // Ask AI to generate questions
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are a creative story analyst. Your job is to identify gaps in the story that, if filled, would make it more vivid and complete for cartoon generation. Generate 2-5 specific questions that would help add visual details, emotional depth, or clarify ambiguous parts. Return ONLY a JSON array of question strings.",
            },
            {
              role: "user",
              content: `Analyze this story and generate questions to improve it:\n\n${fullContext}`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`Failed to analyze story: ${errorText}`);
    }

    const data = await response.json();
    console.log("AI response:", data);

    let questions: string[];
    try {
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(content);
      }
      
      // Limit to 5 questions
      questions = questions.slice(0, 5);
    } catch (parseError) {
      console.error("Failed to parse questions:", parseError);
      // Fallback questions
      questions = [
        "What was the main character wearing?",
        "What time of day did this happen?",
        "How did you feel during this moment?",
      ];
    }

    console.log(`Generated ${questions.length} questions`);

    return new Response(
      JSON.stringify({
        success: true,
        questions,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-story:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
