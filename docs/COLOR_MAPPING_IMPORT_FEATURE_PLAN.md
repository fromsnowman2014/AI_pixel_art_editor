# Color Mapping Import Feature Plan

## 📋 Overview

**Goal**: Add color palette mapping functionality to the import system, allowing users to apply custom color palettes or use existing project palettes when importing images/GIFs.

**Current State**: The system has color quantization (Median Cut algorithm) and palette management, but lacks user control over color mapping during import.

---

## 🔍 Analysis Results

### ✅ Already Implemented
- **Color Quantization**: `lib/utils/image-processing.ts` with Median Cut algorithm
- **Palette System**: `components/color-palette.tsx` with palette management
- **Project Color Limits**: `project.colorLimit` (2-64 colors)
- **Palette Presets**: Basic, Retro Gaming, Pastel, Earthy, Ocean, Monochrome

### ❌ Missing Features
- **Custom palette mapping during import**
- **Palette selection options in import modal**
- **Apply existing project palette to imported images**

---

## 🎨 UI Design Plan

### 1. Import Modal Structure Enhancement
```
Quick Import
├─ Smart Import (Recommended)
├─ Safe Add  
└─ [NEW] Palette Import ⭐

Advanced Options
├─ Scaling Mode
├─ Import Strategy  
└─ [NEW] Color Mapping ✨
    ├─ Auto (quantize to N colors)
    ├─ Use Project Palette  
    ├─ Custom Palette
    └─ Preserve Original
```

### 2. Color Mapping UI Component
```jsx
<div className="space-y-2">
  <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
    Color Mapping
  </label>
  
  <select value={colorMapping} onChange={setColorMapping}
          className="w-full p-2 border rounded text-xs">
    <option value="auto">Auto Quantize (8 colors)</option>
    <option value="project">Use Current Palette ({palette.length})</option>
    <option value="custom">Custom Palette</option>
    <option value="preserve">Preserve Original</option>
  </select>
  
  {/* Palette Preview */}
  {colorMapping === 'project' && (
    <div className="flex gap-1 flex-wrap p-2 bg-gray-50 rounded">
      {project.palette.map(color => 
        <Tooltip key={color} content={color.toUpperCase()}>
          <div className="w-4 h-4 rounded border border-gray-300" 
               style={{backgroundColor: color}} />
        </Tooltip>
      )}
    </div>
  )}
</div>
```

### 3. Advanced Options Expansion
```jsx
{colorMapping === 'custom' && (
  <div className="space-y-3 pl-4 border-l-2 border-gray-200">
    {/* Quick Palette Presets */}
    <div className="grid grid-cols-2 gap-2">
      <button onClick={() => setPalettePreset('retro')} 
              className="p-2 border rounded text-xs hover:bg-gray-50">
        <div className="flex gap-1 mb-1">
          {retroColors.slice(0,4).map(c => 
            <div key={c} className="w-2 h-2 rounded" style={{backgroundColor: c}} />
          )}
        </div>
        Retro Gaming
      </button>
      {/* More presets... */}
    </div>
    
    {/* Color Limit Slider */}
    <div className="space-y-1">
      <label className="text-xs text-gray-600">Color Limit: {colorLimit}</label>
      <input type="range" min="2" max="64" value={colorLimit} 
             onChange={e => setColorLimit(Number(e.target.value))}
             className="w-full" />
    </div>
  </div>
)}
```

---

## 🔧 Implementation Strategy

### Phase 1: Import Modal Extension (30 mins)
**Files to Modify:**
- `components/frame-import-options-modal.tsx`

**Tasks:**
1. Add color mapping state variables
2. Create Color Mapping section in Advanced Options
3. Implement compact palette preview component
4. Add tooltip support for color swatches

**Code Changes:**
```typescript
// Add to modal state
const [colorMapping, setColorMapping] = useState<'auto' | 'project' | 'custom' | 'preserve'>('auto')
const [customPalette, setCustomPalette] = useState<Color[]>([])
const [colorLimit, setColorLimit] = useState(8)

// Enhanced preset options
const quickPresets = React.useMemo(() => [
  {
    id: 'smart-add',
    label: 'Smart Import (Recommended)',
    action: 'add' as const,
    scalingMode: sizeAnalysis.recommendation,
    colorMapping: 'auto' as const
  },
  {
    id: 'palette-import',
    label: 'Palette Import ⭐',
    action: 'add' as const,
    scalingMode: 'fit' as ExtendedScalingMode,
    colorMapping: 'project' as const,
    recommended: false
  }
], [sizeAnalysis.recommendation])
```

