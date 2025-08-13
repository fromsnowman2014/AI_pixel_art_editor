'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Project, Frame, PixelData, CanvasState, HistoryEntry } from '@/lib/types/api'
import { generatePalette, DEFAULT_PALETTE, createPixelCanvas } from '@/lib/utils'
import { useAuthStore } from './auth-store'

// Debug logging utility
const DEBUG_MODE = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.localStorage?.getItem('pixelbuddy-debug') === 'true')
const debugLog = (category: string, message: string, data?: any) => {
  if (DEBUG_MODE) {
    const timestamp = new Date().toISOString().split('T')[1]?.split('.')[0] || 'unknown'
    console.log(`[${timestamp}] 🏪 ProjectStore [${category}]:`, message, data || '')
  }
}

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
      debugLog('THUMBNAIL_ERROR', 'Invalid pixel data provided', { 
        hasPixelData: !!pixelData,
        dataLength: pixelData?.data?.length || 0
      })
      return null
    }

    canvas = document.createElement('canvas')
    canvas.width = thumbnailSize
    canvas.height = thumbnailSize
    const ctx = canvas.getContext('2d', { willReadFrequently: false })
    
    if (!ctx) {
      debugLog('THUMBNAIL_ERROR', 'Failed to get 2D context for thumbnail canvas')
      return null
    }

    // Create source canvas with original pixel data
    sourceCanvas = document.createElement('canvas')
    sourceCanvas.width = pixelData.width
    sourceCanvas.height = pixelData.height
    const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: false })
    
    if (!sourceCtx) {
      debugLog('THUMBNAIL_ERROR', 'Failed to get 2D context for source canvas')
      return null
    }

    // Create ImageData with proper validation
    const expectedLength = pixelData.width * pixelData.height * 4
    if (pixelData.data.length !== expectedLength) {
      debugLog('THUMBNAIL_ERROR', 'Pixel data length mismatch', {
        expected: expectedLength,
        actual: pixelData.data.length,
        dimensions: `${pixelData.width}x${pixelData.height}`
      })
      return null
    }

    // Put original pixel data on source canvas
    const imageData = new ImageData(new Uint8ClampedArray(pixelData.data), pixelData.width, pixelData.height)
    sourceCtx.putImageData(imageData, 0, 0)

    // Scale down to thumbnail size with nearest neighbor (pixel perfect)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(sourceCanvas, 0, 0, thumbnailSize, thumbnailSize)

    const result = canvas.toDataURL('image/png')
    
    debugLog('THUMBNAIL_SUCCESS', 'Thumbnail generated successfully', {
      originalSize: `${pixelData.width}x${pixelData.height}`,
      thumbnailSize: `${thumbnailSize}x${thumbnailSize}`,
      resultLength: result.length
    })
    
    return result
  } catch (error) {
    debugLog('THUMBNAIL_ERROR', 'Failed to generate thumbnail', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      pixelDataSize: pixelData?.data?.length || 0,
      dimensions: pixelData ? `${pixelData.width}x${pixelData.height}` : 'unknown'
    })
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

interface ProjectTab {
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
  mode: 'beginner',
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
          debugLog('INIT_START', `Initializing app`, { existingTabsCount: tabs.length })

