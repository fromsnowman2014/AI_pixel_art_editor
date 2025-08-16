import { useProjectStore } from '@/lib/stores/project-store'

describe('Canvas Drawing Fix - Persistence Issue', () => {
  beforeEach(() => {
    // Reset store state
    useProjectStore.setState({
      tabs: [],
      activeTabId: null,
    })
  })

  test('should initialize canvasData for persisted tabs with null canvasData', () => {
    // Simulate persisted state with null canvasData (as it comes from persistence)
    const mockPersistedTab = {
      id: 'tab-1',
      project: {
        id: 'project-1',
        name: 'Test Project',
        width: 32,
        height: 32,
        colorLimit: 24,
        palette: ['#000000', '#FFFFFF'],
        frames: ['frame-1'],
        activeFrameId: 'frame-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: null
      },
      currentFrame: {
        id: 'frame-1',
        projectId: 'project-1',
        index: 0,
        delayMs: 500,
        included: true,
        layers: [],
        flattenedPngUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      frames: [],
      canvasData: null, // This simulates persisted state
      canvasState: {
        tool: 'pencil' as const,
        color: '#000000',
        brushSize: 1,
        zoom: 8,
        panX: 0,
        panY: 0,
      },
      history: [], // This also gets cleared in persistence
      historyIndex: 0,
      isDirty: false,
    }

    // Set the persisted state
    useProjectStore.setState({
      tabs: [mockPersistedTab],
      activeTabId: 'tab-1',
    })

    // Call initializeApp to trigger the fix
    const store = useProjectStore.getState()
    store.initializeApp()

    // Verify that canvasData was initialized
    const updatedStore = useProjectStore.getState()
    const tab = updatedStore.tabs[0]

    expect(tab.canvasData).not.toBeNull()
    expect(tab.canvasData?.width).toBe(32)
    expect(tab.canvasData?.height).toBe(32)
    expect(tab.canvasData?.data).toBeInstanceOf(Uint8ClampedArray)
    expect(tab.canvasData?.data.length).toBe(32 * 32 * 4) // RGBA

    // Verify that history was also restored
    expect(tab.history).toHaveLength(1)
    expect(tab.history[0].action).toBe('restored')
    expect(tab.historyIndex).toBe(0)
  })

  test('should not modify tabs that already have canvasData', () => {
    const validCanvasData = {
      width: 32,
      height: 32,
      data: new Uint8ClampedArray(32 * 32 * 4)
    }

    const mockTabWithCanvasData = {
      id: 'tab-1',
      project: {
        id: 'project-1',
        name: 'Test Project',
        width: 32,
        height: 32,
        colorLimit: 24,
        palette: ['#000000', '#FFFFFF'],
        frames: ['frame-1'],
        activeFrameId: 'frame-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: null
      },
      currentFrame: null,
      frames: [],
      canvasData: validCanvasData, // Already has canvas data
      canvasState: {
        tool: 'pencil' as const,
        color: '#000000',
        brushSize: 1,
        zoom: 8,
        panX: 0,
        panY: 0,
      },
      history: [{
        id: 'history-1',
        action: 'initial',
        data: validCanvasData,
        timestamp: Date.now()
      }],
      historyIndex: 0,
      isDirty: false,
    }

    useProjectStore.setState({
      tabs: [mockTabWithCanvasData],
      activeTabId: 'tab-1',
    })

    const store = useProjectStore.getState()
    store.initializeApp()

    const updatedStore = useProjectStore.getState()
    const tab = updatedStore.tabs[0]

    // Should not have changed the existing canvasData
    expect(tab.canvasData).toBe(validCanvasData)
    expect(tab.history).toHaveLength(1) // Should not have added new history
    expect(tab.history[0].action).toBe('initial') // Should preserve original history
  })

  test('should create new project when no tabs exist', () => {
    // Empty state
    useProjectStore.setState({
      tabs: [],
      activeTabId: null,
    })

    const store = useProjectStore.getState()
    store.initializeApp()

    const updatedStore = useProjectStore.getState()

    // Should have created a new project
    expect(updatedStore.tabs).toHaveLength(1)
    expect(updatedStore.activeTabId).toBeTruthy()
    expect(updatedStore.tabs[0].canvasData).not.toBeNull()
    expect(updatedStore.tabs[0].history).toHaveLength(1)
  })
})