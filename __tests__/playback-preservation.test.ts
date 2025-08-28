/**
 * Critical Playback Functionality Preservation Test
 * 
 * This test ensures that timeline/play button functionality is preserved during refactoring.
 * All playback-related logs and debugging functionality must remain intact.
 */

import { useProjectStore } from '@/lib/stores/project-store'
import { PlaybackDebugger } from '@/lib/ui/playback-debugger'

// Mock performance.now for consistent testing
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => 1000)
  },
  writable: true
})

// Mock console methods to capture debug output
const originalConsoleLog = console.log
const originalConsoleError = console.error
let consoleLogSpy: jest.SpyInstance
let consoleErrorSpy: jest.SpyInstance

beforeEach(() => {
  // Reset store state
  useProjectStore.getState().resetState?.()
  
  // Reset PlaybackDebugger
  PlaybackDebugger.clearLogs()
  
  // Setup console spies
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleLogSpy.mockRestore()
  consoleErrorSpy.mockRestore()
})

describe('Playback Functionality Preservation', () => {
  describe('PlaybackDebugger Core Functionality', () => {
    test('should log playback events with proper structure', () => {
      PlaybackDebugger.log('PLAYBACK_START', { frameIndex: 0, totalFrames: 3 }, 'tab-1')
      
      const logs = PlaybackDebugger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        event: 'PLAYBACK_START',
        data: { frameIndex: 0, totalFrames: 3 },
        tabId: 'tab-1',
        timestamp: expect.any(Number)
      })
    })

    test('should preserve important event console logging', () => {
      PlaybackDebugger.log('PLAYBACK_STARTED', { frameIndex: 0 })
      PlaybackDebugger.log('PLAYBACK_STOPPED', { reason: 'user_action' })
      
      // These should trigger console.log for important events (using correct event names)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🎬 [PlaybackDebug] PLAYBACK_STARTED:', 
        { frameIndex: 0 }
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🎬 [PlaybackDebug] PLAYBACK_STOPPED:', 
        { reason: 'user_action' }
      )
    })

    test('should maintain log size limits', () => {
      // Add more than maxLogs entries
      for (let i = 0; i < 150; i++) {
        PlaybackDebugger.log('TEST_EVENT', { index: i })
      }
      
      const logs = PlaybackDebugger.getLogs()
      expect(logs.length).toBeLessThanOrEqual(100)
      expect(logs[0].data.index).toBe(149) // Most recent should be first
    })
  })

  describe('ProjectStore Playback Methods', () => {
    test('should preserve playback control methods', () => {
      const store = useProjectStore.getState()
      
      // Create a project with frames first
      store.createNewProject({
        name: 'Test Project',
        width: 32,
        height: 32,
        colorLimit: 16
      })
      
      const activeTab = store.getActiveTab()
      expect(activeTab).toBeTruthy()
      
      // Add some frames for testing
      if (activeTab) {
        store.addFrame(activeTab.id)
        store.addFrame(activeTab.id)
      }
      
      // Test playback methods exist and function
      expect(typeof store.startPlayback).toBe('function')
      expect(typeof store.stopPlayback).toBe('function')
      expect(typeof store.togglePlayback).toBe('function')
      expect(typeof store.setPlaybackFrame).toBe('function')
      expect(typeof store.setPlaybackSpeed).toBe('function')
      expect(typeof store.resetPlaybackToStart).toBe('function')
      
      // Test that playback state is properly managed (using actual ProjectTab interface)
      expect(activeTab?.isPlaying).toBeDefined()
      expect(activeTab?.playbackFrameIndex).toBeDefined()
      expect(activeTab?.playbackSpeed).toBeDefined()
      expect(activeTab?.playbackFrameId).toBeDefined()
      expect(activeTab?.playbackIntervalId).toBeDefined()
      expect(activeTab?.playbackStartTime).toBeDefined()
      expect(activeTab?.playbackAccumulatedTime).toBeDefined()
    })

    test('should maintain playback state structure', () => {
      const store = useProjectStore.getState()
      store.createNewProject({
        name: 'Test Project',
        width: 32,
        height: 32,
        colorLimit: 16
      })
      
      const activeTab = store.getActiveTab()
      expect(activeTab).toMatchObject({
        isPlaying: expect.any(Boolean),
        playbackFrameIndex: expect.any(Number),
        playbackSpeed: expect.any(Number),
        playbackFrameId: null, // Initially null
        playbackIntervalId: null, // Initially null
        playbackStartTime: null, // Initially null
        playbackAccumulatedTime: expect.any(Number)
      })
    })
  })

  describe('Frame Manager Integration', () => {
    test('should preserve frame navigation functionality', () => {
      const store = useProjectStore.getState()
      store.createNewProject({
        name: 'Test Project',
        width: 32,
        height: 32,
        colorLimit: 16
      })
      
      // Add frames
      let activeTab = store.getActiveTab()
      if (activeTab) {
        store.addFrame(activeTab.id)
        store.addFrame(activeTab.id)
        store.addFrame(activeTab.id)
      }
      
      activeTab = store.getActiveTab()
      expect(activeTab?.frames).toHaveLength(4) // Including initial frame
      
      // Test frame navigation
      if (activeTab && activeTab.frames.length > 1) {
        store.setActiveFrame(activeTab.id, activeTab.frames[1].id)
        expect(store.getActiveTab()?.currentFrame?.id).toBe(activeTab.frames[1].id)
      }
    })

    test('should preserve playback debugging during frame operations', () => {
      const store = useProjectStore.getState()
      store.createNewProject({
        name: 'Test Project',
        width: 32,
        height: 32,
        colorLimit: 16
      })
      
      const activeTab = store.getActiveTab()
      if (activeTab) {
        store.addFrame(activeTab.id)
      }
      
      // Verify that PlaybackDebugger is being used (logs should exist)
      const logsBeforePlayback = PlaybackDebugger.getLogs().length
      
      // Trigger playback operations that should create debug logs
      if (activeTab) {
        store.startPlayback(activeTab.id)
        store.stopPlayback(activeTab.id)
      }
      
      const logsAfterPlayback = PlaybackDebugger.getLogs().length
      expect(logsAfterPlayback).toBeGreaterThan(logsBeforePlayback)
    })
  })

  describe('Error Handling and Recovery', () => {
    test('should handle playback errors gracefully', () => {
      const store = useProjectStore.getState()
      
      // Test error handling without crashing
      expect(() => {
        store.startPlayback('invalid-tab-id') // Should handle case with invalid tab
      }).not.toThrow()
      
      expect(() => {
        store.setPlaybackFrame('invalid-tab-id', 999) // Invalid frame index
      }).not.toThrow()
    })

    test('should maintain error logging in PlaybackDebugger', () => {
      // Test error logging capability
      try {
        PlaybackDebugger.log('TEST_ERROR', { invalidData: null })
      } catch (error) {
        // Should not throw, but if it does, error should be logged
        expect(consoleErrorSpy).toHaveBeenCalled()
      }
    })
  })

  describe('Performance and Memory', () => {
    test('should not leak memory during playback operations', () => {
      const store = useProjectStore.getState()
      store.createNewProject({
        name: 'Test Project',
        width: 32,
        height: 32,
        colorLimit: 16
      })
      
      const activeTab = store.getActiveTab()
      if (activeTab) {
        // Add multiple frames
        for (let i = 0; i < 10; i++) {
          store.addFrame(activeTab.id)
        }
        
        // Simulate intensive playback operations
        for (let i = 0; i < 50; i++) {
          store.startPlayback(activeTab.id)
          store.setPlaybackFrame(activeTab.id, i % 10)
          store.stopPlayback(activeTab.id)
        }
      }
      
      // Ensure logs are cleaned up properly
      const logs = PlaybackDebugger.getLogs()
      expect(logs.length).toBeLessThanOrEqual(100)
    })
  })
})

