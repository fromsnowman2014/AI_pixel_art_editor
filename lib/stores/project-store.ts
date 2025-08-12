'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Project, Frame, PixelData, CanvasState, HistoryEntry } from '@/lib/types/api'
import { generatePalette, DEFAULT_PALETTE } from '@/lib/utils'
import { useAuthStore } from './auth-store'

// Debug logging utility
const DEBUG_MODE = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.localStorage?.getItem('pixelbuddy-debug') === 'true')
const debugLog = (category: string, message: string, data?: any) => {
  if (DEBUG_MODE) {
    const timestamp = new Date().toISOString().split('T')[1]?.split('.')[0] || 'unknown'
    console.log(`[${timestamp}] 🏪 ProjectStore [${category}]:`, message, data || '')
  }
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
  exportProject: (tabId: string, format: 'png' | 'gif' | 'jpg') => Promise<void>

  // Frame operations
  addFrame: (tabId: string) => void
  deleteFrame: (tabId: string, frameId: string) => void
  duplicateFrame: (tabId: string, frameId: string) => void
  setActiveFrame: (tabId: string, frameId: string) => void
  reorderFrames: (tabId: string, frameIds: string[]) => void

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
                hasHistory: tab.history?.length > 0
              }))
            })

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

              debugLog('UPDATE_CANVAS_COMPLETE', `Canvas data updated successfully`, {
                tabId: tab.id,
                isDirty: tab.isDirty,
                canvasDataSet: !!tab.canvasData
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
              
              Object.assign(tab.project, updates)
              
              // If dimensions changed, reallocate canvas data
              if ((updates.width && updates.width !== oldWidth) || (updates.height && updates.height !== oldHeight)) {
                const newCanvasData = createEmptyPixelData(tab.project.width, tab.project.height)
                
                // Copy existing pixels if shrinking or expanding
                if (tab.canvasData) {
                  const oldData = tab.canvasData.data
                  const newData = newCanvasData.data
                  const minWidth = Math.min(oldWidth, tab.project.width)
                  const minHeight = Math.min(oldHeight, tab.project.height)
                  
                  for (let y = 0; y < minHeight; y++) {
                    for (let x = 0; x < minWidth; x++) {
                      const oldIndex = (y * oldWidth + x) * 4
                      const newIndex = (y * tab.project.width + x) * 4
                      
                      newData[newIndex] = oldData[oldIndex] || 255     // R (default white)
                      newData[newIndex + 1] = oldData[oldIndex + 1] || 255 // G
                      newData[newIndex + 2] = oldData[oldIndex + 2] || 255 // B
                      newData[newIndex + 3] = oldData[oldIndex + 3] || 255 // A
                    }
                  }
                }
                
                tab.canvasData = newCanvasData
                
                // Add history entry for dimension change
                get().addHistoryEntry(tabId, 'resize_canvas', newCanvasData)
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

        // Export project (placeholder)
        exportProject: async (tabId, format) => {
          const tab = get().getTab(tabId)
          if (!tab || !tab.canvasData) return

          set((state) => {
            state.isLoading = true
            state.error = null
          })

          try {
            // TODO: Implement export logic
            console.log(`Exporting project as ${format}:`, tab.project)
            
            set((state) => {
              state.isLoading = false
            })
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Export failed'
              state.isLoading = false
            })
          }
        },

        // Add frame
        addFrame: (tabId) => {
          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            if (tab) {
              const frameId = `frame-${Date.now()}`
              const newFrame: Frame = {
                id: frameId,
                ...createDefaultFrame(),
                projectId: tab.project.id,
                index: tab.frames.length,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }

              tab.frames.push(newFrame)
              tab.project.frames.push(frameId)
              tab.isDirty = true
            }
          })
        },

        // Delete frame
        deleteFrame: (tabId, frameId) => {
          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            if (tab && tab.frames.length > 1) { // Don't allow deleting the last frame
              const frameIndex = tab.frames.findIndex(f => f.id === frameId)
              if (frameIndex !== -1) {
                tab.frames.splice(frameIndex, 1)
                tab.project.frames = tab.frames.map(f => f.id)
                
                // Update active frame if deleted
                if (tab.project.activeFrameId === frameId) {
                  const newIndex = Math.min(frameIndex, tab.frames.length - 1)
                  tab.project.activeFrameId = tab.frames[newIndex]?.id || null
                  tab.currentFrame = tab.frames[newIndex] || null
                }
                
                tab.isDirty = true
              }
            }
          })
        },

        // Duplicate frame
        duplicateFrame: (tabId, frameId) => {
          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            const sourceFrame = tab?.frames.find(f => f.id === frameId)
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

              tab.project.frames = tab.frames.map(f => f.id)
              tab.isDirty = true
            }
          })
        },

        // Set active frame
        setActiveFrame: (tabId, frameId) => {
          set((state) => {
            const tab = state.tabs.find(t => t.id === tabId)
            const frame = tab?.frames.find(f => f.id === frameId)
            if (tab && frame) {
              tab.project.activeFrameId = frameId
              tab.currentFrame = frame
            }
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
      })),
      {
        name: 'pixelbuddy-projects',
        partialize: (state) => ({
          // Only persist essential data, not the full canvas data
          tabs: state.tabs.map(tab => ({
            ...tab,
            canvasData: null, // Don't persist heavy canvas data
            history: [], // Don't persist history
          })),
          activeTabId: state.activeTabId,
        }),
      }
    ),
    { name: 'pixelbuddy-store' }
  )
)