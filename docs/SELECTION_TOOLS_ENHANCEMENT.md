# Selection Tools Enhancement - Development Specification

## Overview

This document specifies the enhancement of selection tools in PixelBuddy's pixel art editor. The improvement includes:
1. Long-press expandable tool menu for Magic Wand with additional selection shapes
2. Transform tools (Move and Resize) that work with selections
3. Mobile-optimized UI with touch gesture support
4. Visual indicator for multi-option tools

## 1. Feature Requirements

### 1.1 Expandable Selection Tool Menu

**Desktop Behavior:**
- **Long-click** (press and hold >500ms) on Magic Wand button reveals additional selection options
- Options displayed: Magic Wand, Rectangle Select, Circle/Ellipse Select
- Menu appears as a popup/flyout positioned near the tool button
- Clicking an option selects that tool and updates the button icon
- Menu automatically closes after selection or when clicking outside

**Mobile Behavior:**
- **Long-press** (>500ms) with haptic feedback (if supported) reveals selection menu
- Touch-optimized larger hit targets (minimum 44×44px per option)
- Modal overlay with clear visual separation from canvas
- "Done" or "Cancel" buttons for explicit menu dismissal
- Prevent accidental canvas interactions while menu is open

**Visual Indicator:**
- Small badge icon (e.g., "+" or "▼") positioned at top-right corner of tool button
- Badge size: 12×12px on desktop, 16×16px on mobile
- Badge color: accent color with high contrast
- Badge remains visible when any selection tool is active
- Tooltip on hover (desktop): "Multiple selection modes available"

### 1.2 Selection Tool Modes

#### 1.2.1 Magic Wand Tool
- Selects contiguous pixels of similar color
- Tolerance setting (adjustable, default: 32)
- Anti-aliasing option for smooth edges
- Icon: Magic wand with sparkles

#### 1.2.2 Rectangle Selection Tool
- Click and drag to create rectangular selection
- Hold Shift: constrain to square
- Hold Alt/Option: draw from center
- Shows selection marquee (animated dashed border)
- Icon: Dotted rectangle

#### 1.2.3 Circle/Ellipse Selection Tool
- Click and drag to create circular/elliptical selection
- Hold Shift: constrain to circle
- Hold Alt/Option: draw from center
- Shows selection marquee (animated dashed border)
- Icon: Dotted circle

### 1.3 Transform Tools

#### 1.3.1 Move Tool
**Purpose:** Move selected pixels to a new location

**Activation:**
- Available only when an active selection exists
- Button enabled/highlighted when selection is present
- Icon: Four-directional arrow or hand cursor

**Desktop Behavior:**
- Click and drag within selection to move
- Arrow keys: move 1px at a time
- Shift + Arrow keys: move 10px at a time
- ESC key: cancel move and return to original position
- Enter/Return: confirm move

**Mobile Behavior:**
- Touch and drag within selection to move
- Visual feedback: selection follows finger with slight offset to avoid occlusion
- On-screen directional buttons for precise 1px adjustments
- "Cancel" and "Apply" buttons for explicit confirmation
- Prevent accidental deselection while dragging

**Visual Feedback:**
- Semi-transparent preview of pixels being moved
- Original position shows dotted outline or dimmed pixels
- Cursor changes to move cursor when hovering over selection

#### 1.3.2 Resize Tool
**Purpose:** Scale selected pixels proportionally or freely

**Activation:**
- Available only when an active selection exists
- Button enabled/highlighted when selection is present
- Icon: Diagonal arrows pointing outward or resize corner icon

**Desktop Behavior:**
- Selection shows 8 resize handles (4 corners + 4 sides)
- Click and drag handles to resize
- Corner handles: resize proportionally by default
- Side handles: resize in one dimension only
- Hold Shift: force proportional resize from corners
- Hold Alt/Option: resize from center
- ESC key: cancel resize
- Enter/Return: confirm resize

**Mobile Behavior:**
- Larger touch-friendly resize handles (24×24px minimum)
- Corner handles visible by default
- Side handles appear when selection is large enough (>100px)
- Pinch gesture: proportional resize from center
- Two-finger drag: free resize
- "Reset" button to restore original size
- "Cancel" and "Apply" buttons for confirmation
- Lock aspect ratio toggle button

