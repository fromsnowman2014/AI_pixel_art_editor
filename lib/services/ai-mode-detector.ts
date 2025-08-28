/**
 * AI Generation Mode Detection System
 * Automatically determines the best AI generation mode based on canvas state
 */

import { CanvasAnalysis } from '@/lib/core/canvas-analysis';
import { AIGenerationMode, AIGenerationContext } from '@/lib/types/canvas';

// Mode selection criteria
interface ModeSelectionCriteria {
  mode: AIGenerationMode;
  confidence: number;
  reasoning: string[];
  requirements: string[];
}

/**
 * Determines the optimal AI generation mode based on canvas analysis
 */
export function detectOptimalAIMode(
  canvasAnalysis: CanvasAnalysis | null,
  context?: Partial<AIGenerationContext>
): ModeSelectionCriteria {
  // If no canvas or empty canvas, use text-to-image
  if (!canvasAnalysis || canvasAnalysis.isEmpty) {
    return {
      mode: 'text-to-image',
      confidence: 0.95,
      reasoning: [
        'Canvas is empty',
        'No existing content to work with',
        'Best suited for creating new content'
      ],
      requirements: [
        'Descriptive prompt required',
        'Style preferences should be specified',
        'Background transparency recommended'
      ]
    };
  }

  const reasoning: string[] = [];
  const requirements: string[] = [];
  let confidence = 0.5;
  let recommendedMode: AIGenerationMode = 'text-to-image';

  // Analyze canvas content
  const { fillPercentage, hasTransparency, contentBounds, pixelDensity } = canvasAnalysis;

  // Criteria for image-to-image
  if (fillPercentage > 10) {
    recommendedMode = 'image-to-image';
    confidence += 0.3;
    reasoning.push(`Canvas has ${fillPercentage.toFixed(1)}% content`);
    
    if (fillPercentage > 30) {
      confidence += 0.2;
      reasoning.push('Substantial content present for enhancement');
    }
    
    if (hasTransparency) {
      confidence += 0.1;
      reasoning.push('Has transparency - good for refinement');
    }
    
    if (contentBounds && (contentBounds.width > 16 || contentBounds.height > 16)) {
      confidence += 0.1;
      reasoning.push('Content size suitable for enhancement');
    }
    
    requirements.push('Prompt should describe improvements');
    requirements.push('Consider preserving existing elements');
    
    if (hasTransparency) {
      requirements.push('Transparency preservation recommended');
    }
  }

  // Special cases for different fill percentages
  if (fillPercentage > 80) {
    reasoning.push('Canvas is mostly filled - enhancement mode recommended');
    requirements.push('Focus on refinement rather than major changes');
    confidence = Math.min(confidence + 0.1, 0.95);
  } else if (fillPercentage < 5) {
    // Very little content - might be better as text-to-image
    recommendedMode = 'text-to-image';
    confidence = 0.8;
    reasoning.push('Minimal content - treat as new creation');
    requirements.push('Create new content with prompt');
  }

  // Consider color complexity
  if (canvasAnalysis.dominantColors.length > 5) {
    reasoning.push('Complex color palette detected');
    if (recommendedMode === 'image-to-image') {
      requirements.push('Consider color harmony in improvements');
    }
  }

  // Pixel density considerations
  if (pixelDensity > 0.7) {
    reasoning.push('High pixel density - detailed content');
    if (recommendedMode === 'image-to-image') {
      requirements.push('Maintain detail level in enhancements');
    }
  } else if (pixelDensity < 0.2) {
    reasoning.push('Low pixel density - sparse content');
    requirements.push('Consider adding more elements');
  }

  // Context-based adjustments
  if (context?.projectSettings) {
    const { colorLimit } = context.projectSettings;
    
    if (colorLimit <= 8) {
      reasoning.push('Limited color palette project');
      requirements.push('Respect color limitations');
      
      if (canvasAnalysis.dominantColors.length >= colorLimit - 2) {
        requirements.push('Color palette is nearly full');
      }
    }
  }

  // Confidence normalization
  confidence = Math.max(0.1, Math.min(confidence, 0.95));

  return {
    mode: recommendedMode,
    confidence,
    reasoning,
    requirements
  };
}

/**
 * Gets user-friendly mode descriptions
 */
export function getModeDescription(mode: AIGenerationMode): {
  title: string;
  description: string;
  icon: string;
  pros: string[];
  cons: string[];
} {
  const descriptions = {
    'text-to-image': {
      title: 'Create New Image',
      description: 'Generate a completely new pixel art image from your text description',
      icon: '✨',
      pros: [
        'Complete creative freedom',
        'Perfect for starting new projects',
        'Consistent style generation',
        'Clean, focused results'
      ],
      cons: [
        'Cannot build on existing work',
        'Less control over specific details',
        'May not match exact vision'
      ]
    },
    'image-to-image': {
      title: 'Enhance Current Image',
      description: 'Improve and refine your existing pixel art based on your description',
      icon: '🎨',
      pros: [
        'Builds on existing work',
        'Preserves current composition',
        'More predictable results',
        'Can fix specific issues'
      ],
      cons: [
        'Limited by existing content',
        'May alter unintended areas',
        'Requires good source material'
      ]
    },
    'inpainting': {
      title: 'Edit Specific Areas',
      description: 'Modify or replace specific parts of your image while keeping the rest intact',
      icon: '🖌️',
      pros: [
        'Precise control over changes',
        'Preserves most of the image',
        'Great for fixing mistakes',
        'Surgical modifications'
      ],
      cons: [
        'Requires mask selection',
        'More complex workflow',
        'May have blend issues'
      ]
    },
    'outpainting': {
      title: 'Extend Canvas',
      description: 'Expand your image beyond its current boundaries with new content',
      icon: '📐',
      pros: [
        'Expands creative possibilities',
        'Maintains existing content',
        'Natural edge blending',
        'Great for backgrounds'
      ],
      cons: [
        'May change composition',
        'Requires careful prompting',
        'Edge artifacts possible'
      ]
    }
  };

  return descriptions[mode];
}