### Phase 2: Processing Pipeline Integration (45 mins)
**Files to Modify:**
- `lib/utils/image-processing.ts`

**Tasks:**
1. Extend `QuantizationOptions` interface
2. Add custom palette mapping to `processImageForPixelArt`
3. Implement color distance-based nearest neighbor mapping
4. Add palette validation and fallbacks

**Code Structure:**
```typescript
export interface ColorMappingOptions {
  mode: 'auto' | 'project' | 'custom' | 'preserve'
  customPalette?: Color[]
  colorLimit?: number
  projectPalette?: string[]
}

export interface QuantizationOptions {
  colorCount: number
  method: 'median-cut' | 'octree' | 'simple'
  enableDithering?: boolean
  colorMapping?: ColorMappingOptions // NEW
}

// Enhanced processing function
export async function processImageForPixelArt(
  inputBuffer: Buffer,
  targetWidth: number,
  targetHeight: number,
  options: QuantizationOptions
): Promise<ProcessingResult>
```

**New Functions:**
```typescript
function applyCustomPaletteMapping(
  imageData: Uint8ClampedArray,
  customPalette: Color[]
): Uint8ClampedArray

function convertHexPaletteToColors(hexPalette: string[]): Color[]

function findNearestColorInPalette(
  targetColor: Color, 
  palette: Color[]
): Color
```

### Phase 3: UI Polish & Integration (15 mins)
**Tasks:**
1. Add hover tooltips for palette previews
2. Ensure consistent styling with current modal design
3. Add loading states for color mapping
4. Test integration with existing import flow

---

## 📊 Technical Specifications

### Data Flow
```
User selects color mapping option
    ↓
Modal collects mapping preferences
    ↓
processImageForPixelArt() receives ColorMappingOptions
    ↓
Branch: Auto quantization vs Custom palette mapping
    ↓
Apply nearest neighbor color mapping
    ↓
Return processed image with applied palette
```

### Performance Considerations
- **Color distance calculation**: Use RGB Euclidean distance for speed
- **Palette size limits**: Respect 2-64 color project limits
- **Memory usage**: Process images in chunks for large imports
- **UI responsiveness**: Use loading indicators for processing > 2 seconds

### Error Handling
- Invalid palette colors → fallback to auto quantization
- Empty custom palette → use project palette
- Processing failure → preserve original image
- Out of memory → reduce color limit automatically

---

## 🧪 Testing Plan

### Unit Tests
- Color distance calculation accuracy
- Palette validation logic
- Hex to Color conversion
- Nearest neighbor mapping

### Integration Tests  
- Import modal color mapping flow
- Processing pipeline with different palette modes
- UI state management
- Error scenarios

### User Acceptance Tests
- Import with project palette maintains brand consistency
- Custom palette presets work as expected
- Performance acceptable for typical 32x32 to 128x128 images
- UI remains intuitive and compact

---

## 📈 Success Metrics

### Functionality
- ✅ Users can apply existing project palette to imports
- ✅ Custom palette presets available in import flow
- ✅ Color mapping preserves visual intent
- ✅ Processing time < 3 seconds for typical images

### UX
- ✅ Import modal remains compact and uncluttered
- ✅ Advanced options progressively disclosed
- ✅ Palette preview shows expected results
- ✅ One-click palette import for common use cases

### Technical
- ✅ No breaking changes to existing import flow
- ✅ Backward compatibility maintained
- ✅ Memory usage within acceptable limits
- ✅ Code follows existing patterns and conventions

---

## 🚀 Implementation Timeline

1. **Phase 1** (30 mins): Modal UI extension
2. **Phase 2** (45 mins): Processing pipeline integration
3. **Phase 3** (15 mins): Polish and testing

**Total Estimated Time**: 90 minutes

**Priority**: Medium-High (enhances core workflow without breaking changes)

---

## 📝 Notes

- Maintain current modal's compact design philosophy
- Use existing color palette component patterns where possible  
- Ensure consistent tooltip and interaction patterns
- Consider adding this feature behind a feature flag initially
- Document new API parameters for future developers

---

*Generated on: 2024-08-24*  
*Status: Planning Complete - Ready for Implementation*