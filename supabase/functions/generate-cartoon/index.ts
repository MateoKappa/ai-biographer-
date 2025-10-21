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

    // Fetch the selected memories if any
    let memoriesText = "";
    if (story.memory_ids && story.memory_ids.length > 0) {
      const { data: memories, error: memoriesError } = await supabase
        .from("memory_captures")
        .select("*, template_questions(question_text)")
        .in("id", story.memory_ids);

      if (memoriesError) {
        console.error("Error fetching memories:", memoriesError);
      } else if (memories) {
        console.log(`Fetched ${memories.length} memories`);
        memoriesText = memories
          .map(
            (m: any) =>
              `${m.template_questions?.question_text}: ${m.answer_text}`
          )
          .join("\n\n");
      }
    }

    // Combine story text and memories
    const fullStory = memoriesText
      ? `${story.story_text}\n\nBased on these memories:\n\n${memoriesText}`
      : story.story_text;

    console.log("Full story length:", fullStory.length);

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
                "You are a creative story analyzer. Split the user's story and memories into 2-4 key scenes that would make great cartoon panels. Each scene should be a vivid visual description based DIRECTLY on the memories provided, maintaining the same character throughout. Describe specific moments from the memories. Focus on visual details like setting, actions, and emotions. Return ONLY a JSON array of scene descriptions, nothing else.",
            },
            {
              role: "user",
              content: `Create 2-4 cartoon scenes based on this story and memories. Each scene should depict a specific memory, maintaining the same character:\n\n${fullStory}`,
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
      
      // Handle different scene formats
      let sceneText: string;
      if (typeof sceneData === 'string') {
        sceneText = sceneData;
      } else if (sceneData.scene) {
        sceneText = sceneData.scene;
      } else if (sceneData.setting && sceneData.action) {
        // Handle structured format with setting, action, emotion
        sceneText = `${sceneData.setting} ${sceneData.action}`;
        if (sceneData.emotion) sceneText += ` ${sceneData.emotion}`;
      } else {
        console.error("Unknown scene format:", sceneData);
        sceneText = JSON.stringify(sceneData);
      }
      
      console.log(`Generating image for scene ${i + 1}:`, sceneText.substring(0, 100));

      const imagePrompt = `Create a colorful cartoon illustration in comic book style depicting this scene: ${sceneText}. IMPORTANT: Keep the same character throughout all panels - maintain consistent appearance, age, and features. Vibrant colors, bold outlines, expressive characters, cinematic composition, suitable for all ages.`;

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
