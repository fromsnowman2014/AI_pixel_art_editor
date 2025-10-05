# ProjectStore Optimization Plan

## Current State Analysis

### File Size and Complexity
- **Current size**: 2,605 lines
- **Structure**: Single monolithic file containing all project state management
- **Key concerns**: Memory usage, performance, maintainability

### Main Components Identified

1. **Utility Functions** (~150 lines)
   - `downloadFile` - File download helper
   - `generateThumbnail` - Canvas thumbnail generation with memory cleanup
   
2. **Interface Definitions** (~100 lines)  
   - `FrameCanvasData` - Frame canvas data structure
   - `ProjectTab` - Main project tab interface with playback state
   - `ProjectStore` - Store interface with all methods

3. **Helper Functions** (~50 lines)
   - `createDefaultCanvasState` - Default canvas state factory
   - `createDefaultProject` - Project initialization
   - `createDefaultFrame` - Frame creation helper
   - `createEmptyPixelData` - Empty pixel data factory

4. **Core Store Implementation** (~2,300 lines)
   - Project CRUD operations
   - Frame management
   - Canvas operations
   - Playback system (CRITICAL - must preserve)
   - Export functionality
   - State persistence

## Optimization Strategies

### 1. Extract Utility Functions (Priority: High)
**Target**: Reduce store file by ~200 lines, improve reusability

Create new files:
- `/lib/utils/thumbnail-generator.ts` - Move `generateThumbnail` with its memory optimization
- `/lib/utils/file-helpers.ts` - Move `downloadFile` and related utilities
- `/lib/factories/project-factories.ts` - Move all create* helper functions

**Benefits**:
- Better testability of utility functions
- Reduced memory footprint of store module
- Improved code reuse

### 2. Split Store by Feature Domain (Priority: Medium)
**Target**: Break down the 2,300-line implementation into focused modules

Create store slices:
- `/lib/stores/slices/project-slice.ts` - Project CRUD operations
- `/lib/stores/slices/frame-slice.ts` - Frame management
- `/lib/stores/slices/canvas-slice.ts` - Canvas operations
- `/lib/stores/slices/playback-slice.ts` - **CRITICAL**: Playback system (preserve all logs)
- `/lib/stores/slices/export-slice.ts` - Export functionality

**Implementation Approach**:
```typescript
// Combined store using Zustand slices
export const useProjectStore = create<ProjectStore>()(
  devtools(
    persist(
      immer((set, get, api) => ({
        ...createProjectSlice(set, get, api),
        ...createFrameSlice(set, get, api),
        ...createCanvasSlice(set, get, api),
        ...createPlaybackSlice(set, get, api), // Preserve all existing logging
        ...createExportSlice(set, get, api),
      })),
      persistConfig
    )
  )
)
```

### 3. Performance Optimizations (Priority: High)

#### Memory Management
- **Canvas Memory Leaks**: The current `generateThumbnail` function has good cleanup, preserve this
- **Frame Data Caching**: Optimize frame canvas data storage and retrieval
- **Playback Frame Buffer**: Implement efficient frame buffering for playback

#### State Update Optimizations
- **Selective Updates**: Use Immer more efficiently to prevent unnecessary re-renders
- **Memoization**: Add React.useMemo for expensive computations
- **Debounced Updates**: Debounce rapid state changes during playback

### 4. Type Safety Improvements (Priority: Medium)
**Target**: Improve type safety and reduce runtime errors

- Strengthen interface definitions with stricter types
- Add runtime validation for critical state transitions
- Implement proper error boundaries for state operations

## Implementation Plan

### Phase 1: Utility Extraction (Day 1, 2-3 hours)
1. Extract utility functions to separate modules
2. Update imports throughout codebase
3. Run tests to ensure functionality preserved
4. **Critical**: Verify playback functionality unchanged

### Phase 2: Store Slicing (Day 1-2, 4-6 hours)
1. Create playbook slice first (preserve all existing behavior)
2. Create other slices progressively
3. Test each slice individually
4. **Critical**: Run playback preservation tests after each slice

### Phase 3: Performance Optimization (Day 2-3, 3-4 hours)
1. Profile memory usage before/after
2. Implement caching optimizations
3. Add performance monitoring
4. **Critical**: Ensure playback frame timing unchanged

### Phase 4: Final Integration (Day 3, 1-2 hours)
1. Integration testing
2. Performance benchmarking
3. Documentation updates
4. **Critical**: Full playback functionality verification

## Success Criteria

### Code Quality Metrics
- **File Size**: Reduce main store to <1,000 lines
- **Modularity**: 5-6 focused modules instead of 1 monolithic file  
- **Test Coverage**: Maintain 100% test pass rate
- **Type Safety**: Zero TypeScript errors

### Performance Metrics
- **Memory Usage**: <20% memory footprint reduction
- **Render Performance**: No regression in component render times
- **Playback Performance**: **CRITICAL** - Zero degradation in timeline functionality

### Maintainability Metrics  
- **Developer Experience**: Easier to locate and modify specific functionality
- **Testing**: Individual components can be unit tested
- **Documentation**: Clear module responsibilities

## Risk Mitigation

### Critical Playback Preservation
1. **Preserve ALL existing playback logs** - These are crucial for debugging
2. **Maintain exact state structure** - Don't change ProjectTab interface
3. **Keep same method signatures** - All playback methods must work identically
4. **Test-driven approach** - Run playback tests after each change

### Rollback Strategy
1. **Git branches**: Create feature branch for each phase
2. **Backup strategy**: Tag working states before major changes
3. **Progressive rollout**: Can rollback individual slices if needed
4. **Test checkpoints**: Must pass all tests before proceeding to next phase

## Expected Outcomes

### Short-term (Immediate)
- Cleaner, more maintainable codebase
- Better separation of concerns
- Improved testability
- **Preserved playback functionality**

### Long-term (Future development)
- Easier to add new features
- Better performance monitoring
- More efficient memory usage
- Reduced onboarding time for new developers

---

**CRITICAL REMINDER**: The timeline/playbook functionality is the most complex and critical part of this application. Any optimization must preserve 100% of its current functionality, including all debugging logs and performance characteristics.