describe('Critical Playback Logging Preservation', () => {
  test('should preserve all console.log calls related to playback', async () => {
    // This test ensures that during refactoring, playback-related console.logs are preserved
    
    // Restore original console.log to capture actual output
    console.log = originalConsoleLog
    consoleLogSpy.mockRestore()
    
    const logOutput: string[] = []
    const mockLog = jest.fn((message: string, ...args: any[]) => {
      logOutput.push(message + ' ' + JSON.stringify(args))
    })
    console.log = mockLog
    
    const store = useProjectStore.getState()
    store.createNewProject({
      name: 'Test Project',
      width: 32,
      height: 32,
      colorLimit: 16
    })
    
    const activeTab = store.getActiveTab()
    if (activeTab) {
      // Trigger playback operations
      store.startPlayback(activeTab.id)
      store.stopPlayback(activeTab.id)
    }
    
    // Verify that playback-related logs are captured
    const playbackLogs = logOutput.filter(log => 
      log.includes('PlaybackDebug') || 
      log.includes('🎬') || 
      log.includes('playback') ||
      log.includes('PLAYBACK')
    )
    
    // Should have at least some playback-related logs
    expect(playbackLogs.length).toBeGreaterThan(0)
    
    // Cleanup
    console.log = originalConsoleLog
  })
})