**Visual Feedback:**
- Bounding box with visible handles
- Semi-transparent preview during resize
- Dimension display (width × height in pixels)
- Percentage indicator (e.g., "150%")
- Nearest-neighbor scaling preview to maintain pixel art style

**Resize Algorithm:**
- Use nearest-neighbor scaling (no interpolation)
- Preserve transparency
- Snap to pixel grid (no sub-pixel positioning)
- Option to maintain aspect ratio (on by default)

### 1.4 Tool State Management

**Tool Persistence:**
- Last selected tool in each category is remembered
- On app restart, default to Magic Wand
- Store in localStorage: `lastSelectionTool`

**Tool Switching:**
- Selecting any selection tool deselects other drawing tools
- Transform tools (Move/Resize) can be used without deselecting selection tool
- Pressing ESC clears active selection and returns to last drawing tool

**Selection State:**
- Active selection persists across tool switches
- Selection cleared when:
  - User clicks outside selection without Move tool
  - User starts drawing with a paint tool
  - User explicitly clicks "Deselect" or presses Ctrl+D (Cmd+D on Mac)
  - User performs destructive operation (e.g., clear canvas)

## 2. UI Component Structure

### 2.1 Component Hierarchy

```
Toolbar
├── SelectionToolGroup
│   ├── SelectionToolButton (with badge indicator)
│   │   └── ToolIcon (dynamic based on selected mode)
│   └── SelectionToolMenu (expandable)
│       ├── MagicWandOption
│       ├── RectangleSelectOption
│       └── CircleSelectOption
├── MoveToolButton (enabled when selection exists)
└── ResizeToolButton (enabled when selection exists)

PixelCanvas
├── SelectionOverlay
│   ├── SelectionMarquee (animated border)
│   └── TransformHandles (when Resize tool active)
│       ├── CornerHandle (×4)
│       └── SideHandle (×4)
└── MovePreview (when Move tool active)

MobileToolbar (mobile only)
├── SelectionToolGroup (same as desktop)
├── TransformControls (when transform tool active)
│   ├── DirectionalButtons (Move tool)
│   ├── AspectRatioLock (Resize tool)
│   └── ActionButtons (Cancel, Apply)
└── SelectionMenuModal (overlay)
```

### 2.2 Component Files to Create/Modify

**New Components:**
- `components/toolbar/selection-tool-group.tsx` - Expandable selection tool button
- `components/toolbar/selection-tool-menu.tsx` - Popup menu for tool options
- `components/canvas/selection-overlay.tsx` - Selection marquee and handles
- `components/canvas/transform-handles.tsx` - Resize handles component
- `components/mobile/transform-controls.tsx` - Mobile-specific transform UI

**Modified Components:**
- `components/toolbar.tsx` - Add new tool group
- `components/pixel-canvas.tsx` - Add selection and transform logic
- `components/mobile/mobile-toolbar.tsx` - Add mobile-optimized controls

**New Hooks:**
- `lib/hooks/use-selection-tool.ts` - Selection tool state management
- `lib/hooks/use-transform-tool.ts` - Transform (move/resize) state management
- `lib/hooks/use-long-press.ts` - Long-press gesture detection

## 3. Technical Implementation

### 3.1 Selection Data Structure

```typescript
interface Selection {
  id: string;
  type: 'magic-wand' | 'rectangle' | 'circle';
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  pixels: Set<string>; // Set of "x,y" coordinates
  imageData: ImageData; // Selected pixel data
  originalImageData: ImageData; // Backup for cancel operation
  transform?: {
    offsetX: number;
    offsetY: number;
    scaleX: number;
    scaleY: number;
  };
}

type SelectionToolType = 'magic-wand' | 'rectangle' | 'circle';
type TransformToolType = 'move' | 'resize' | null;

interface SelectionState {
  activeSelection: Selection | null;
  activeTool: SelectionToolType;
  activeTransformTool: TransformToolType;
  isMenuOpen: boolean;
  isTransforming: boolean;
}
```

### 3.2 Zustand Store Extension

Add to `lib/stores/project-store.ts`:

