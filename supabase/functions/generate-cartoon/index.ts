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
    console.log("Generating cartoon for story:", storyId);

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

    console.log("Story fetched:", story.story_text.substring(0, 100));

    // Step 1: Use AI to split story into 2-4 scenes
    const scenesResponse = await fetch(
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
                "You are a creative story analyzer. Split the user's story into 2-4 key scenes that would make great cartoon panels. Each scene should be a vivid description suitable for image generation. Return ONLY a JSON array of scene descriptions, nothing else.",
            },
            {
              role: "user",
              content: `Split this story into 2-4 key scenes:\n\n${story.story_text}`,
            },
          ],
        }),
      }
    );

    if (!scenesResponse.ok) {
      const errorText = await scenesResponse.text();
      console.error("Scenes API error:", errorText);
      throw new Error(`Failed to analyze story: ${errorText}`);
    }

    const scenesData = await scenesResponse.json();
    console.log("Scenes response:", scenesData);

    let scenes: any[];
    try {
      const content = scenesData.choices[0].message.content;
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        scenes = JSON.parse(jsonMatch[0]);
      } else {
        scenes = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("Failed to parse scenes:", parseError);
      // Fallback: split story into sentences and take first 3
      scenes = story.story_text
        .split(/[.!?]+/)
        .filter((s: string) => s.trim().length > 20)
        .slice(0, 3)
        .map((s: string) => ({ scene: s.trim() }));
    }

    console.log(`Generated ${scenes.length} scenes`);

    // Step 2: Generate cartoon image for each scene
    const panels = [];
    for (let i = 0; i < scenes.length; i++) {
      const sceneData = scenes[i];
      // Handle both object format and string format
      const sceneText = typeof sceneData === 'string' ? sceneData : sceneData.scene;
      console.log(`Generating image for scene ${i + 1}:`, sceneText.substring(0, 100));

      const imagePrompt = `Create a colorful cartoon illustration in comic book style: ${sceneText}. Vibrant colors, bold outlines, friendly characters, suitable for all ages.`;

      const imageResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image-preview",
            messages: [
              {
                role: "user",
                content: imagePrompt,
              },
            ],
            modalities: ["image", "text"],
          }),
        }
      );

      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        console.error(`Image generation error for scene ${i}:`, errorText);
        throw new Error(`Failed to generate image: ${errorText}`);
      }

      const imageData = await imageResponse.json();
      console.log(`Image generated for scene ${i + 1}`);

      // Extract the base64 image
      const imageUrl =
        imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageUrl) {
        console.error("No image URL in response:", imageData);
        throw new Error("Failed to get image URL from AI");
      }

      // Store the panel in database
      const { error: panelError } = await supabase
        .from("cartoon_panels")
        .insert({
          story_id: storyId,
          scene_text: sceneText,
          image_url: imageUrl,
          order_index: i,
        });

      if (panelError) {
        console.error("Panel insert error:", panelError);
        throw panelError;
      }

      panels.push({ scene: sceneText, imageUrl, order_index: i });
    }

    // Update story status to complete
    const { error: updateError } = await supabase
      .from("stories")
      .update({ status: "complete" })
      .eq("id", storyId);

    if (updateError) throw updateError;

    console.log("Cartoon generation complete!");

    return new Response(
      JSON.stringify({
        success: true,
        panels: panels.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-cartoon:", error);
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
