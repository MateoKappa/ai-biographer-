import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { audio } = await req.json();
    console.log("Transcribing audio with Lovable AI...");

    if (!audio) {
      throw new Error("No audio data provided");
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not set");
    }

    // Convert base64 to binary
    const binaryAudio = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));

    // Prepare form data for Lovable AI
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: "audio/webm" });
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-1");

    console.log("Sending to Lovable AI...");

    // Send to Lovable AI
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", errorText);
      throw new Error(`Lovable AI error: ${errorText}`);
    }

    const result = await response.json();
    console.log("Transcription successful");

    return new Response(
      JSON.stringify({ text: result.text }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in transcribe-audio:", error);
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
