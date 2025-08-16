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

// Quality improvement keywords with kid-friendly descriptors
const QUALITY_KEYWORDS = [
  'high quality',
  'clean and bright',
  'sharp colorful edges',
  'well defined with simple details',
  'clear cheerful details',
  'vibrant colors',
  'friendly appearance'
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

// Background-related keywords detection
const BACKGROUND_KEYWORDS = [
  'background', 'scene', 'environment', 'setting', 'landscape', 'backdrop',
  'scenery', 'world', 'place', 'location', 'forest', 'city', 'room', 'sky',
  'ground', 'floor', 'wall', 'outdoor', 'indoor', 'nature', 'urban'
];

// Character/Subject keywords detection with kid-friendly focus
const CHARACTER_KEYWORDS = [
  'character', 'person', 'hero', 'friendly warrior', 'cute mage', 'brave knight', 'happy archer',
  'protagonist', 'avatar', 'player', 'friendly npc', 'cute enemy', 'funny boss', 'cheerful villager',
  'brave adventurer', 'curious explorer', 'kind soldier', 'helpful guard', 'friendly merchant', 'wise wizard'
];

// Object/Item keywords detection
const OBJECT_KEYWORDS = [
  'sword', 'shield', 'armor', 'weapon', 'tool', 'item', 'potion', 'gem',
  'treasure', 'coin', 'key', 'book', 'scroll', 'crystal', 'orb', 'staff',
  'bow', 'arrow', 'helmet', 'boots', 'gloves', 'ring', 'amulet', 'chest'
];

// Game-style enhancement keywords
const GAME_STYLE_KEYWORDS = [
  'game character', 'RPG style', 'fantasy character', 'retro game sprite',
  'video game character', 'pixel game art', 'indie game style', 'arcade style'
];

// Animation and GIF-specific keywords
const ANIMATION_KEYWORDS = [
  'animation', 'animated', 'movement', 'motion', 'frame', 'sequence',
  'walk', 'run', 'jump', 'attack', 'idle', 'loop', 'cycle', 'step',
  'next frame', 'continue', 'follow-up', 'progression'
];

// Game asset specific keywords
const GAME_ASSET_KEYWORDS = [
  'sprite', 'tile', 'asset', 'character sprite', 'game piece', 'token',
  'game art', 'retro gaming', '2D game', 'platformer', 'side-scroller',
  'top-down', 'isometric', 'RPG asset', 'action game', 'arcade game'
];

// Animation action keywords for prompting
const ANIMATION_ACTIONS = {
  character: [
    'walking animation', 'running animation', 'jumping animation', 'idle animation',
    'attack animation', 'death animation', 'casting spell', 'drinking potion',
    'opening door', 'climbing ladder', 'swimming', 'flying'
  ],
  object: [
    'rotating object', 'glowing effect', 'pulsing animation', 'floating animation',
    'spinning coin', 'flickering torch', 'opening chest', 'breaking apart',
    'materializing', 'dissolving', 'bouncing', 'swaying'
  ],
  effect: [
    'magic effect', 'explosion effect', 'healing effect', 'fire animation',
    'water ripple', 'wind effect', 'lightning strike', 'particle effect',
    'smoke animation', 'sparkle effect', 'energy burst', 'portal opening'
  ]
};

// Game context enhancement
const GAME_CONTEXT_KEYWORDS = [
  'suitable for games', 'game ready', 'tileable', 'seamless', 'game engine compatible',
  'sprite sheet ready', 'animation friendly', 'consistent style', 'game asset quality'
];

/**
 * Advanced prompt analysis with Chain of Thought reasoning
 */
export function analyzePrompt(prompt: string): {
  hasStyleKeywords: boolean;
  hasTransparencyKeywords: boolean;
  hasBackgroundKeywords: boolean;
  hasCharacterKeywords: boolean;
  hasObjectKeywords: boolean;
  hasAnimationKeywords: boolean;
  hasGameAssetKeywords: boolean;
  hasNegativeElements: boolean;
  subjectType: 'character' | 'object' | 'scene' | 'abstract' | 'unknown';
  animationIntent: 'frame-sequence' | 'static-sprite' | 'effect' | 'none';
  suggestedAdditions: string[];
  confidence: number;
  reasoning: string[];
} {
  const lowerPrompt = prompt.toLowerCase();
  const reasoning: string[] = [];
  
  // Step 1: Detect existing elements (CoT reasoning starts)
  reasoning.push("🧠 Chain of Thought Analysis:");
  reasoning.push(`📝 Input prompt: "${prompt}"`);
  
  // Check for existing style keywords
  const hasStyleKeywords = Object.values(STYLE_KEYWORDS).flat()
    .some(keyword => lowerPrompt.includes(keyword.toLowerCase()));
  reasoning.push(`🎨 Style keywords present: ${hasStyleKeywords ? 'YES' : 'NO'}`);
  
  // Check for transparency keywords
  const hasTransparencyKeywords = TRANSPARENCY_KEYWORDS
    .some(keyword => lowerPrompt.includes(keyword.toLowerCase()));
  reasoning.push(`🔍 Transparency keywords present: ${hasTransparencyKeywords ? 'YES' : 'NO'}`);
  
  // Check for background keywords
  const hasBackgroundKeywords = BACKGROUND_KEYWORDS
    .some(keyword => lowerPrompt.includes(keyword.toLowerCase()));
  reasoning.push(`🖼️ Background keywords present: ${hasBackgroundKeywords ? 'YES' : 'NO'}`);
  
  // Check for character keywords
  const hasCharacterKeywords = CHARACTER_KEYWORDS
    .some(keyword => lowerPrompt.includes(keyword.toLowerCase()));
  reasoning.push(`👤 Character keywords present: ${hasCharacterKeywords ? 'YES' : 'NO'}`);
  
  // Check for object keywords
  const hasObjectKeywords = OBJECT_KEYWORDS
    .some(keyword => lowerPrompt.includes(keyword.toLowerCase()));
  reasoning.push(`⚔️ Object keywords present: ${hasObjectKeywords ? 'YES' : 'NO'}`);
  
  // Check for animation keywords
  const hasAnimationKeywords = ANIMATION_KEYWORDS
    .some(keyword => lowerPrompt.includes(keyword.toLowerCase()));
  reasoning.push(`🎬 Animation keywords present: ${hasAnimationKeywords ? 'YES' : 'NO'}`);
  
  // Check for game asset keywords
  const hasGameAssetKeywords = GAME_ASSET_KEYWORDS
    .some(keyword => lowerPrompt.includes(keyword.toLowerCase()));
  reasoning.push(`🎮 Game asset keywords present: ${hasGameAssetKeywords ? 'YES' : 'NO'}`);
  
  // Check for negative elements
  const hasNegativeElements = NEGATIVE_PROMPTS
    .some(negative => lowerPrompt.includes(negative.toLowerCase()));
  reasoning.push(`❌ Negative elements present: ${hasNegativeElements ? 'YES' : 'NO'}`);
  
  // Step 2: Subject type detection (CoT reasoning)
  reasoning.push("🤔 Subject type analysis:");
  let subjectType: 'character' | 'object' | 'scene' | 'abstract' | 'unknown' = 'unknown';
  
  // Character detection patterns
  const characterPatterns = ['cat', 'dog', 'bird', 'animal', 'person', 'man', 'woman', 'child', 'baby'];
  const isLikelyCharacter = characterPatterns.some(pattern => lowerPrompt.includes(pattern)) || hasCharacterKeywords;
  
  // Object detection patterns  
  const objectPatterns = ['sword', 'shield', 'weapon', 'tool', 'item', 'house', 'building'];
  const isLikelyObject = objectPatterns.some(pattern => lowerPrompt.includes(pattern)) || hasObjectKeywords;
  
  // Scene detection patterns
  const scenePatterns = ['landscape', 'forest', 'castle', 'dungeon', 'world', 'map'];
  const isLikelyScene = scenePatterns.some(pattern => lowerPrompt.includes(pattern)) || hasBackgroundKeywords;
  
  if (isLikelyCharacter) {
    subjectType = 'character';
    reasoning.push("➡️ Detected as CHARACTER (living being, person, or animal)");
  } else if (isLikelyObject) {
    subjectType = 'object';
    reasoning.push("➡️ Detected as OBJECT (item, tool, or structure)");
  } else if (isLikelyScene) {
    subjectType = 'scene';
    reasoning.push("➡️ Detected as SCENE (environment or landscape)");
  } else if (prompt.trim().length < 10) {
    subjectType = 'abstract';
    reasoning.push("➡️ Detected as ABSTRACT (short, conceptual prompt)");
  } else {
    reasoning.push("➡️ Subject type UNKNOWN - treating as character for game context");
    subjectType = 'character'; // Default to character for game context
  }
  
  // Step 2.5: Animation intent detection (CoT reasoning for GIF creation)
  reasoning.push("🎬 Animation intent analysis:");
  let animationIntent: 'frame-sequence' | 'static-sprite' | 'effect' | 'none' = 'none';
  
  // Detect animation/frame sequence intent
  const frameSequencePatterns = ['next frame', 'continue', 'sequence', 'animation', 'follow up', 'progression'];
  const hasFrameSequenceIntent = frameSequencePatterns.some(pattern => lowerPrompt.includes(pattern));
  
  // Detect effect/particle intent
  const effectPatterns = ['effect', 'magic', 'explosion', 'particle', 'glow', 'sparkle', 'burst', 'trail'];
  const hasEffectIntent = effectPatterns.some(pattern => lowerPrompt.includes(pattern));
  
  if (hasFrameSequenceIntent || hasAnimationKeywords) {
    animationIntent = 'frame-sequence';
    reasoning.push("➡️ Animation intent: FRAME-SEQUENCE (GIF animation frame)");
  } else if (hasEffectIntent) {
    animationIntent = 'effect';
    reasoning.push("➡️ Animation intent: EFFECT (visual effect or particle)");
  } else if (hasGameAssetKeywords || subjectType === 'character' || subjectType === 'object') {
    animationIntent = 'static-sprite';
    reasoning.push("➡️ Animation intent: STATIC-SPRITE (game asset for potential animation)");
  } else {
    reasoning.push("➡️ Animation intent: NONE (static image)");
  }
  
  // Step 3: Generate intelligent suggestions (CoT reasoning)
  reasoning.push("💡 Generating optimization suggestions:");
  const suggestedAdditions: string[] = [];
  
  // Style enhancement logic with GIF/animation context
  if (!hasStyleKeywords) {
    if (subjectType === 'character') {
      if (animationIntent === 'frame-sequence') {
        suggestedAdditions.push('game character sprite', 'animation frame', 'pixel art style');
        reasoning.push("+ Adding animation character style (GIF frame + character detected)");
      } else {
        suggestedAdditions.push('game character', 'sprite', 'pixel art style');
        reasoning.push("+ Adding game character style (character detected)");
      }
    } else if (subjectType === 'object') {
      if (animationIntent === 'frame-sequence') {
        suggestedAdditions.push('animated game object', 'pixel art style');
        reasoning.push("+ Adding animated object style (GIF frame + object detected)");
      } else {
        suggestedAdditions.push('pixel art style', 'game item', 'sprite');
        reasoning.push("+ Adding game item style (object detected)");
      }
    } else {
      suggestedAdditions.push('pixel art style', 'game asset');
      reasoning.push("+ Adding basic game asset style (fallback)");
    }
  }
  
  // Background enhancement logic for GIF/game context
  if (!hasBackgroundKeywords && !hasTransparencyKeywords) {
    if (subjectType === 'character' || subjectType === 'object') {
      suggestedAdditions.push('transparent background', 'isolated subject', 'game sprite');
      reasoning.push("+ Adding transparent background (game asset - needs transparency for GIF layers)");
    } else if (subjectType === 'scene') {
      // Scene should have background, don't add transparency
      reasoning.push("- Not adding transparency (scene detected - should have background)");
    } else {
      suggestedAdditions.push('transparent background', 'game ready');
      reasoning.push("+ Adding transparent background (default for game/GIF use)");
    }
  }
  
  // Game and animation context enhancement
  if (!hasGameAssetKeywords && !lowerPrompt.includes('game')) {
    if (animationIntent === 'frame-sequence') {
      suggestedAdditions.push('game animation frame', 'sprite sequence');
      reasoning.push("+ Adding animation frame context (GIF creation intent detected)");
    } else if (subjectType === 'character') {
      suggestedAdditions.push('video game character', 'game sprite');
      reasoning.push("+ Adding game character context (character for game use)");
    } else if (subjectType === 'object') {
      suggestedAdditions.push('game object', 'game asset');
      reasoning.push("+ Adding game object context (object for game use)");
    }
  }
  
  // Animation-specific enhancements
  if (animationIntent === 'frame-sequence' && !hasAnimationKeywords) {
    suggestedAdditions.push('animation ready', 'frame consistent');
    reasoning.push("+ Adding animation consistency hints (for GIF frame sequence)");
  }
  
  // Step 4: Calculate confidence (CoT reasoning)
  reasoning.push("📊 Confidence calculation:");
  let confidence = 0.3; // Lower base confidence for stricter standards
  
  if (hasStyleKeywords) {
    confidence += 0.25;
    reasoning.push("+ 0.25 for existing style keywords");
  }
  if (hasTransparencyKeywords || hasBackgroundKeywords) {
    confidence += 0.2;
    reasoning.push("+ 0.2 for background clarity");
  }
  if (!hasNegativeElements) {
    confidence += 0.2;
    reasoning.push("+ 0.2 for no negative elements");
  }
  if (subjectType === 'character' || subjectType === 'object' || subjectType === 'scene') {
    confidence += 0.15;
    reasoning.push("+ 0.15 for clear subject identification");
  }
  if (animationIntent !== 'none') {
    confidence += 0.1;
    reasoning.push("+ 0.1 for animation context clarity");
  }
  if (hasGameAssetKeywords || hasAnimationKeywords) {
    confidence += 0.1;
    reasoning.push("+ 0.1 for game/animation keywords");
  }
  if (prompt.length > 5 && prompt.length < 150) {
    confidence += 0.1;
    reasoning.push("+ 0.1 for appropriate length");
  }
  
  confidence = Math.min(confidence, 1.0);
  reasoning.push(`📊 Final confidence: ${(confidence * 100).toFixed(0)}%`);
  
  return {
    hasStyleKeywords,
    hasTransparencyKeywords,
    hasBackgroundKeywords,
    hasCharacterKeywords,
    hasObjectKeywords,
    hasAnimationKeywords,
    hasGameAssetKeywords,
    hasNegativeElements,
    subjectType,
    animationIntent,
    suggestedAdditions,
    confidence,
    reasoning
  };
}

/**
 * Enhanced prompt optimization with intelligent CoT reasoning
 */
export function enhancePrompt(
  originalPrompt: string, 
  options: PromptEnhancementOptions
): {
  enhancedPrompt: string;
  changes: string[];
  confidence: number;
  reasoning: string[];
} {
  if (!originalPrompt.trim()) {
    throw new Error('Prompt cannot be empty');
  }
  
  // Advanced CoT analysis
  const analysis = analyzePrompt(originalPrompt);
  const changes: string[] = [];
  const reasoning: string[] = [...analysis.reasoning]; // Include analysis reasoning
  let enhancedPrompt = originalPrompt.trim();
  
  reasoning.push(""); // Add separator
  reasoning.push("🚀 Enhancement Process:");
  
  // Intelligent style enhancement based on CoT analysis with GIF/animation context
  if (!analysis.hasStyleKeywords) {
    reasoning.push("🎨 Style enhancement needed...");
    
    if (analysis.subjectType === 'character') {
      if (analysis.animationIntent === 'frame-sequence') {
        // Character animation frame for GIF with enhanced descriptors
        enhancedPrompt += ', cheerful game character sprite, colorful animation frame, detailed pixel art style, bright sprite sheet ready';
        changes.push('Added animation character style with mood and color details (CoT: GIF frame + character)');
        reasoning.push("+ Applied animation character style with enhanced mood and color descriptors for GIF creation");
      } else {
        // Static character sprite with enhanced descriptors
        enhancedPrompt += ', friendly video game character, colorful character sprite, detailed pixel art style, bright and cheerful, game ready';
        changes.push('Added game character style with mood and color details (CoT: character for game use)');
        reasoning.push("+ Applied character-focused game sprite style with enhanced mood and color descriptors");
      }
    } else if (analysis.subjectType === 'object') {
      if (analysis.animationIntent === 'frame-sequence') {
        // Animated object for GIF with enhanced descriptors
        enhancedPrompt += ', colorful animated game object, bright object sprite, detailed pixel art style, cheerful animation frame';
        changes.push('Added animated object style with mood and color details (CoT: GIF frame + object)');
        reasoning.push("+ Applied animated object style with enhanced mood and color descriptors for GIF creation");
      } else {
        // Static object sprite with enhanced descriptors  
        enhancedPrompt += ', colorful pixel art style, bright game item sprite, cheerful retro gaming asset, friendly game object';
        changes.push('Added game item style with mood and color details (CoT: object for game use)');
        reasoning.push("+ Applied object-focused game asset style with enhanced mood and color descriptors");
      }
    } else if (analysis.subjectType === 'scene') {
      // Scene/background for game with enhanced descriptors
      enhancedPrompt += ', colorful pixel art style, bright retro game environment, cheerful 16-bit background, detailed friendly game scene';
      changes.push('Added game environment style with mood and color details (CoT: scene for game background)');
      reasoning.push("+ Applied scene-focused game environment style with enhanced mood and color descriptors");
    } else {
      // Default with game context and enhanced descriptors
      enhancedPrompt += ', bright pixel art style, colorful game asset, cheerful sprite art, friendly retro gaming style';
      changes.push('Added game asset style with mood and color details (CoT: fallback with game context)');
      reasoning.push("+ Applied fallback game asset style with enhanced mood and color descriptors");
    }
  } else {
    reasoning.push("✅ Style keywords already present - no enhancement needed");
  }
  
  // Intelligent background handling for GIF/game asset creation
  if (!analysis.hasBackgroundKeywords && !analysis.hasTransparencyKeywords) {
    reasoning.push("🖼️ Background enhancement needed for GIF/game use...");
    
    if (analysis.subjectType === 'character' || analysis.subjectType === 'object') {
      if (analysis.animationIntent === 'frame-sequence') {
        // Animation frames MUST have transparent backgrounds for GIF layering
        enhancedPrompt += ', transparent background, isolated subject, no background, animation frame ready, GIF compatible';
        changes.push('Added animation transparency (CoT: GIF frame needs transparent background)');
        reasoning.push("+ Applied transparent background for GIF frame layering");
      } else {
        // Game sprites need transparency for compositing
        enhancedPrompt += ', transparent background, isolated subject, no background, sprite ready, game compatible';
        changes.push('Added sprite transparency (CoT: game sprite needs transparent background)');
        reasoning.push("+ Applied transparent background for game sprite compositing");
      }
    } else if (analysis.subjectType === 'scene') {
      // Scenes should have backgrounds but be game-ready
      enhancedPrompt += ', detailed background, complete scene, game environment, tileable edges';
      changes.push('Added game scene background (CoT: scene needs environment for game world)');
      reasoning.push("+ Applied game environment background (scenes for game worlds)");
    } else {
      // Default to transparent for any GIF/game use
      enhancedPrompt += ', transparent background, isolated subject, game ready, GIF ready';
      changes.push('Added universal transparency (CoT: default for GIF/game compatibility)');
      reasoning.push("+ Applied universal transparent background for GIF/game use");
    }
  } else if (options.enforceTransparency && !analysis.hasTransparencyKeywords) {
    enhancedPrompt += ', transparent background, no background, isolated subject, GIF compatible';
    changes.push('Added enforced transparency with GIF compatibility');
    reasoning.push("+ Applied enforced transparency with GIF/game optimization");
  } else {
    reasoning.push("✅ Background context already clear - no enhancement needed");
  }
  
  // Mode-specific intelligent enhancements
  reasoning.push(`🔧 Mode-specific enhancement for: ${options.mode}`);
  switch (options.mode) {
    case 'text-to-image':
      // For new images, add quality and game context with mood and color details
      if (!enhancedPrompt.includes('clean') && !enhancedPrompt.includes('sharp')) {
        enhancedPrompt += ', clean bright pixels, sharp colorful edges, crisp cheerful details';
        changes.push('Added quality keywords with mood and color details for new image');
        reasoning.push("+ Added quality enhancement with mood and color descriptors for new generation");
      }
      
      // Add game context if it's a character with enhanced descriptors
      if (analysis.subjectType === 'character' && !enhancedPrompt.toLowerCase().includes('game')) {
        enhancedPrompt += ', suitable for cheerful video games, bright and friendly';
        changes.push('Added game context with mood details for character');
        reasoning.push("+ Added game context with mood descriptors for character use");
      }
      break;
      
    case 'image-to-image':
      // For GIF frame creation: enhance based on subject and animation intent
      if (analysis.animationIntent === 'frame-sequence') {
        // This is for creating the next frame in a GIF sequence
        if (analysis.subjectType === 'character') {
          enhancedPrompt = `create next animation frame of this pixel art character: ${enhancedPrompt}`;
          enhancedPrompt += ', continue animation sequence, maintain character consistency, next movement frame, smooth animation transition';
        } else if (analysis.subjectType === 'object') {
          enhancedPrompt = `create next animation frame of this pixel art object: ${enhancedPrompt}`;
          enhancedPrompt += ', continue object animation, maintain object consistency, next animation state, smooth transition';
        } else {
          enhancedPrompt = `create next frame in animation sequence: ${enhancedPrompt}`;
          enhancedPrompt += ', continue animation, maintain consistency, next frame, smooth progression';
        }
        changes.push('Added GIF frame sequence instructions (CoT: animation frame creation)');
        reasoning.push("+ Applied GIF frame sequence optimization for animation continuity");
      } else {
        // Standard improvement for static sprites
        if (analysis.subjectType === 'character') {
          enhancedPrompt = `improve this game character sprite: ${enhancedPrompt}`;
          enhancedPrompt += ', enhance character details, maintain sprite consistency, improve game readiness';
        } else if (analysis.subjectType === 'object') {
          enhancedPrompt = `improve this game object sprite: ${enhancedPrompt}`;
          enhancedPrompt += ', enhance object details, maintain sprite consistency, improve game asset quality';
        } else {
          enhancedPrompt = `improve this game sprite: ${enhancedPrompt}`;
          enhancedPrompt += ', maintain pixel art style, enhance game asset quality';
        }
        changes.push('Added game sprite improvement instructions (CoT: game asset enhancement)');
        reasoning.push("+ Applied game sprite enhancement for better game asset quality");
      }
      
      // Use canvas analysis for GIF/game context
      if (options.canvasAnalysis) {
        if (options.canvasAnalysis.dominantColors.length > 0 && options.preserveExistingColors) {
          enhancedPrompt += ', preserve existing color palette, maintain color consistency';
          changes.push('Added color preservation for animation consistency');
          reasoning.push("+ Added color preservation for GIF/animation consistency");
        }
        
        if (options.canvasAnalysis.hasTransparency) {
          enhancedPrompt += ', maintain transparency, preserve transparent background';
          changes.push('Added transparency preservation for GIF layering');
          reasoning.push("+ Added transparency preservation for GIF frame compatibility");
        }
      }
      break;
  }
  
  // Add enhanced negative prompts for game/GIF optimization
  if (options.style === 'pixel-art') {
    if (analysis.animationIntent === 'frame-sequence') {
      enhancedPrompt += '. Avoid: blurry, antialiased, smooth gradients, photorealistic, inconsistent style, frame jumping, motion blur, different art style';
      changes.push('Added animation-specific negative prompts');
      reasoning.push("+ Added negative prompts for GIF animation consistency");
    } else {
      enhancedPrompt += '. Avoid: blurry, antialiased, smooth gradients, photorealistic, high detail textures, non-game style, realistic lighting, complex shadows';
      changes.push('Added game-optimized negative prompts');
      reasoning.push("+ Added negative prompts for game sprite quality");
    }
  }
  
  // Final cleanup and optimization
  reasoning.push("🧹 Final cleanup and optimization:");
  enhancedPrompt = enhancedPrompt
    .replace(/,\s*,/g, ',') // Remove double commas
    .replace(/\s+/g, ' ')   // Normalize spaces
    .replace(/,\s*\./g, '.') // Fix comma before period
    .trim();
  reasoning.push("+ Cleaned up formatting and spacing");
  
  reasoning.push(""); // Add separator
  reasoning.push(`✨ Enhancement complete! Applied ${changes.length} optimizations.`);
  reasoning.push(`📊 Final confidence: ${(analysis.confidence * 100).toFixed(0)}%`);
  
  return {
    enhancedPrompt,
    changes,
    confidence: analysis.confidence,
    reasoning
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
      'cute orange cat character with happy expression and simple details',
      'simple cozy house with bright green garden and colorful flowers',
      'magical fantasy sword with bright blue handle and detailed golden shield',
      'colorful flower bouquet with pink roses and cheerful yellow daisies',
      'friendly retro spaceship with silver details and happy pilot window',
      'magical potion bottle with glowing purple liquid and sparkly details',
      'happy cartoon food items with colorful simple designs and cute faces',
      'smiling bright yellow sun with fluffy white clouds and cheerful sky'
    ],
    'image-to-image': [
      'add more colorful details with bright cheerful colors',
      'improve colors with happy vibrant tones and simple shading',
      'add simple background elements with friendly atmosphere',
      'enhance with magical glowing effects and warm lighting',
      'add cute decorative patterns with colorful simple designs',
      'improve character expression to look more happy and friendly',
      'add detailed environmental elements with bright colors',
      'refine edges and cleanup with crisp pixel art style'
    ]
  };
  
  let suggestions = baseSuggestions[mode as 'text-to-image' | 'image-to-image'] || baseSuggestions['text-to-image'];
  
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
 * Generates a complete enhanced prompt with all options applied and CoT reasoning
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
  reasoning: string[];
} {
  // Validate first
  const validation = validatePrompt(userPrompt);
  
  if (!validation.isValid) {
    throw new Error(`Prompt validation failed: ${validation.issues.join(', ')}`);
  }
  
  // Enhance the prompt with CoT reasoning
  const enhancement = enhancePrompt(userPrompt, options);
  
  return {
    finalPrompt: enhancement.enhancedPrompt,
    originalPrompt: userPrompt,
    enhancedPrompt: enhancement.enhancedPrompt,
    appliedChanges: enhancement.changes,
    validationResults: validation,
    confidence: enhancement.confidence,
    reasoning: enhancement.reasoning
  };
}

