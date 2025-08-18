# Canvas Drawing Debug Analysis

## Issue Summary
Drawing operations don't appear immediately but show up after page refresh, indicating a rendering pipeline issue rather than data persistence problem.

## Debug Investigation Plan

### 1. Current Debug Logging Status
✅ **pixel-canvas.tsx**: Comprehensive logging added
✅ **project-store.ts**: State update logging added  
✅ **Debug mode**: Enabled for development

### 2. Key Areas to Investigate

#### A. Canvas Rendering Pipeline
- **useEffect dependencies**: `[canvasData, project, canvasState.zoom]`
- **Canvas context**: Getting lost or not refreshing
- **ImageData creation**: `new ImageData()` from canvasData
- **Canvas putImageData**: Actually updating the visual canvas

#### B. State Update Flow
- **drawPixel()**: Updates canvasData successfully
- **updateCanvasData()**: Store update working
- **React re-render**: Component not re-rendering immediately
- **useEffect trigger**: Not firing after state change

#### C. Zustand State Management
- **Immer proxy issues**: React not detecting deep changes
- **Reference equality**: Same object reference preventing re-render
- **Persistence rehydration**: State restoration working but rendering not

## Debug Test Plan

### Phase 1: Verify Debug Logging
1. Enable debug mode in browser
2. Test drawing operations
3. Analyze console output for rendering pipeline

### Phase 2: Component Re-render Analysis  
1. Add React render tracking
2. Check useEffect dependencies
3. Verify state change detection

### Phase 3: Canvas Context Analysis
1. Verify canvas element persistence
2. Check 2D context state
3. Test ImageData updates

### Phase 4: State Reference Analysis
1. Check Zustand state references
2. Verify Immer mutation detection
3. Test manual re-render trigger

## Expected Debug Output Analysis

Look for these patterns:
- ✅ `DRAW_UPDATE_COMPLETE`: Drawing data updated
- ❌ `RENDER_START`: Canvas re-render NOT triggered
- ❌ `PROPS_UPDATE`: Component props NOT updated

## Hypothesis
**Primary**: React not detecting Zustand state changes due to reference equality issues
**Secondary**: Canvas useEffect not triggering due to stale dependencies
**Tertiary**: Canvas 2D context state corruption

## Next Steps
1. Run debug test on localhost:3003
2. Analyze console logs during drawing
3. Identify specific failure point
4. Implement targeted fix