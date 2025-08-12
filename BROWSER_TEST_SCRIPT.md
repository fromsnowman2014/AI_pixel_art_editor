# Browser Test Script - Copy & Paste Commands

## 🔧 **1. Enable Debug Mode**
```javascript
// Copy and paste in browser console (F12)
localStorage.setItem('pixelbuddy-debug', 'true');
location.reload();
```

## 🎯 **2. Test Sequence - Execute One by One**

### **Phase 1: Canvas Drawing Test**
```javascript
console.log('🎨 STARTING CANVAS DRAWING TEST');

// 1. Check initial state
console.log('Current tool:', document.querySelector('[variant="default"]')?.textContent || 'Not found');

// 2. Monitor canvas clicks (run this, then click canvas)
document.addEventListener('click', function(e) {
  if (e.target.closest('canvas')) {
    console.log('🖱️  CANVAS CLICKED:', {
      x: e.clientX,
      y: e.clientY,
      canvasRect: e.target.getBoundingClientRect()
    });
  }
}, { once: false });

console.log('✅ Canvas click monitoring enabled. Now click on canvas and check console logs.');
```

### **Phase 2: Tool Selection Test**
```javascript
console.log('🛠️  STARTING TOOL SELECTION TEST');

// Test tool selection
const tools = ['Pencil', 'Eraser', 'Paint Bucket', 'Eyedropper', 'Pan'];
let currentIndex = 0;

function testNextTool() {
  if (currentIndex >= tools.length) {
    console.log('✅ All tools tested!');
    return;
  }
  
  const toolName = tools[currentIndex];
  const toolButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes(toolName)
  );
  
  if (toolButton) {
    console.log(`🔄 Testing ${toolName}...`);
    toolButton.click();
    setTimeout(() => {
      currentIndex++;
      testNextTool();
    }, 1000);
  } else {
    console.log(`❌ Tool ${toolName} not found`);
    currentIndex++;
    testNextTool();
  }
}

testNextTool();
```

### **Phase 3: Color Selection Test**
```javascript
console.log('🎨 STARTING COLOR SELECTION TEST');

// Get all color buttons (8x8 grid)
const colorButtons = document.querySelectorAll('button[style*="backgroundColor"]');
console.log(`Found ${colorButtons.length} color buttons`);

if (colorButtons.length > 0) {
  colorButtons[0].click(); // Test first color
  setTimeout(() => {
    if (colorButtons.length > 1) {
      colorButtons[1].click(); // Test second color
      console.log('✅ Color selection test completed');
    }
  }, 500);
} else {
  console.log('❌ No color buttons found');
}
```

### **Phase 4: Canvas Resize Test**
```javascript
console.log('📐 STARTING CANVAS RESIZE TEST');

// Find width/height inputs
const widthInput = document.querySelector('input[type="number"]');
const heightInput = document.querySelectorAll('input[type="number"]')[1];

if (widthInput && heightInput) {
  console.log('🔍 Found dimension inputs');
  
  // Change dimensions
  widthInput.value = '48';
  widthInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  heightInput.value = '48';
  heightInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Look for Apply button
  setTimeout(() => {
    const applyButton = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent.includes('Apply Canvas Size')
    );
    
    if (applyButton) {
      console.log('✅ Apply button appeared!');
      console.log('🔄 Clicking Apply button...');
      applyButton.click();
    } else {
      console.log('❌ Apply button not found');
    }
  }, 100);
} else {
  console.log('❌ Dimension inputs not found');
}
```

### **Phase 5: Integration Test**
```javascript
console.log('🔗 STARTING INTEGRATION TEST');

function runIntegrationTest() {
  // 1. Select pencil tool
  const pencilBtn = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Pencil')
  );
  if (pencilBtn) pencilBtn.click();
  
  setTimeout(() => {
    // 2. Select a color
    const colorButtons = document.querySelectorAll('button[style*="backgroundColor"]');
    if (colorButtons.length > 2) colorButtons[2].click();
    
    setTimeout(() => {
      // 3. Instructions for manual test
      console.log('🎯 MANUAL TEST: Now click on the canvas and verify:');
      console.log('1. ✅ Pixel appears immediately');
      console.log('2. ✅ Pixel color matches selected color');  
      console.log('3. ✅ Console shows: DRAW_START → RENDER_START → RENDER_COMPLETE');
      console.log('4. ✅ No errors in console');
      
      console.log('📊 Watch console for debug logs when you click canvas...');
    }, 500);
  }, 500);
}

runIntegrationTest();
```

## 🐛 **Problem Detection Commands**

### **Check for Common Issues**
```javascript
// Check if canvas is rendered
const canvas = document.querySelector('canvas');
console.log('Canvas found:', !!canvas);
if (canvas) {
  console.log('Canvas size:', canvas.width + 'x' + canvas.height);
  console.log('Canvas style:', window.getComputedStyle(canvas).display);
}

// Check if project store is working
console.log('Project store tabs:', window.localStorage.getItem('pixelbuddy-projects'));

// Check current project state
const projectPanel = document.querySelector('[class*="project"]');
console.log('Project panel found:', !!projectPanel);
```

### **Force Debug Mode (if needed)**
```javascript
// Force enable all logging
window.localStorage.setItem('pixelbuddy-debug', 'true');
console.log('🔧 Debug mode force-enabled');

// Clear any cached state
window.localStorage.removeItem('pixelbuddy-projects');
console.log('🔄 Cleared project cache');

location.reload();
```

## 📋 **Expected Results**

### ✅ **Success Patterns:**
```
🛠️  Toolbar [TOOL_CHANGE]: Tool changed from pencil to eraser
🎨 ColorPalette [COLOR_SELECT]: Color changed from #000000 to #FF0000
🎨 PixelCanvas [DRAW_START]: Drawing at (120, 80)
🎨 PixelCanvas [RENDER_START]: Canvas render effect triggered
🎨 PixelCanvas [RENDER_COMPLETE]: Canvas rendered successfully
```

### ❌ **Failure Patterns:**
```
🎨 PixelCanvas [DRAW_START]: Drawing at (120, 80)
🎨 PixelCanvas [DRAW_UPDATE_COMPLETE]: updateCanvasData called successfully
❌ Missing RENDER_START = Canvas not re-rendering!
```

## 🎯 **Success Criteria**
- [ ] All buttons respond to clicks
- [ ] Tool selection changes cursor and active state
- [ ] Color selection updates current color display  
- [ ] Canvas drawing creates visible pixels immediately
- [ ] Resize shows Apply button when dimensions change
- [ ] Apply button works with proper confirmation flow
- [ ] No console errors during normal operation