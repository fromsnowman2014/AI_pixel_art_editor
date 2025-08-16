'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Project, Frame, PixelData, CanvasState, HistoryEntry } from '@/lib/types/api'
import { generatePalette, DEFAULT_PALETTE, createPixelCanvas } from '@/lib/utils'
import { useAuthStore } from './auth-store'

// Import centralized debug utility
import { storeDebug, exportDebug } from '@/lib/utils/debug'

// Utility function to download files
const downloadFile = (dataURL: string, fileName: string) => {
  const link = document.createElement('a')
  link.download = fileName
  link.href = dataURL
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Utility function to generate thumbnail from pixel data - Memory optimized
const generateThumbnail = (pixelData: PixelData, thumbnailSize = 48): string | null => {
  let canvas: HTMLCanvasElement | null = null
  let sourceCanvas: HTMLCanvasElement | null = null
  
  try {
    // Validate input data
    if (!pixelData || !pixelData.data || pixelData.data.length === 0) {
      return null
    }

    canvas = document.createElement('canvas')
    canvas.width = thumbnailSize
    canvas.height = thumbnailSize
    const ctx = canvas.getContext('2d', { willReadFrequently: false })
    
    if (!ctx) {
      return null
    }

    // Create source canvas with original pixel data
    sourceCanvas = document.createElement('canvas')
    sourceCanvas.width = pixelData.width
    sourceCanvas.height = pixelData.height
    const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: false })
    
    if (!sourceCtx) {
      return null
    }

    // Create ImageData with proper validation
    const expectedLength = pixelData.width * pixelData.height * 4
    if (pixelData.data.length !== expectedLength) {
      return null
    }

    // Put original pixel data on source canvas
    const imageData = new ImageData(new Uint8ClampedArray(pixelData.data), pixelData.width, pixelData.height)
    sourceCtx.putImageData(imageData, 0, 0)

    // Scale down to thumbnail size with nearest neighbor (pixel perfect)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(sourceCanvas, 0, 0, thumbnailSize, thumbnailSize)

    const result = canvas.toDataURL('image/png')
    return result
  } catch (error) {
    return null
  } finally {
    // CRITICAL: Clean up canvas elements to prevent memory leaks
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      canvas.width = 0
      canvas.height = 0
    }
    if (sourceCanvas) {
      const sourceCtx = sourceCanvas.getContext('2d')
      if (sourceCtx) {
        sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height)
      }
      sourceCanvas.width = 0
      sourceCanvas.height = 0
    }
  }
}

interface FrameCanvasData {
  frameId: string
  canvasData: PixelData
  thumbnail: string | null // Base64 encoded thumbnail image
}

export interface ProjectTab {
  id: string
  project: Project
  currentFrame: Frame | null
  frames: Frame[]
  canvasData: PixelData | null
  canvasState: CanvasState
  history: HistoryEntry[]
  historyIndex: number
  isDirty: boolean
  frameCanvasData: FrameCanvasData[] // Store canvas data for each frame
}

interface ProjectStore {
  // Current state
  tabs: ProjectTab[]
  activeTabId: string | null
  isLoading: boolean
  error: string | null

  // Actions
  initializeApp: () => void
  createNewProject: (options?: { width?: number; height?: number; colorLimit?: number }) => void
  openProject: (project: Project) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  duplicateTab: (tabId: string) => void

  // Canvas operations
  updateCanvasData: (tabId: string, data: PixelData) => void
  updateCanvasState: (tabId: string, state: Partial<CanvasState>) => void
  undo: (tabId: string) => void
  redo: (tabId: string) => void
  addHistoryEntry: (tabId: string, action: string, data: PixelData) => void

  // Project operations
  updateProject: (tabId: string, updates: Partial<Project>) => void
  saveProject: (tabId: string) => Promise<void>
  exportProject: (tabId: string, format: 'png' | 'gif' | 'jpg' | 'webp', options?: any) => Promise<void>

  // Frame operations
  addFrame: (tabId: string) => void
  deleteFrame: (tabId: string, frameId: string) => void
  duplicateFrame: (tabId: string, frameId: string) => void
  setActiveFrame: (tabId: string, frameId: string) => void
  reorderFrames: (tabId: string, frameIds: string[]) => void
  saveCurrentFrameCanvas: (tabId: string) => void
  saveAllFrameCanvasData: (tabId: string) => void
  getFrameThumbnail: (tabId: string, frameId: string) => string | null
  regenerateAllThumbnails: () => void
  regenerateFrameThumbnail: (tabId: string, frameId: string) => void

  // Utility functions
  getActiveTab: () => ProjectTab | null
  getTab: (tabId: string) => ProjectTab | null
  markTabDirty: (tabId: string) => void
  clearError: () => void
}

const createDefaultCanvasState = (): CanvasState => ({
  tool: 'pencil',
  color: '#000000',
  brushSize: 1,
  zoom: 8, // 8x zoom for pixel art
  panX: 0,
  panY: 0,
})

const createDefaultProject = (options?: {
  width?: number
  height?: number
  colorLimit?: number
  userId?: string | null
}): Omit<Project, 'id' | 'createdAt' | 'updatedAt'> => ({
  userId: options?.userId || null,
  name: 'New Project',
  width: options?.width || 32,
  height: options?.height || 32,
  colorLimit: options?.colorLimit || 24,
  palette: generatePalette(options?.colorLimit || 24),
  frames: [],
  activeFrameId: null,
})

const createDefaultFrame = (): Omit<Frame, 'id' | 'createdAt' | 'updatedAt'> => ({
  projectId: '',
  index: 0,
  delayMs: 500,
  included: true,
  layers: [],
  flattenedPngUrl: null,
})

const createEmptyPixelData = (width: number, height: number): PixelData => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height * 4), // RGBA
})

