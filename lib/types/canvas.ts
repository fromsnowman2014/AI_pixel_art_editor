/**
 * Canvas and AI Generation related types
 */
import { CanvasAnalysis } from '@/lib/core/canvas-analysis';

// AI Generation Modes
export type AIGenerationMode = 
  | 'text-to-image'    // 빈 캔버스 → 새로운 이미지
  | 'image-to-image'   // 기존 캔버스 → 개선된 이미지
  | 'inpainting'       // 부분 영역 수정 (향후 확장)
  | 'outpainting';     // 캔버스 확장 (향후 확장)

// Canvas State Interface
export interface CanvasState {
  isEmpty: boolean;
  hasContent: boolean;
  lastModified: Date;
  contentHash: string; // 캔버스 변경 감지용
  analysis: CanvasAnalysis | null; // 캔버스 분석 결과
}

// Enhanced AI Generation Request
export interface EnhancedAIGenerateRequest {
  prompt: string;
  mode: AIGenerationMode;
  width: number;
  height: number;
  colorLimit: number;
  
  // Image-to-image specific
  inputImage?: string; // base64 encoded image
  strength?: number;   // 0.1-1.0, 입력 이미지 영향도
  
  // Style and background options
  style: 'pixel-art' | 'low-res' | 'retro';
  preserveTransparency?: boolean;
  enforceTransparentBackground?: boolean;
  
  // Advanced options (for future)
  seed?: number;
  guidanceScale?: number; // CFG scale
  negativePrompt?: string;
}

// Prompt Enhancement Options
export interface PromptEnhancementOptions {
  enforceTransparency: boolean;
  mode: AIGenerationMode;
  canvasAnalysis?: CanvasAnalysis;
  style: 'pixel-art' | 'low-res' | 'retro';
  preserveExistingColors?: boolean;
}

// AI Generation Context
export interface AIGenerationContext {
  canvasState: CanvasState;
  projectSettings: {
    width: number;
    height: number;
    colorLimit: number;
    palette: string[];
  };
  userPreferences: {
    defaultStyle: string;
    alwaysTransparent: boolean;
    autoEnhancePrompts: boolean;
  };
}

// Generation Result with Metadata
export interface AIGenerationResult {
  imageUrl: string; // base64 or URL
  originalPrompt: string;
  enhancedPrompt: string;
  mode: AIGenerationMode;
  settings: EnhancedAIGenerateRequest;
  metadata: {
    generationTime: number;
    model: string;
    seed?: number;
    beforeImage?: string; // for image-to-image
  };
}

// Canvas Operation Types
export type CanvasOperation = 
  | 'draw'
  | 'erase' 
  | 'fill'
  | 'ai-generate'
  | 'ai-enhance'
  | 'import'
  | 'clear';

// Canvas History Entry
export interface CanvasHistoryEntry {
  id: string;
  operation: CanvasOperation;
  timestamp: Date;
  beforeState: {
    imageData: string; // base64 encoded ImageData
    analysis: CanvasAnalysis;
  };
  afterState: {
    imageData: string;
    analysis: CanvasAnalysis;
  };
  metadata?: {
    aiRequest?: EnhancedAIGenerateRequest;
    aiResult?: AIGenerationResult;
    toolUsed?: string;
    brushSize?: number;
  };
}

// AI Generation Status
export type AIGenerationStatus = 
  | 'idle'
  | 'analyzing-canvas'
  | 'enhancing-prompt'
  | 'generating'
  | 'processing-result'
  | 'applying-to-canvas'
  | 'completed'
  | 'error';

// AI Generation Progress
export interface AIGenerationProgress {
  status: AIGenerationStatus;
  stage: string;
  progress: number; // 0-100
  estimatedTimeRemaining?: number;
  canCancel: boolean;
  error?: string;
}

// Canvas Event Types
export interface CanvasEvents {
  onCanvasChange: (analysis: CanvasAnalysis) => void;
  onAIGenerationStart: (request: EnhancedAIGenerateRequest) => void;
  onAIGenerationProgress: (progress: AIGenerationProgress) => void;
  onAIGenerationComplete: (result: AIGenerationResult) => void;
  onAIGenerationError: (error: string) => void;
}