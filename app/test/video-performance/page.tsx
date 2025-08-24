'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { FastVideoProcessor } from '@/lib/utils/fast-video-processor'
import { EnhancedMediaImporter, MediaImportOptions } from '@/lib/utils/enhanced-media-importer'

interface TestResult {
  method: string
  duration: number
  frames: number
  success: boolean
  error?: string
  fileSize?: number
  avgFrameTime?: number
}

export default function VideoPerformancePage() {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const options: MediaImportOptions = {
    width: 64,
    height: 64,
    colorCount: 16,
    maxFrames: 10
  }

  const runPerformanceTest = async (file: File) => {
    if (!file) return

    setIsRunning(true)
    setTestResults([])
    setProgress('Starting performance tests...')

    const results: TestResult[] = []

    // Test 1: 새로운 FastVideoProcessor (HTML5 방식)
    try {
      setProgress('Testing FastVideoProcessor (HTML5)...')
      const startTime = performance.now()
      
      const result1 = await FastVideoProcessor.processVideoWithHTML5(
        file,
        options,
        (prog, msg) => setProgress(`FastVideoProcessor: ${msg} (${prog}%)`)
      )
      
      const duration1 = performance.now() - startTime
      
      results.push({
        method: 'FastVideoProcessor (HTML5)',
        duration: duration1,
        frames: result1.frames.length,
        success: true,
        fileSize: file.size,
        avgFrameTime: duration1 / result1.frames.length
      })
      
      console.log('✅ FastVideoProcessor completed:', {
        duration: `${Math.round(duration1)}ms`,
        frames: result1.frames.length,
        avgPerFrame: `${Math.round(duration1 / result1.frames.length)}ms/frame`
      })
      
    } catch (error) {
      results.push({
        method: 'FastVideoProcessor (HTML5)',
        duration: 0,
        frames: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 2: 기존 EnhancedMediaImporter (FFmpeg 방식) - 파일 방식으로만
    try {
      setProgress('Testing EnhancedMediaImporter (FFmpeg)...')
      const startTime = performance.now()
      
      const result2 = await EnhancedMediaImporter.importFromFile(
        file,
        options,
        (prog, msg) => setProgress(`EnhancedMediaImporter: ${msg} (${prog}%)`)
      )
      
      const duration2 = performance.now() - startTime
      
      results.push({
        method: 'EnhancedMediaImporter (FFmpeg)',
        duration: duration2,
        frames: result2.frames.length,
        success: true,
        fileSize: file.size,
        avgFrameTime: duration2 / result2.frames.length
      })
      
      console.log('✅ EnhancedMediaImporter completed:', {
        duration: `${Math.round(duration2)}ms`,
        frames: result2.frames.length,
        avgPerFrame: `${Math.round(duration2 / result2.frames.length)}ms/frame`
      })
      
    } catch (error) {
      results.push({
        method: 'EnhancedMediaImporter (FFmpeg)',
        duration: 0,
        frames: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 3: Progressive Range Loading (URL 전용이므로 스킵)
    
    setTestResults(results)
    setIsRunning(false)
    setProgress('Tests completed!')

    // 결과 분석
    const successfulResults = results.filter(r => r.success)
    if (successfulResults.length >= 2) {
      const fastTime = successfulResults[0]?.duration || 0
      const ffmpegTime = successfulResults[1]?.duration || 0
      
      if (fastTime > 0 && ffmpegTime > 0) {
        const improvement = ((ffmpegTime - fastTime) / ffmpegTime) * 100
        
        console.log(`🚀 Performance improvement: ${Math.round(improvement)}% faster with FastVideoProcessor`)
        setProgress(`Completed! FastVideoProcessor is ${Math.round(improvement)}% faster`)
      }
    }
  }

  const handleFileSelect = () => {
    const file = fileInputRef.current?.files?.[0]
    if (file) {
      if (file.type.startsWith('video/')) {
        runPerformanceTest(file)
      } else {
        alert('Please select a video file (.mp4, .webm, .mov, etc.)')
      }
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
    return `${(bytes / 1024 / 1024).toFixed(2)}MB`
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🎬 Video Processing Performance Test
        </h1>
        <p className="text-gray-600 mb-8">
          비교 테스트: FastVideoProcessor (HTML5) vs EnhancedMediaImporter (FFmpeg)
        </p>

        {/* File Input */}
        <div className="mb-8">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
              id="video-input"
            />
            <label htmlFor="video-input" className="cursor-pointer">
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zM5.5 9.643a.75.75 0 00-.32 1.021l1.318 2.318a.75.75 0 001.021.32zM18.5 9.643a.75.75 0 01.32 1.021l-1.318 2.318a.75.75 0 01-1.021.32z" />
                </svg>
                <p className="text-lg font-medium text-gray-700">동영상 파일 선택</p>
                <p className="text-sm text-gray-500 mt-2">MP4, WebM, MOV 등 지원</p>
              </div>
            </label>
          </div>
        </div>

        {/* Progress */}
        {isRunning && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800 font-medium">{progress}</span>
            </div>
          </div>
        )}

        {/* Results Table */}
        {testResults.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 테스트 결과</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">방식</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">처리 시간</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">프레임 수</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">프레임당 시간</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">결과</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.map((result, index) => (
                    <tr key={index} className={`border-b ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {result.method}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {result.success ? formatDuration(result.duration) : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {result.success ? result.frames : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {result.success && result.avgFrameTime ? formatDuration(result.avgFrameTime) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {result.success ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✅ 성공
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800" title={result.error}>
                            ❌ 실패
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Performance Analysis */}
            {testResults.filter(r => r.success).length >= 2 && (
              <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 성능 분석</h3>
                
                {(() => {
                  const successful = testResults.filter(r => r.success)
                  const fastTime = successful.find(r => r.method.includes('FastVideoProcessor'))?.duration || 0
                  const ffmpegTime = successful.find(r => r.method.includes('EnhancedMediaImporter'))?.duration || 0
                  
                  if (fastTime > 0 && ffmpegTime > 0) {
                    const improvement = ((ffmpegTime - fastTime) / ffmpegTime) * 100
                    const speedup = ffmpegTime / fastTime
                    
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-4 shadow">
                          <div className="text-2xl font-bold text-green-600">
                            {Math.round(improvement)}%
                          </div>
                          <div className="text-sm text-gray-600">속도 향상</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow">
                          <div className="text-2xl font-bold text-blue-600">
                            {speedup.toFixed(1)}×
                          </div>
                          <div className="text-sm text-gray-600">배속 빨라짐</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow">
                          <div className="text-2xl font-bold text-purple-600">
                            {formatDuration(ffmpegTime - fastTime)}
                          </div>
                          <div className="text-sm text-gray-600">시간 절약</div>
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            )}
          </div>
        )}

        {/* Test Parameters */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">🔧 테스트 설정</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">출력 크기:</span>
              <span className="ml-2 text-gray-600">{options.width}×{options.height}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">색상 수:</span>
              <span className="ml-2 text-gray-600">{options.colorCount}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">최대 프레임:</span>
              <span className="ml-2 text-gray-600">{options.maxFrames}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">브라우저:</span>
              <span className="ml-2 text-gray-600">{navigator.userAgent.split(' ')[0]}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>💡 <strong>팁:</strong> FastVideoProcessor는 브라우저 네이티브 HTML5 Video API를 사용하여 FFmpeg보다 빠르게 프레임을 추출합니다.</p>
          <p className="mt-2">🎯 <strong>최적화 포인트:</strong> 부분 파일 로딩, 메모리 효율성, 브라우저 하드웨어 가속 활용</p>
        </div>
      </div>
    </div>
  )
}