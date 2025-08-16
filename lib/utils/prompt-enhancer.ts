/**
 * Prompt Enhancement System for AI Generation
 * Automatically improves prompts for pixel art generation
 */

import { CanvasAnalysis } from './canvas-analysis';
import { PromptEnhancementOptions, AIGenerationMode } from '@/lib/types/canvas';

// Pixel art style keywords for different styles
const STYLE_KEYWORDS = {
  'pixel-art': [
    'pixel art style',
    'pixelated',
    'retro gaming style',
    '8-bit style',
    '16-bit style',
    'low resolution',
    'crisp pixels',
    'no anti-aliasing'
  ],
  'low-res': [
    'low resolution',
    'simple shapes',
    'blocky style',
    'minimal detail',
    'retro computer graphics'
  ],
  'retro': [
    'retro style',
    'vintage gaming',
    'classic arcade style',
    'nostalgic pixel art',
    'old school graphics'
  ]
} as const;

// Background and transparency keywords
const TRANSPARENCY_KEYWORDS = [
  'transparent background',
  'no background',
  'isolated subject',
  'clear background',
  'PNG transparency',
  'cutout style'
];

// Quality improvement keywords
const QUALITY_KEYWORDS = [
  'high quality',
  'clean',
  'sharp',
  'well defined',
  'clear details'
];

// Negative prompts for pixel art
const NEGATIVE_PROMPTS = [
  'blurry',
  'antialiased',
  'smooth gradients',
  'realistic lighting',
  'photorealistic',
  'high detail textures',
  'soft edges'
];

/**
 * Analyzes a prompt and suggests improvements
 */
export function analyzePrompt(prompt: string): {
  hasStyleKeywords: boolean;
  hasTransparencyKeywords: boolean;
  hasNegativeElements: boolean;
  suggestedAdditions: string[];
  confidence: number;
} {
  const lowerPrompt = prompt.toLowerCase();
  
  // Check for existing style keywords
  const hasStyleKeywords = Object.values(STYLE_KEYWORDS).flat()
    .some(keyword => lowerPrompt.includes(keyword.toLowerCase()));
  
  // Check for transparency keywords
  const hasTransparencyKeywords = TRANSPARENCY_KEYWORDS
    .some(keyword => lowerPrompt.includes(keyword.toLowerCase()));
  
  // Check for negative elements
  const hasNegativeElements = NEGATIVE_PROMPTS
    .some(negative => lowerPrompt.includes(negative.toLowerCase()));
  
  // Suggest additions
  const suggestedAdditions: string[] = [];
  
  if (!hasStyleKeywords) {
    suggestedAdditions.push('pixel art style');
  }
  
  if (!hasTransparencyKeywords) {
    suggestedAdditions.push('transparent background');
  }
  
  // Calculate confidence (higher is better)
  let confidence = 0.5; // Base confidence
  if (hasStyleKeywords) confidence += 0.3;
  if (hasTransparencyKeywords) confidence += 0.2;
  if (!hasNegativeElements) confidence += 0.2;
  if (prompt.length > 10 && prompt.length < 200) confidence += 0.1;
  
  return {
    hasStyleKeywords,
    hasTransparencyKeywords,
    hasNegativeElements,
    suggestedAdditions,
    confidence: Math.min(confidence, 1.0)
  };
}

/**
 * Enhances a prompt for AI generation based on context and options
 */
export function enhancePrompt(
  originalPrompt: string, 
  options: PromptEnhancementOptions
): {
  enhancedPrompt: string;
  changes: string[];
  confidence: number;
} {
  if (!originalPrompt.trim()) {
    throw new Error('Prompt cannot be empty');
  }
  
  const analysis = analyzePrompt(originalPrompt);
  const changes: string[] = [];
  let enhancedPrompt = originalPrompt.trim();
  
  // Add style keywords if missing
  if (!analysis.hasStyleKeywords) {
    const styleKeywords = STYLE_KEYWORDS[options.style] || STYLE_KEYWORDS['pixel-art'];
    const primaryStyle = styleKeywords[0];
    enhancedPrompt += `, ${primaryStyle}`;
    changes.push(`Added style: ${primaryStyle}`);
  }
  
  // Handle transparency based on mode and options
  if (options.enforceTransparency && !analysis.hasTransparencyKeywords) {
    enhancedPrompt += ', transparent background, no background, isolated subject';
    changes.push('Added transparency requirements');
  }
  
  // Mode-specific enhancements
  switch (options.mode) {
    case 'text-to-image':
      // For new images, add quality keywords
      if (!enhancedPrompt.includes('clean') && !enhancedPrompt.includes('sharp')) {
        enhancedPrompt += ', clean, sharp pixels';
        changes.push('Added quality keywords for new image');
      }
      break;
      
    case 'image-to-image':
      // For improvements, add enhancement keywords
      enhancedPrompt = `improve this pixel art: ${enhancedPrompt}`;
      enhancedPrompt += ', maintain pixel art style, enhance details';
      changes.push('Added image-to-image enhancement keywords');
      
      // Use canvas analysis for context
      if (options.canvasAnalysis) {
        if (options.canvasAnalysis.dominantColors.length > 0 && options.preserveExistingColors) {
          enhancedPrompt += ', preserve existing color palette';
          changes.push('Added color preservation hint');
        }
        
        if (options.canvasAnalysis.hasTransparency) {
          enhancedPrompt += ', maintain transparency';
          changes.push('Added transparency preservation');
        }
      }
      break;
  }
  
  // Add negative prompts to avoid unwanted effects
  if (options.style === 'pixel-art') {
    enhancedPrompt += '. Avoid: blurry, antialiased, smooth gradients, photorealistic';
    changes.push('Added negative prompts');
  }
  
  // Final cleanup
  enhancedPrompt = enhancedPrompt
    .replace(/,\s*,/g, ',') // Remove double commas
    .replace(/\s+/g, ' ')   // Normalize spaces
    .trim();
  
  return {
    enhancedPrompt,
    changes,
    confidence: analysis.confidence
  };
}

