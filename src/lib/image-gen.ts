/**
 * Image Generation Service
 * 
 * Uses Replicate API for image generation.
 * Supports multiple styles optimized for AI agent use cases.
 */

import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export type ImageStyle = 'pfp' | 'artwork' | 'banner' | 'custom';

interface GenerationOptions {
  prompt: string;
  style: ImageStyle;
  agentName?: string;
  negativePrompt?: string;
}

interface GenerationResult {
  imageUrl: string;
  width: number;
  height: number;
  model: string;
}

// Style presets for different image types
const STYLE_PRESETS: Record<ImageStyle, {
  width: number;
  height: number;
  promptPrefix: string;
  promptSuffix: string;
  model: string;
}> = {
  pfp: {
    width: 512,
    height: 512,
    promptPrefix: 'Profile picture avatar, ',
    promptSuffix: ', digital art, centered composition, vibrant colors, professional quality, suitable for social media avatar',
    model: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
  },
  artwork: {
    width: 1024,
    height: 1024,
    promptPrefix: 'Digital artwork, ',
    promptSuffix: ', masterpiece, highly detailed, artstation quality, beautiful lighting',
    model: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
  },
  banner: {
    width: 1500,
    height: 500,
    promptPrefix: 'Wide banner image, ',
    promptSuffix: ', panoramic, professional design, suitable for header banner',
    model: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
  },
  custom: {
    width: 1024,
    height: 1024,
    promptPrefix: '',
    promptSuffix: ', high quality, detailed',
    model: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
  },
};

/**
 * Generate an image using Replicate
 */
export async function generateImage(options: GenerationOptions): Promise<GenerationResult> {
  const { prompt, style, agentName, negativePrompt } = options;
  const preset = STYLE_PRESETS[style] || STYLE_PRESETS.pfp;

  // Build the full prompt
  let fullPrompt = preset.promptPrefix + prompt;
  if (agentName) {
    fullPrompt = fullPrompt.replace('{agent}', agentName);
  }
  fullPrompt += preset.promptSuffix;

  // For development/testing without API key
  if (!process.env.REPLICATE_API_TOKEN || process.env.NODE_ENV === 'development') {
    // Return a placeholder image
    const placeholderUrl = `https://picsum.photos/seed/${Date.now()}/${preset.width}/${preset.height}`;
    return {
      imageUrl: placeholderUrl,
      width: preset.width,
      height: preset.height,
      model: 'placeholder',
    };
  }

  try {
    const output = await replicate.run(preset.model as `${string}/${string}`, {
      input: {
        prompt: fullPrompt,
        negative_prompt: negativePrompt || 'blurry, low quality, distorted, ugly, bad anatomy',
        width: preset.width,
        height: preset.height,
        num_outputs: 1,
        scheduler: 'K_EULER',
        num_inference_steps: 30,
        guidance_scale: 7.5,
      },
    });

    // Replicate returns an array of URLs
    const imageUrl = Array.isArray(output) ? output[0] : output;

    return {
      imageUrl: imageUrl as string,
      width: preset.width,
      height: preset.height,
      model: preset.model,
    };
  } catch (error) {
    console.error('Image generation error:', error);
    throw new Error('Failed to generate image');
  }
}

/**
 * Generate a PFP specifically for an agent
 */
export async function generateAgentPFP(agentName: string, description?: string): Promise<GenerationResult> {
  const prompt = description 
    ? `AI agent named ${agentName}, ${description}`
    : `AI agent avatar for ${agentName}, futuristic, tech-inspired, unique character`;
  
  return generateImage({
    prompt,
    style: 'pfp',
    agentName,
  });
}

/**
 * Get available styles and their prices
 */
export function getAvailableStyles() {
  return Object.entries(STYLE_PRESETS).map(([key, value]) => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    width: value.width,
    height: value.height,
    description: value.promptPrefix.trim().replace(/,\s*$/, ''),
  }));
}
