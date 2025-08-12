// Production Debug Test Script for PixelBuddy
// Run this in the browser console on https://ai-pixel-art-editor.vercel.app

console.log('🚀 PixelBuddy Production Debug Test Started');

// Enable debug mode for production testing
localStorage.setItem('pixelbuddy-debug', 'true');
console.log('✅ Debug mode enabled');

// Reload to activate debug logging
if (!window.location.search.includes('debug=1')) {
    console.log('🔄 Reloading page to activate debug logging...');
    window.location.href = window.location.href + '?debug=1';
} else {
    console.log('📝 Debug logging should now be active');
    
    // Test functions
    window.testDrawing = function() {
        console.log('🎨 Testing drawing functionality...');
        
        // Try to find canvas element
        const canvas = document.querySelector('canvas.pixel-canvas');
        if (!canvas) {
            console.error('❌ Canvas element not found');
            return;
        }
        
        console.log('✅ Canvas found:', canvas);
        
        // Simulate click event
        const rect = canvas.getBoundingClientRect();
        const x = rect.left + 50;
        const y = rect.top + 50;
        
        console.log('🖱️ Simulating click at:', { x, y, rect });
        
        const clickEvent = new MouseEvent('mousedown', {
            clientX: x,
            clientY: y,
            bubbles: true,
            cancelable: true
        });
        
        canvas.parentElement.dispatchEvent(clickEvent);
        
        // Follow up with mouseup
        setTimeout(() => {
            const upEvent = new MouseEvent('mouseup', {
                clientX: x,
                clientY: y,
                bubbles: true,
                cancelable: true
            });
            canvas.parentElement.dispatchEvent(upEvent);
            
            console.log('🏁 Drawing test complete. Check debug logs above for issues.');
        }, 100);
    };
    
    window.checkState = function() {
        console.log('🔍 Current application state:');
        
        // Try to access Zustand store
        try {
            const storeElement = document.querySelector('[data-zustand-store]');
            console.log('Store element:', storeElement);
        } catch (e) {
            console.log('Could not access store directly');
        }
        
        // Check canvas state
        const canvas = document.querySelector('canvas.pixel-canvas');
        if (canvas) {
            console.log('Canvas dimensions:', {
                width: canvas.width,
                height: canvas.height,
                style: canvas.style.cssText
            });
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const imageData = ctx.getImageData(0, 0, Math.min(32, canvas.width), Math.min(32, canvas.height));
                console.log('Canvas image data sample:', {
                    width: imageData.width,
                    height: imageData.height,
                    dataLength: imageData.data.length,
                    firstPixels: Array.from(imageData.data.slice(0, 16))
                });
            }
        }
    };
    
    console.log('🛠️ Available test functions:');
    console.log('  - testDrawing() : Simulate drawing on canvas');
    console.log('  - checkState()  : Check current application state');
    console.log('');
    console.log('📱 Ready for manual testing:');
    console.log('1. Select a color');
    console.log('2. Select pencil tool');
    console.log('3. Click on canvas');
    console.log('4. Watch console for debug logs');
}