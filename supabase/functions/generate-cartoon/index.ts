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
    const { storyId, advancedMode } = await req.json();
    
    console.log("Generating cartoon for story:", storyId, "Advanced mode:", advancedMode);

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
    
    // Get configuration from story
    const NUM_PANELS = story.desired_panels || 4;
    const ANIMATION_STYLE = story.animation_style || 'classic_cartoon';
    
    // Define style descriptions
    const styleDescriptions: Record<string, string> = {
      classic_cartoon: 'Colorful classic cartoon style with bold outlines, expressive characters, warm vibrant colors',
      anime: 'Anime/manga style with detailed shading, expressive eyes, dynamic poses',
      comic_book: 'American comic book style with bold inks, dramatic lighting, action-oriented composition',
      watercolor: 'Soft watercolor painting style with flowing colors, gentle brushstrokes, artistic feel',
      pixel_art: 'Retro pixel art style with 16-bit aesthetics, clear pixels, nostalgic gaming feel',
      realistic: 'Photorealistic style with detailed textures, natural lighting, lifelike representation'
    };
    
    const stylePrompt = styleDescriptions[ANIMATION_STYLE] || styleDescriptions.classic_cartoon;
    
    console.log(`Configuration - Panels: ${NUM_PANELS}, Style: ${ANIMATION_STYLE}`);

    // Update story status to processing
    await supabase
      .from("stories")
      .update({ status: "processing" })
      .eq("id", storyId);

    // Check if this is advanced mode with user-defined panels
    if (advancedMode && story.context_qa && Array.isArray(story.context_qa) && story.context_qa.length > 0) {
      console.log("🎯 ADVANCED MODE: Using user-defined panels");
      const userPanels = story.context_qa;
      
      // Step 1: Convert user panel descriptions into connected story narrative
      console.log(`📝 STEP 1/3: Converting ${userPanels.length} panel descriptions into connected story...`);
      const narrativeResponse = await fetch(
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
                  `You are a storytelling expert. You will receive ${userPanels.length} panel descriptions. Convert them into ${userPanels.length} DETAILED (3-4 sentences each), CONNECTED story descriptions that flow together like a narrative. Each description should tell WHAT HAPPENS in that moment of the story with vivid details, emotions, and atmosphere. They should read like: "First...", "Then...", "Finally..." - a fun, engaging story you'd tell someone. Make it colorful and immersive! Return ONLY a JSON array of ${userPanels.length} story descriptions. Format: ["First moment with details...", "Second moment with details...", "Final moment with details..."]`,
              },
              {
                role: "user",
                content: `Convert these ${userPanels.length} panel descriptions into SHORT connected story moments:\n\n${userPanels.map((p: any, i: number) => `Panel ${i + 1}: ${p.description}`).join('\n\n')}`,
              },
            ],
          }),
        }
      );

      if (!narrativeResponse.ok) {
        const errorText = await narrativeResponse.text();
        console.error("Narrative API error:", errorText);
        throw new Error(`Failed to create story narrative: ${errorText}`);
      }

      const narrativeData = await narrativeResponse.json();
      console.log("Narrative response:", narrativeData);

      let storyDescriptions: string[];
      try {
        const content = narrativeData.choices[0].message.content;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          storyDescriptions = JSON.parse(jsonMatch[0]);
        } else {
          storyDescriptions = JSON.parse(content);
        }
      } catch (parseError) {
        console.error("Failed to parse narrative:", parseError);
        // Fallback to user descriptions
        storyDescriptions = userPanels.map((p: any) => p.description);
      }

      console.log(`✅ Created ${storyDescriptions.length} connected story descriptions`);
      storyDescriptions.forEach((desc, i) => {
        console.log(`   Story ${i + 1}: ${desc}`);
      });
      
      // Step 2: Generate images from user descriptions
      console.log(`🎨 STEP 2/3: Generating ${userPanels.length} images from user descriptions IN PARALLEL...`);
      
      const imageGenerationPromises = userPanels.map(async (panelData: any, order_index: number) => {
        console.log(`🖼️  Panel ${order_index + 1}/${userPanels.length}: Starting image generation...`);
        console.log(`   User Description: ${panelData.description}`);
        console.log(`   Story Text: ${storyDescriptions[order_index]}`);
        if (panelData.referenceImageUrl) {
          console.log(`   Reference Image: ${panelData.referenceImageUrl}`);
        }

        const imagePrompt = `Create a vibrant cartoon illustration for ONE scene: "${panelData.description}".

IMPORTANT: Create a SINGLE illustration focused on this ONE moment. This is part of a larger story sequence.
LAYOUT: Create 4 small cartoon panels arranged in a grid (2x2) within one image. Each small panel should show a different moment or angle of this scene, like a comic book page layout.

Style: ${stylePrompt}
Character consistency: Maintain consistent character appearance (age, clothing, features) throughout the story
Composition: Cinematic angle, emotionally engaging, suitable for all ages, clear focal point in each small panel`;

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
              quality: "medium",
              output_format: "png",
            }),
          }
        );

        if (!imageResponse.ok) {
          const errorText = await imageResponse.text();
          console.error(`Image generation error for panel ${order_index}:`, errorText);
          throw new Error(`Failed to generate image for panel ${order_index + 1}: ${errorText}`);
        }

        const imageData = await imageResponse.json();
        console.log(`✅ Panel ${order_index + 1}/${userPanels.length}: Image generated successfully`);

        const imageUrl = imageData.data?.[0]?.b64_json 
          ? `data:image/png;base64,${imageData.data[0].b64_json}`
          : null;

        if (!imageUrl) {
          console.error("No image URL in response:", imageData);
          throw new Error("Failed to get image URL from OpenAI");
        }

        return { 
          sceneText: storyDescriptions[order_index], // Use AI-generated story text
          imageUrl, 
          order_index 
        };
      });

      // Wait for all images to be generated
      console.log("⏳ Waiting for all images to complete...");
      const generatedImages = await Promise.all(imageGenerationPromises);
      console.log("✅ All images generated!");

      // Step 3: Save all panels to database
      console.log("💾 STEP 3/3: Saving all panels to database...");
      for (const { sceneText, imageUrl, order_index } of generatedImages) {
        const { error: panelError } = await supabase
          .from("cartoon_panels")
          .insert({
            story_id: storyId,
            scene_text: sceneText, // This is now the AI-generated story text
            image_url: imageUrl,
            order_index,
          });

        if (panelError) {
          console.error("❌ Panel insert error:", panelError);
          throw panelError;
        }
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
          panels: generatedImages.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // SIMPLE MODE: Continue with AI-powered scene generation
    console.log("📖 SIMPLE MODE: Using AI to generate scenes");

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
    console.log(`🎬 STEP 2/3: Analyzing story and creating ${NUM_PANELS} scenes...`);
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
                `You are a story narrative expert. Break this story into ${NUM_PANELS} connected moments that flow together as one cohesive narrative. Each panel description should be SHORT (2-3 sentences max) and focus on WHAT HAPPENS in the story, not visual details. The panels should connect like chapters: beginning → middle → end. Write what's happening in the story at each moment, maintaining narrative flow. Return ONLY a JSON array of SHORT story moments. Format: ["What happens first...", "Then what happens...", "Finally..."]`,
            },
            {
              role: "user",
              content: `Break this memory into ${NUM_PANELS} connected story moments (SHORT descriptions of what happens, NOT visual details):\n\n${processedStory}`,
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

    // Step 2.5: Convert detailed scenes into SHORT connected story descriptions
    console.log(`📝 STEP 2.5/4: Converting scenes into connected story narrative...`);
    const narrativeResponse = await fetch(
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
                `You are a storytelling expert. You will receive ${NUM_PANELS} scene descriptions. Convert them into ${NUM_PANELS} SHORT (1-2 sentences max), CONNECTED story descriptions that flow together like a narrative. Each description should tell WHAT HAPPENS in that moment of the story, not describe visuals. They should read like: "First...", "Then...", "Finally..." - a story you'd tell someone, not a scene you'd paint. Return ONLY a JSON array of ${NUM_PANELS} SHORT story descriptions. Format: ["First moment of story...", "Second moment...", "Final moment..."]`,
            },
            {
              role: "user",
              content: `Convert these ${NUM_PANELS} detailed scenes into SHORT connected story moments:\n\n${scenes.map((s, i) => `Scene ${i + 1}: ${typeof s === 'string' ? s : JSON.stringify(s)}`).join('\n\n')}`,
            },
          ],
        }),
      }
    );

    if (!narrativeResponse.ok) {
      const errorText = await narrativeResponse.text();
      console.error("Narrative API error:", errorText);
      throw new Error(`Failed to create story narrative: ${errorText}`);
    }

    const narrativeData = await narrativeResponse.json();
    console.log("Narrative response:", narrativeData);

    let storyDescriptions: string[];
    try {
      const content = narrativeData.choices[0].message.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        storyDescriptions = JSON.parse(jsonMatch[0]);
      } else {
        storyDescriptions = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("Failed to parse narrative:", parseError);
      // Fallback to original scenes
      storyDescriptions = scenes.map(s => typeof s === 'string' ? s : JSON.stringify(s));
    }

    console.log(`✅ Created ${storyDescriptions.length} connected story descriptions`);
    storyDescriptions.forEach((desc, i) => {
      console.log(`   Story ${i + 1}: ${desc}`);
    });

    // Step 3: Generate cartoon images for all scenes IN PARALLEL for speed
    console.log(`🎨 STEP 3/4: Generating ${storyDescriptions.length} cartoon images IN PARALLEL...`);
    
    // Use the short story descriptions for both display and image generation
    const imageGenerationPromises = storyDescriptions.map(async (storyText, order_index) => {
      console.log(`🖼️  Panel ${order_index + 1}/${storyDescriptions.length}: Starting image generation...`);
      console.log(`   Story: ${storyText}`);

      const imagePrompt = `Create a vibrant cartoon illustration that visualizes this story moment: "${storyText}".

IMPORTANT: Create a SINGLE illustration focused on this ONE moment. This is panel ${order_index + 1} of ${NUM_PANELS} in a larger story sequence.
LAYOUT: Create 4 small cartoon panels arranged in a grid (2x2) within one image. Each small panel should show a different moment or angle of this scene, like a comic book page layout.

Style: ${stylePrompt}
Character consistency: Maintain consistent character appearance (age, clothing, features) throughout the story
Composition: Cinematic angle, emotionally engaging, suitable for all ages, clear focal point in each small panel`;

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
      console.log(`✅ Panel ${order_index + 1}/${storyDescriptions.length}: Image generated successfully`);

      // Extract the base64 image from OpenAI response
      const imageUrl = imageData.data?.[0]?.b64_json 
        ? `data:image/png;base64,${imageData.data[0].b64_json}`
        : null;

      if (!imageUrl) {
        console.error("No image URL in response:", imageData);
        throw new Error("Failed to get image URL from OpenAI");
      }

      return { sceneText: storyText, imageUrl, order_index };
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
