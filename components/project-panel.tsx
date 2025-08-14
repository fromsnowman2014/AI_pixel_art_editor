'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ExportModal } from '@/components/export-modal';
import { api } from '@/lib/api/client';
import toast from 'react-hot-toast';
import { debugLog } from '@/lib/utils/debug';
import type { ProjectMode } from '@/lib/types/api';
import {
  Settings,
  Download,
  Upload,
  Sparkles,
  Image,
  Layers,
  Grid,
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

const parseCanvasSize = (value: string | number): number => {
  const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(numValue)) return 0; // Allow 0 for temporary input states
  return numValue;
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
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const activeTab = getActiveTab();
  const project = activeTab?.project;

  // Canvas dimension state for deferred application
  const [pendingWidth, setPendingWidth] = useState(() => project?.width || 32);
  const [pendingHeight, setPendingHeight] = useState(() => project?.height || 32);
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

  const handleModeChange = useCallback((mode: ProjectMode) => {
    if (activeTabId) {
      updateProject(activeTabId, { mode });
    }
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

  // Check if pending dimensions are valid for applying
  const arePendingDimensionsValid = useMemo(() => {
    return validateCanvasSize(pendingWidth) && validateCanvasSize(pendingHeight);
  }, [pendingWidth, pendingHeight]);

  // Check if dimensions have changed
  const haveDimensionsChanged = useMemo(() => {
    return pendingWidth !== project?.width || pendingHeight !== project?.height;
  }, [pendingWidth, pendingHeight, project?.width, project?.height]);

  // Handle apply dimensions with content check
  const handleApplyDimensions = useCallback(() => {
    if (!project) return;
    
    debugLog(
      '🎛️  ProjectPanel',
      'APPLY_DIMENSIONS_START',
      'Apply dimensions requested',
      {
        currentSize: `${project.width}x${project.height}`,
        newSize: `${pendingWidth}x${pendingHeight}`,
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
      handleDimensionChange(pendingWidth, pendingHeight);
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

    // Apply new dimensions
    handleDimensionChange(pendingWidth, pendingHeight);
    setShowResizeConfirm(false);
  }, [activeTabId, saveProject, pendingWidth, pendingHeight, handleDimensionChange]);

  const handleResizeWithDiscard = useCallback(() => {
    debugLog(
      '🎛️  ProjectPanel',
      'RESIZE_WITH_DISCARD',
      'User chose to discard changes and resize'
    );

    // Apply new dimensions directly
    handleDimensionChange(pendingWidth, pendingHeight);
    setShowResizeConfirm(false);
  }, [pendingWidth, pendingHeight, handleDimensionChange]);

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

      // Step 2: Generate AI image
      debugLog(
        '🎛️  ProjectPanel',
        'AI_GENERATE_REQUEST',
        'Making generation request'
      );
      const result = await api.ai.generate({
        prompt: aiPrompt,
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

      // Step 4: Clear prompt and show success
      setAiPrompt('');
      toast.success(
        `AI image generated! Used ${result.colorCount} colors in ${Math.round(result.processingTimeMs / 1000)}s`
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
                  type='number'
                  value={pendingWidth}
                  onChange={e =>
                    setPendingWidth(parseCanvasSize(e.target.value))
                  }
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    pendingWidth === 0 || validateCanvasSize(pendingWidth)
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
                  type='number'
                  value={pendingHeight}
                  onChange={e =>
                    setPendingHeight(parseCanvasSize(e.target.value))
                  }
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    pendingHeight === 0 || validateCanvasSize(pendingHeight)
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
                  <>Apply Canvas Size ({pendingWidth}×{pendingHeight})</>
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

          <div>
            <label className='mb-2 block text-sm font-medium text-gray-700'>
              Mode
            </label>
            <div className='flex space-x-2'>
              <Button
                variant={project.mode === 'beginner' ? 'default' : 'outline'}
                size='sm'
                onClick={() => handleModeChange('beginner')}
                className='flex-1'
              >
                Beginner
              </Button>
              <Button
                variant={project.mode === 'advanced' ? 'default' : 'outline'}
                size='sm'
                onClick={() => handleModeChange('advanced')}
                className='flex-1'
              >
                Advanced
              </Button>
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
            🎨 <strong>AI Tips:</strong>
            <ul className='mt-1 list-inside list-disc space-y-1'>
              <li>Be specific about style and colors</li>
              <li>Mention if you want simple or detailed</li>
              <li>Add mood keywords like "happy", "dark", "cute"</li>
            </ul>
          </div>
        </section>

        {/* Advanced Settings */}
        <div className='border-t border-gray-200 p-4'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className='mb-3 w-full justify-between'
          >
            Advanced Settings
            <Settings className='h-4 w-4' />
          </Button>

          {showAdvancedSettings && (
            <div className='space-y-3 text-sm'>
              <div className='flex items-center space-x-2'>
                <Grid className='h-4 w-4 text-gray-500' />
                <span>Grid visible</span>
                <input type='checkbox' className='ml-auto' defaultChecked />
              </div>

              <div className='flex items-center space-x-2'>
                <Layers className='h-4 w-4 text-gray-500' />
                <span>Layer mode</span>
                <input type='checkbox' className='ml-auto' />
              </div>

              <div className='flex items-center space-x-2'>
                <Image className='h-4 w-4 text-gray-500' />
                <span>Auto-save</span>
                <input type='checkbox' className='ml-auto' defaultChecked />
              </div>
            </div>
          )}
        </div>

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
                  {pendingWidth}×{pendingHeight}
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
