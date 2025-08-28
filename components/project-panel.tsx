'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ExportModal } from '@/components/export-modal';
import { api } from '@/lib/api/client';
import toast from 'react-hot-toast';
import { debugLog } from '@/lib/ui/debug';
import { generateGuidedPrompt, type GuidedPromptOptions } from '@/lib/services/prompt-enhancer';
import {
  Settings,
  Download,
  Upload,
  Sparkles,
  AlertTriangle,
  Save,
  Trash2,
} from 'lucide-react';

interface ProjectPanelProps {
  className?: string;
}

// Constants for validation
const CANVAS_SIZE_LIMITS = {
  MIN: 8,
  MAX: 128,
} as const;

const COLOR_LIMIT_RANGE = {
  MIN: 4,
  MAX: 64,
} as const;

const AI_PROMPT_LIMITS = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 500,
} as const;

// Utility functions
const validateCanvasSize = (size: number): boolean => {
  return Number.isInteger(size) && size >= CANVAS_SIZE_LIMITS.MIN && size <= CANVAS_SIZE_LIMITS.MAX;
};

const parseCanvasSize = (value: string | number): number | string => {
  if (typeof value === 'string') {
    // Allow empty string for user to start fresh input
    if (value.trim() === '') return '';
    
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return '';
    return numValue;
  }
  return value;
};

