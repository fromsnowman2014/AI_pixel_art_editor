'use client';

import { useState } from 'react';
import { 
  enhancePrompt,
  generateCompletePrompt,
  getPromptSuggestions,
  validatePrompt,
  analyzePrompt,
  debugPromptEnhancement
} from '@/lib/utils/prompt-enhancer';
import { PromptEnhancementOptions, AIGenerationMode } from '@/lib/types/canvas';

export default function PromptEnhancerTestPage() {
  const [testPrompt, setTestPrompt] = useState('cute cat');
  const [mode, setMode] = useState<AIGenerationMode>('text-to-image');
  const [style, setStyle] = useState<'pixel-art' | 'low-res' | 'retro'>('pixel-art');
  const [enforceTransparency, setEnforceTransparency] = useState(true);
  const [results, setResults] = useState<any>(null);

  const runTest = () => {
    const options: PromptEnhancementOptions = {
      mode,
      style,
      enforceTransparency,
      canvasAnalysis: mode === 'image-to-image' ? {
        isEmpty: false,
        hasTransparency: true,
        dominantColors: ['rgb(255,0,0)', 'rgb(0,255,0)'],
        pixelDensity: 0.6,
        contentBounds: { x: 10, y: 10, width: 20, height: 20 },
        totalPixels: 1024,
        filledPixels: 614,
        fillPercentage: 60
      } : undefined
    };

    try {
      // Run all tests
      const analysis = analyzePrompt(testPrompt);
      const validation = validatePrompt(testPrompt);
      const enhancement = enhancePrompt(testPrompt, options);
      const complete = generateCompletePrompt(testPrompt, options);
      const suggestions = getPromptSuggestions(options.canvasAnalysis || null, mode);

      // Debug in console
      debugPromptEnhancement(testPrompt, options);

      setResults({
        analysis,
        validation,
        enhancement,
        complete,
        suggestions
      });
    } catch (error: any) {
      setResults({
        error: error.message
      });
    }
  };

  const testCases = [
    'cute cat',
    'walking animation',
    'next frame continue movement', 
    'game character sprite',
    'animated sword spinning',
    'magic effect explosion',
    'transparent background flower',
    'game item potion',
    'character attack animation frame'
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Prompt Enhancer Tests</h1>
      
      {/* Input Controls */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Test Prompt:</label>
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter prompt to test..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Mode:</label>
            <select 
              value={mode} 
              onChange={(e) => setMode(e.target.value as AIGenerationMode)}
              className="w-full p-2 border rounded"
            >
              <option value="text-to-image">Text to Image</option>
              <option value="image-to-image">Image to Image</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Style:</label>
            <select 
              value={style} 
              onChange={(e) => setStyle(e.target.value as any)}
              className="w-full p-2 border rounded"
            >
              <option value="pixel-art">Pixel Art</option>
              <option value="low-res">Low Res</option>
              <option value="retro">Retro</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="transparency"
              checked={enforceTransparency}
              onChange={(e) => setEnforceTransparency(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="transparency" className="text-sm font-medium">
              Enforce Transparency
            </label>
          </div>
        </div>
        
        <button
          onClick={runTest}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Run Enhancement Test
        </button>
      </div>

      {/* Quick Test Cases */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold mb-2">Quick Test Cases:</h3>
        <div className="flex flex-wrap gap-2">
          {testCases.map((testCase, index) => (
            <button
              key={index}
              onClick={() => setTestPrompt(testCase)}
              className="px-3 py-1 bg-gray-200 text-sm rounded hover:bg-gray-300"
            >
              "{testCase}"
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {results.error ? (
            <div className="bg-red-50 border border-red-200 p-4 rounded">
              <h3 className="font-semibold text-red-800">Error:</h3>
              <p className="text-red-600">{results.error}</p>
            </div>
          ) : (
            <>
              {/* CoT Reasoning Display */}
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded">
                <h3 className="font-semibold text-indigo-800 mb-2">🧠 Chain of Thought Analysis:</h3>
                <div className="bg-indigo-100 p-3 rounded font-mono text-xs max-h-64 overflow-y-auto">
                  {results.complete.reasoning.map((line: string, i: number) => (
                    <div key={i} className={`${line.startsWith('🧠') || line.startsWith('🚀') || line.startsWith('📊') ? 'font-bold text-indigo-800 mt-2' : ''}`}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              {/* Analysis Summary */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                <h3 className="font-semibold text-blue-800 mb-2">Analysis Summary:</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>Has Style Keywords: {results.analysis.hasStyleKeywords ? '✅' : '❌'}</div>
                  <div>Has Transparency: {results.analysis.hasTransparencyKeywords ? '✅' : '❌'}</div>
                  <div>Has Background Keywords: {results.analysis.hasBackgroundKeywords ? '✅' : '❌'}</div>
                  <div>Has Character Keywords: {results.analysis.hasCharacterKeywords ? '✅' : '❌'}</div>
                  <div>Has Object Keywords: {results.analysis.hasObjectKeywords ? '✅' : '❌'}</div>
                  <div>Has Animation Keywords: {results.analysis.hasAnimationKeywords ? '✅' : '❌'}</div>
                  <div>Has Game Asset Keywords: {results.analysis.hasGameAssetKeywords ? '✅' : '❌'}</div>
                  <div>Has Negative Elements: {results.analysis.hasNegativeElements ? '⚠️' : '✅'}</div>
                  <div>Subject Type: <span className="font-semibold">{results.analysis.subjectType}</span></div>
                  <div>Animation Intent: <span className="font-semibold text-purple-600">{results.analysis.animationIntent}</span></div>
                  <div>Confidence: {(results.analysis.confidence * 100).toFixed(0)}%</div>
                </div>
                {results.analysis.suggestedAdditions.length > 0 && (
                  <div className="mt-2">
                    <strong>Suggested Additions:</strong> {results.analysis.suggestedAdditions.join(', ')}
                  </div>
                )}
              </div>

              {/* Validation */}
              <div className={`border p-4 rounded ${results.validation.isValid ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <h3 className={`font-semibold mb-2 ${results.validation.isValid ? 'text-green-800' : 'text-yellow-800'}`}>
                  Validation: {results.validation.isValid ? 'Valid ✅' : 'Issues Found ⚠️'}
                </h3>
                {results.validation.issues.length > 0 && (
                  <div className="mb-2">
                    <strong>Issues:</strong>
                    <ul className="list-disc ml-6">
                      {results.validation.issues.map((issue: string, i: number) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {results.validation.suggestions.length > 0 && (
                  <div>
                    <strong>Suggestions:</strong>
                    <ul className="list-disc ml-6">
                      {results.validation.suggestions.map((suggestion: string, i: number) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Enhancement Results */}
              <div className="bg-green-50 border border-green-200 p-4 rounded">
                <h3 className="font-semibold text-green-800 mb-2">Enhancement Results:</h3>
                <div className="space-y-2">
                  <div>
                    <strong>Original:</strong> 
                    <span className="ml-2 text-gray-600">"{results.complete.originalPrompt}"</span>
                  </div>
                  <div>
                    <strong>Enhanced:</strong> 
                    <span className="ml-2 text-green-700">"{results.complete.finalPrompt}"</span>
                  </div>
                  <div>
                    <strong>Applied Changes:</strong>
                    <ul className="list-disc ml-6">
                      {results.complete.appliedChanges.map((change: string, i: number) => (
                        <li key={i}>{change}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong>Confidence:</strong> {(results.complete.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Suggestions */}
              <div className="bg-purple-50 border border-purple-200 p-4 rounded">
                <h3 className="font-semibold text-purple-800 mb-2">Prompt Suggestions for {mode}:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {results.suggestions.map((suggestion: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setTestPrompt(suggestion)}
                      className="p-2 bg-purple-100 text-purple-700 text-sm rounded hover:bg-purple-200 text-left"
                    >
                      "{suggestion}"
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
      
      <div className="mt-8 text-sm text-gray-500">
        <p>Check the browser console for detailed debug logs.</p>
      </div>
    </div>
  );
}