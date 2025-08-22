# Frontend QA Testing Plan - Systematic UI Component Verification

## 🔧 **Debug Mode Setup**

### Enable Debug Logging
```javascript
// In browser console (F12)
localStorage.setItem('pixelbuddy-debug', 'true')
// Then refresh page
```

### Debug Log Categories
- 🎨 **PixelCanvas**: `[DRAW_*]`, `[RENDER_*]`, `[MOUSE_*]`
- 🏪 **ProjectStore**: `[UPDATE_*]`, `[INIT_*]`, `[RESIZE_*]` 
- 🎛️  **ProjectPanel**: `[APPLY_*]`, `[CANVAS_EMPTY_*]`
- 🛠️  **Toolbar**: Tool selection and state changes
- 🎨 **ColorPalette**: Color selection events

## 🎯 **Testing Sequence - One Component at a Time**

### **Phase 1: Core Canvas Functionality** ⭐ HIGH PRIORITY

#### **Test 1.1: PixelCanvas - Drawing Operations**
**Expected Behavior:**
- ✅ Pencil tool draws pixels immediately
- ✅ Eraser removes pixels immediately  
- ✅ Color Picker picks colors correctly
- ✅ Fill tool works on enclosed areas

**Test Steps:**
1. Select pencil tool
2. Choose any color from palette
3. Click on canvas - **pixel should appear immediately**
4. Draw several pixels in sequence
5. Switch to eraser, test erasing
6. Test color picker on existing pixels
7. Test fill tool on empty areas

**Debug Logs to Monitor:**
```
[DRAW_UPDATE_COMPLETE] → [RENDER_START] → [RENDER_COMPLETE]
```

**❌ If Drawing Fails:**
- Check: Missing `RENDER_START` after `DRAW_UPDATE_COMPLETE`
- Root Cause: Canvas useEffect dependencies issue
- Solution: Verify canvasDataId changes properly

---

### **Phase 2: Tools & Color System**

#### **Test 2.1: Toolbar - Tool Selection**
**Expected Behavior:**
- ✅ Tool buttons visually indicate active state
- ✅ Canvas cursor changes per tool
- ✅ Only one tool active at time

**Test Steps:**
1. Click each tool button (pencil, eraser, color picker, fill, pan)
2. Verify visual feedback (button highlight)
3. Verify cursor changes on canvas
4. Test tool functionality

#### **Test 2.2: ColorPalette - Color Selection**  
**Expected Behavior:**
- ✅ Colors display correctly
- ✅ Active color highlighted
- ✅ Drawing uses selected color

**Test Steps:**
1. Click different colors in palette
2. Verify visual feedback
3. Draw with each color
4. Verify drawn pixels match selected color

---

### **Phase 3: Project Management**

#### **Test 3.1: ProjectPanel - Canvas Resize (NEW FEATURE)**
**Expected Behavior:**
- ✅ Width/Height changes don't apply immediately
- ✅ Apply button appears when dimensions change
- ✅ Empty canvas: immediate resize
- ✅ Non-empty canvas: shows confirmation modal

**Test Steps:**
1. **Empty Canvas Test:**
   - Change width/height values
   - Click "Apply Canvas Size" button
   - Should resize immediately

2. **Non-Empty Canvas Test:**
   - Draw some pixels first
   - Change width/height values  
   - Click "Apply Canvas Size" button
   - Should show modal with options:
     - "Save Current Work & Resize"
     - "Discard Changes & Resize" 
     - "Cancel"

**Debug Logs to Monitor:**
```
[APPLY_DIMENSIONS_START] → [CANVAS_EMPTY_CHECK] → 
[APPLY_DIMENSIONS_DIRECT] OR [APPLY_DIMENSIONS_CONFIRM]
```

#### **Test 3.2: ProjectTabs - Tab Management**
**Expected Behavior:**
- ✅ Create new tabs
- ✅ Switch between tabs  
- ✅ Close tabs
- ✅ Each tab maintains its own canvas state

#### **Test 3.3: FrameManager - Animation Frames**
**Expected Behavior:**
- ✅ Add/remove frames
- ✅ Switch between frames
- ✅ Frame preview thumbnails

---

### **Phase 4: Integration & Performance**

#### **Test 4.1: Cross-Component Integration**
**Expected Behavior:**
- ✅ Tool + Color + Canvas work together seamlessly
- ✅ Undo/Redo maintains state consistency
- ✅ Tab switching preserves all states

#### **Test 4.2: Accessibility & UX**
**Expected Behavior:**
- ✅ Keyboard navigation works
- ✅ Touch/mobile interaction works  
- ✅ High contrast mode supported
- ✅ Button sizes ≥44px (touch targets)

#### **Test 4.3: Performance**
**Expected Behavior:**
- ✅ Drawing response <16ms (60fps)
- ✅ No memory leaks during extended use
- ✅ Smooth zoom/pan operations

---

## 🚨 **Critical Issue Resolution Framework**

### **Problem: Drawing Not Visible Immediately**
1. **Symptoms**: Click canvas, no pixel appears until refresh
2. **Debug**: Check for missing `RENDER_START` logs
3. **Root Cause**: useEffect dependencies not detecting canvas data changes
4. **Solution**: Verify canvasDataId useMemo is working

### **Problem: Apply Button Not Working**
1. **Symptoms**: Click Apply, nothing happens  
2. **Debug**: Check `APPLY_DIMENSIONS_*` logs
3. **Root Cause**: Event handlers not properly bound
4. **Solution**: Verify handleApplyDimensions function

### **Problem: Modal Not Appearing**
1. **Symptoms**: Canvas has content but no modal shows
2. **Debug**: Check `CANVAS_EMPTY_CHECK` results
3. **Root Cause**: isCanvasEmpty() returning incorrect result
4. **Solution**: Verify pixel data analysis logic

---

## 📋 **Testing Checklist**

- [ ] **Phase 1**: Canvas drawing (pencil, eraser, color picker, fill)
- [ ] **Phase 2**: Tool selection and color palette  
- [ ] **Phase 3**: Project panel resize functionality
- [ ] **Phase 4**: Tab management and frames
- [ ] **Phase 5**: Integration testing
- [ ] **Phase 6**: Performance validation

## 🎯 **Success Criteria**

- **Functional**: All buttons/features work as designed
- **Performance**: Drawing feels instant (<16ms response)  
- **Accessibility**: WCAG 2.1 AA compliance
- **User Experience**: Intuitive, no confusion
- **Reliability**: No crashes, consistent behavior