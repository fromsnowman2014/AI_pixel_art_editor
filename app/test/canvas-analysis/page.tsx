'use client';

import { useEffect } from 'react';
import { 
  analyzeCanvas, 
  isCanvasEmpty, 
  generateContentHash,
  debugCanvasAnalysis 
} from '@/lib/core/canvas-analysis';

// Helper function to create test ImageData
function createTestImageData(width: number, height: number, fillPattern?: 'empty' | 'full' | 'partial'): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  
  switch (fillPattern) {
    case 'empty':
      data.fill(0);
      break;
      
    case 'full':
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255;     // R
        data[i + 1] = 0;   // G
        data[i + 2] = 0;   // B
        data[i + 3] = 255; // A
      }
      break;
      
    case 'partial':
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          if (y < height / 2) {
            data[index] = 255;     // R
            data[index + 1] = 0;   // G
            data[index + 2] = 0;   // B
            data[index + 3] = 255; // A
          }
        }
      }
      break;
      
    default:
      data.fill(0);
  }
  
  return new ImageData(data, width, height);
}

function testEmptyCanvas(): boolean {
  console.log('🧪 Testing empty canvas detection...');
  
  const emptyCanvas = createTestImageData(32, 32, 'empty');
  const analysis = analyzeCanvas(emptyCanvas);
  
  const isCorrect = analysis.isEmpty && 
                   analysis.filledPixels === 0 && 
                   analysis.fillPercentage === 0 &&
                   analysis.contentBounds === null;
  
  debugCanvasAnalysis(analysis, 'Empty Canvas');
  console.log(isCorrect ? '✅ Empty canvas test passed' : '❌ Empty canvas test failed');
  
  return isCorrect;
}

function testFullCanvas(): boolean {
  console.log('🧪 Testing full canvas detection...');
  
  const fullCanvas = createTestImageData(32, 32, 'full');
  const analysis = analyzeCanvas(fullCanvas);
  
  const expectedPixels = 32 * 32;
  const isCorrect = !analysis.isEmpty && 
                   analysis.filledPixels === expectedPixels && 
                   analysis.fillPercentage === 100 &&
                   analysis.contentBounds !== null &&
                   analysis.dominantColors.includes('rgb(255,0,0)');
  
  debugCanvasAnalysis(analysis, 'Full Canvas');
  console.log(isCorrect ? '✅ Full canvas test passed' : '❌ Full canvas test failed');
  
  return isCorrect;
}

function testPartialCanvas(): boolean {
  console.log('🧪 Testing partial canvas detection...');
  
  const partialCanvas = createTestImageData(32, 32, 'partial');
  const analysis = analyzeCanvas(partialCanvas);
  
  const expectedFilledPixels = 32 * 16;
  const expectedFillPercentage = 50;
  const isCorrect = !analysis.isEmpty && 
                   analysis.filledPixels === expectedFilledPixels && 
                   Math.abs(analysis.fillPercentage - expectedFillPercentage) < 1 &&
                   analysis.hasTransparency &&
                   analysis.contentBounds !== null;
  
  debugCanvasAnalysis(analysis, 'Partial Canvas');
  console.log(isCorrect ? '✅ Partial canvas test passed' : '❌ Partial canvas test failed');
  
  return isCorrect;
}

function testContentHash(): boolean {
  console.log('🧪 Testing content hash generation...');
  
  const canvas1 = createTestImageData(16, 16, 'empty');
  const canvas2 = createTestImageData(16, 16, 'empty');
  const canvas3 = createTestImageData(16, 16, 'full');
  
  const hash1 = generateContentHash(canvas1);
  const hash2 = generateContentHash(canvas2);
  const hash3 = generateContentHash(canvas3);
  
  const isCorrect = hash1 === hash2 && hash1 !== hash3;
  
  console.log('Hash results:', { hash1, hash2, hash3 });
  console.log(isCorrect ? '✅ Content hash test passed' : '❌ Content hash test failed');
  
  return isCorrect;
}

function runCanvasAnalysisTests(): boolean {
  console.log('🎯 Running Canvas Analysis Tests...\n');
  
  const results = [
    testEmptyCanvas(),
    testFullCanvas(),
    testPartialCanvas(),
    testContentHash()
  ];
  
  const allPassed = results.every(result => result);
  
  console.log(`\n📊 Test Results: ${results.filter(r => r).length}/${results.length} passed`);
  console.log(allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed');
  
  return allPassed;
}

export default function CanvasAnalysisTestPage() {
  useEffect(() => {
    runCanvasAnalysisTests();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Canvas Analysis Tests</h1>
      <p className="text-gray-600 mb-4">
        Check the browser console for test results.
      </p>
      
      <div className="space-y-4">
        <button 
          onClick={runCanvasAnalysisTests}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Run Tests Again
        </button>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Test Coverage:</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>Empty canvas detection</li>
            <li>Full canvas detection</li>
            <li>Partial canvas analysis</li>
            <li>Content hash generation</li>
            <li>Transparency detection</li>
            <li>Dominant color extraction</li>
            <li>Content bounds calculation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}