// Guided prompt option type definitions
export interface GuidedPromptOptions {
  background: 'transparent' | 'included';
  characterType: 'game' | 'profile'; 
  artStyle: 'simple' | 'detailed';
  colorTone: 'bright' | 'dark';
}

/**
 * Applies guided prompt options to enhance user input with specific style choices
 */
export function applyGuidedPromptOptions(
  userPrompt: string,
  guidedOptions: GuidedPromptOptions
): {
  enhancedPrompt: string;
  appliedOptions: string[];
  reasoning: string[];
} {
  const appliedOptions: string[] = [];
  const reasoning: string[] = [];
  let enhancedPrompt = userPrompt.trim();
  
  reasoning.push("🎯 Guided Prompt Enhancement:");
  reasoning.push(`📝 User input: "${userPrompt}"`);
  reasoning.push(`🎨 Selected options: ${JSON.stringify(guidedOptions)}`);
  reasoning.push("");
  
  // Background setting
  reasoning.push("🖼️ Background enhancement:");
  if (guidedOptions.background === 'transparent') {
    enhancedPrompt += ', transparent background, isolated subject, no background, sprite ready';
    appliedOptions.push('Transparent Background');
    reasoning.push("+ Applied transparent background for sprite/character isolation");
  } else {
    enhancedPrompt += ', detailed background, complete scene, environmental setting';
    appliedOptions.push('Background Included');
    reasoning.push("+ Applied background inclusion for complete scene");
  }
  
  // Character type setting
  reasoning.push("👤 Character type enhancement:");
  if (guidedOptions.characterType === 'game') {
    enhancedPrompt += ', game character sprite, video game character, RPG style character, retro game sprite';
    appliedOptions.push('Game Character');
    reasoning.push("+ Applied game character styling for retro gaming context");
  } else {
    enhancedPrompt += ', character portrait, profile view, personal avatar, character design';
    appliedOptions.push('Profile Character');
    reasoning.push("+ Applied profile character styling for personal representation");
  }
  
  // Art style setting
  reasoning.push("🎨 Art style enhancement:");
  if (guidedOptions.artStyle === 'simple') {
    enhancedPrompt += ', simple pixel art style, minimal detail, clean shapes, basic forms, easy to understand';
    appliedOptions.push('Simple Style');
    reasoning.push("+ Applied simple art style for clean, readable pixel art");
  } else {
    enhancedPrompt += ', detailed pixel art style, rich details, complex shading, intricate design, elaborate features';
    appliedOptions.push('Detailed Style');
    reasoning.push("+ Applied detailed art style for complex, rich pixel art");
  }
  
  // Color tone setting
  reasoning.push("🌈 Color tone enhancement:");
  if (guidedOptions.colorTone === 'bright') {
    enhancedPrompt += ', bright vibrant colors, cheerful palette, happy colors, light and colorful, sunny atmosphere';
    appliedOptions.push('Bright Colors');
    reasoning.push("+ Applied bright color palette for cheerful, vibrant appearance");
  } else {
    enhancedPrompt += ', dark atmospheric colors, moody palette, deep colors, shadowy tones, dramatic atmosphere';
    appliedOptions.push('Dark Colors');
    reasoning.push("+ Applied dark color palette for moody, atmospheric appearance");
  }
  
  // Add pixel art fundamentals
  enhancedPrompt += ', pixel art style, crisp pixels, retro gaming style';
  appliedOptions.push('Pixel Art Style');
  reasoning.push("+ Added fundamental pixel art styling");
  
  // Cleanup
  enhancedPrompt = enhancedPrompt
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
  
  reasoning.push("");
  reasoning.push(`✨ Guided enhancement complete! Applied ${appliedOptions.length} options.`);
  reasoning.push(`📊 Final prompt: "${enhancedPrompt}"`);
  
  return {
    enhancedPrompt,
    appliedOptions,
    reasoning
  };
}

