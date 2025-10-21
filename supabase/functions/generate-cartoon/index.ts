// @ts-ignore: Deno is available in Supabase Edge Functions runtime
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
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
    
    // 🎨 CONFIGURATION: Number of cartoon panels to generate
    // Change this value to generate more panels (e.g., 2-4)
    const NUM_PANELS = 1;
    
    console.log("Generating cartoon for story:", storyId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the story
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("*")
      .eq("id", storyId)
      .single();

    if (storyError) throw storyError;

    console.log("Story fetched:", story.story_text.substring(0, 100));

    // Update story status to processing
    await supabase
      .from("stories")
      .update({ status: "processing" })
      .eq("id", storyId);

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

    // Add context from Q&A if available
    let contextText = "";
    if (story.context_qa && Array.isArray(story.context_qa) && story.context_qa.length > 0) {
      contextText = story.context_qa
        .map((qa: any) => `${qa.question}\n${qa.answer}`)
        .join("\n\n");
    }

    // Combine story text, memories, and additional context
    let fullStory = story.story_text;
    if (memoriesText) {
      fullStory += `\n\nBased on these memories:\n\n${memoriesText}`;
    }
    if (contextText) {
      fullStory += `\n\nAdditional context:\n\n${contextText}`;
    }

    console.log("Full story length:", fullStory.length);

    // Step 0.5: If this looks like a conversation transcript, extract the actual story first
    let processedStory = fullStory;
    if (fullStory.includes("User:") || fullStory.includes("AI:")) {
      console.log("📝 STEP 1/3: Detected conversation format, extracting story content...");
      
      const extractResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-5-mini-2025-08-07",
            messages: [
              {
                role: "system",
                content:
                  "You are a story extractor. The user will provide a conversation transcript between a user and AI. Extract ONLY the actual story content that the user is telling (ignore AI's questions and prompts). Rewrite it as a coherent narrative in third person, keeping all the important details, characters, settings, and plot points the user described. Be detailed and vivid.",
              },
              {
                role: "user",
                content: fullStory,
              },
            ],
          }),
        }
      );

      if (extractResponse.ok) {
        const extractData = await extractResponse.json();
        processedStory = extractData.choices[0].message.content;
        console.log("✅ Story extracted successfully:", processedStory.substring(0, 200) + "...");
      } else {
        console.log("⚠️ Story extraction failed, using original text");
      }
    } else {
      console.log("📖 Using original story text (not a conversation)");
    }

    // Step 1: Use AI to split story into scenes
    const sceneText = NUM_PANELS === 1 ? "scene" : `${NUM_PANELS} scenes`;
    console.log(`🎬 STEP 2/3: Analyzing story and creating ${sceneText}...`);
    const scenesResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5-mini-2025-08-07",
          messages: [
            {
              role: "system",
              content:
                `You are a creative story analyzer. ${NUM_PANELS === 1 
                  ? "Create ONE key scene that captures the essence of the story as a vivid cartoon panel. Focus on the most impactful moment." 
                  : `Split the story into ${NUM_PANELS} key scenes that would make great cartoon panels.`} Each scene should be a vivid visual description maintaining the same character throughout. Focus on visual details like setting, actions, and emotions. Return ONLY a JSON array of scene descriptions, nothing else. Format: [\"scene 1 description\", \"scene 2 description\", ...]`,
            },
            {
              role: "user",
              content: `Create ${NUM_PANELS === 1 ? "1 cartoon scene" : `${NUM_PANELS} cartoon scenes`} based on this story:\n\n${processedStory}`,
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
      // Fallback: split story into sentences and take first NUM_PANELS
      scenes = story.story_text
        .split(/[.!?]+/)
        .filter((s: string) => s.trim().length > 20)
        .slice(0, NUM_PANELS)
        .map((s: string) => ({ scene: s.trim() }));
    }

    console.log(`✅ Generated ${scenes.length} scenes for the cartoon`);

    // Step 2: Generate cartoon images for all scenes IN PARALLEL for speed
    console.log(`🎨 STEP 3/3: Generating ${scenes.length} cartoon images IN PARALLEL...`);
    
    // Prepare all scene texts first
    const scenesWithText = scenes.map((sceneData, i) => {
      let sceneText: string;
      if (typeof sceneData === 'string') {
        sceneText = sceneData;
      } else if (sceneData.scene) {
        sceneText = sceneData.scene;
      } else if (sceneData.setting && sceneData.action) {
        sceneText = `${sceneData.setting} ${sceneData.action}`;
        if (sceneData.emotion) sceneText += ` ${sceneData.emotion}`;
      } else {
        console.error("Unknown scene format:", sceneData);
        sceneText = JSON.stringify(sceneData);
      }
      return { sceneText, order_index: i };
    });

    // Generate all images in parallel
    const imageGenerationPromises = scenesWithText.map(async ({ sceneText, order_index }) => {
      console.log(`🖼️  Panel ${order_index + 1}/${scenes.length}: Starting image generation...`);
      console.log(`   Scene: ${sceneText.substring(0, 100)}${sceneText.length > 100 ? '...' : ''}`);

      const imagePrompt = `Create a colorful cartoon illustration in comic book style depicting this scene: ${sceneText}. IMPORTANT: Keep the same character throughout all panels - maintain consistent appearance, age, and features. Vibrant colors, bold outlines, expressive characters, cinematic composition, suitable for all ages.`;

      const imageResponse = await fetch(
        "https://api.openai.com/v1/images/generations",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-image-1",
            prompt: imagePrompt,
            n: 1,
            size: "1024x1024",
            quality: "medium", // Valid options: low, medium, high, auto
            output_format: "png",
          }),
        }
      );

      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        console.error(`Image generation error for scene ${order_index}:`, errorText);
        throw new Error(`Failed to generate image for panel ${order_index + 1}: ${errorText}`);
      }

      const imageData = await imageResponse.json();
      console.log(`✅ Panel ${order_index + 1}/${scenes.length}: Image generated successfully`);

      // Extract the base64 image from OpenAI response
      const imageUrl = imageData.data?.[0]?.b64_json 
        ? `data:image/png;base64,${imageData.data[0].b64_json}`
        : null;

      if (!imageUrl) {
        console.error("No image URL in response:", imageData);
        throw new Error("Failed to get image URL from OpenAI");
      }

      return { sceneText, imageUrl, order_index };
    });

    // Wait for all images to be generated
    console.log("⏳ Waiting for all images to complete...");
    const generatedImages = await Promise.all(imageGenerationPromises);
    console.log("✅ All images generated!");

    // Now save all panels to database
    console.log("💾 Saving all panels to database...");
    const panels: Array<{ scene: string; imageUrl: string; order_index: number }> = [];
    for (const { sceneText, imageUrl, order_index } of generatedImages) {
      const { error: panelError } = await supabase
        .from("cartoon_panels")
        .insert({
          story_id: storyId,
          scene_text: sceneText,
          image_url: imageUrl,
          order_index,
        });

      if (panelError) {
        console.error("❌ Panel insert error:", panelError);
        throw panelError;
      }

      panels.push({ scene: sceneText, imageUrl, order_index });
    }
    console.log("✅ All panels saved to database");

    // Update story status to complete
    console.log("🎉 All panels complete! Finalizing...");
    const { error: updateError } = await supabase
      .from("stories")
      .update({ status: "complete" })
      .eq("id", storyId);

    if (updateError) throw updateError;

    console.log("✨ SUCCESS! Cartoon generation complete!");

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