export const useProjectStore = create<ProjectStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        tabs: [],
        activeTabId: null,
        isLoading: false,
        error: null,

        // Initialize app with default project
        initializeApp: () => {
          const { tabs } = get()

          if (tabs.length === 0) {
            get().createNewProject()
          } else {
            
            // CRITICAL: Regenerate thumbnails after persistence restore
            get().regenerateAllThumbnails()

            // Fix tabs loaded from persistence that have null canvasData
            set((state) => {
              state.tabs.forEach((tab, index) => {

                if (!tab.canvasData) {
                  tab.canvasData = createEmptyPixelData(tab.project.width, tab.project.height)
                }

                // Also ensure history exists for undo/redo functionality
                if (!tab.history || tab.history.length === 0) {
                  tab.history = [{
                    id: `history-${Date.now()}`,
                    action: 'restored',
                    data: tab.canvasData!,
                    timestamp: Date.now(),
                  }]
                  tab.historyIndex = 0
                }

                // Initialize frameCanvasData for tabs loaded from persistence
                if (!tab.frameCanvasData) {
                  tab.frameCanvasData = []
                  
                  // Create frame canvas data for existing frames
                  if (tab.frames && tab.frames.length > 0) {
                    tab.frames.forEach(frame => {
                      tab.frameCanvasData.push({
                        frameId: frame.id,
                        canvasData: tab.canvasData ? { 
                          ...tab.canvasData, 
                          data: new Uint8ClampedArray(tab.canvasData.data) 
                        } : createEmptyPixelData(tab.project.width, tab.project.height),
                        thumbnail: null
                      })
                    })
                  }
                }

              })
            })

          }
        },

        // Create new project tab
        createNewProject: (options) => {
          set((state) => {
            const tabId = `tab-${Date.now()}`
            const projectId = `project-${Date.now()}`
            const frameId = `frame-${Date.now()}`
            
            // Get current user from auth store
            const authState = useAuthStore.getState()
            const userId = authState.user?.id || null
            
            const project: Project = {
              id: projectId,
              ...createDefaultProject({ ...options, userId }),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              activeFrameId: frameId,
              frames: [frameId],
            }

            const frame: Frame = {
              id: frameId,
              ...createDefaultFrame(),
              projectId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }

            const canvasData = createEmptyPixelData(project.width, project.height)

            const newTab: ProjectTab = {
              id: tabId,
              project,
              currentFrame: frame,
              frames: [frame],
              canvasData,
              canvasState: createDefaultCanvasState(),
              history: [{
                id: `history-${Date.now()}`,
                action: 'initial',
                data: canvasData,
                timestamp: Date.now(),
              }],
              historyIndex: 0,
              isDirty: false,
              frameCanvasData: [{
                frameId,
                canvasData: { ...canvasData, data: new Uint8ClampedArray(canvasData.data) },
                thumbnail: null // Will be generated when first drawn
              }]
            }

            state.tabs.push(newTab)
            state.activeTabId = tabId
          })
        },

        // Open existing project
        openProject: (project) => {
          set((state) => {
            const tabId = `tab-${Date.now()}-${project.id}`
            
            // Check if project is already open
            const existingTab = state.tabs.find(tab => tab.project.id === project.id)
            if (existingTab) {
              state.activeTabId = existingTab.id
              return
            }

            const canvasData = createEmptyPixelData(project.width, project.height)

            const newTab: ProjectTab = {
              id: tabId,
              project,
              currentFrame: null, // Will be loaded from API
              frames: [], // Will be loaded from API
              canvasData,
              canvasState: createDefaultCanvasState(),
              history: [{
                id: `history-${Date.now()}`,
                action: 'loaded',
                data: canvasData,
                timestamp: Date.now(),
              }],
              historyIndex: 0,
              isDirty: false,
              frameCanvasData: [], // Will be populated when frames are loaded
            }

            state.tabs.push(newTab)
            state.activeTabId = tabId
          })
        },

        // Close tab
        closeTab: (tabId) => {
          set((state) => {
            const tabIndex = state.tabs.findIndex(tab => tab.id === tabId)
            if (tabIndex === -1) return

            state.tabs.splice(tabIndex, 1)

            // Update active tab
            if (state.activeTabId === tabId) {
              if (state.tabs.length > 0) {
                // Select next tab or previous if it was the last
                const newIndex = Math.min(tabIndex, state.tabs.length - 1)
                state.activeTabId = state.tabs[newIndex]?.id || null
              } else {
                state.activeTabId = null
              }
            }
          })
        },

        // Set active tab
        setActiveTab: (tabId) => {
          set((state) => {
            if (state.tabs.find(tab => tab.id === tabId)) {
              state.activeTabId = tabId
            }
          })
        },

        // Duplicate tab
        duplicateTab: (tabId) => {
          set((state) => {
            const sourceTab = state.tabs.find(tab => tab.id === tabId)
            if (!sourceTab) return

            const newTabId = `tab-${Date.now()}-copy`
            const newProjectId = `project-${Date.now()}-copy`

            const newProject: Project = {
              ...sourceTab.project,
              id: newProjectId,
              name: `${sourceTab.project.name} (Copy)`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }

            const newTab: ProjectTab = {
              ...sourceTab,
              id: newTabId,
              project: newProject,
              isDirty: true,
              frameCanvasData: sourceTab.frameCanvasData.map(frameData => ({
                ...frameData,
                canvasData: { ...frameData.canvasData, data: new Uint8ClampedArray(frameData.canvasData.data) }
              }))
            }

            state.tabs.push(newTab)
            state.activeTabId = newTabId
          })
        },

        // Update canvas data
        updateCanvasData: (tabId, data) => {

          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            if (tab) {
              const oldData = tab.canvasData

              // Sample some pixels to verify the data
              const samplePixels = []
              for (let i = 0; i < Math.min(10, data.data.length / 4); i++) {
                const idx = i * 4
                if (data.data[idx + 3] && (data.data[idx + 3] ?? 0) > 0) { // Only non-transparent pixels
                  samplePixels.push({
                    pixel: i,
                    r: data.data[idx] || 0,
                    g: data.data[idx + 1] || 0,
                    b: data.data[idx + 2] || 0,
                    a: data.data[idx + 3] || 0
                  })
                }
              }


              tab.canvasData = data
              tab.isDirty = true

              // CRITICAL: Immediately update current frame's canvas data to prevent loss
              if (tab.currentFrame) {
                const frameIndex = tab.frameCanvasData.findIndex(f => f.frameId === tab.currentFrame!.id)
                
                // Create a deep copy of canvas data
                const canvasDataCopy = {
                  ...data,
                  data: new Uint8ClampedArray(data.data)
                }

                // Generate thumbnail for immediate UI update - FORCE regeneration
                const thumbnail = generateThumbnail(canvasDataCopy)
                

                if (frameIndex >= 0) {
                  // Update existing frame data
                  tab.frameCanvasData[frameIndex] = {
                    frameId: tab.currentFrame.id,
                    canvasData: canvasDataCopy,
                    thumbnail
                  }
                } else {
                  // Add new frame data
                  tab.frameCanvasData.push({
                    frameId: tab.currentFrame.id,
                    canvasData: canvasDataCopy,
                    thumbnail
                  })
                }
              }


              // Critical debug: Check if React will detect this change
              // Fix: Capture values before setTimeout to avoid proxy issues
              const capturedData = {
                tabId: tab.id,
                canvasDataLength: tab.canvasData?.data.length,
                tabsCount: state.tabs.length,
                activeTabId: state.activeTabId
              }
            }
          })
        },

        // Update canvas state
        updateCanvasState: (tabId, stateUpdates) => {
          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            if (tab) {
              Object.assign(tab.canvasState, stateUpdates)
            }
          })
        },

        // Undo operation
        undo: (tabId) => {
          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            if (tab && tab.historyIndex > 0) {
              tab.historyIndex--
              const historyEntry = tab.history[tab.historyIndex]
              if (historyEntry) {
                tab.canvasData = historyEntry.data
                tab.isDirty = true
              }
            }
          })
        },

        // Redo operation
        redo: (tabId) => {
          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            if (tab && tab.historyIndex < tab.history.length - 1) {
              tab.historyIndex++
              const historyEntry = tab.history[tab.historyIndex]
              if (historyEntry) {
                tab.canvasData = historyEntry.data
                tab.isDirty = true
              }
            }
          })
        },

        // Add history entry
        addHistoryEntry: (tabId, action, data) => {
          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            if (tab) {
              // Remove any history entries after current index
              tab.history = tab.history.slice(0, tab.historyIndex + 1)
              
              // Add new entry
              tab.history.push({
                id: `history-${Date.now()}`,
                action,
                data: { ...data, data: new Uint8ClampedArray(data.data) },
                timestamp: Date.now(),
              })
              
              // Limit history to 100 entries
              if (tab.history.length > 100) {
                tab.history = tab.history.slice(-100)
              }
              
              tab.historyIndex = tab.history.length - 1
            }
          })
        },

        // Update project
        updateProject: (tabId, updates) => {
          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            if (tab) {
              const oldWidth = tab.project.width
              const oldHeight = tab.project.height
              
              storeDebug('UPDATE_PROJECT_START', 'Project update requested', {
                tabId,
                updates,
                oldSize: `${oldWidth}x${oldHeight}`,
                newSize: updates.width || updates.height ? `${updates.width || oldWidth}x${updates.height || oldHeight}` : 'no size change'
              })
              
              Object.assign(tab.project, updates)
              
              // If dimensions changed, reallocate canvas data for ALL frames
              if ((updates.width && updates.width !== oldWidth) || (updates.height && updates.height !== oldHeight)) {
                storeDebug('RESIZE_CANVAS_START', 'Canvas resize operation started for all frames', {
                  oldSize: `${oldWidth}x${oldHeight}`,
                  newSize: `${tab.project.width}x${tab.project.height}`,
                  hasExistingData: !!tab.canvasData,
                  frameCount: tab.frameCanvasData.length
                })

                // Utility function to resize canvas data
                const resizeCanvasData = (originalData: PixelData): PixelData => {
                  const newCanvasData = createEmptyPixelData(tab.project.width, tab.project.height)
                  
                  if (originalData) {
                    const oldData = originalData.data
                    const newData = newCanvasData.data
                    const minWidth = Math.min(oldWidth, tab.project.width)
                    const minHeight = Math.min(oldHeight, tab.project.height)
                    
                    let copiedPixels = 0
                    for (let y = 0; y < minHeight; y++) {
                      for (let x = 0; x < minWidth; x++) {
                        const oldIndex = (y * oldWidth + x) * 4
                        const newIndex = (y * tab.project.width + x) * 4
                        
                        // Copy pixel data
                        newData[newIndex] = oldData[oldIndex] || 0         // R
                        newData[newIndex + 1] = oldData[oldIndex + 1] || 0 // G
                        newData[newIndex + 2] = oldData[oldIndex + 2] || 0 // B
                        newData[newIndex + 3] = oldData[oldIndex + 3] || 0 // A
                        
                        if ((oldData[oldIndex + 3] ?? 0) > 0) copiedPixels++
                      }
                    }
                    
                    storeDebug('RESIZE_FRAME_DATA_COPY', 'Frame pixel data copied', {
                      copiedPixels: copiedPixels,
                      totalPixels: minWidth * minHeight
                    })
                  }
                  
                  return newCanvasData
                }

                // Resize current canvas data
                if (tab.canvasData) {
                  tab.canvasData = resizeCanvasData(tab.canvasData)
                  
                  storeDebug('RESIZE_CURRENT_CANVAS', 'Current canvas data resized', {
                    newSize: `${tab.project.width}x${tab.project.height}`
                  })
                }

                // Resize all frame canvas data
                tab.frameCanvasData = tab.frameCanvasData.map((frameData, index) => {
                  const resizedCanvasData = resizeCanvasData(frameData.canvasData)
                  const newThumbnail = generateThumbnail(resizedCanvasData)
                  
                  storeDebug('RESIZE_FRAME_CANVAS', `Frame ${index + 1} canvas data resized`, {
                    frameId: frameData.frameId,
                    newSize: `${resizedCanvasData.width}x${resizedCanvasData.height}`,
                    thumbnailGenerated: !!newThumbnail
                  })
                  
                  return {
                    ...frameData,
                    canvasData: resizedCanvasData,
                    thumbnail: newThumbnail
                  }
                })
                
                // Add history entry for dimension change
                if (tab.canvasData) {
                  get().addHistoryEntry(tabId, 'resize_canvas_all_frames', tab.canvasData)
                }
                
                storeDebug('RESIZE_CANVAS_COMPLETE', 'All frames canvas resize completed', {
                  newSize: `${tab.project.width}x${tab.project.height}`,
                  framesUpdated: tab.frameCanvasData.length,
                  historyAdded: true
                })
              }
              
              tab.project.updatedAt = new Date().toISOString()
              tab.isDirty = true
            }
          })
        },

        // Save project (placeholder - will use API)
        saveProject: async (tabId) => {
          const tab = get().getTab(tabId)
          if (!tab) return

          set((state) => {
            state.isLoading = true
            state.error = null
          })

          try {
            // TODO: Implement API save
            console.log('Saving project:', tab.project)
            
            set((state) => {
              const tabToUpdate = state.tabs.find(t => t.id === tabId)
              if (tabToUpdate) {
                tabToUpdate.isDirty = false
              }
              state.isLoading = false
            })
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Save failed'
              state.isLoading = false
            })
          }
        },

        // Export project with file download
        exportProject: async (tabId, format, options = {}) => {
          const tab = get().getTab(tabId)
          if (!tab || !tab.canvasData) return


          set((state) => {
            state.isLoading = true
            state.error = null
          })

          try {
            storeDebug('EXPORT_START', `Starting export as ${format}`, {
              projectId: tab.project.id,
              projectSize: `${tab.project.width}x${tab.project.height}`,
              format,
              options,
              currentFrameId: tab.project.activeFrameId,
              hasCurrentCanvasData: !!tab.canvasData,
              canvasDataLength: tab.canvasData?.data.length
            })
            
            // CRITICAL: Save current canvas data to active frame before export
            if (tab.project.activeFrameId && tab.canvasData) {
              storeDebug('EXPORT_SAVE_CURRENT_FRAME', 'Saving current canvas data to active frame before export', {
                activeFrameId: tab.project.activeFrameId,
                canvasDataLength: tab.canvasData.data.length
              })
              
              // Force save current canvas data to the active frame
              get().saveCurrentFrameCanvas(tab.id)
              
              // Verify the save worked by checking the frame data
              const updatedTab = get().tabs.find(t => t.id === tab.id)
              const updatedFrame = updatedTab?.frames.find(f => f.id === tab.project.activeFrameId)
              const frameCanvasData = updatedTab?.frameCanvasData.find(fc => fc.frameId === tab.project.activeFrameId)
              storeDebug('EXPORT_SAVE_VERIFICATION', 'Verified current frame save', {
                frameExists: !!updatedFrame,
                frameHasCanvasData: !!(frameCanvasData?.canvasData),
                frameCanvasDataLength: frameCanvasData?.canvasData?.data.length,
                frameHasContent: frameCanvasData?.canvasData ? Array.from(frameCanvasData.canvasData.data).some((_, i) => i % 4 === 3 && (frameCanvasData.canvasData!.data[i] ?? 0) > 0) : false
              })
            }

            // Calculate scaled dimensions
            const { width: originalWidth, height: originalHeight } = tab.project
            const scale = options.scale || 1
            const scaledWidth = Math.round(originalWidth * scale)
            const scaledHeight = Math.round(originalHeight * scale)
            
            storeDebug('EXPORT_SCALING', 'Calculating scaled dimensions', {
              original: `${originalWidth}x${originalHeight}`,
              scale,
              scaled: `${scaledWidth}x${scaledHeight}`
            })

            // Create source canvas from pixel data
            const sourceCanvas = document.createElement('canvas')
            sourceCanvas.width = originalWidth
            sourceCanvas.height = originalHeight
            
            const sourceCtx = sourceCanvas.getContext('2d')
            if (!sourceCtx) throw new Error('Failed to get source canvas context')

            // Set pixel perfect rendering for source
            sourceCtx.imageSmoothingEnabled = false
            
            // Create ImageData from stored pixel data
            const imageData = new ImageData(new Uint8ClampedArray(tab.canvasData.data), originalWidth, originalHeight)
            sourceCtx.putImageData(imageData, 0, 0)

            // Create final export canvas with scaling
            const canvas = document.createElement('canvas')
            canvas.width = scaledWidth
            canvas.height = scaledHeight
            
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Failed to get canvas context')

            // Configure scaling context
            if (scale >= 1) {
              // For upscaling, use nearest-neighbor (pixelated)
              ctx.imageSmoothingEnabled = false
            } else {
              // For downscaling, can use smooth interpolation
              ctx.imageSmoothingEnabled = true
              ctx.imageSmoothingQuality = 'high'
            }
            
            // Scale the image
            ctx.drawImage(sourceCanvas, 0, 0, originalWidth, originalHeight, 0, 0, scaledWidth, scaledHeight)

            storeDebug('EXPORT_CANVAS_CREATED', 'Canvas created from pixel data', {
              canvasSize: `${canvas.width}x${canvas.height}`,
              hasImageData: !!imageData
            })

            // Generate filename
            const fileName = options.fileName || `${tab.project.name}_${Date.now()}`
            const fullFileName = `${fileName}.${format}`

            if (format === 'gif') {
              // For GIF, we need multiple frames
              if (!tab.frames || tab.frames.length <= 1) {
                throw new Error('Need at least 2 frames to create a GIF')
              }

              storeDebug('EXPORT', 'Starting GIF creation', { frames: tab.frames.length })

              // Import gif.js dynamically to avoid SSR issues
              const GIF = (await import('gif.js' as any)).default
              
              
              // Create GIF encoder with transparency support using chroma key
              const gif = new GIF({
                workers: 2,
                quality: 10,
                width: scaledWidth,
                height: scaledHeight,
                repeat: options.loop !== false ? 0 : -1, // 0 = infinite loop, -1 = no loop
                transparent: 0xFF00FF, // Use magenta as transparent color (chroma key)
                dispose: 2, // Restore to background for proper transparency
                workerScript: '/gif.worker.js'
              })
              

              // Add frames to GIF
              const frameDuration = options.duration || 500
              let framesAdded = 0
              
              
              for (let i = 0; i < tab.frames.length; i++) {
                const frame = tab.frames[i]
                if (!frame) continue
                
                
                // Skip frames not included in animation
                if (!frame.included) continue
                
                const frameData = tab.frameCanvasData.find(f => f.frameId === frame.id)
                if (!frameData) {
                  storeDebug('EXPORT_ERROR', `No frameData for frame ${frame.id}`)
                  continue
                }
                
                if (!frameData.canvasData) {
                  storeDebug('EXPORT_ERROR', `No canvasData for frame ${frame.id}`)
                  continue
                }
                
                if (frameData.canvasData.data.length === 0) {
                  storeDebug('EXPORT_ERROR', `Empty canvas data for frame ${frame.id}`)
                  continue
                }
                
                // Validate data length
                const expectedDataLength = originalWidth * originalHeight * 4
                if (frameData.canvasData.data.length !== expectedDataLength) {
                  storeDebug('EXPORT_ERROR', `Wrong data length for frame ${frame.id}`)
                  continue
                }
                
                
                
                // Create source canvas for this frame
                const sourceFrameCanvas = createPixelCanvas(originalWidth, originalHeight)
                const sourceFrameCtx = sourceFrameCanvas.getContext('2d')!
                sourceFrameCtx.imageSmoothingEnabled = false
                
                
                // Create ImageData and render frame to source canvas with transparency handling
                try {
                  const frameImageData = new ImageData(new Uint8ClampedArray(frameData.canvasData.data), originalWidth, originalHeight)
                  
                  
                  // Clear source canvas for transparent background
                  sourceFrameCtx.clearRect(0, 0, originalWidth, originalHeight)
                  sourceFrameCtx.putImageData(frameImageData, 0, 0)
                  
                  storeDebug('EXPORT_GIF_IMAGEDATA_APPLIED', `Applied ImageData to source canvas for frame ${i + 1}`, {
                    frameId: frame.id
                  })
                  
                  // Create scaled canvas for GIF frame
                  const frameCanvas = createPixelCanvas(scaledWidth, scaledHeight)
                  const frameCtx = frameCanvas.getContext('2d')!
                  
                  storeDebug('EXPORT_GIF_SCALED_CANVAS_CREATED', `Created scaled canvas for frame ${i + 1}`, {
                    frameId: frame.id,
                    scaledSize: `${frameCanvas.width}x${frameCanvas.height}`,
                    scale: scale
                  })
                  
                  // Clear scaled canvas for transparent background
                  frameCtx.clearRect(0, 0, scaledWidth, scaledHeight)
                  
                  // Configure scaling for frame
                  if (scale >= 1) {
                    frameCtx.imageSmoothingEnabled = false // Pixel perfect upscaling
                  } else {
                    frameCtx.imageSmoothingEnabled = true
                    frameCtx.imageSmoothingQuality = 'high'
                  }
                  
                  storeDebug('EXPORT_GIF_BEFORE_SCALING', `About to scale frame ${i + 1}`, {
                    frameId: frame.id,
                    sourceSize: `${originalWidth}x${originalHeight}`,
                    targetSize: `${scaledWidth}x${scaledHeight}`,
                    scale: scale,
                    imageSmoothingEnabled: frameCtx.imageSmoothingEnabled
                  })
                  
                  // Scale the frame preserving transparency
                  frameCtx.drawImage(sourceFrameCanvas, 0, 0, originalWidth, originalHeight, 0, 0, scaledWidth, scaledHeight)
                  
                  storeDebug('EXPORT_GIF_AFTER_SCALING', `Completed scaling for frame ${i + 1}`, {
                    frameId: frame.id
                  })
                  
                  // Verify the scaled canvas has content
                  const scaledImageData = frameCtx.getImageData(0, 0, scaledWidth, scaledHeight)
                  let scaledHasVisiblePixels = false
                  if (scaledImageData && scaledImageData.data) {
                    const scaledData = scaledImageData.data
                    for (let pixelIndex = 3; pixelIndex < scaledData.length; pixelIndex += 4) {
                      if ((scaledData[pixelIndex] ?? 0) > 0) {
                        scaledHasVisiblePixels = true
                        break
                      }
                    }
                  }
                  
                  storeDebug('EXPORT_GIF_SCALED_VERIFICATION', `Scaled canvas verification for frame ${i + 1}`, {
                    frameId: frame.id,
                    scaledHasVisiblePixels,
                    scaledDataLength: scaledImageData.data.length,
                    firstScaledPixels: Array.from(scaledImageData.data.slice(0, 16))
                  })
                  
                  // Convert transparent pixels to magenta chroma key for GIF transparency
                  const chromaKeyCanvas = createPixelCanvas(scaledWidth, scaledHeight)
                  const chromaKeyCtx = chromaKeyCanvas.getContext('2d')!
                  
                  // Get current frame data
                  const currentFrameData = frameCtx.getImageData(0, 0, scaledWidth, scaledHeight)
                  const chromaKeyData = new Uint8ClampedArray(currentFrameData.data)
                  
                  // Convert transparent pixels (alpha = 0) to magenta (255, 0, 255, 255)
                  let transparentPixelsConverted = 0
                  for (let i = 0; i < chromaKeyData.length; i += 4) {
                    if (chromaKeyData[i + 3] === 0) { // If alpha is 0 (transparent)
                      chromaKeyData[i] = 255     // R = 255
                      chromaKeyData[i + 1] = 0   // G = 0  
                      chromaKeyData[i + 2] = 255 // B = 255 (magenta)
                      chromaKeyData[i + 3] = 255 // A = 255 (opaque)
                      transparentPixelsConverted++
                    }
                  }
                  
                  // Apply converted data to chroma key canvas
                  const chromaKeyImageData = new ImageData(chromaKeyData, scaledWidth, scaledHeight)
                  chromaKeyCtx.putImageData(chromaKeyImageData, 0, 0)
                  
                  
                  // Add frame to GIF with individual frame delay and transparency
                  const frameDelay = frame.delayMs || frameDuration
                  
                  
                  gif.addFrame(chromaKeyCanvas, { 
                    delay: frameDelay,
                    dispose: 2 // Restore to background for proper transparency
                  })
                  framesAdded++
                  
                  
                } catch (frameError) {
                  storeDebug('EXPORT_ERROR', `Frame processing failed: ${frameError}`)
                  // Continue with next frame
                }
              }
              
              if (framesAdded === 0) {
                throw new Error('No frames could be processed for GIF creation')
              }
              
              storeDebug('EXPORT', 'Rendering GIF', { frames: framesAdded })
              
              // Set up GIF completion handler
              return new Promise<void>((resolve, reject) => {
                gif.on('finished', function(blob: Blob) {
                  // Convert blob to download URL
                  const url = URL.createObjectURL(blob)
                  downloadFile(url, `${fileName}.gif`)
                  
                  // Clean up
                  setTimeout(() => URL.revokeObjectURL(url), 1000)
                  
                  storeDebug('EXPORT', `GIF exported: ${Math.round(blob.size / 1024)}KB`)
                  
                  resolve()
                })
                
                gif.on('error', function(error: any) {
                  storeDebug('EXPORT_ERROR', `GIF rendering failed: ${error}`)
                  reject(new Error(`GIF creation failed: ${error}`))
                })
                
                
                // Start rendering
                gif.render()
              })

            } else {
              // Handle static image formats (PNG, JPG, WebP)
              const quality = (format === 'jpg' ? (options.quality || 90) / 100 : 1.0)
              
              let mimeType = 'image/png'
              if (format === 'jpg') mimeType = 'image/jpeg'
              if (format === 'webp') mimeType = 'image/webp'


              const dataURL = canvas.toDataURL(mimeType, quality)
              downloadFile(dataURL, fullFileName)

              storeDebug('EXPORT', `Image exported as ${format}`)
            }
            
            set((state) => {
              state.isLoading = false
            })

            storeDebug('EXPORT_COMPLETE', 'Export process completed successfully')

          } catch (error) {
            storeDebug('EXPORT_ERROR', 'Export failed', { error: error instanceof Error ? error.message : error })
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Export failed'
              state.isLoading = false
            })
          }
        },

        // Add frame
        addFrame: (tabId) => {
          storeDebug('ADD_FRAME_START', `Adding new frame to tab ${tabId}`)

          // CRITICAL: Save current canvas data before switching
          const currentTab = get().getTab(tabId)
          if (currentTab?.currentFrame && currentTab?.canvasData) {
            storeDebug('ADD_FRAME_SAVE_CURRENT', 'Saving current canvas before adding frame', {
              currentFrameId: currentTab.currentFrame.id,
              hasCanvasData: !!currentTab.canvasData
            })
            get().saveCurrentFrameCanvas(tabId)
          }

          let newFrameId: string | null = null

          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            if (tab) {
              const frameId = `frame-${Date.now()}`
              newFrameId = frameId
              
              const newFrame: Frame = {
                id: frameId,
                ...createDefaultFrame(),
                projectId: tab.project.id,
                index: tab.frames.length,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }

              // Create empty canvas data for the new frame
              const newFrameCanvasData = createEmptyPixelData(tab.project.width, tab.project.height)
              
              // Add frame to arrays
              tab.frames.push(newFrame)
              tab.project.frames.push(frameId)
              
              // Add canvas data for the new frame
              tab.frameCanvasData.push({
                frameId,
                canvasData: newFrameCanvasData,
                thumbnail: null // Will be generated when first drawn
              })

              // AUTO-SWITCH: Set the new frame as active and load its canvas data
              tab.project.activeFrameId = frameId
              tab.currentFrame = newFrame
              tab.canvasData = {
                ...newFrameCanvasData,
                data: new Uint8ClampedArray(newFrameCanvasData.data)
              }
              
              tab.isDirty = true

              storeDebug('ADD_FRAME_COMPLETE', `Frame added and auto-switched successfully`, {
                frameId,
                totalFrames: tab.frames.length,
                frameCanvasDataCount: tab.frameCanvasData.length,
                autoSwitchedToFrame: frameId
              })
            }
          })

          // Generate thumbnail for the new empty frame
          if (newFrameId) {
            setTimeout(() => {
              get().regenerateFrameThumbnail(tabId, newFrameId!)
            }, 100)
          }
        },

        // Delete frame
        deleteFrame: (tabId, frameId) => {
          storeDebug('DELETE_FRAME_START', `Deleting frame ${frameId} from tab ${tabId}`)

          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            if (tab && tab.frames.length > 1) { // Don't allow deleting the last frame
              const frameIndex = tab.frames.findIndex(f => f.id === frameId)
              if (frameIndex !== -1) {
                // Remove frame from frames array
                tab.frames.splice(frameIndex, 1)
                tab.project.frames = tab.frames.map(f => f.id)
                
                // Remove frame canvas data
                const frameCanvasIndex = tab.frameCanvasData.findIndex(f => f.frameId === frameId)
                if (frameCanvasIndex !== -1) {
                  tab.frameCanvasData.splice(frameCanvasIndex, 1)
                }
                
                // Update active frame if deleted
                if (tab.project.activeFrameId === frameId) {
                  const newIndex = Math.min(frameIndex, tab.frames.length - 1)
                  const newActiveFrame = tab.frames[newIndex]
                  tab.project.activeFrameId = newActiveFrame?.id || null
                  tab.currentFrame = newActiveFrame || null
                  
                  // Load canvas data for the new active frame
                  if (newActiveFrame) {
                    const newFrameData = tab.frameCanvasData.find(f => f.frameId === newActiveFrame.id)
                    if (newFrameData) {
                      tab.canvasData = {
                        ...newFrameData.canvasData,
                        data: new Uint8ClampedArray(newFrameData.canvasData.data)
                      }
                    }
                  }
                }
                
                tab.isDirty = true

                storeDebug('DELETE_FRAME_COMPLETE', `Frame deleted successfully`, {
                  deletedFrameId: frameId,
                  remainingFrames: tab.frames.length,
                  frameCanvasDataCount: tab.frameCanvasData.length,
                  newActiveFrameId: tab.project.activeFrameId
                })
              }
            }
          })
        },

        // Duplicate frame
        duplicateFrame: (tabId, frameId) => {
          storeDebug('DUPLICATE_FRAME_START', `Duplicating frame ${frameId} in tab ${tabId}`)

          // CRITICAL: Save current canvas data before duplication
          const currentTab = get().getTab(tabId)
          if (currentTab?.currentFrame && currentTab?.canvasData) {
            storeDebug('DUPLICATE_FRAME_SAVE_CURRENT', 'Saving current canvas before duplication', {
              currentFrameId: currentTab.currentFrame.id,
              hasCanvasData: !!currentTab.canvasData,
              dataLength: currentTab.canvasData.data.length
            })
            get().saveCurrentFrameCanvas(tabId)
          }

          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            const sourceFrame = tab?.frames.find(f => f.id === frameId)
            const sourceFrameData = tab?.frameCanvasData.find(f => f.frameId === frameId)
            
            if (tab && sourceFrame) {
              const newFrameId = `frame-${Date.now()}-copy`
              const newFrame: Frame = {
                ...sourceFrame,
                id: newFrameId,
                index: sourceFrame.index + 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }

              // Insert after source frame
              const insertIndex = sourceFrame.index + 1
              tab.frames.splice(insertIndex, 0, newFrame)
              
              // Update indices for frames after the inserted one
              for (let i = insertIndex + 1; i < tab.frames.length; i++) {
                const frame = tab.frames[i]
                if (frame) {
                  frame.index = i
                }
              }

              // Duplicate frame canvas data with improved logic
              if (sourceFrameData && sourceFrameData.canvasData.data.length > 0) {
                // Copy existing frame data
                const duplicatedCanvasData = {
                  ...sourceFrameData.canvasData,
                  data: new Uint8ClampedArray(sourceFrameData.canvasData.data)
                }
                
                storeDebug('DUPLICATE_FRAME_COPY_EXISTING', `Copying existing canvas data`, {
                  sourceDataLength: sourceFrameData.canvasData.data.length,
                  duplicatedDataLength: duplicatedCanvasData.data.length,
                  hasThumbnail: !!sourceFrameData.thumbnail
                })
                
                tab.frameCanvasData.splice(insertIndex, 0, {
                  frameId: newFrameId,
                  canvasData: duplicatedCanvasData,
                  thumbnail: sourceFrameData.thumbnail // Reuse thumbnail since it's the same content
                })
              } else if (tab.currentFrame?.id === frameId && tab.canvasData && tab.canvasData.data.length > 0) {
                // Copy from current active canvas if it's the source frame
                const duplicatedCanvasData = {
                  ...tab.canvasData,
                  data: new Uint8ClampedArray(tab.canvasData.data)
                }
                
                const thumbnail = generateThumbnail(duplicatedCanvasData)
                
                storeDebug('DUPLICATE_FRAME_COPY_CURRENT', `Copying from current active canvas`, {
                  currentDataLength: tab.canvasData.data.length,
                  duplicatedDataLength: duplicatedCanvasData.data.length,
                  thumbnailGenerated: !!thumbnail
                })
                
                tab.frameCanvasData.splice(insertIndex, 0, {
                  frameId: newFrameId,
                  canvasData: duplicatedCanvasData,
                  thumbnail
                })
              } else {
                // Fallback: create empty canvas data
                storeDebug('DUPLICATE_FRAME_CREATE_EMPTY', `Creating empty canvas data for duplicated frame`)
                
                tab.frameCanvasData.splice(insertIndex, 0, {
                  frameId: newFrameId,
                  canvasData: createEmptyPixelData(tab.project.width, tab.project.height),
                  thumbnail: null
                })
              }

              tab.project.frames = tab.frames.map(f => f.id)

              // AUTO-SWITCH: Set the duplicated frame as active and load its canvas data
              tab.project.activeFrameId = newFrameId
              tab.currentFrame = newFrame
              
              // Load canvas data for the new duplicated frame
              const newFrameCanvasData = tab.frameCanvasData.find(f => f.frameId === newFrameId)
              if (newFrameCanvasData) {
                tab.canvasData = {
                  ...newFrameCanvasData.canvasData,
                  data: new Uint8ClampedArray(newFrameCanvasData.canvasData.data)
                }
                
                storeDebug('DUPLICATE_FRAME_CANVAS_LOADED', `Canvas data loaded for duplicated frame`, {
                  newFrameId,
                  dataLength: tab.canvasData.data.length
                })
              }
              
              tab.isDirty = true

              storeDebug('DUPLICATE_FRAME_COMPLETE', `Frame duplicated and auto-switched successfully`, {
                sourceFrameId: frameId,
                newFrameId,
                totalFrames: tab.frames.length,
                frameCanvasDataCount: tab.frameCanvasData.length,
                autoSwitchedToFrame: newFrameId
              })
            }
          })
        },

        // Save current frame canvas data
        saveCurrentFrameCanvas: (tabId) => {
          const tab = get().getTab(tabId)
          if (!tab || !tab.canvasData || !tab.currentFrame) return

          storeDebug('SAVE_FRAME_CANVAS', `Saving canvas data for frame ${tab.currentFrame.id}`, {
            frameId: tab.currentFrame.id,
            hasCanvasData: !!tab.canvasData,
            dataLength: tab.canvasData.data.length
          })

          set((state) => {
            const stateTab = state.tabs.find(t => t.id === tabId)
            if (!stateTab || !stateTab.canvasData || !stateTab.currentFrame) return

            const frameIndex = stateTab.frameCanvasData.findIndex(f => f.frameId === stateTab.currentFrame!.id)
            
            // Create a copy of canvas data
            const canvasDataCopy = {
              ...stateTab.canvasData,
              data: new Uint8ClampedArray(stateTab.canvasData.data)
            }

            // Generate thumbnail
            const thumbnail = generateThumbnail(canvasDataCopy)

            if (frameIndex >= 0) {
              // Update existing frame data
              stateTab.frameCanvasData[frameIndex] = {
                frameId: stateTab.currentFrame.id,
                canvasData: canvasDataCopy,
                thumbnail
              }
            } else {
              // Add new frame data
              stateTab.frameCanvasData.push({
                frameId: stateTab.currentFrame.id,
                canvasData: canvasDataCopy,
                thumbnail
              })
            }

            storeDebug('SAVE_FRAME_CANVAS_COMPLETE', `Frame canvas data saved`, {
              frameId: stateTab.currentFrame.id,
              thumbnailGenerated: !!thumbnail,
              frameCanvasDataCount: stateTab.frameCanvasData.length
            })
          })
        },

        // Get frame thumbnail
        getFrameThumbnail: (tabId, frameId) => {
          const tab = get().getTab(tabId)
          if (!tab || !tab.frameCanvasData) return null

          const frameData = tab.frameCanvasData.find(f => f.frameId === frameId)
          return frameData?.thumbnail || null
        },

        // Save all frame canvas data (useful for export operations)
        saveAllFrameCanvasData: (tabId) => {
          const tab = get().getTab(tabId)
          if (!tab) return

          storeDebug('SAVE_ALL_FRAMES_START', `Saving all frame canvas data for tab ${tabId}`, {
            totalFrames: tab.frames.length,
            frameCanvasDataCount: tab.frameCanvasData.length
          })

          // Always save current frame first
          get().saveCurrentFrameCanvas(tabId)

          storeDebug('SAVE_ALL_FRAMES_COMPLETE', `All frame canvas data saved`, {
            tabId,
            totalFrames: tab.frames.length
          })
        },

        // Set active frame with canvas data loading - CRITICAL FIX: Single atomic operation
        setActiveFrame: (tabId, frameId) => {
          storeDebug('SET_ACTIVE_FRAME_START', `Switching to frame ${frameId}`, {
            tabId,
            frameId
          })

          // ATOMIC OPERATION: Single set() call for data integrity
          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            const targetFrame = tab?.frames.find(f => f.id === frameId)
            
            if (!tab || !targetFrame) {
              storeDebug('SET_ACTIVE_FRAME_ERROR', 'Tab or frame not found', { tabId, frameId })
              return
            }

            storeDebug('SET_ACTIVE_FRAME_PROCESS', `Processing frame switch from ${tab.currentFrame?.id} to ${frameId}`, {
              hasCurrentCanvas: !!tab.canvasData,
              currentCanvasDataLength: tab.canvasData?.data.length,
              frameCanvasDataCount: tab.frameCanvasData.length
            })

            // STEP 1: Save current frame's canvas data if exists
            if (tab.currentFrame && tab.canvasData) {
              const currentFrameId = tab.currentFrame.id
              const hasNonZeroPixels = Array.from(tab.canvasData.data).some((_, i) => i % 4 === 3 && (tab.canvasData?.data[i] ?? 0) > 0)
              
              storeDebug('SET_ACTIVE_FRAME_SAVE_CURRENT', `Saving current frame ${currentFrameId}`, {
                currentFrameId,
                dataLength: tab.canvasData.data.length,
                hasNonZeroPixels
              })

              const frameIndex = tab.frameCanvasData.findIndex(f => f.frameId === currentFrameId)
              
              // Create a deep copy of canvas data
              const canvasDataCopy = {
                ...tab.canvasData,
                data: new Uint8ClampedArray(tab.canvasData.data)
              }

              // Generate thumbnail
              const thumbnail = generateThumbnail(canvasDataCopy)

              if (frameIndex >= 0) {
                // Update existing frame data
                tab.frameCanvasData[frameIndex] = {
                  frameId: currentFrameId,
                  canvasData: canvasDataCopy,
                  thumbnail
                }
                storeDebug('SET_ACTIVE_FRAME_SAVE_UPDATED', `Updated frame data for ${currentFrameId}`, {
                  frameIndex,
                  thumbnailGenerated: !!thumbnail
                })
              } else {
                // Add new frame data
                tab.frameCanvasData.push({
                  frameId: currentFrameId,
                  canvasData: canvasDataCopy,
                  thumbnail
                })
                storeDebug('SET_ACTIVE_FRAME_SAVE_ADDED', `Added frame data for ${currentFrameId}`, {
                  frameCanvasDataCount: tab.frameCanvasData.length,
                  thumbnailGenerated: !!thumbnail
                })
              }
            }

            // STEP 2: Update active frame references
            tab.project.activeFrameId = frameId
            tab.currentFrame = targetFrame

            // STEP 3: Load target frame's canvas data
            const targetFrameData = tab.frameCanvasData.find(f => f.frameId === frameId)
            if (targetFrameData) {
              // Load existing canvas data for target frame
              const hasPixelData = Array.from(targetFrameData.canvasData.data).some((_, i) => i % 4 === 3 && (targetFrameData.canvasData.data[i] ?? 0) > 0)
              tab.canvasData = {
                ...targetFrameData.canvasData,
                data: new Uint8ClampedArray(targetFrameData.canvasData.data)
              }
              storeDebug('SET_ACTIVE_FRAME_LOADED', `Loaded existing canvas data for frame ${frameId}`, {
                dataLength: targetFrameData.canvasData.data.length,
                hasThumbnail: !!targetFrameData.thumbnail,
                hasPixelData,
                samplePixels: Array.from(targetFrameData.canvasData.data.slice(0, 16))
              })
            } else {
              // Create empty canvas data for new frame
              tab.canvasData = createEmptyPixelData(tab.project.width, tab.project.height)
              storeDebug('SET_ACTIVE_FRAME_EMPTY', `Created empty canvas data for new frame ${frameId}`, {
                newDataLength: tab.canvasData.data.length
              })
            }

            // STEP 4: Update state metadata
            tab.isDirty = true

            storeDebug('SET_ACTIVE_FRAME_COMPLETE', `Frame switch completed atomically`, {
              newActiveFrameId: frameId,
              newCanvasDataLength: tab.canvasData.data.length,
              totalFrameCanvasData: tab.frameCanvasData.length,
              frameCanvasDataIds: tab.frameCanvasData.map(f => f.frameId)
            })

            // STEP 5: Add history entry (separate call to avoid circular dependencies)
            setTimeout(() => {
              get().addHistoryEntry(tabId, 'frame_switch', tab.canvasData!)
            }, 0)
          })
        },

        // Reorder frames
        reorderFrames: (tabId, frameIds) => {
          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            if (tab) {
              const reorderedFrames = frameIds.map((id, index) => {
                const frame = tab.frames.find(f => f.id === id)
                if (frame) {
                  return { ...frame, index }
                }
                return frame
              }).filter(Boolean) as Frame[]

              tab.frames = reorderedFrames
              tab.project.frames = frameIds
              tab.isDirty = true
            }
          })
        },

        // Get active tab
        getActiveTab: () => {
          const { tabs, activeTabId } = get()
          return tabs.find(tab => tab.id === activeTabId) || null
        },

        // Get tab by ID
        getTab: (tabId) => {
          const { tabs } = get()
          return tabs.find(tab => tab.id === tabId) || null
        },

        // Mark tab as dirty
        markTabDirty: (tabId) => {
          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            if (tab) {
              tab.isDirty = true
            }
          })
        },

        // Clear error
        clearError: () => {
          set((state) => {
            state.error = null
          })
        },

        // Regenerate all thumbnails for all tabs and frames
        regenerateAllThumbnails: () => {
          storeDebug('REGENERATE_ALL_THUMBNAILS_START', 'Starting thumbnail regeneration for all tabs')
          
          set((state) => {
            let totalRegenerated = 0
            
            state.tabs.forEach(tab => {
              const frames = tab.frameCanvasData || []
              storeDebug('REGENERATE_TAB_THUMBNAILS', `Regenerating thumbnails for tab ${tab.id}`, {
                tabId: tab.id,
                frameCount: frames.length,
                projectName: tab.project.name
              })

              frames.forEach(frameData => {
                if (frameData.canvasData && frameData.canvasData.data.length > 0) {
                  const newThumbnail = generateThumbnail(frameData.canvasData)
                  if (newThumbnail) {
                    frameData.thumbnail = newThumbnail
                    totalRegenerated++
                    storeDebug('REGENERATE_FRAME_THUMBNAIL', `Regenerated thumbnail for frame`, {
                      frameId: frameData.frameId,
                      tabId: tab.id,
                      hasData: frameData.canvasData.data.length > 0
                    })
                  }
                } else {
                  storeDebug('REGENERATE_FRAME_SKIP', `Skipping thumbnail for empty frame`, {
                    frameId: frameData.frameId,
                    dataLength: frameData.canvasData?.data.length || 0
                  })
                }
              })
            })
            
            storeDebug('REGENERATE_ALL_THUMBNAILS_COMPLETE', `Regenerated ${totalRegenerated} thumbnails`, {
              totalTabs: state.tabs.length,
              totalFrames: state.tabs.reduce(
                (sum, tab) => sum + ((tab.frameCanvasData || []).length),
                0
              ),
              regeneratedCount: totalRegenerated
            })
          })
        },

        // Regenerate thumbnail for specific frame
        regenerateFrameThumbnail: (tabId, frameId) => {
          storeDebug('REGENERATE_FRAME_THUMBNAIL_START', `Regenerating thumbnail for frame ${frameId}`)
          
          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            if (!tab) {
              storeDebug('REGENERATE_FRAME_THUMBNAIL_ERROR', 'Tab not found', { tabId })
              return
            }
            
            const frameData = tab.frameCanvasData.find(f => f.frameId === frameId)
            if (!frameData) {
              storeDebug('REGENERATE_FRAME_THUMBNAIL_ERROR', 'Frame data not found', { frameId, tabId })
              return
            }
            
            if (frameData.canvasData && frameData.canvasData.data.length > 0) {
              const newThumbnail = generateThumbnail(frameData.canvasData)
              if (newThumbnail) {
                frameData.thumbnail = newThumbnail
                storeDebug('REGENERATE_FRAME_THUMBNAIL_SUCCESS', `Successfully regenerated thumbnail`, {
                  frameId,
                  tabId,
                  thumbnailLength: newThumbnail.length
                })
              } else {
                storeDebug('REGENERATE_FRAME_THUMBNAIL_ERROR', 'Failed to generate thumbnail', { frameId, tabId })
              }
            } else {
              storeDebug('REGENERATE_FRAME_THUMBNAIL_SKIP', 'Frame has no canvas data', {
                frameId,
                dataLength: frameData.canvasData?.data.length || 0
              })
            }
          })
        },
      })),
      {
        name: 'pixelbuddy-projects',
        partialize: (state) => ({
          // Only persist essential data, not the full canvas data or thumbnails
          tabs: state.tabs.map(tab => ({
            ...tab,
            canvasData: null, // Don't persist heavy canvas data
            history: [], // Don't persist history
            frameCanvasData: (tab.frameCanvasData || []).map(frameData => ({
              ...frameData,
              thumbnail: null // Don't persist thumbnails - regenerate on load
            }))
          })),
          activeTabId: state.activeTabId,
        }),
      }
    ),
    { name: 'pixelbuddy-store' }
  )
)