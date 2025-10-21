import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

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
    const { conversationText } = await req.json();
    console.log("Filtering conversation, length:", conversationText.length);

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Extract the story elements from this conversation. Focus on: characters (names, descriptions), setting (where, when), plot (what happens), and key details. Ignore filler words, off-topic discussion, and technical issues. Output a clear, detailed story prompt suitable for generating a cartoon."
          },
          {
            role: "user",
            content: conversationText
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const data = await response.json();
    const storyPrompt = data.choices[0].message.content;
    
    console.log("Filtered story prompt:", storyPrompt.substring(0, 200));

    return new Response(
      JSON.stringify({ storyPrompt }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in filter-conversation:", error);
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