```typescript
interface ProjectState {
  // ... existing state

  // Selection state
  selection: SelectionState;

  // Selection actions
  setSelectionTool: (tool: SelectionToolType) => void;
  setTransformTool: (tool: TransformToolType) => void;
  createSelection: (selection: Selection) => void;
  updateSelection: (updates: Partial<Selection>) => void;
  clearSelection: () => void;
  toggleSelectionMenu: () => void;

  // Transform actions
  startTransform: () => void;
  applyTransform: () => void;
  cancelTransform: () => void;
  moveSelection: (dx: number, dy: number) => void;
  resizeSelection: (bounds: Selection['bounds'], scaleX: number, scaleY: number) => void;
}
```

### 3.3 Long-Press Detection Hook

```typescript
// lib/hooks/use-long-press.ts
interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number; // default 500ms
  threshold?: number; // movement threshold (default 10px)
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = 500,
  threshold = 10
}: UseLongPressOptions) {
  // Implementation using touch/mouse events
  // Returns event handlers: { onMouseDown, onMouseUp, onMouseMove, onTouchStart, onTouchEnd, onTouchMove }
}
```

### 3.4 Selection Algorithm Implementations

#### Magic Wand Algorithm
```typescript
// lib/core/magic-wand.ts - Already exists, verify implementation
export function magicWandSelect(
  imageData: ImageData,
  startX: number,
  startY: number,
  tolerance: number = 32
): Set<string> {
  // Flood fill algorithm with color tolerance
  // Returns Set of "x,y" coordinate strings
}
```

#### Rectangle Selection
```typescript
// lib/core/rectangle-selection.ts
export function rectangleSelect(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  constrainSquare: boolean = false
): Set<string> {
  // Calculate rectangle bounds
  // Generate set of all coordinates within rectangle
}
```

#### Circle Selection
```typescript
// lib/core/circle-selection.ts
export function circleSelect(
  centerX: number,
  centerY: number,
  radius: number,
  constrainCircle: boolean = false
): Set<string> {
  // Midpoint circle algorithm or Bresenham
  // Fill interior with flood fill or mathematical check
}
```

### 3.5 Transform Operations

#### Move Operation
```typescript
// lib/core/transform.ts
export function movePixels(
  imageData: ImageData,
  pixels: Set<string>,
  dx: number,
  dy: number
): ImageData {
  // Create new ImageData
  // Copy pixels to new positions
  // Clear original positions
  // Return new ImageData
}
```

#### Resize Operation
```typescript
export function resizePixels(
  imageData: ImageData,
  pixels: Set<string>,
  scaleX: number,
  scaleY: number,
  method: 'nearest-neighbor' = 'nearest-neighbor'
): ImageData {
  // Extract selection into temporary canvas
  // Apply nearest-neighbor scaling
  // Return scaled ImageData
}
```

### 3.6 Canvas Integration

**PixelCanvas Event Handling:**

```typescript
// In pixel-canvas.tsx
const handleCanvasMouseDown = (e: React.MouseEvent) => {
  const { activeTool, activeTransformTool, activeSelection } = useProjectStore.getState().selection;

  if (activeTransformTool === 'move' && activeSelection) {
    // Start move operation
    startMove(e);
  } else if (activeTransformTool === 'resize' && activeSelection) {
    // Check if handle clicked, start resize
    const handle = detectHandleClick(e);
    if (handle) startResize(e, handle);
  } else if (activeTool === 'magic-wand') {
    // Perform magic wand selection
    performMagicWandSelection(e);
  } else if (activeTool === 'rectangle' || activeTool === 'circle') {
    // Start drag for shape selection
    startShapeSelection(e, activeTool);
  }
};
```

### 3.7 Mobile-Specific Considerations

**Touch Event Handling:**
```typescript
// Prevent default touch behaviors during selection/transform
const handleTouchStart = (e: TouchEvent) => {
  if (isSelectionOrTransformActive) {
    e.preventDefault(); // Prevent scroll, zoom, etc.
  }
};

// Vibration feedback for long-press
const triggerHapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(50);
  }
};
```

**Viewport Considerations:**
- Ensure transform handles are accessible on small screens
- Auto-scroll canvas when moving selection near edges
- Zoom controls don't interfere with selection gestures

## 4. UI/UX Design Specifications

