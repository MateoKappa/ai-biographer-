import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { transcription, questions } = await req.json();
    console.log("Analyzing transcription to match questions...");

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Ask AI to match the transcription to the questions
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
                "You are an AI that analyzes transcribed speech and matches relevant information to specific questions. Your job is to extract the most relevant parts of the transcription that answer each question. Return ONLY a JSON object with question indices as keys and extracted answers as values. If a question isn't answered in the transcription, use an empty string.",
            },
            {
              role: "user",
              content: `Here is a transcription of someone speaking:\n\n${transcription}\n\nHere are the questions to answer:\n${questions.map((q: string, i: number) => `${i}. ${q}`).join("\n")}\n\nReturn a JSON object mapping question indices to their answers based on the transcription.`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`Failed to analyze answers: ${errorText}`);
    }

    const data = await response.json();
    console.log("AI response:", data);

    let answers: Record<number, string>;
    try {
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        answers = JSON.parse(jsonMatch[0]);
      } else {
        answers = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("Failed to parse answers:", parseError);
      // Fallback to empty answers
      answers = {};
    }

    console.log(`Matched ${Object.keys(answers).length} answers`);

    return new Response(
      JSON.stringify({
        success: true,
        answers,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-answers:", error);
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