/**
 * Suggests alternative modes based on user intent
 */
export function suggestAlternativeModes(
  currentMode: AIGenerationMode,
  canvasAnalysis: CanvasAnalysis | null,
  userIntent?: string
): Array<{
  mode: AIGenerationMode;
  reason: string;
  confidence: number;
}> {
  const suggestions: Array<{
    mode: AIGenerationMode;
    reason: string;
    confidence: number;
  }> = [];

  if (!canvasAnalysis) {
    return suggestions;
  }

  // Analyze user intent if provided
  const intentLower = userIntent?.toLowerCase() || '';
  
  if (currentMode === 'text-to-image') {
    if (!canvasAnalysis.isEmpty) {
      suggestions.push({
        mode: 'image-to-image',
        reason: 'You have existing content that could be enhanced',
        confidence: 0.7
      });
    }
  }

  if (currentMode === 'image-to-image') {
    if (canvasAnalysis.fillPercentage < 5) {
      suggestions.push({
        mode: 'text-to-image',
        reason: 'Very little content - might be better to start fresh',
        confidence: 0.6
      });
    }
  }

  // Intent-based suggestions
  if (intentLower.includes('add') || intentLower.includes('extend')) {
    suggestions.push({
      mode: 'outpainting',
      reason: 'You want to add elements - outpainting might be suitable',
      confidence: 0.5
    });
  }

  if (intentLower.includes('fix') || intentLower.includes('change') || intentLower.includes('replace')) {
    suggestions.push({
      mode: 'inpainting',
      reason: 'You want to modify specific areas - inpainting provides precise control',
      confidence: 0.6
    });
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Validates if a mode is suitable for the current canvas state
 */
export function validateModeForCanvas(
  mode: AIGenerationMode,
  canvasAnalysis: CanvasAnalysis | null
): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!canvasAnalysis) {
    if (mode !== 'text-to-image') {
      warnings.push('No canvas data available');
      suggestions.push('Use text-to-image mode for new creations');
      return { isValid: false, warnings, suggestions };
    }
    return { isValid: true, warnings, suggestions };
  }

  switch (mode) {
    case 'text-to-image':
      if (!canvasAnalysis.isEmpty && canvasAnalysis.fillPercentage > 20) {
        warnings.push('Canvas has existing content that will be replaced');
        suggestions.push('Consider using image-to-image mode to enhance existing content');
      }
      break;

    case 'image-to-image':
      if (canvasAnalysis.isEmpty) {
        warnings.push('Canvas is empty - no content to enhance');
        suggestions.push('Use text-to-image mode to create new content');
        return { isValid: false, warnings, suggestions };
      }
      
      if (canvasAnalysis.fillPercentage < 10) {
        warnings.push('Very little content to work with');
        suggestions.push('Consider adding more content first or use text-to-image mode');
      }
      break;

    case 'inpainting':
      if (canvasAnalysis.isEmpty) {
        warnings.push('Canvas is empty - no content to modify');
        suggestions.push('Use text-to-image mode to create content first');
        return { isValid: false, warnings, suggestions };
      }
      
      suggestions.push('Select the area you want to modify');
      break;

    case 'outpainting':
      if (canvasAnalysis.isEmpty) {
        warnings.push('Canvas is empty - no content to extend from');
        suggestions.push('Create some content first using text-to-image mode');
        return { isValid: false, warnings, suggestions };
      }
      
      if (canvasAnalysis.fillPercentage > 80) {
        warnings.push('Canvas is mostly full - limited space for extension');
        suggestions.push('Consider increasing canvas size first');
      }
      break;
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions
  };
}

/**
 * Debug function for mode detection
 */
export function debugModeDetection(
  canvasAnalysis: CanvasAnalysis | null,
  context?: Partial<AIGenerationContext>
): void {
  console.log('🤖 AI Mode Detection Debug:');
  console.log('Canvas Analysis:', canvasAnalysis);
  
  if (canvasAnalysis) {
    const detection = detectOptimalAIMode(canvasAnalysis, context);
    console.log('Recommended Mode:', detection.mode);
    console.log('Confidence:', detection.confidence.toFixed(2));
    console.log('Reasoning:', detection.reasoning);
    console.log('Requirements:', detection.requirements);
    
    const alternatives = suggestAlternativeModes(detection.mode, canvasAnalysis);
    if (alternatives.length > 0) {
      console.log('Alternative Modes:', alternatives);
    }
    
    // Test all modes
    const modes: AIGenerationMode[] = ['text-to-image', 'image-to-image', 'inpainting', 'outpainting'];
    modes.forEach(mode => {
      const validation = validateModeForCanvas(mode, canvasAnalysis);
      console.log(`${mode}: ${validation.isValid ? 'Valid' : 'Invalid'}`, {
        warnings: validation.warnings,
        suggestions: validation.suggestions
      });
    });
  }
}