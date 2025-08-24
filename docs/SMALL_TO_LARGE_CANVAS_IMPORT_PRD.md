# Small to Large Canvas Import Feature - PRD

## 📋 Product Requirements Document

**Feature Name:** Smart Image Import for Small-to-Large Canvas Scenarios  
**Version:** 1.0  
**Date:** 2024-08-24  
**Author:** Claude Code Assistant  

---

## 🎯 Executive Summary

This feature addresses the user experience gap when importing small images (GIF, PNG, etc.) into larger canvas sizes. Currently, users lack control over how small images are scaled and positioned, limiting creative flexibility for pixel art creation.

## 🔍 Problem Statement

### Current Issues
1. **No Size Context Awareness**: Import modal doesn't differentiate between small→large vs large→small scenarios
2. **Limited Scaling Options**: Only 4 basic modes (fit, fill, original, smart) without upscaling consideration
3. **User Confusion**: No clear indication when imported image will be much smaller than canvas
4. **Missed Opportunities**: Small pixel art assets could benefit from intelligent upscaling

### User Pain Points
- Importing a 16×16 pixel art icon into a 64×64 canvas results in a tiny centered image
- No option to upscale small images while preserving pixel art quality
- Users manually need to determine optimal scaling factors

## 🎯 Solution Overview

### Enhanced Scaling System
Extend the existing 4-mode system (fit, fill, original, smart) with **context-aware recommendations** and **upscaling options** when importing small images into larger canvases.

### Key Features
1. **Smart Detection**: Automatically detect small→large scenarios
2. **Enhanced UI**: Show size comparison and scaling recommendations
3. **Upscaling Options**: Provide integer-based upscaling for pixel art quality
4. **Visual Previews**: Show how the image will appear at different scales

---

## 📊 User Stories & Requirements

### Core User Stories

**As a pixel artist**, I want to:
- Import small pixel art assets and choose how they scale to my larger canvas
- See a preview of how my image will look at different scales
- Get intelligent recommendations based on the size difference
- Maintain pixel art quality when upscaling small images

### Functional Requirements

#### FR1: Smart Size Detection
- **Priority:** High
- **Description:** Detect when original image is significantly smaller than target canvas
- **Criteria:** 
  - Small image: Original ≤ 50% of target canvas in both dimensions
  - Large image: Original > 75% of target canvas in at least one dimension
  - Medium image: Everything in between

#### FR2: Enhanced Scaling Modes
- **Priority:** High  
- **Description:** Extend existing scaling modes with upscaling variants
- **New Modes:**
  - `fit-upscale`: Fit with intelligent upscaling (2x, 3x, 4x multipliers)
  - `original-center`: Keep original size, center on canvas
  - `smart-upscale`: Integer scaling optimized for pixel art (2x, 3x, 4x when beneficial)

#### FR3: Context-Aware UI
- **Priority:** High
- **Description:** Show different UI based on image size relationship
- **Features:**
  - Size comparison indicator (e.g., "16×16 → 64×64")
  - Visual recommendations with icons
  - Preview thumbnails for each scaling option
  - Clear labeling of upscaling vs downscaling

#### FR4: Quality Preservation
- **Priority:** High
- **Description:** Maintain pixel art quality during upscaling
- **Requirements:**
  - Use nearest-neighbor scaling for all operations
  - Prefer integer scaling factors (2x, 3x, 4x) over fractional
  - Avoid anti-aliasing or smoothing

---

## 🎨 User Experience Design

### Enhanced Import Modal Flow

#### 1. Size Relationship Detection
```typescript
const sizeRelationship = detectSizeRelationship(original, target);
// Returns: 'small-to-large' | 'large-to-small' | 'similar-size'
```

#### 2. Context-Aware Recommendations
- **Small to Large (e.g., 16×16 → 64×64):**
  - 🔍 **Original**: Keep 16×16, center on canvas
  - ⬆️ **Smart Upscale**: 4× scaling (16×16 → 64×64) - **Recommended**
  - 📏 **Fit**: Scale proportionally to fit canvas
  - 🎯 **Fill**: Stretch to fill entire canvas

#### 3. Visual Enhancements
- **Size Badge**: "Small Image → Large Canvas"
- **Scaling Factor**: "4× Upscale Available"
- **Quality Indicator**: "Pixel Perfect" badge for integer scaling

### UI Layout Changes

#### Before (Current)
```
┌─────────────────────┐
│ Import Summary      │
│ Scaling Mode        │
│ Import Strategy     │
└─────────────────────┘
```

#### After (Enhanced)
```
┌─────────────────────┐
│ Import Summary      │
│ 📊 Size Analysis    │ ← New section
│ 🎛️ Scaling Options  │ ← Enhanced with context
│ Import Strategy     │
└─────────────────────┘
```

---

## 🔧 Technical Implementation