/**
 * Gets suggested prompts based on canvas state
 */
export function getPromptSuggestions(
  canvasAnalysis: CanvasAnalysis | null,
  mode: AIGenerationMode
): string[] {
  const baseSuggestions = {
    'text-to-image': [
      'cute animal character',
      'simple house with garden',
      'fantasy sword and shield',
      'colorful flower bouquet',
      'retro spaceship',
      'magical potion bottle',
      'cartoon food items',
      'smiling sun and clouds'
    ],
    'image-to-image': [
      'add more details',
      'improve colors and shading',
      'add background elements',
      'enhance lighting effects',
      'add decorative patterns',
      'improve character expression',
      'add environmental details',
      'refine edges and cleanup'
    ]
  };
  
  let suggestions = baseSuggestions[mode] || baseSuggestions['text-to-image'];
  
  // Customize based on canvas analysis
  if (canvasAnalysis && mode === 'image-to-image') {
    if (canvasAnalysis.dominantColors.length > 0) {
      const hasWarmColors = canvasAnalysis.dominantColors.some(color => 
        color.includes('255,') || color.includes('red') || color.includes('orange')
      );
      
      if (hasWarmColors) {
        suggestions.unshift('add cool color accents', 'balance warm colors with cool tones');
      } else {
        suggestions.unshift('add warm color highlights', 'enhance with warmer tones');
      }
    }
    
    if (canvasAnalysis.fillPercentage < 30) {
      suggestions.unshift('add background elements', 'fill empty space with details');
    } else if (canvasAnalysis.fillPercentage > 80) {
      suggestions.unshift('simplify and clean up', 'reduce clutter');
    }
  }
  
  return suggestions.slice(0, 6); // Return top 6 suggestions
}

/**
 * Validates if a prompt is suitable for pixel art generation
 */
export function validatePrompt(prompt: string): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Length checks
  if (prompt.length < 3) {
    issues.push('Prompt is too short');
    suggestions.push('Add more descriptive words');
  } else if (prompt.length > 500) {
    issues.push('Prompt is too long');
    suggestions.push('Simplify and focus on key elements');
  }
  
  // Content checks
  const lowerPrompt = prompt.toLowerCase();
  
  // Check for problematic terms
  const problematicTerms = ['photorealistic', 'high resolution', '4k', '8k', 'detailed textures'];
  const foundProblems = problematicTerms.filter(term => lowerPrompt.includes(term));
  
  if (foundProblems.length > 0) {
    issues.push(`Contains terms unsuitable for pixel art: ${foundProblems.join(', ')}`);
    suggestions.push('Remove realistic/high-detail terms and focus on simple, stylized descriptions');
  }
  
  // Check for NSFW or inappropriate content (basic check)
  const inappropriateTerms = ['nude', 'sexual', 'violence', 'gore', 'explicit'];
  const foundInappropriate = inappropriateTerms.filter(term => lowerPrompt.includes(term));
  
  if (foundInappropriate.length > 0) {
    issues.push('Contains inappropriate content');
    suggestions.push('Use family-friendly descriptions');
  }
  
  // Positive suggestions
  if (!lowerPrompt.includes('pixel') && !lowerPrompt.includes('retro') && !lowerPrompt.includes('8-bit')) {
    suggestions.push('Consider adding "pixel art style" for better results');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
}

/**
 * Generates a complete enhanced prompt with all options applied
 */
export function generateCompletePrompt(
  userPrompt: string,
  options: PromptEnhancementOptions
): {
  finalPrompt: string;
  originalPrompt: string;
  enhancedPrompt: string;
  appliedChanges: string[];
  validationResults: ReturnType<typeof validatePrompt>;
  confidence: number;
} {
  // Validate first
  const validation = validatePrompt(userPrompt);
  
  if (!validation.isValid) {
    throw new Error(`Prompt validation failed: ${validation.issues.join(', ')}`);
  }
  
  // Enhance the prompt
  const enhancement = enhancePrompt(userPrompt, options);
  
  return {
    finalPrompt: enhancement.enhancedPrompt,
    originalPrompt: userPrompt,
    enhancedPrompt: enhancement.enhancedPrompt,
    appliedChanges: enhancement.changes,
    validationResults: validation,
    confidence: enhancement.confidence
  };
}

/**
 * Debug function to test prompt enhancement
 */
export function debugPromptEnhancement(
  prompt: string, 
  options: PromptEnhancementOptions
): void {
  console.log('🎭 Prompt Enhancement Debug:');
  console.log('Original:', prompt);
  
  try {
    const result = generateCompletePrompt(prompt, options);
    console.log('Enhanced:', result.finalPrompt);
    console.log('Changes:', result.appliedChanges);
    console.log('Confidence:', result.confidence.toFixed(2));
    console.log('Validation:', result.validationResults);
  } catch (error) {
    console.error('Enhancement failed:', error);
  }
}