### 4.1 Desktop UI

**Tool Button with Badge:**
```
┌─────────────┐
│  [Icon]   + │  ← Badge indicator (top-right)
│             │
│ Magic Wand  │  ← Tooltip on hover
└─────────────┘
```

**Expanded Tool Menu (Popup):**
```
┌──────────────────┐
│  ✓ Magic Wand    │ ← Checkmark for selected
│    Rectangle     │
│    Circle        │
└──────────────────┘
```

**Selection with Resize Handles:**
```
  ┌─────┬─────┬─────┐
  │ ●   │  ●  │   ● │  ← Corner and side handles
  ├─────┼─────┼─────┤
  │ ●   │     │   ● │
  ├─────┼─────┼─────┤
  │ ●   │  ●  │   ● │
  └─────┴─────┴─────┘

  Dimensions: 64 × 48 px (150%)
```

### 4.2 Mobile UI

**Tool Button with Badge (Larger):**
```
┌──────────────────┐
│   [Icon]      +  │  ← 16px badge
│                  │
│   Magic Wand     │
└──────────────────┘
Minimum: 44×44px touch target
```

**Modal Selection Menu:**
```
╔══════════════════════╗
║  Select Tool Mode    ║
╠══════════════════════╣
║                      ║
║  ☑ Magic Wand       ║
║                      ║
║  ☐ Rectangle        ║
║                      ║
║  ☐ Circle           ║
║                      ║
╠══════════════════════╣
║  [Cancel]   [Done]  ║
╚══════════════════════╝

Each option: 60×60px min
```

**Move Tool Controls:**
```
┌─────────────────────┐
│       ↑             │
│    ←  ⊕  →         │  ← Directional buttons
│       ↓             │
│                     │
│ [Cancel]  [Apply]  │
└─────────────────────┘
```

**Resize Tool Controls:**
```
┌─────────────────────┐
│  [🔒] Lock Aspect   │  ← Toggle button
│                     │
│  Width:  128 px     │
│  Height:  96 px     │
│  Scale:  200%       │
│                     │
│ [Reset] [Cancel] [Apply] │
└─────────────────────┘
```

### 4.3 Visual Styles

**Selection Marquee:**
- Animated dashed border (marching ants)
- Animation speed: 200ms per 4px shift
- Color: Alternating black/white for visibility on any background
- Border width: 1px (desktop), 2px (mobile)

**Transform Handles:**
- Desktop: 8×8px squares with 1px border
- Mobile: 24×24px circles for better touch accuracy
- Corner handles: White fill, black border
- Side handles: Gray fill, dark gray border
- Active handle (being dragged): Accent color fill