          if (tabs.length === 0) {
            debugLog('INIT_NEW_PROJECT', `No existing tabs, creating new project`)
            get().createNewProject()
          } else {
            debugLog('INIT_RESTORE_TABS', `Restoring ${tabs.length} tabs from persistence`, {
              tabInfo: tabs.map(tab => ({
                id: tab.id,
                projectName: tab.project.name,
                hasCanvasData: !!tab.canvasData,
                canvasDataLength: tab.canvasData?.data.length,
                dimensions: `${tab.project.width}x${tab.project.height}`,
                hasHistory: tab.history?.length > 0,
                frameCount: tab.frameCanvasData?.length || 0
              }))
            })
            
            // CRITICAL: Regenerate thumbnails after persistence restore
            get().regenerateAllThumbnails()

            // Fix tabs loaded from persistence that have null canvasData
            set((state) => {
              state.tabs.forEach((tab, index) => {
                debugLog('INIT_PROCESS_TAB', `Processing tab ${index}`, {
                  tabId: tab.id,
                  hasCanvasData: !!tab.canvasData,
                  hasHistory: !!tab.history?.length
                })

                if (!tab.canvasData) {
                  debugLog('INIT_CREATE_CANVAS_DATA', `Creating canvas data for tab ${tab.id}`, {
                    dimensions: `${tab.project.width}x${tab.project.height}`,
                    pixelCount: tab.project.width * tab.project.height
                  })
                  tab.canvasData = createEmptyPixelData(tab.project.width, tab.project.height)
                }

                // Also ensure history exists for undo/redo functionality
                if (!tab.history || tab.history.length === 0) {
                  debugLog('INIT_CREATE_HISTORY', `Creating history for tab ${tab.id}`)
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
                  debugLog('INIT_CREATE_FRAME_CANVAS_DATA', `Creating frameCanvasData for tab ${tab.id}`)
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

                debugLog('INIT_TAB_COMPLETE', `Tab ${tab.id} initialization complete`, {
                  hasCanvasData: !!tab.canvasData,
                  canvasDataLength: tab.canvasData?.data.length,
                  historyLength: tab.history?.length,
                  historyIndex: tab.historyIndex
                })
              })
            })

            debugLog('INIT_COMPLETE', `App initialization complete`)
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
            const userId = authState.user?.type === 'authenticated' ? authState.user.id : null
            
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
          debugLog('UPDATE_CANVAS_START', `Updating canvas data for tab ${tabId}`, {
            tabId,
            dataLength: data.data.length,
            dimensions: `${data.width}x${data.height}`
          })

          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            if (tab) {
              const oldData = tab.canvasData
              debugLog('UPDATE_CANVAS_FOUND_TAB', `Found tab, updating canvas data`, {
                tabId: tab.id,
                hadPreviousData: !!oldData,
                previousDataLength: oldData?.data.length,
                newDataLength: data.data.length,
                dataChanged: !oldData || JSON.stringify(Array.from(oldData.data.slice(0, 20))) !== JSON.stringify(Array.from(data.data.slice(0, 20)))
              })

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

              debugLog('UPDATE_CANVAS_PIXEL_SAMPLE', `New canvas data pixel sample`, {
                totalPixels: data.data.length / 4,
                nonTransparentSample: samplePixels.slice(0, 3)
              })

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
                
                debugLog('UPDATE_CANVAS_THUMBNAIL_REGEN', `Force regenerating thumbnail for real-time sync`, {
                  frameId: tab.currentFrame.id,
                  hasNonZeroPixels: Array.from(canvasDataCopy.data).some((_, i) => i % 4 === 3 && (canvasDataCopy.data[i] ?? 0) > 0),
                  thumbnailGenerated: !!thumbnail,
                  dataLength: canvasDataCopy.data.length
                })

                if (frameIndex >= 0) {
                  // Update existing frame data
                  tab.frameCanvasData[frameIndex] = {
                    frameId: tab.currentFrame.id,
                    canvasData: canvasDataCopy,
                    thumbnail
                  }
                  debugLog('UPDATE_CANVAS_FRAME_UPDATED', `Updated current frame canvas data`, {
                    frameId: tab.currentFrame.id,
                    frameIndex,
                    thumbnailGenerated: !!thumbnail
                  })
                } else {
                  // Add new frame data
                  tab.frameCanvasData.push({
                    frameId: tab.currentFrame.id,
                    canvasData: canvasDataCopy,
                    thumbnail
                  })
                  debugLog('UPDATE_CANVAS_FRAME_ADDED', `Added new frame canvas data`, {
                    frameId: tab.currentFrame.id,
                    frameCanvasDataCount: tab.frameCanvasData.length,
                    thumbnailGenerated: !!thumbnail
                  })
                }
              }

              debugLog('UPDATE_CANVAS_COMPLETE', `Canvas data updated successfully`, {
                tabId: tab.id,
                isDirty: tab.isDirty,
                canvasDataSet: !!tab.canvasData,
                frameDataUpdated: !!tab.currentFrame
              })

              // Critical debug: Check if React will detect this change
              // Fix: Capture values before setTimeout to avoid proxy issues
              const capturedData = {
                tabId: tab.id,
                canvasDataLength: tab.canvasData?.data.length,
                tabsCount: state.tabs.length,
                activeTabId: state.activeTabId
              }
              setTimeout(() => {
                debugLog('STORE_FOLLOWUP_CHECK', 'Checking store state after update', {
                  ...capturedData,
                  timestamp: Date.now()
                })
              }, 25)
            } else {
              debugLog('UPDATE_CANVAS_NO_TAB', `Tab not found: ${tabId}`, {
                availableTabs: state.tabs.map(t => ({ id: t.id, projectName: t.project.name }))
              })
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
              
              debugLog('UPDATE_PROJECT_START', 'Project update requested', {
                tabId,
                updates,
                oldSize: `${oldWidth}x${oldHeight}`,
                newSize: updates.width || updates.height ? `${updates.width || oldWidth}x${updates.height || oldHeight}` : 'no size change'
              })
              
              Object.assign(tab.project, updates)
              
              // If dimensions changed, reallocate canvas data for ALL frames
              if ((updates.width && updates.width !== oldWidth) || (updates.height && updates.height !== oldHeight)) {
                debugLog('RESIZE_CANVAS_START', 'Canvas resize operation started for all frames', {
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
                    
                    debugLog('RESIZE_FRAME_DATA_COPY', 'Frame pixel data copied', {
                      copiedPixels: copiedPixels,
                      totalPixels: minWidth * minHeight
                    })
                  }
                  
                  return newCanvasData
                }

                // Resize current canvas data
                if (tab.canvasData) {
                  tab.canvasData = resizeCanvasData(tab.canvasData)
                  
                  debugLog('RESIZE_CURRENT_CANVAS', 'Current canvas data resized', {
                    newSize: `${tab.project.width}x${tab.project.height}`
                  })
                }

                // Resize all frame canvas data
                tab.frameCanvasData = tab.frameCanvasData.map((frameData, index) => {
                  const resizedCanvasData = resizeCanvasData(frameData.canvasData)
                  const newThumbnail = generateThumbnail(resizedCanvasData)
                  
                  debugLog('RESIZE_FRAME_CANVAS', `Frame ${index + 1} canvas data resized`, {
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
                
                debugLog('RESIZE_CANVAS_COMPLETE', 'All frames canvas resize completed', {
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

          // Debug logging
          const DEBUG_MODE = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.localStorage?.getItem('pixelbuddy-debug') === 'true')
          const debugLog = (category: string, message: string, data?: any) => {
            if (DEBUG_MODE) {
              const timestamp = new Date().toISOString().split('T')[1]?.split('.')[0] || 'unknown'
              console.log(`[${timestamp}] 🏪 ProjectStore [${category}]:`, message, data || '')
            }
          }

          set((state) => {
            state.isLoading = true
            state.error = null
          })

          try {
            debugLog('EXPORT_START', `Starting export as ${format}`, {
              projectId: tab.project.id,
              projectSize: `${tab.project.width}x${tab.project.height}`,
              format,
              options
            })

            // Calculate scaled dimensions
            const { width: originalWidth, height: originalHeight } = tab.project
            const scale = options.scale || 1
            const scaledWidth = Math.round(originalWidth * scale)
            const scaledHeight = Math.round(originalHeight * scale)
            
            debugLog('EXPORT_SCALING', 'Calculating scaled dimensions', {
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

            debugLog('EXPORT_CANVAS_CREATED', 'Canvas created from pixel data', {
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

              debugLog('EXPORT_GIF_START', 'Starting GIF creation', {
                frameCount: tab.frames.length,
                duration: options.duration || 500,
                loop: options.loop !== false,
                includeOnlyVisible: tab.frames.filter(f => f.included).length
              })

              // Import gif.js dynamically to avoid SSR issues
              const GIF = (await import('gif.js' as any)).default
              
              debugLog('EXPORT_GIF_LIBRARY_LOADED', 'GIF.js library loaded successfully')
              
              // Create GIF encoder with scaled dimensions and transparency support
              const gif = new GIF({
                workers: 2,
                quality: 10,
                width: scaledWidth,
                height: scaledHeight,
                repeat: options.loop !== false ? 0 : -1, // 0 = infinite loop, -1 = no loop
                transparent: 0x00000000, // Enable transparency with index 0
                dispose: 2, // Restore to background color for transparency
                workerScript: '/gif.worker.js'
              })
              
              debugLog('EXPORT_GIF_ENCODER_CREATED', 'GIF encoder initialized', {
                workers: 2,
                quality: 10,
                dimensions: `${scaledWidth}x${scaledHeight}`,
                repeat: options.loop !== false ? 0 : -1
              })

              // Add frames to GIF
              const frameDuration = options.duration || 500
              let framesAdded = 0
              
              for (let i = 0; i < tab.frames.length; i++) {
                const frame = tab.frames[i]
                if (!frame) continue
                
                // Skip frames not included in animation
                if (!frame.included) {
                  debugLog('EXPORT_GIF_FRAME_SKIPPED', `Skipping frame ${i + 1} (not included)`, {
                    frameId: frame.id,
                    index: i
                  })
                  continue
                }
                
                const frameData = tab.frameCanvasData.find(f => f.frameId === frame.id)
                if (!frameData || !frameData.canvasData || frameData.canvasData.data.length === 0) {
                  debugLog('EXPORT_GIF_FRAME_NO_DATA', `Skipping frame ${i + 1} (no canvas data)`, {
                    frameId: frame.id,
                    hasFrameData: !!frameData,
                    dataLength: frameData?.canvasData?.data.length || 0
                  })
                  continue
                }
                
                debugLog('EXPORT_GIF_FRAME_PROCESSING', `Processing frame ${i + 1}`, {
                  frameId: frame.id,
                  dataLength: frameData.canvasData.data.length,
                  delayMs: frame.delayMs || frameDuration
                })
                
                // Create source canvas for this frame
                const sourceFrameCanvas = createPixelCanvas(originalWidth, originalHeight)
                const sourceFrameCtx = sourceFrameCanvas.getContext('2d')!
                sourceFrameCtx.imageSmoothingEnabled = false
                
                // Create ImageData and render frame to source canvas with transparency handling
                try {
                  const frameImageData = new ImageData(new Uint8ClampedArray(frameData.canvasData.data), originalWidth, originalHeight)
                  
                  // Clear source canvas with transparent background (don't fill with white)
                  sourceFrameCtx.clearRect(0, 0, originalWidth, originalHeight)
                  sourceFrameCtx.putImageData(frameImageData, 0, 0)
                  
                  // Create scaled canvas for GIF frame
                  const frameCanvas = createPixelCanvas(scaledWidth, scaledHeight)
                  const frameCtx = frameCanvas.getContext('2d')!
                  
                  // Clear scaled canvas with transparent background (don't fill with white)
                  frameCtx.clearRect(0, 0, scaledWidth, scaledHeight)
                  
                  // Configure scaling for frame
                  if (scale >= 1) {
                    frameCtx.imageSmoothingEnabled = false // Pixel perfect upscaling
                  } else {
                    frameCtx.imageSmoothingEnabled = true
                    frameCtx.imageSmoothingQuality = 'high'
                  }
                  
                  // Scale the frame preserving transparency
                  frameCtx.drawImage(sourceFrameCanvas, 0, 0, originalWidth, originalHeight, 0, 0, scaledWidth, scaledHeight)
                  
                  // Add frame to GIF with individual frame delay and transparency
                  const frameDelay = frame.delayMs || frameDuration
                  gif.addFrame(frameCanvas, { 
                    delay: frameDelay,
                    dispose: 2 // Restore to background for proper transparency
                  })
                  framesAdded++
                  
                  debugLog('EXPORT_GIF_FRAME_ADDED', `Added frame ${i + 1} to GIF`, {
                    frameId: frame.id,
                    delay: frameDelay,
                    totalFramesAdded: framesAdded
                  })
                  
                } catch (frameError) {
                  debugLog('EXPORT_GIF_FRAME_ERROR', `Error processing frame ${i + 1}`, {
                    frameId: frame.id,
                    error: frameError instanceof Error ? frameError.message : String(frameError)
                  })
                  // Continue with next frame
                }
              }
              
              if (framesAdded === 0) {
                throw new Error('No frames could be processed for GIF creation')
              }
              
              debugLog('EXPORT_GIF_RENDERING_START', 'Starting GIF rendering', {
                totalFramesAdded: framesAdded,
                estimatedFileSize: `${Math.round(framesAdded * scaledWidth * scaledHeight * 0.1 / 1024)}KB`
              })
              
              // Set up GIF completion handler
              return new Promise<void>((resolve, reject) => {
                gif.on('finished', function(blob: Blob) {
                  debugLog('EXPORT_GIF_RENDER_COMPLETE', 'GIF rendering completed', {
                    blobSize: `${Math.round(blob.size / 1024)}KB`,
                    framesProcessed: framesAdded
                  })
                  
                  // Convert blob to download URL
                  const url = URL.createObjectURL(blob)
                  downloadFile(url, `${fileName}.gif`)
                  
                  // Clean up
                  setTimeout(() => URL.revokeObjectURL(url), 1000)
                  
                  debugLog('EXPORT_GIF_DOWNLOAD_SUCCESS', 'GIF download initiated', {
                    fileName: `${fileName}.gif`,
                    finalSize: `${Math.round(blob.size / 1024)}KB`
                  })
                  
                  resolve()
                })
                
                gif.on('error', function(error: any) {
                  debugLog('EXPORT_GIF_ERROR', 'GIF rendering failed', {
                    error: error instanceof Error ? error.message : String(error)
                  })
                  reject(new Error(`GIF creation failed: ${error}`))
                })
                
                gif.on('progress', function(p: number) {
                  debugLog('EXPORT_GIF_PROGRESS', `GIF rendering progress: ${Math.round(p * 100)}%`, {
                    progress: p,
                    percentage: Math.round(p * 100)
                  })
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

              debugLog('EXPORT_IMAGE_CONVERT', `Converting to ${format}`, {
                mimeType,
                quality: format === 'jpg' ? quality : 1.0
              })

              const dataURL = canvas.toDataURL(mimeType, quality)
              downloadFile(dataURL, fullFileName)

              debugLog('EXPORT_IMAGE_SUCCESS', `Successfully exported as ${format}`, {
                fileName: fullFileName,
                size: `${scaledWidth}x${scaledHeight}`
              })
            }
            
            set((state) => {
              state.isLoading = false
            })

            debugLog('EXPORT_COMPLETE', 'Export process completed successfully')

          } catch (error) {
            debugLog('EXPORT_ERROR', 'Export failed', { error: error instanceof Error ? error.message : error })
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Export failed'
              state.isLoading = false
            })
          }
        },

        // Add frame
        addFrame: (tabId) => {
          debugLog('ADD_FRAME_START', `Adding new frame to tab ${tabId}`)

          // CRITICAL: Save current canvas data before switching
          const currentTab = get().getTab(tabId)
          if (currentTab?.currentFrame && currentTab?.canvasData) {
            debugLog('ADD_FRAME_SAVE_CURRENT', 'Saving current canvas before adding frame', {
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

              debugLog('ADD_FRAME_COMPLETE', `Frame added and auto-switched successfully`, {
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
          debugLog('DELETE_FRAME_START', `Deleting frame ${frameId} from tab ${tabId}`)

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

                debugLog('DELETE_FRAME_COMPLETE', `Frame deleted successfully`, {
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
          debugLog('DUPLICATE_FRAME_START', `Duplicating frame ${frameId} in tab ${tabId}`)

          // CRITICAL: Save current canvas data before duplication
          const currentTab = get().getTab(tabId)
          if (currentTab?.currentFrame && currentTab?.canvasData) {
            debugLog('DUPLICATE_FRAME_SAVE_CURRENT', 'Saving current canvas before duplication', {
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
                
                debugLog('DUPLICATE_FRAME_COPY_EXISTING', `Copying existing canvas data`, {
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
                
                debugLog('DUPLICATE_FRAME_COPY_CURRENT', `Copying from current active canvas`, {
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
                debugLog('DUPLICATE_FRAME_CREATE_EMPTY', `Creating empty canvas data for duplicated frame`)
                
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
                
                debugLog('DUPLICATE_FRAME_CANVAS_LOADED', `Canvas data loaded for duplicated frame`, {
                  newFrameId,
                  dataLength: tab.canvasData.data.length
                })
              }
              
              tab.isDirty = true

              debugLog('DUPLICATE_FRAME_COMPLETE', `Frame duplicated and auto-switched successfully`, {
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

          debugLog('SAVE_FRAME_CANVAS', `Saving canvas data for frame ${tab.currentFrame.id}`, {
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

            debugLog('SAVE_FRAME_CANVAS_COMPLETE', `Frame canvas data saved`, {
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

          debugLog('SAVE_ALL_FRAMES_START', `Saving all frame canvas data for tab ${tabId}`, {
            totalFrames: tab.frames.length,
            frameCanvasDataCount: tab.frameCanvasData.length
          })

          // Always save current frame first
          get().saveCurrentFrameCanvas(tabId)

          debugLog('SAVE_ALL_FRAMES_COMPLETE', `All frame canvas data saved`, {
            tabId,
            totalFrames: tab.frames.length
          })
        },

        // Set active frame with canvas data loading - CRITICAL FIX: Single atomic operation
        setActiveFrame: (tabId, frameId) => {
          debugLog('SET_ACTIVE_FRAME_START', `Switching to frame ${frameId}`, {
            tabId,
            frameId
          })

          // ATOMIC OPERATION: Single set() call for data integrity
          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            const targetFrame = tab?.frames.find(f => f.id === frameId)
            
            if (!tab || !targetFrame) {
              debugLog('SET_ACTIVE_FRAME_ERROR', 'Tab or frame not found', { tabId, frameId })
              return
            }

            debugLog('SET_ACTIVE_FRAME_PROCESS', `Processing frame switch from ${tab.currentFrame?.id} to ${frameId}`, {
              hasCurrentCanvas: !!tab.canvasData,
              currentCanvasDataLength: tab.canvasData?.data.length,
              frameCanvasDataCount: tab.frameCanvasData.length
            })

            // STEP 1: Save current frame's canvas data if exists
            if (tab.currentFrame && tab.canvasData) {
              const currentFrameId = tab.currentFrame.id
              const hasNonZeroPixels = Array.from(tab.canvasData.data).some((_, i) => i % 4 === 3 && (tab.canvasData?.data[i] ?? 0) > 0)
              
              debugLog('SET_ACTIVE_FRAME_SAVE_CURRENT', `Saving current frame ${currentFrameId}`, {
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
                debugLog('SET_ACTIVE_FRAME_SAVE_UPDATED', `Updated frame data for ${currentFrameId}`, {
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
                debugLog('SET_ACTIVE_FRAME_SAVE_ADDED', `Added frame data for ${currentFrameId}`, {
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
              debugLog('SET_ACTIVE_FRAME_LOADED', `Loaded existing canvas data for frame ${frameId}`, {
                dataLength: targetFrameData.canvasData.data.length,
                hasThumbnail: !!targetFrameData.thumbnail,
                hasPixelData,
                samplePixels: Array.from(targetFrameData.canvasData.data.slice(0, 16))
              })
            } else {
              // Create empty canvas data for new frame
              tab.canvasData = createEmptyPixelData(tab.project.width, tab.project.height)
              debugLog('SET_ACTIVE_FRAME_EMPTY', `Created empty canvas data for new frame ${frameId}`, {
                newDataLength: tab.canvasData.data.length
              })
            }

            // STEP 4: Update state metadata
            tab.isDirty = true

            debugLog('SET_ACTIVE_FRAME_COMPLETE', `Frame switch completed atomically`, {
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
          debugLog('REGENERATE_ALL_THUMBNAILS_START', 'Starting thumbnail regeneration for all tabs')
          
          set((state) => {
            let totalRegenerated = 0
            
            state.tabs.forEach(tab => {
              debugLog('REGENERATE_TAB_THUMBNAILS', `Regenerating thumbnails for tab ${tab.id}`, {
                tabId: tab.id,
                frameCount: tab.frameCanvasData.length,
                projectName: tab.project.name
              })
              
              tab.frameCanvasData.forEach(frameData => {
                if (frameData.canvasData && frameData.canvasData.data.length > 0) {
                  const newThumbnail = generateThumbnail(frameData.canvasData)
                  if (newThumbnail) {
                    frameData.thumbnail = newThumbnail
                    totalRegenerated++
                    debugLog('REGENERATE_FRAME_THUMBNAIL', `Regenerated thumbnail for frame`, {
                      frameId: frameData.frameId,
                      tabId: tab.id,
                      hasData: frameData.canvasData.data.length > 0
                    })
                  }
                } else {
                  debugLog('REGENERATE_FRAME_SKIP', `Skipping thumbnail for empty frame`, {
                    frameId: frameData.frameId,
                    dataLength: frameData.canvasData?.data.length || 0
                  })
                }
              })
            })
            
            debugLog('REGENERATE_ALL_THUMBNAILS_COMPLETE', `Regenerated ${totalRegenerated} thumbnails`, {
              totalTabs: state.tabs.length,
              totalFrames: state.tabs.reduce((sum, tab) => sum + tab.frameCanvasData.length, 0),
              regeneratedCount: totalRegenerated
            })
          })
        },

        // Regenerate thumbnail for specific frame
        regenerateFrameThumbnail: (tabId, frameId) => {
          debugLog('REGENERATE_FRAME_THUMBNAIL_START', `Regenerating thumbnail for frame ${frameId}`)
          
          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            if (!tab) {
              debugLog('REGENERATE_FRAME_THUMBNAIL_ERROR', 'Tab not found', { tabId })
              return
            }
            
            const frameData = tab.frameCanvasData.find(f => f.frameId === frameId)
            if (!frameData) {
              debugLog('REGENERATE_FRAME_THUMBNAIL_ERROR', 'Frame data not found', { frameId, tabId })
              return
            }
            
            if (frameData.canvasData && frameData.canvasData.data.length > 0) {
              const newThumbnail = generateThumbnail(frameData.canvasData)
              if (newThumbnail) {
                frameData.thumbnail = newThumbnail
                debugLog('REGENERATE_FRAME_THUMBNAIL_SUCCESS', `Successfully regenerated thumbnail`, {
                  frameId,
                  tabId,
                  thumbnailLength: newThumbnail.length
                })
              } else {
                debugLog('REGENERATE_FRAME_THUMBNAIL_ERROR', 'Failed to generate thumbnail', { frameId, tabId })
              }
            } else {
              debugLog('REGENERATE_FRAME_THUMBNAIL_SKIP', 'Frame has no canvas data', {
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
            frameCanvasData: tab.frameCanvasData.map(frameData => ({
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