const ProjectPanel = memo(function ProjectPanel({ className }: ProjectPanelProps) {
  const {
    activeTabId,
    getActiveTab,
    updateProject,
    exportProject,
    saveProject,
    addFrame,
    updateCanvasData,
  } = useProjectStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);

  // AI Guided Prompt Options State - Updated for compact checkbox layout
  const [guidedOptions, setGuidedOptions] = useState({
    background: 'transparent' as 'transparent' | 'included',
    characterType: 'game' as 'game' | 'profile', 
    artStyle: 'simple' as 'simple' | 'detailed',
    colorTone: 'bright' as 'bright' | 'dark'
  });

  // Compact checkbox state (derived from guidedOptions)
  const [compactStyleOptions, setCompactStyleOptions] = useState({
    transparentBg: true,
    gameCharacter: true,
    detailedArt: false,
    brightColors: true,
    addEffects: false,
    highContrast: false
  });

  const activeTab = getActiveTab();
  const project = activeTab?.project;

  // Canvas dimension state for deferred application (allow string for empty input)
  const [pendingWidth, setPendingWidth] = useState<number | string>(() => project?.width || 32);
  const [pendingHeight, setPendingHeight] = useState<number | string>(() => project?.height || 32);
  const [showResizeConfirm, setShowResizeConfirm] = useState(false);

  // Update pending dimensions when project changes
  React.useEffect(() => {
    if (project) {
      setPendingWidth(project.width);
      setPendingHeight(project.height);
    }
  }, [project]);

  // All callback hooks must be defined before any conditional returns
  const handleNameChange = useCallback((name: string) => {
    if (activeTabId) {
      updateProject(activeTabId, { name });
    }
  }, [activeTabId, updateProject]);

  const handleDimensionChange = useCallback((width: number, height: number) => {
    if (!activeTabId) return;
    
    // Validate dimensions before applying
    if (!validateCanvasSize(width) || !validateCanvasSize(height)) {
      toast.error(`Canvas size must be between ${CANVAS_SIZE_LIMITS.MIN} and ${CANVAS_SIZE_LIMITS.MAX} pixels`);
      return;
    }
    
    updateProject(activeTabId, { width, height });
  }, [activeTabId, updateProject]);

  const handleColorLimitChange = useCallback((colorLimit: number) => {
    if (!activeTabId) return;
    
    const validatedColorLimit = Math.max(COLOR_LIMIT_RANGE.MIN, Math.min(COLOR_LIMIT_RANGE.MAX, colorLimit));
    
    if (validatedColorLimit !== colorLimit) {
      toast.error(`Color limit must be between ${COLOR_LIMIT_RANGE.MIN} and ${COLOR_LIMIT_RANGE.MAX}`);
    }
    
    updateProject(activeTabId, { colorLimit: validatedColorLimit });
  }, [activeTabId, updateProject]);


  // Check if canvas has any content
  const isCanvasEmpty = useCallback(() => {
    if (!activeTab?.canvasData) {
      debugLog(
        '🎛️  ProjectPanel',
        'CANVAS_EMPTY_CHECK',
        'No canvas data found',
        { tabId: activeTabId }
      );
      return true;
    }

    const { data } = activeTab.canvasData;
    if (!data) return true; // No data means empty canvas
    
    // Check for any non-transparent pixels (optimized loop)
    for (let i = 3; i < data.length; i += 4) {
      const alphaValue = data[i];
      if (alphaValue !== undefined && alphaValue > 0) {
        debugLog(
          '🎛️  ProjectPanel',
          'CANVAS_EMPTY_CHECK',
          'Canvas has content',
          { tabId: activeTabId, dataLength: data.length }
        );
        return false;
      }
    }

    debugLog(
      '🎛️  ProjectPanel',
      'CANVAS_EMPTY_CHECK',
      'Canvas is empty',
      { tabId: activeTabId, dataLength: data.length }
    );

    return true;
  }, [activeTab?.canvasData, activeTabId]);

  // Get canvas empty state (memoized)
  const canvasIsEmpty = useMemo(() => isCanvasEmpty(), [isCanvasEmpty]);

  // Handle blur events to auto-correct values
  const handleWidthBlur = useCallback(() => {
    if (typeof pendingWidth === 'string' && pendingWidth.trim() === '') {
      return; // Keep empty for user convenience
    }
    
    const numValue = typeof pendingWidth === 'string' ? parseInt(pendingWidth, 10) : pendingWidth;
    if (isNaN(numValue)) {
      setPendingWidth(project?.width || CANVAS_SIZE_LIMITS.MIN);
      return;
    }
    
    // Auto-correct to valid range
    const correctedValue = Math.max(CANVAS_SIZE_LIMITS.MIN, Math.min(CANVAS_SIZE_LIMITS.MAX, numValue));
    if (correctedValue !== numValue) {
      setPendingWidth(correctedValue);
      toast.success(`Width adjusted to valid range: ${correctedValue}`);
    }
  }, [pendingWidth, project?.width]);

  const handleHeightBlur = useCallback(() => {
    if (typeof pendingHeight === 'string' && pendingHeight.trim() === '') {
      return; // Keep empty for user convenience
    }
    
    const numValue = typeof pendingHeight === 'string' ? parseInt(pendingHeight, 10) : pendingHeight;
    if (isNaN(numValue)) {
      setPendingHeight(project?.height || CANVAS_SIZE_LIMITS.MIN);
      return;
    }
    
    // Auto-correct to valid range
    const correctedValue = Math.max(CANVAS_SIZE_LIMITS.MIN, Math.min(CANVAS_SIZE_LIMITS.MAX, numValue));
    if (correctedValue !== numValue) {
      setPendingHeight(correctedValue);
      toast.success(`Height adjusted to valid range: ${correctedValue}`);
    }
  }, [pendingHeight, project?.height]);

  // Check if pending dimensions are valid for applying
  const arePendingDimensionsValid = useMemo(() => {
    const widthNum = typeof pendingWidth === 'string' ? parseInt(pendingWidth, 10) : pendingWidth;
    const heightNum = typeof pendingHeight === 'string' ? parseInt(pendingHeight, 10) : pendingHeight;
    return validateCanvasSize(widthNum) && validateCanvasSize(heightNum);
  }, [pendingWidth, pendingHeight]);

  // Check if dimensions have changed
  const haveDimensionsChanged = useMemo(() => {
    const widthNum = typeof pendingWidth === 'string' ? parseInt(pendingWidth, 10) : pendingWidth;
    const heightNum = typeof pendingHeight === 'string' ? parseInt(pendingHeight, 10) : pendingHeight;
    return widthNum !== project?.width || heightNum !== project?.height;
  }, [pendingWidth, pendingHeight, project?.width, project?.height]);

  // Handle apply dimensions with content check
  const handleApplyDimensions = useCallback(() => {
    if (!project) return;
    
    const widthNum = typeof pendingWidth === 'string' ? parseInt(pendingWidth, 10) : pendingWidth;
    const heightNum = typeof pendingHeight === 'string' ? parseInt(pendingHeight, 10) : pendingHeight;
    
    if (isNaN(widthNum) || isNaN(heightNum)) {
      toast.error('Please enter valid numbers for width and height');
      return;
    }
    
    debugLog(
      '🎛️  ProjectPanel',
      'APPLY_DIMENSIONS_START',
      'Apply dimensions requested',
      {
        currentSize: `${project.width}x${project.height}`,
        newSize: `${widthNum}x${heightNum}`,
        activeTabId: activeTabId,
      }
    );

    if (canvasIsEmpty) {
      // Canvas is empty, apply directly
      debugLog(
        '🎛️  ProjectPanel',
        'APPLY_DIMENSIONS_DIRECT',
        'Canvas is empty, applying directly'
      );
      handleDimensionChange(widthNum, heightNum);
    } else {
      // Canvas has content, show confirmation modal
      debugLog(
        '🎛️  ProjectPanel',
        'APPLY_DIMENSIONS_CONFIRM',
        'Canvas has content, showing confirmation modal'
      );
      setShowResizeConfirm(true);
    }
  }, [project, canvasIsEmpty, pendingWidth, pendingHeight, handleDimensionChange, activeTabId]);

  // Handle resize confirmation actions
  const handleResizeWithSave = useCallback(async () => {
    if (!activeTabId) return;
    debugLog(
      '🎛️  ProjectPanel',
      'RESIZE_WITH_SAVE',
      'User chose to save before resizing'
    );

    // Save current project first
    try {
      await saveProject(activeTabId);
      debugLog(
        '🎛️  ProjectPanel',
        'RESIZE_SAVE_SUCCESS',
        'Project saved successfully before resize'
      );
    } catch (error) {
      debugLog(
        '🎛️  ProjectPanel',
        'RESIZE_SAVE_ERROR',
        'Failed to save project before resize',
        error
      );
      // Continue with resize even if save fails
    }

    // Apply new dimensions while preserving existing canvas content
    const widthNum = typeof pendingWidth === 'string' ? parseInt(pendingWidth, 10) : pendingWidth;
    const heightNum = typeof pendingHeight === 'string' ? parseInt(pendingHeight, 10) : pendingHeight;
    handleDimensionChange(widthNum, heightNum);
    setShowResizeConfirm(false);
  }, [activeTabId, saveProject, pendingWidth, pendingHeight, handleDimensionChange]);

  const handleResizeWithDiscard = useCallback(() => {
    debugLog(
      '🎛️  ProjectPanel',
      'RESIZE_WITH_DISCARD',
      'User chose to discard changes and resize'
    );

    if (!activeTabId || !project) return;

    const widthNum = typeof pendingWidth === 'string' ? parseInt(pendingWidth, 10) : pendingWidth;
    const heightNum = typeof pendingHeight === 'string' ? parseInt(pendingHeight, 10) : pendingHeight;

    // First update project dimensions
    updateProject(activeTabId, { 
      width: widthNum, 
      height: heightNum 
    });

    // Then clear canvas by creating empty pixel data
    const emptyCanvasData = {
      width: widthNum,
      height: heightNum,
      data: new Uint8ClampedArray(widthNum * heightNum * 4) // RGBA, all transparent
    };

    // Update canvas with empty data
    updateCanvasData(activeTabId, emptyCanvasData);

    debugLog(
      '🎛️  ProjectPanel',
      'RESIZE_DISCARD_SUCCESS',
      'Canvas cleared and resized',
      {
        newSize: `${widthNum}x${heightNum}`,
        dataLength: emptyCanvasData.data.length
      }
    );

    setShowResizeConfirm(false);
  }, [activeTabId, project, pendingWidth, pendingHeight, updateProject, updateCanvasData]);

  const handleResizeCancel = useCallback(() => {
    debugLog(
      '🎛️  ProjectPanel',
      'RESIZE_CANCEL',
      'User cancelled resize operation'
    );

    // Reset pending dimensions to current project dimensions
    if (project) {
      setPendingWidth(project.width);
      setPendingHeight(project.height);
    }
    setShowResizeConfirm(false);
  }, [project]);

  // Toggle option handler
  // Handler for compact style options
  const handleCompactStyleChange = useCallback((optionKey: keyof typeof compactStyleOptions, checked: boolean) => {
    setCompactStyleOptions(prev => ({
      ...prev,
      [optionKey]: checked
    }));

    // Update guidedOptions based on compact style selections
    if (optionKey === 'transparentBg') {
      setGuidedOptions(prev => ({
        ...prev,
        background: checked ? 'transparent' : 'included'
      }));
    } else if (optionKey === 'gameCharacter') {
      setGuidedOptions(prev => ({
        ...prev,
        characterType: checked ? 'game' : 'profile'
      }));
    } else if (optionKey === 'detailedArt') {
      setGuidedOptions(prev => ({
        ...prev,
        artStyle: checked ? 'detailed' : 'simple'
      }));
    } else if (optionKey === 'brightColors') {
      setGuidedOptions(prev => ({
        ...prev,
        colorTone: checked ? 'bright' : 'dark'
      }));
    }
  }, []);

  const handleGuidedOptionChange = useCallback((category: keyof typeof guidedOptions, value: any) => {
    setGuidedOptions(prev => ({
      ...prev,
      [category]: value
    }));
  }, []);

  // Toggle Switch Component
  // Compact Style Option Component using checkboxes for space efficiency
  const StyleOption = ({ id, label, emoji, checked, onChange, tooltip }: {
    id: string;
    label: string;
    emoji: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    tooltip?: string;
  }) => (
    <label className="flex items-center gap-2 cursor-pointer group" title={tooltip}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 transition-colors"
        aria-label={`${label} option`}
      />
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
        <span className="mr-1" aria-hidden="true">{emoji}</span>
        {label}
      </span>
    </label>
  );

  // Legacy ToggleSwitch for compatibility (if still needed elsewhere)
  const ToggleSwitch = ({ label, emoji, leftOption, rightOption, value, onChange }: {
    label: string;
    emoji: string;
    leftOption: { key: string; label: string };
    rightOption: { key: string; label: string };
    value: string;
    onChange: (value: string) => void;
  }) => (
    <div className='space-y-2'>
      <div className='flex items-center space-x-2 text-sm font-medium text-gray-700'>
        <span>{emoji}</span>
        <span>{label}</span>
      </div>
      <div className='flex rounded-lg border border-gray-200 bg-gray-50 p-1'>
        <button
          type='button'
          onClick={() => onChange(leftOption.key)}
          className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
            value === leftOption.key
              ? 'bg-white text-purple-700 shadow-sm ring-1 ring-purple-200'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          {leftOption.label}
        </button>
        <button
          type='button'
          onClick={() => onChange(rightOption.key)}
          className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
            value === rightOption.key
              ? 'bg-white text-purple-700 shadow-sm ring-1 ring-purple-200'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          {rightOption.label}
        </button>
      </div>
    </div>
  );

  // Helper function to load image into canvas
  const loadImageToCanvas = useCallback(async (imageUrl: string) => {
    if (!project || !activeTabId) {
      throw new Error('No active project or tab');
    }

    debugLog(
      '🎛️  ProjectPanel',
      'LOAD_IMAGE_START',
      'Loading AI image to canvas',
      { imageUrl }
    );

    return new Promise<void>((resolve, reject) => {
      const img = new (globalThis.Image || window.Image)();
      img.crossOrigin = 'anonymous';

      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
      };

      img.onload = () => {
        let canvas: HTMLCanvasElement | null = null;
        try {
          // Create canvas to extract pixel data
          canvas = document.createElement('canvas');
          canvas.width = project.width;
          canvas.height = project.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }

          // Ensure pixel-perfect rendering
          ctx.imageSmoothingEnabled = false;

          // Draw image to canvas
          ctx.drawImage(img, 0, 0, project.width, project.height);

          // Extract pixel data
          const imageData = ctx.getImageData(
            0,
            0,
            project.width,
            project.height
          );
          const pixelData = {
            data: new Uint8ClampedArray(imageData.data),
            width: project.width,
            height: project.height,
          };

          debugLog(
            '🎛️  ProjectPanel',
            'LOAD_IMAGE_CANVAS',
            'Extracted pixel data',
            {
              dataLength: pixelData.data.length,
              dimensions: `${pixelData.width}x${pixelData.height}`,
            }
          );

          // Check if canvas is empty, create new frame if needed
          const isEmpty = isCanvasEmpty();
          if (isEmpty && activeTab?.frames.length === 0) {
            debugLog(
              '🎛️  ProjectPanel',
              'LOAD_IMAGE_NEW_FRAME',
              'Creating new frame for empty project'
            );
            addFrame(activeTabId);
          } else if (!isEmpty) {
            debugLog(
              '🎛️  ProjectPanel',
              'LOAD_IMAGE_APPEND_FRAME',
              'Appending new frame with AI image'
            );
            addFrame(activeTabId);
          }

          // Update canvas with new pixel data
          updateCanvasData(activeTabId, pixelData);

          debugLog(
            '🎛️  ProjectPanel',
            'LOAD_IMAGE_SUCCESS',
            'Successfully loaded AI image to canvas'
          );
          cleanup();
          resolve();
        } catch (error) {
          debugLog(
            '🎛️  ProjectPanel',
            'LOAD_IMAGE_ERROR',
            'Failed to process image',
            error
          );
          cleanup();
          reject(error);
        } finally {
          // Clean up canvas to prevent memory leaks
          if (canvas) {
            canvas.width = 0;
            canvas.height = 0;
          }
        }
      };

      img.onerror = () => {
        debugLog(
          '🎛️  ProjectPanel',
          'LOAD_IMAGE_ERROR',
          'Failed to load image from URL',
          { imageUrl }
        );
        cleanup();
        reject(new Error('Failed to load generated image'));
      };

      img.src = imageUrl;
    });
  }, [project, activeTabId, activeTab?.frames.length, isCanvasEmpty, addFrame, updateCanvasData]);

  const handleSave = useCallback(() => {
    if (activeTabId) {
      saveProject(activeTabId);
    }
  }, [activeTabId, saveProject]);

  const handleOpenExport = useCallback(() => {
    debugLog('🎛️  ProjectPanel', 'EXPORT_MODAL_OPEN', 'Opening export modal', {
      activeTabId,
    });
    setShowExportModal(true);
  }, [activeTabId]);

  const handleAiGenerate = useCallback(async () => {
    // Enhanced input validation
    const trimmedPrompt = aiPrompt.trim();
    
    if (!trimmedPrompt) {
      toast.error('Please enter a prompt first');
      return;
    }
    
    if (trimmedPrompt.length < AI_PROMPT_LIMITS.MIN_LENGTH) {
      toast.error(`Prompt must be at least ${AI_PROMPT_LIMITS.MIN_LENGTH} characters long`);
      return;
    }
    
    if (trimmedPrompt.length > AI_PROMPT_LIMITS.MAX_LENGTH) {
      toast.error(`Prompt must be no more than ${AI_PROMPT_LIMITS.MAX_LENGTH} characters`);
      return;
    }

    if (!activeTabId || !project) {
      toast.error('No active project selected');
      return;
    }
    
    // Validate project dimensions
    if (!validateCanvasSize(project.width) || !validateCanvasSize(project.height)) {
      toast.error('Invalid canvas dimensions. Please check project settings.');
      return;
    }

    setIsGenerating(true);
    debugLog(
      '🎛️  ProjectPanel',
      'AI_GENERATION_START',
      'Starting AI generation',
      {
        prompt: aiPrompt,
        projectSize: `${project.width}x${project.height}`,
        colorLimit: project.colorLimit,
      }
    );

    try {
      // Step 1: Check backend health and OpenAI key availability
      debugLog(
        '🎛️  ProjectPanel',
        'AI_HEALTH_CHECK',
        'Checking backend health'
      );
      const healthCheck = await api.health();

      if (!healthCheck.openaiKeyLoaded) {
        debugLog(
          '🎛️  ProjectPanel',
          'AI_HEALTH_ERROR',
          'OpenAI key not loaded on server'
        );
        toast.error('AI service unavailable: Server key missing');
        return;
      }

      if (healthCheck.services.openai !== 'healthy') {
        debugLog(
          '🎛️  ProjectPanel',
          'AI_HEALTH_ERROR',
          'OpenAI service unhealthy'
        );
        toast.error('AI service temporarily unavailable');
        return;
      }

      debugLog('🎛️  ProjectPanel', 'AI_HEALTH_SUCCESS', 'Health check passed');

      // Step 2: Apply guided prompt enhancement
      debugLog(
        '🎛️  ProjectPanel',
        'AI_GUIDED_PROMPT',
        'Applying guided prompt options',
        { guidedOptions }
      );

      const guidedPromptResult = generateGuidedPrompt(
        trimmedPrompt,
        guidedOptions,
        {
          mode: 'text-to-image' as const,
          style: 'pixel-art' as const,
          enforceTransparency: guidedOptions.background === 'transparent',
          canvasAnalysis: undefined
        }
      );

      debugLog(
        '🎛️  ProjectPanel',
        'AI_GUIDED_PROMPT_RESULT',
        'Generated enhanced prompt',
        {
          originalPrompt: trimmedPrompt,
          guidedPrompt: guidedPromptResult.guidedPrompt,
          finalPrompt: guidedPromptResult.finalPrompt,
          appliedOptions: guidedPromptResult.appliedGuidedOptions,
          confidence: guidedPromptResult.confidence
        }
      );

      // Step 3: Generate AI image with enhanced prompt
      debugLog(
        '🎛️  ProjectPanel',
        'AI_GENERATE_REQUEST',
        'Making generation request with enhanced prompt'
      );
      const result = await api.ai.generate({
        prompt: guidedPromptResult.finalPrompt,
        mode: 'new',
        width: project.width,
        height: project.height,
        colorLimit: project.colorLimit,
        enableDithering: false,
        quantizationMethod: 'median-cut',
      });

      debugLog(
        '🎛️  ProjectPanel',
        'AI_GENERATE_SUCCESS',
        'AI generation completed',
        {
          assetId: result.assetId,
          dimensions: `${result.width}x${result.height}`,
          colorCount: result.colorCount,
          processingTime: result.processingTimeMs,
        }
      );

      // Step 3: Load generated image into canvas
      await loadImageToCanvas(result.pngUrl);

      // Step 4: Clear prompt and show success with guided options info
      setAiPrompt('');
      const appliedOptionsText = guidedPromptResult.appliedGuidedOptions.join(', ');
      toast.success(
        `✨ AI Image Generated Successfully! 
        🎨 Applied Options: ${appliedOptionsText}
        📊 ${result.colorCount} colors, ${Math.round(result.processingTimeMs / 1000)}s`,
        { duration: 4000 }
      );
    } catch (error: any) {
      debugLog(
        '🎛️  ProjectPanel',
        'AI_GENERATION_ERROR',
        'AI generation failed',
        error
      );

      if (error?.code === 'RATE_LIMIT_EXCEEDED') {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (error?.message) {
        toast.error(`AI generation failed: ${error.message}`);
      } else {
        toast.error('AI generation failed. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  }, [aiPrompt, activeTabId, project, loadImageToCanvas]);

  if (!activeTabId || !project) {
    return (
      <div className='flex h-full items-center justify-center p-4 text-gray-500'>
        <div className='text-center'>
          <Settings className='mx-auto mb-2 h-8 w-8' />
          <p>Select a project to view settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col bg-white', className)}>
      {/* Header */}
      <div className='border-b border-gray-200 p-4'>
        <h2 className='text-lg font-semibold text-gray-800'>
          Project Settings
        </h2>
      </div>

      <div className='flex-1 overflow-y-auto'>
        {/* Project Info */}
        <div className='space-y-4 p-4'>
          <div>
            <label 
              htmlFor='project-name'
              className='mb-2 block text-sm font-medium text-gray-700'
            >
              Project Name
            </label>
            <input
              id='project-name'
              type='text'
              value={project.name}
              onChange={e => handleNameChange(e.target.value)}
              className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              placeholder='My Pixel Art'
              aria-describedby='project-name-hint'
              maxLength={100}
            />
            <div id='project-name-hint' className='sr-only'>
              Enter a descriptive name for your pixel art project
            </div>
          </div>

          <div className='space-y-3'>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label 
                  htmlFor='canvas-width'
                  className='mb-1 block text-sm font-medium text-gray-700'
                >
                  Width
                </label>
                <input
                  id='canvas-width'
                  type='text'
                  value={pendingWidth}
                  onChange={e =>
                    setPendingWidth(parseCanvasSize(e.target.value))
                  }
                  onBlur={handleWidthBlur}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    pendingWidth === '' || (typeof pendingWidth === 'number' && validateCanvasSize(pendingWidth))
                      ? 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      : 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50'
                  }`}
                  aria-describedby='canvas-width-hint'
                  placeholder={`${CANVAS_SIZE_LIMITS.MIN}-${CANVAS_SIZE_LIMITS.MAX}`}
                />
                <div id='canvas-width-hint' className='sr-only'>
                  Canvas width in pixels, between {CANVAS_SIZE_LIMITS.MIN} and {CANVAS_SIZE_LIMITS.MAX}
                </div>
              </div>
              <div>
                <label 
                  htmlFor='canvas-height'
                  className='mb-1 block text-sm font-medium text-gray-700'
                >
                  Height
                </label>
                <input
                  id='canvas-height'
                  type='text'
                  value={pendingHeight}
                  onChange={e =>
                    setPendingHeight(parseCanvasSize(e.target.value))
                  }
                  onBlur={handleHeightBlur}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    pendingHeight === '' || (typeof pendingHeight === 'number' && validateCanvasSize(pendingHeight))
                      ? 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      : 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50'
                  }`}
                  aria-describedby='canvas-height-hint'
                  placeholder={`${CANVAS_SIZE_LIMITS.MIN}-${CANVAS_SIZE_LIMITS.MAX}`}
                />
                <div id='canvas-height-hint' className='sr-only'>
                  Canvas height in pixels, between {CANVAS_SIZE_LIMITS.MIN} and {CANVAS_SIZE_LIMITS.MAX}
                </div>
              </div>
            </div>

            {/* Apply button - show if dimensions changed */}
            {haveDimensionsChanged && (
              <Button
                onClick={() => handleApplyDimensions()}
                size='sm'
                disabled={!arePendingDimensionsValid}
                className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed'
              >
                {arePendingDimensionsValid ? (
                  <>
                    Apply Canvas Size ({typeof pendingWidth === 'number' ? pendingWidth : parseInt(pendingWidth, 10)}×{typeof pendingHeight === 'number' ? pendingHeight : parseInt(pendingHeight, 10)})
                  </>
                ) : (
                  <>Invalid size (min: {CANVAS_SIZE_LIMITS.MIN}, max: {CANVAS_SIZE_LIMITS.MAX})</>
                )}
              </Button>
            )}
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-gray-700'>
              Color Limit: {project.colorLimit} colors
            </label>
            <input
              type='range'
              min='4'
              max='64'
              value={project.colorLimit}
              onChange={e => handleColorLimitChange(parseInt(e.target.value))}
              className='w-full'
            />
            <div className='mt-1 flex justify-between text-xs text-gray-500'>
              <span>4</span>
              <span>64</span>
            </div>
          </div>

        </div>

        {/* AI Generation */}
        <section className='border-t border-gray-200 p-4' aria-labelledby='ai-assistant-heading'>
          <div className='mb-3 flex items-center space-x-2'>
            <Sparkles className='h-5 w-5 text-purple-600' aria-hidden='true' />
            <h3 id='ai-assistant-heading' className='text-sm font-semibold text-gray-800'>
              AI Assistant
            </h3>
          </div>

          <div className='space-y-3'>
            <div>
              <label htmlFor='ai-prompt' className='sr-only'>
                AI Generation Prompt
              </label>
              <textarea
                id='ai-prompt'
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="Describe what you want to create... e.g., 'a cute cat pixel art', 'medieval castle', 'space ship'"
                className='w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-500'
                rows={3}
                disabled={isGenerating}
                maxLength={AI_PROMPT_LIMITS.MAX_LENGTH}
                minLength={AI_PROMPT_LIMITS.MIN_LENGTH}
                aria-describedby='ai-prompt-hint ai-prompt-count'
                aria-invalid={aiPrompt.trim().length > 0 && aiPrompt.trim().length < AI_PROMPT_LIMITS.MIN_LENGTH}
              />
            </div>

            <div id='ai-prompt-count' className='text-right text-xs text-gray-500' aria-live='polite'>
              {aiPrompt.length}/{AI_PROMPT_LIMITS.MAX_LENGTH} characters
            </div>

            {/* Guided Prompt Options */}
            <div className='space-y-4 rounded-lg border border-purple-200 bg-purple-50 p-4'>
              <div className='flex items-center space-x-2 mb-3'>
                <span className='text-sm font-semibold text-purple-800'>✨ Quick Style Options</span>
              </div>
              
              {/* Compact horizontal layout with checkboxes for space efficiency */}
              <div className='flex flex-wrap gap-x-4 gap-y-2'>
                <StyleOption
                  id="transparent-bg"
                  label="Transparent BG"
                  emoji="🖼️"
                  checked={compactStyleOptions.transparentBg}
                  onChange={(checked) => handleCompactStyleChange('transparentBg', checked)}
                  tooltip="Generate with transparent background (recommended for pixel art)"
                />
                
                <StyleOption
                  id="game-character"
                  label="Game Style"
                  emoji="👤"
                  checked={compactStyleOptions.gameCharacter}
                  onChange={(checked) => handleCompactStyleChange('gameCharacter', checked)}
                  tooltip="Optimize for game character design"
                />
                
                <StyleOption
                  id="detailed-art"
                  label="Detailed"
                  emoji="🎨"
                  checked={compactStyleOptions.detailedArt}
                  onChange={(checked) => handleCompactStyleChange('detailedArt', checked)}
                  tooltip="Add more detail to the artwork"
                />
                
                <StyleOption
                  id="bright-colors"
                  label="Bright Colors"
                  emoji="🌈"
                  checked={compactStyleOptions.brightColors}
                  onChange={(checked) => handleCompactStyleChange('brightColors', checked)}
                  tooltip="Use bright, vibrant color palette"
                />
                
                <StyleOption
                  id="add-effects"
                  label="Effects"
                  emoji="✨"
                  checked={compactStyleOptions.addEffects}
                  onChange={(checked) => handleCompactStyleChange('addEffects', checked)}
                  tooltip="Add visual effects like glow or particles"
                />
                
                <StyleOption
                  id="high-contrast"
                  label="High Contrast"
                  emoji="⚫"
                  checked={compactStyleOptions.highContrast}
                  onChange={(checked) => handleCompactStyleChange('highContrast', checked)}
                  tooltip="Use high contrast colors for better visibility"
                />
              </div>
            </div>

            <Button
              onClick={handleAiGenerate}
              disabled={!aiPrompt.trim() || isGenerating}
              className='w-full bg-purple-600 hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-400'
            >
              {isGenerating ? (
                <>
                  <div className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                  Generating AI Image...
                </>
              ) : (
                <>
                  <Sparkles className='mr-2 h-4 w-4' />
                  Generate with AI
                </>
              )}
            </Button>

            {isGenerating && (
              <div className='rounded-lg bg-purple-50 p-3 text-xs text-purple-700'>
                ⏳ <strong>Processing:</strong> This may take 10-30 seconds.
                We're generating your image and optimizing it for pixel art!
              </div>
            )}
          </div>

          <div className='mt-3 rounded-lg bg-purple-50 p-3 text-xs text-purple-700'>
            💡 <strong>Smart AI Tips:</strong>
            <ul className='mt-1 list-inside list-disc space-y-1'>
              <li>Add specific descriptions to your prompt</li>
              <li>Use the Quick Options above to select your desired style</li>
              <li>Include emotion keywords like "cute", "brave", "magical"</li>
              <li>AI automatically generates optimized prompts for pixel art</li>
            </ul>
          </div>
        </section>


        {/* Statistics */}
        <div className='border-t border-gray-200 p-4'>
          <h3 className='mb-3 text-sm font-semibold text-gray-800'>
            Statistics
          </h3>
          <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
              <span className='text-gray-600'>Canvas Size:</span>
              <span>
                {project.width}×{project.height}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-600'>Total Pixels:</span>
              <span>{project.width * project.height}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-600'>Colors Used:</span>
              <span>
                {project.palette.length}/{project.colorLimit}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-600'>Frames:</span>
              <span>{activeTab?.frames.length || 0}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Actions */}
      <div className='space-y-2 border-t border-gray-200 p-4'>
        <Button
          onClick={handleSave}
          disabled={!activeTab?.isDirty}
          className='w-full'
          variant={activeTab?.isDirty ? 'default' : 'outline'}
        >
          <Upload className='mr-2 h-4 w-4' />
          {activeTab?.isDirty ? 'Save Project' : 'Saved'}
        </Button>

        <Button onClick={handleOpenExport} variant='outline' className='w-full'>
          <Download className='mr-2 h-4 w-4' />
          Export Project
        </Button>
      </div>

      {/* Canvas Resize Confirmation Modal */}
      {showResizeConfirm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
          <div className='mx-4 max-w-md rounded-lg bg-white p-6 shadow-xl'>
            <div className='mb-4 flex items-center space-x-3'>
              <AlertTriangle className='h-6 w-6 text-amber-600' />
              <h3 className='text-lg font-semibold text-gray-800'>
                Canvas Size Change
              </h3>
            </div>

            <div className='mb-6 space-y-3'>
              <p className='text-sm text-gray-600'>
                You're about to change the canvas size from{' '}
                <span className='font-medium'>
                  {project.width}×{project.height}
                </span>{' '}
                to{' '}
                <span className='font-medium'>
                  {typeof pendingWidth === 'number' ? pendingWidth : parseInt(pendingWidth, 10)}×{typeof pendingHeight === 'number' ? pendingHeight : parseInt(pendingHeight, 10)}
                </span>
                .
              </p>

              <p className='text-sm text-gray-600'>
                Your current artwork will be affected. What would you like to
                do?
              </p>
            </div>

            <div className='space-y-2'>
              {activeTab?.isDirty && (
                <Button
                  onClick={handleResizeWithSave}
                  className='w-full bg-green-600 hover:bg-green-700'
                >
                  <Save className='mr-2 h-4 w-4' />
                  Save Current Work & Resize
                </Button>
              )}

              <Button
                onClick={handleResizeWithDiscard}
                variant='outline'
                className='w-full border-red-300 text-red-700 hover:bg-red-50'
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Discard Changes & Resize
              </Button>

              <Button
                onClick={handleResizeCancel}
                variant='ghost'
                className='w-full'
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal open={showExportModal} onOpenChange={setShowExportModal} />
    </div>
  );
});

export { ProjectPanel };