**Tool Badge Indicator:**
- Desktop: 12×12px circle
- Mobile: 16×16px circle
- Background: Accent color (e.g., blue #3B82F6)
- Content: "+" symbol or "▼" in white
- Position: Absolute, top-right corner with 2px overlap

## 5. Accessibility

### 5.1 Keyboard Navigation

**Selection Tools:**
- `Tab`: Navigate between toolbar buttons
- `Enter/Space`: Activate button or open menu
- Arrow keys: Navigate menu options when open
- `Esc`: Close menu without selection
- `M`: Quick switch to Magic Wand (or last selection tool)
- `V`: Quick switch to Move tool
- `T`: Quick switch to Resize tool

**Transform Tools:**
- Arrow keys: Move selection 1px
- `Shift + Arrow`: Move 10px
- `Ctrl/Cmd + Z`: Undo move/resize
- `Enter`: Apply transform
- `Esc`: Cancel transform
- `Shift + Drag`: Constrain aspect ratio (resize)

### 5.2 Screen Reader Support

**ARIA Labels:**
```tsx
<button
  aria-label="Selection tools - Magic Wand selected"
  aria-haspopup="menu"
  aria-expanded={isMenuOpen}
>
  <MagicWandIcon />
  <ToolBadge aria-hidden="true" />
</button>

<div role="menu" aria-label="Selection tool options">
  <button role="menuitem" aria-checked="true">Magic Wand</button>
  <button role="menuitem" aria-checked="false">Rectangle</button>
  <button role="menuitem" aria-checked="false">Circle</button>
</div>
```

**Live Regions:**
```tsx
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {activeSelection && `Selection created: ${selection.bounds.width} by ${selection.bounds.height} pixels`}
  {isTransforming && `Transforming selection: ${transform.scaleX * 100}%`}
</div>
```

### 5.3 Focus Management

- When menu opens, focus moves to first option
- When menu closes, focus returns to tool button
- When transform starts, focus moves to transform controls
- When transform completes/cancels, focus returns to canvas

## 6. Performance Considerations

### 6.1 Optimization Strategies

**Selection Creation:**
- Debounce magic wand tolerance slider (300ms)
- Use Web Workers for large magic wand operations (>1000 pixels)
- Limit maximum selection size (e.g., entire canvas = warning)

**Transform Preview:**
- Throttle resize preview updates to 60fps (16ms)
- Use OffscreenCanvas for transform calculations
- Cache scaled ImageData during continuous resize

**Memory Management:**
- Store only one active selection at a time
- Clear transform preview ImageData on operation complete
- Use WeakMap for temporary coordinate lookups

### 6.2 Performance Targets

- Selection creation: <100ms for typical magic wand operation
- Transform preview: 60fps (16ms per frame)
- Menu open animation: <200ms
- Touch response time: <100ms (perceived instant)

## 7. Testing Requirements

### 7.1 Unit Tests

**Selection Algorithms:**
- `magic-wand.test.ts`: Color tolerance, boundary detection
- `rectangle-selection.test.ts`: Square constraint, bounds calculation
- `circle-selection.test.ts`: Circle constraint, pixel inclusion

**Transform Operations:**
- `transform.test.ts`: Move accuracy, resize scaling, boundary clamping

**Hooks:**
- `use-long-press.test.ts`: Timing, threshold, event handling
- `use-selection-tool.test.ts`: State transitions, tool switching

### 7.2 Integration Tests

**User Flows:**
1. Open selection menu → Select rectangle → Create selection → Move → Apply
2. Magic wand select → Resize with aspect ratio → Cancel → Undo
3. Circle select → Move with keyboard → Resize with mouse → Apply
4. Mobile: Long-press menu → Select tool → Transform → Apply

**Edge Cases:**
- Selection at canvas boundaries
- Very small selections (<5px)
- Very large selections (entire canvas)
- Rapid tool switching
- Transform with empty selection (should disable)

### 7.3 E2E Tests (Playwright)

```typescript
// __tests__/e2e/selection-tools.spec.ts
test('Desktop: Long-press opens selection menu', async ({ page }) => {
  await page.goto('/');
  const magicWandBtn = page.locator('[aria-label*="Magic Wand"]');

  // Long press
  await magicWandBtn.hover();
  await page.mouse.down();
  await page.waitForTimeout(600);

  // Menu should be visible
  await expect(page.locator('[role="menu"]')).toBeVisible();

  // Select rectangle
  await page.click('[role="menuitem"]:has-text("Rectangle")');

  // Icon should update
  await expect(magicWandBtn).toHaveAttribute('aria-label', /Rectangle/);
});

test('Mobile: Touch long-press with modal', async ({ page, context }) => {
  await context.grantPermissions(['vibrate']);
  await page.goto('/', { waitUntil: 'networkidle' });

  const toolBtn = page.locator('[aria-label*="Selection tools"]');

  // Simulate touch long-press
  await toolBtn.touchStart();
  await page.waitForTimeout(600);

  // Modal should appear
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // Select circle
  await page.click('text=Circle');
  await page.click('text=Done');

  // Modal should close
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
});

test('Move selection with keyboard', async ({ page }) => {
  await page.goto('/');

  // Create a selection first
  await selectRectangleTool(page);
  await createRectangleSelection(page, { x: 50, y: 50, width: 30, height: 30 });

  // Activate move tool
  await page.click('[aria-label*="Move"]');

  // Move with arrow keys
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');

  // Verify selection moved
  const selection = await getSelectionBounds(page);
  expect(selection.x).toBe(52);
  expect(selection.y).toBe(51);

  // Apply
  await page.keyboard.press('Enter');
});
```

### 7.4 Visual Regression Tests

- Screenshot selection marquee animation (multiple frames)
- Screenshot transform handles (desktop vs mobile)
- Screenshot tool menu (expanded state)
- Screenshot badge indicator

## 8. Implementation Phases

### Phase 1: Selection Tool Menu (Week 1)
**Goal:** Implement expandable selection tool menu

**Tasks:**
1. Create `SelectionToolGroup` and `SelectionToolMenu` components
2. Implement `useLongPress` hook
3. Add badge indicator to tool button
4. Wire up tool switching logic in store
5. Add keyboard navigation and ARIA labels
6. Write unit tests for menu component
7. E2E test for menu interaction

**Deliverables:**
- Functional desktop selection menu
- Mobile modal menu
- Tool persistence in localStorage

### Phase 2: Rectangle & Circle Selection (Week 1-2)
**Goal:** Implement new selection modes

**Tasks:**
1. Implement `rectangleSelect` algorithm
2. Implement `circleSelect` algorithm
3. Add selection rendering (marquee animation)
4. Integrate with canvas mouse/touch events
5. Add modifier key support (Shift, Alt)
6. Write unit tests for selection algorithms
7. E2E tests for selection creation

**Deliverables:**
- Working rectangle selection tool
- Working circle selection tool
- Visual marquee feedback

### Phase 3: Move Tool (Week 2)
**Goal:** Implement selection movement

**Tasks:**
1. Create `TransformHandles` component (disabled for move)
2. Implement `movePixels` function
3. Add drag preview rendering
4. Keyboard arrow key movement
5. Mobile directional buttons
6. Apply/Cancel confirmation flow
7. Unit tests for move operations
8. E2E tests for move workflow

**Deliverables:**
- Functional move tool (desktop + mobile)
- Keyboard and touch controls
- Undo/redo support

### Phase 4: Resize Tool (Week 3)
**Goal:** Implement selection resizing

**Tasks:**
1. Create resize handles rendering
2. Implement `resizePixels` with nearest-neighbor
3. Add handle drag detection and tracking
4. Implement aspect ratio lock
5. Show dimension/percentage display
6. Mobile pinch gesture support
7. Unit tests for resize operations
8. E2E tests for resize workflow

**Deliverables:**
- Functional resize tool (desktop + mobile)
- Proportional and free resize modes
- Visual feedback for dimensions

### Phase 5: Polish & Performance (Week 3-4)
**Goal:** Optimize and finalize

**Tasks:**
1. Performance profiling and optimization
2. Add loading states for heavy operations
3. Implement Web Worker for large selections
4. Final accessibility audit
5. Visual regression testing
6. Cross-browser testing
7. User testing with kids (9-12 age group)
8. Documentation and inline code comments

**Deliverables:**
- Optimized performance (<100ms operations)
- Polished animations and transitions
- Complete test coverage (>80%)
- User documentation

## 9. Success Metrics

**Usability:**
- 90%+ of users discover menu expansion within first use
- <5% error rate on tool selection (clicking wrong option)
- Average time to complete move/resize: <10 seconds

**Performance:**
- Selection creation: <100ms (95th percentile)
- Transform preview: 60fps sustained
- Memory usage: <50MB for active selection

**Accessibility:**
- 100% keyboard navigable
- WCAG AA compliance
- Screen reader compatible

## 10. Future Enhancements

**Planned for Later:**
- Lasso/Freeform selection tool
- Select by color (all pixels matching color)
- Invert selection
- Grow/Shrink selection by N pixels
- Feather selection edges
- Selection masks and alpha channels
- Copy/Paste selection to new frame
- Transform tools: Rotate, Flip, Skew
- Selection history (multiple selections)

## 11. Dependencies

**NPM Packages:**
- None required (use native Canvas API and React)

**Internal Dependencies:**
- `lib/core/magic-wand.ts` (existing)
- `lib/stores/project-store.ts` (to extend)
- `components/pixel-canvas.tsx` (to modify)
- `components/toolbar.tsx` (to modify)

**Browser APIs:**
- Canvas 2D Context
- Touch Events API
- Vibration API (optional, mobile only)
- localStorage API

## 12. Risk Assessment

**Technical Risks:**
- **Performance on large canvases:** Mitigate with Web Workers and operation throttling
- **Touch gesture conflicts:** Careful event handling and preventDefault
- **Selection rendering performance:** Use efficient marquee animation with CSS

**UX Risks:**
- **Discoverability of long-press:** Mitigate with badge indicator and first-time tooltip
- **Accidental tool switching:** Require deliberate long-press (500ms threshold)
- **Mobile screen real estate:** Collapsible/modal controls to preserve canvas space

**Compatibility Risks:**
- **Safari touch events:** Test thoroughly on iOS devices
- **Older browsers:** Graceful degradation for unsupported features (e.g., vibration)

## 13. Appendix: Code Examples

### Example: Long-Press Hook Implementation

```typescript
// lib/hooks/use-long-press.ts
import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onLongPress: (e: React.MouseEvent | React.TouchEvent) => void;
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
  delay?: number;
  threshold?: number;
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = 500,
  threshold = 10,
}: UseLongPressOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressRef = useRef(false);

  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const pos = 'touches' in e
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: e.clientX, y: e.clientY };

      startPosRef.current = pos;
      isLongPressRef.current = false;

      timeoutRef.current = setTimeout(() => {
        isLongPressRef.current = true;

        // Haptic feedback on mobile
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }

        onLongPress(e);
      }, delay);
    },
    [delay, onLongPress]
  );

  const move = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!startPosRef.current || !timeoutRef.current) return;

      const pos = 'touches' in e
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: e.clientX, y: e.clientY };

      const dx = pos.x - startPosRef.current.x;
      const dy = pos.y - startPosRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > threshold) {
        clear();
      }
    },
    [threshold]
  );

  const end = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (!isLongPressRef.current && onClick) {
        onClick(e);
      }

      clear();
    },
    [onClick]
  );

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    startPosRef.current = null;
    isLongPressRef.current = false;
  }, []);

  return {
    onMouseDown: start,
    onMouseMove: move,
    onMouseUp: end,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
  };
}
```

### Example: Selection Tool Menu Component

```typescript
// components/toolbar/selection-tool-menu.tsx
import { useState } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { useLongPress } from '@/lib/hooks/use-long-press';
import { MagicWandIcon, RectangleIcon, CircleIcon } from './icons';

type SelectionTool = 'magic-wand' | 'rectangle' | 'circle';

interface ToolOption {
  id: SelectionTool;
  label: string;
  icon: React.ComponentType;
}

const TOOL_OPTIONS: ToolOption[] = [
  { id: 'magic-wand', label: 'Magic Wand', icon: MagicWandIcon },
  { id: 'rectangle', label: 'Rectangle', icon: RectangleIcon },
  { id: 'circle', label: 'Circle', icon: CircleIcon },
];

export function SelectionToolGroup() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { selection, setSelectionTool } = useProjectStore();
  const currentTool = selection.activeTool;

  const handleLongPress = () => {
    setIsMenuOpen(true);
  };

  const handleClick = () => {
    // Short click: no action (or could toggle last used tool)
  };

  const handleSelectTool = (toolId: SelectionTool) => {
    setSelectionTool(toolId);
    setIsMenuOpen(false);
  };

  const longPressHandlers = useLongPress({
    onLongPress: handleLongPress,
    onClick: handleClick,
    delay: 500,
  });

  const CurrentIcon = TOOL_OPTIONS.find(t => t.id === currentTool)?.icon || MagicWandIcon;

  return (
    <div className="relative">
      <button
        {...longPressHandlers}
        className="relative p-2 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`Selection tools - ${TOOL_OPTIONS.find(t => t.id === currentTool)?.label} selected`}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
      >
        <CurrentIcon />
        <span className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
          +
        </span>
      </button>

      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            role="menu"
            aria-label="Selection tool options"
            className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1"
          >
            {TOOL_OPTIONS.map((tool) => (
              <button
                key={tool.id}
                role="menuitem"
                aria-checked={currentTool === tool.id}
                onClick={() => handleSelectTool(tool.id)}
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3 ${
                  currentTool === tool.id ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                <tool.icon />
                <span>{tool.label}</span>
                {currentTool === tool.id && <span className="ml-auto">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

---

**Document Version:** 1.0
**Last Updated:** 2025-01-18
**Author:** Development Team
**Status:** Ready for Implementation
