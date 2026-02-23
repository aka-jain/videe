import OpenAI from "openai";
import { modelsToUse, openai } from "../config";
import { getLanguageConfig, LocaleCode } from "../config/languages";

/**
 * Generate a script using OpenAI based on the provided prompt in the specified language.
 * Optional memoryContext (e.g. from Mem0) is injected so the script can be personalized.
 */
export async function generateScript(
    prompt: string,
    language: LocaleCode,
    twoPhaseScriptGeneration: boolean = false,
    memoryContext?: string
): Promise<string> {
    // Get the language display name using the configuration module
    const { displayName } = getLanguageConfig(language);
    const client = new OpenAI();
    const hasMemory = Boolean(memoryContext?.trim());
    const memoryBlockSystem = hasMemory
        ? `\n\nUSER MEMORY CONTEXT (MANDATORY): The following is context from the user's saved memories. You MUST weave this into the script so the video feels personal and directly related to what the user cares about. Do not ignore it.\n---\n${memoryContext!.trim()}\n---\n`
        : "";
    const memoryBlockInput = hasMemory
        ? `\n\n[Context from user's memories - you MUST use this in the script]\n${memoryContext!.trim()}`
        : "";

    if (twoPhaseScriptGeneration) {
        const stage1SystemPrompt = `
        You are a research assistant of your brother who is a video script generator.
        You check the user prompt and determine if it is about generating a script that may need knowledge apart from the one you have, such as a specific event, person, or thing beyond your knowledge cutoff.
        If it is, you should use the web search tool to search for the information.
        Include detailed information that will be needed to generate the script.
        If it is not, you should not use the web search tool and just output "NO_WEB_SEARCH_NEEDED". The input follows now
        `
        const stage1Response = await client.responses.create({
            model: modelsToUse.scriptFactCheck,
            tools: [{
                type: "web_search_preview",
                search_context_size: "high",
            }],
            instructions: stage1SystemPrompt,
            input: `\`\`\`${prompt}\`\`\``,
            max_output_tokens: 1500,
        })

        const systemPrompt = `

        You are a video script generator.
        The story should begin with a powerful hook and it should keep the viewer hooked
        You will be given a prompt and you will need to generate a script for a video.
        The script should be at max 20 seconds long when read aloud, and at max 50 words.
        The script should such that it can become viral on social media.
        The script should be engaging and interesting.
        The script should be such that it can be easily understood by a wide audience.
        The script should be such that it can be easily remembered by the audience.
        Your will only output the script, no other text.
        You will not generate a title for the script.
        You will not generate a description for the script.
        Your will not generate any text for direction of section or music.
        You will not add any smilies or emojis to the script.
        You will not add any smilies or emojis to the script.
        Somewhere in the video ask the user to comment, do it only if it makes sense for the script.
        In the end, ask the the user to, like and subscribe to your channel.

        

        IMPORTANT: For the final output, follow all the instructions above and below. Only output the script. No citation, nothing else

        IMPORTANT: You should not use the web search if the user prompt is not about generating
        a script that may need knowledge apart from the one you have.

        IMPORTANT: You must write the script in the ${displayName} language.

        Example 1 of a unacceptable script:
        Title: How to make a video go viral
        Script:
        Hey everyone, today I'm going to show you how to make a video go viral.
        First, you need to have a good idea for a video.
        Second, you need to film a video with good production quality.
        Third, you need to promote your video on social media.

        Example 2 of a unacceptable script:
        Title: How to make a video go viral
        Script:
        Hey everyone, today I'm going to show you how to make a video go viral.

        Example 3 of a unacceptable script:
        The scene opens with a shot of a person walking down a street.
        Narrater: Simba is a lioness who is going to become the king of the jungle.

        End of unacceptable script.

        Your Brother who is your research assistant has found the following information for the user prompt:
        ${stage1Response.output_text}
        ${memoryBlockSystem}

        You will generate a script for a video in ${displayName}. The script must reflect and use the user memory context above.

        `;

        const response = await client.responses.create({
            model: modelsToUse.scriptGenerateStage2,
            instructions: systemPrompt,
            input: `User's video prompt:\n\`\`\`${prompt}\`\`\`${memoryBlockInput}`,
            max_output_tokens: 250,
        })
        const script = response.output_text.trim();
        console.log("Generated Script:", script);
        return script || "";
    } else {
        // Single-phase: just generate the script directly
        const systemPrompt = `
        You are a video script generator.
        You will be given a prompt and you will need to generate a script for a video.
        The script should be at max 20 seconds long when read aloud, and at max 50 words.
        The script should such that it can become viral on social media.
        The script should be engaging and interesting.
        The script should be such that it can be easily understood by a wide audience.
        The script should be such that it can be easily remembered by the audience.
        Your will only output the script, no other text.
        You will not generate a title for the script.
        You will not generate a description for the script.
        Your will not generate any text for direction of section or music.
        You will not add any smilies or emojis to the script.
        You will not add any smilies or emojis to the script.
        Somewhere in the video ask the user to comment, do it only if it makes sense for the script.
        In the end, ask the the user to, like and subscribe to your channel.

        IMPORTANT: For the final output, follow all the instructions above and below. Only output the script. No citation, nothing else
        IMPORTANT: You must write the script in the ${displayName} language.
        IMPORTANT: If user memory context is provided below, the script MUST incorporate it so the video is clearly related to that context.
        ${memoryBlockSystem}
        `;
        const response = await client.responses.create({
            model: modelsToUse.scriptGenerateSingleStage,
            instructions: systemPrompt,
            input: `User's video prompt:\n\`\`\`${prompt}\`\`\`${memoryBlockInput}`,
            max_output_tokens: 250,
        })
        console.log("Response:", JSON.stringify(response, null, 2));
        const script = response.output_text.trim();
        console.log("Generated Script:", script);
        return script || "";
    }
}

/**
 * Determine the mood of the script for music selection
 */
export async function determineMoodFromScript(script: string): Promise<string> {
    try {
        // Use OpenAI to determine the mood of the script, regardless of language
        const validMoods = [
            "happy",
            "sad",
            "exciting",
            "calm",
            "mysterious",
            "inspirational",
            "funny",
            "scary",
            "romantic",
            "dramatic",
            "thrilling",
            "powerful",
            "neutral",
        ];
        const response = await openai.chat.completions.create({
            model: modelsToUse.determineMood,
            messages: [
                {
                    role: "system",
                    content:
                        `You are a mood analyst. Given a script in any language, respond with a single word representing its mood: ${validMoods.join(', ')}. Always respond in English regardless of the script language.`
                },
                {
                    role: "user",
                    content: `Analyze the mood of this script (which may be in a language other than English) and respond with one English word only: ${script}`,
                },
            ],
            max_tokens: 10,
        });

        const mood = response.choices[0].message?.content?.trim().toLowerCase();


        return mood && validMoods.includes(mood) ? mood : "neutral";
    } catch (error) {
        console.error("Error determining mood from script:", error);
        return "neutral"; // Default to neutral if any error
    }
} 