### 1. Enhanced Size Detection Logic

```typescript
interface SizeAnalysis {
  relationship: 'small-to-large' | 'large-to-small' | 'similar-size';
  scaleFactorX: number;
  scaleFactorY: number;
  optimalIntegerScale?: number; // 2, 3, 4, etc.
  recommendation: ScalingMode;
  reasons: string[];
}

const analyzeSizeRelationship = (
  original: { width: number; height: number },
  target: { width: number; height: number }
): SizeAnalysis => {
  // Implementation details...
}
```

### 2. Extended Scaling Modes

```typescript
export type ScalingMode = 
  | 'fit' | 'fill' | 'original' | 'smart'
  | 'fit-upscale' | 'smart-upscale' | 'original-center'

export interface ScalingModeConfig {
  mode: ScalingMode;
  displayName: string;
  description: string;
  icon: React.ComponentType;
  color: string;
  isUpscaling?: boolean;
  integerScale?: number;
  recommendation?: boolean;
}
```

### 3. Context-Aware Modal Component

```typescript
interface EnhancedImportModalProps extends FrameImportOptionsModalProps {
  sizeAnalysis: SizeAnalysis;
  availableScalingModes: ScalingModeConfig[];
  onPreviewScale?: (mode: ScalingMode) => void;
}
```

---

## 📏 Acceptance Criteria

### AC1: Smart Detection
- ✅ Correctly identifies small→large scenarios (original ≤ 50% of target)
- ✅ Shows appropriate size analysis in modal
- ✅ Provides contextual recommendations

### AC2: Enhanced UI
- ✅ Displays size comparison prominently
- ✅ Shows scaling factor information
- ✅ Highlights recommended options
- ✅ Provides clear upscaling indicators

### AC3: Quality Upscaling
- ✅ Integer scaling produces crisp pixel art
- ✅ No blurring or anti-aliasing artifacts
- ✅ Maintains original pixel boundaries

### AC4: User Experience
- ✅ Modal load time < 200ms
- ✅ Preview generation < 100ms
- ✅ Clear visual hierarchy and labeling
- ✅ Accessible keyboard navigation

---

## 🧪 Testing Strategy

### Test Scenarios

#### Scenario 1: Tiny to Large (16×16 → 64×64)
- **Expected**: Recommend 4× smart upscale
- **Verify**: Perfect 4× integer scaling, crisp pixels

#### Scenario 2: Small to Medium (24×24 → 64×64)
- **Expected**: Recommend 2× smart upscale
- **Verify**: Clean 2× scaling with some padding

#### Scenario 3: Similar Size (60×60 → 64×64)
- **Expected**: Recommend fit mode
- **Verify**: Slight scaling with good quality

### Edge Cases
- **1×1 pixel** → 64×64 canvas
- **Non-square ratios** (8×16 → 64×64)
- **Already optimal** (32×32 → 64×64)

---

## 🚀 Implementation Plan

### Phase 1: Core Detection (Week 1)
- [ ] Implement size analysis logic
- [ ] Create enhanced modal component structure
- [ ] Add context-aware mode filtering

### Phase 2: UI Enhancement (Week 2)
- [ ] Design and implement new modal sections
- [ ] Add visual indicators and recommendations
- [ ] Create preview system

### Phase 3: Advanced Scaling (Week 3)
- [ ] Implement upscaling algorithms
- [ ] Add quality preservation features
- [ ] Integrate with existing import pipeline

### Phase 4: Testing & Polish (Week 4)
- [ ] Comprehensive testing across scenarios
- [ ] Performance optimization
- [ ] User experience refinement

---

## 📈 Success Metrics

### Primary KPIs
- **User Satisfaction**: 90%+ positive feedback on small image imports
- **Feature Adoption**: 70%+ of small→large imports use new modes
- **Quality Metrics**: 0 reported pixelation/quality issues

### Secondary KPIs
- **Modal Interaction Time**: <30 seconds average
- **Mode Selection Distribution**: Balanced usage across options
- **Error Rate**: <1% import failures

---

## 🎯 Future Enhancements

### Post-Launch Improvements
1. **Batch Import**: Handle multiple small images at once
2. **Template Presets**: Save preferred scaling settings
3. **AI Recommendations**: ML-based optimal scaling suggestions
4. **Custom Scaling**: User-defined scaling factors

### Advanced Features
1. **Animation Scaling**: Frame-by-frame upscaling for GIFs
2. **Selective Scaling**: Scale different parts of image differently
3. **Pattern Recognition**: Detect and preserve pixel art patterns

---

## ✅ Definition of Done

Feature is complete when:
- [ ] All acceptance criteria met
- [ ] Code review completed
- [ ] Unit tests passing (>90% coverage)
- [ ] Integration tests passing
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Design review approved
- [ ] Accessibility audit passed