/**
 * Combined function that applies guided options and then enhances with existing logic
 */
export function generateGuidedPrompt(
  userPrompt: string,
  guidedOptions: GuidedPromptOptions,
  enhancementOptions: PromptEnhancementOptions
): {
  finalPrompt: string;
  originalPrompt: string;
  guidedPrompt: string;
  fullyEnhancedPrompt: string;
  appliedGuidedOptions: string[];
  enhancementChanges: string[];
  confidence: number;
  reasoning: string[];
} {
  // Step 1: Apply guided options
  const guidedResult = applyGuidedPromptOptions(userPrompt, guidedOptions);
  
  // Step 2: Apply existing enhancement logic
  const enhancementResult = enhancePrompt(guidedResult.enhancedPrompt, enhancementOptions);
  
  // Combine reasoning
  const combinedReasoning = [
    ...guidedResult.reasoning,
    "",
    "🔄 Applying additional AI enhancement...",
    ...enhancementResult.reasoning
  ];
  
  return {
    finalPrompt: enhancementResult.enhancedPrompt,
    originalPrompt: userPrompt,
    guidedPrompt: guidedResult.enhancedPrompt,
    fullyEnhancedPrompt: enhancementResult.enhancedPrompt,
    appliedGuidedOptions: guidedResult.appliedOptions,
    enhancementChanges: enhancementResult.changes,
    confidence: enhancementResult.confidence,
    reasoning: combinedReasoning
  };
}

/**
 * Debug function to test prompt enhancement with CoT reasoning
 */
export function debugPromptEnhancement(
  prompt: string, 
  options: PromptEnhancementOptions
): void {
  console.log('🎭 Enhanced Prompt Analysis Debug:');
  console.log('Original:', prompt);
  console.log('Options:', options);
  console.log('');
  
  try {
    const result = generateCompletePrompt(prompt, options);
    
    // Display CoT reasoning step by step
    console.log('🧠 Chain of Thought Reasoning:');
    result.reasoning.forEach(line => console.log(line));
    console.log('');
    
    console.log('📊 Final Results:');
    console.log('Original:', result.originalPrompt);
    console.log('Enhanced:', result.finalPrompt);
    console.log('Applied Changes:', result.appliedChanges);
    console.log('Confidence:', (result.confidence * 100).toFixed(0) + '%');
    console.log('Validation:', result.validationResults.isValid ? 'PASSED' : 'FAILED');
    
    if (!result.validationResults.isValid) {
      console.log('Validation Issues:', result.validationResults.issues);
    }
    
  } catch (error) {
    console.error('❌ Enhancement failed:', error);
  }
}