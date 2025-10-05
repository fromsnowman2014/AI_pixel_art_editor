# Flip & Rotate Feature Implementation Plan

## Overview
이 문서는 PixelBuddy에 상하/좌우 반전 및 회전 기능을 추가하기 위한 구현 계획입니다. 현재 아키텍처와 충돌하지 않으면서 자연스럽게 통합되는 방식으로 설계되었습니다.

## 기능 요구사항

### 1. 상하/좌우 반전 (Flip)
- **상하 반전 (Vertical Flip)**: Y축 기준 이미지 반전
- **좌우 반전 (Horizontal Flip)**: X축 기준 이미지 반전
- **적용 범위 선택**:
  - 현재 프레임만 (Current Frame Only)
  - 모든 프레임 (All Frames)

### 2. 회전 (Rotate)
- **90도 단위 회전**: 시계방향 90°/180°/270° 회전
- **자유 회전 (Free Rotation)**: 마우스 드래그로 1도 단위 회전
- **적용 범위 선택**:
  - 현재 프레임만 (Current Frame Only)
  - 모든 프레임 (All Frames)

## 아키텍처 분석

### 현재 구조
```
components/
├── toolbar.tsx              # 드로잉 툴 (Pencil, Eraser, Fill 등)
├── pixel-canvas.tsx         # 메인 캔버스 렌더링 및 드로잉
├── frame-manager.tsx        # 프레임 관리 및 애니메이션
└── pixel-editor.tsx         # 전체 에디터 레이아웃

lib/
├── stores/project-store.ts  # Zustand 상태 관리
├── types/api.ts            # TypeScript 타입 정의
└── utils/                  # 유틸리티 함수들
```

### 주요 타입
```typescript
interface PixelData {
  width: number
  height: number
  data: Uint8ClampedArray  // RGBA 픽셀 데이터
}

interface CanvasState {
  tool: string
  color: string
  brushSize: number
  zoom: number
  panX: number
  panY: number
  selection?: SelectionState
}

interface ProjectTab {
  frames: Frame[]
  canvasData: PixelData | null
  canvasState: CanvasState
  frameCanvasData: FrameCanvasData[]  // 각 프레임별 캔버스 데이터
}
```

## UI/UX 설계

### 1. UI 배치 전략

#### Option A: Toolbar 섹션 추가 (권장)
**위치**: [components/toolbar.tsx](../components/toolbar.tsx) 내 새로운 섹션
**장점**:
- 기존 Drawing Tools와 분리되어 혼란 최소화
- 툴바 내에서 논리적으로 그룹화 가능
- 키보드 단축키 시스템 재사용 가능

**레이아웃 구조**:
```tsx
<div className="space-y-3">
  {/* DRAWING TOOLS 섹션 - 기존 */}
  <div className="space-y-3">
    <div className="text-xs font-semibold">DRAWING TOOLS</div>
    <div className="grid grid-cols-3 gap-2">
      {/* Pencil, Eraser, Fill, Magic Wand, Eyedropper, Pan */}
    </div>
  </div>

  {/* TRANSFORM TOOLS 섹션 - 신규 */}
  <div className="space-y-3">
    <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
      TRANSFORM TOOLS
    </div>
    <div className="grid grid-cols-2 gap-2">
      {/* Flip Horizontal, Flip Vertical */}
      {/* Rotate 90°, Free Rotate */}
    </div>
  </div>
</div>
```

#### Option B: 상단 메뉴바 추가
**위치**: [components/pixel-editor.tsx](../components/pixel-editor.tsx) 상단
**장점**: Photoshop/GIMP 스타일 익숙한 UX
**단점**: 추가 UI 공간 필요, 모바일에서 복잡해질 수 있음

**최종 선택: Option A (Toolbar 섹션 추가)**
- 현재 컴팩트한 UI 구조 유지
- 키보드 단축키 일관성 유지
- 모바일 친화적

### 2. 버튼 디자인

#### Transform Tools Buttons
```tsx
const transformTools = [
  {
    id: 'flip-h',
    name: 'Flip Horizontal',
    icon: FlipHorizontal,
    shortcut: 'F',
    description: 'Flip canvas horizontally (left ↔ right)'
  },
  {
    id: 'flip-v',
    name: 'Flip Vertical',
    icon: FlipVertical,
    shortcut: 'V',
    description: 'Flip canvas vertically (top ↔ bottom)'
  },
  {
    id: 'rotate-90',
    name: 'Rotate 90°',
    icon: RotateCw,
    shortcut: 'R',
    description: 'Rotate canvas 90° clockwise'
  },
  {
    id: 'rotate-free',
    name: 'Free Rotate',
    icon: Orbit,
    shortcut: 'T',
    description: 'Rotate canvas freely by dragging'
  },
]
```

**버튼 스타일**: 기존 Drawing Tools와 동일한 디자인 패턴 사용
- 44px minimum hit target (WCAG 준수)
- Hover state with scale animation
- Keyboard shortcut indicator
- Tooltip with description

### 3. 모달 디자인: Transform Scope Modal

**트리거**: Transform Tool 버튼 클릭 시
**목적**: 적용 범위 선택 (현재 프레임 vs 모든 프레임)

```tsx
<Dialog>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>
        {transformType === 'flip-h' ? '좌우 반전' :
         transformType === 'flip-v' ? '상하 반전' :
         transformType === 'rotate-90' ? '90도 회전' :
         '자유 회전'}
      </DialogTitle>
      <DialogDescription>
        변형을 적용할 범위를 선택하세요
      </DialogDescription>
    </DialogHeader>

    {/* Preview - Current Frame */}
    <div className="border rounded p-2">
      <canvas ref={previewRef} className="pixel-canvas" />
    </div>

    {/* Scope Selection */}
    <RadioGroup defaultValue="current">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="current" id="current" />
        <Label htmlFor="current" className="flex flex-col">
          <span className="font-semibold">현재 프레임만</span>
          <span className="text-xs text-gray-500">
            Frame {currentFrameIndex + 1}에만 적용
          </span>
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <RadioGroupItem value="all" id="all" />
        <Label htmlFor="all" className="flex flex-col">
          <span className="font-semibold">모든 프레임</span>
          <span className="text-xs text-gray-500">
            총 {frames.length}개 프레임에 일괄 적용
          </span>
        </Label>
      </div>
    </RadioGroup>

    {/* Rotate-specific: Angle Input */}
    {transformType === 'rotate-90' && (
      <div className="space-y-2">
        <Label>회전 각도</Label>
        <RadioGroup defaultValue="90">
          <RadioGroupItem value="90" label="90°" />
          <RadioGroupItem value="180" label="180°" />
          <RadioGroupItem value="270" label="270°" />
        </RadioGroup>
      </div>
    )}

    {transformType === 'rotate-free' && (
      <div className="space-y-2">
        <Label>회전 각도: {rotationAngle}°</Label>
        <Slider
          min={-180}
          max={180}
          step={1}
          value={[rotationAngle]}
          onValueChange={([angle]) => setRotationAngle(angle)}
        />
      </div>
    )}

    <DialogFooter>
      <Button variant="outline" onClick={handleCancel}>
        취소
      </Button>
      <Button onClick={handleApply}>
        적용
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## 핵심 로직 구현

### 1. Canvas Transform Functions

#### Flip Horizontal
```typescript
/**
 * 좌우 반전 (Horizontal Flip)
 * X축 기준으로 픽셀 데이터를 미러링
 */
function flipHorizontal(pixelData: PixelData): PixelData {
  const { width, height, data } = pixelData
  const newData = new Uint8ClampedArray(data.length)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4
      const destX = width - 1 - x  // 좌우 반전
      const destIndex = (y * width + destX) * 4

      // RGBA 복사
      newData[destIndex] = data[srcIndex]
      newData[destIndex + 1] = data[srcIndex + 1]
      newData[destIndex + 2] = data[srcIndex + 2]
      newData[destIndex + 3] = data[srcIndex + 3]
    }
  }

  return { width, height, data: newData }
}
```

#### Flip Vertical
```typescript
/**
 * 상하 반전 (Vertical Flip)
 * Y축 기준으로 픽셀 데이터를 미러링
 */
function flipVertical(pixelData: PixelData): PixelData {
  const { width, height, data } = pixelData
  const newData = new Uint8ClampedArray(data.length)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4
      const destY = height - 1 - y  // 상하 반전
      const destIndex = (destY * width + x) * 4

      // RGBA 복사
      newData[destIndex] = data[srcIndex]
      newData[destIndex + 1] = data[srcIndex + 1]
      newData[destIndex + 2] = data[srcIndex + 2]
      newData[destIndex + 3] = data[srcIndex + 3]
    }
  }

  return { width, height, data: newData }
}
```

#### Rotate 90° Clockwise
```typescript
/**
 * 90도 시계방향 회전
 * 주의: width와 height가 바뀜!
 */
function rotate90Clockwise(pixelData: PixelData): PixelData {
  const { width, height, data } = pixelData
  const newWidth = height   // width <-> height 교환
  const newHeight = width
  const newData = new Uint8ClampedArray(data.length)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4

      // 90도 회전 좌표 변환: (x, y) -> (height - 1 - y, x)
      const destX = height - 1 - y
      const destY = x
      const destIndex = (destY * newWidth + destX) * 4

      // RGBA 복사
      newData[destIndex] = data[srcIndex]
      newData[destIndex + 1] = data[srcIndex + 1]
      newData[destIndex + 2] = data[srcIndex + 2]
      newData[destIndex + 3] = data[srcIndex + 3]
    }
  }

  return { width: newWidth, height: newHeight, data: newData }
}

/**
 * 180도 회전 = rotate90 두 번
 * 270도 회전 = rotate90 세 번
 */
function rotate180(pixelData: PixelData): PixelData {
  return rotate90Clockwise(rotate90Clockwise(pixelData))
}

function rotate270Clockwise(pixelData: PixelData): PixelData {
  return rotate90Clockwise(rotate90Clockwise(rotate90Clockwise(pixelData)))
}
```

#### Free Rotation (Advanced)
```typescript
/**
 * 자유 각도 회전 (1도 단위)
 * Canvas API 사용 후 픽셀 데이터 추출
 *
 * 주의사항:
 * - 픽셀 아트 특성상 회전 시 품질 저하 가능
 * - Nearest-neighbor 보간 사용 필수
 * - 캔버스 크기 조정 필요 (회전 후 잘리지 않도록)
 */
function rotateFree(
  pixelData: PixelData,
  angleDegrees: number
): PixelData {
  const { width, height, data } = pixelData

  // 1. 임시 캔버스 생성
  const tempCanvas = createPixelCanvas(width, height)
  const ctx = tempCanvas.getContext('2d')!

  // 2. ImageData로 변환 후 캔버스에 그리기
  const imageData = new ImageData(data, width, height)
  ctx.putImageData(imageData, 0, 0)

  // 3. 회전된 이미지를 담을 새 캔버스 생성
  // 회전 후 크기 계산 (잘림 방지)
  const angleRad = (angleDegrees * Math.PI) / 180
  const cos = Math.abs(Math.cos(angleRad))
  const sin = Math.abs(Math.sin(angleRad))
  const newWidth = Math.ceil(width * cos + height * sin)
  const newHeight = Math.ceil(width * sin + height * cos)

  const rotatedCanvas = createPixelCanvas(newWidth, newHeight)
  const rotatedCtx = rotatedCanvas.getContext('2d')!

  // 4. Nearest-neighbor 보간 설정 (픽셀 아트 유지)
  rotatedCtx.imageSmoothingEnabled = false

  // 5. 회전 변환 적용
  rotatedCtx.translate(newWidth / 2, newHeight / 2)
  rotatedCtx.rotate(angleRad)
  rotatedCtx.drawImage(tempCanvas, -width / 2, -height / 2)

  // 6. 픽셀 데이터 추출
  const rotatedImageData = rotatedCtx.getImageData(0, 0, newWidth, newHeight)

  return {
    width: newWidth,
    height: newHeight,
    data: rotatedImageData.data
  }
}
```

### 2. Project Store Actions

[lib/stores/project-store.ts](../lib/stores/project-store.ts)에 추가할 액션들:

```typescript
interface ProjectStore {
  // ... existing actions ...

  // Transform actions
  flipHorizontal: (tabId: string, scope: 'current' | 'all') => void
  flipVertical: (tabId: string, scope: 'current' | 'all') => void
  rotateCanvas: (tabId: string, angle: 90 | 180 | 270, scope: 'current' | 'all') => void
  rotateFreeCanvas: (tabId: string, angleDegrees: number, scope: 'current' | 'all') => void
}

// Implementation
flipHorizontal: (tabId, scope) => {
  set((state) => {
    const tab = state.tabs.find(t => t.id === tabId)
    if (!tab) return

    if (scope === 'current') {
      // 현재 프레임만 변형
      if (tab.canvasData) {
        tab.canvasData = flipHorizontal(tab.canvasData)

        // 히스토리 추가
        get().addHistoryEntry(tabId, 'flip_horizontal', tab.canvasData)

        // 썸네일 재생성
        if (tab.project.activeFrameId) {
          get().regenerateFrameThumbnail(tabId, tab.project.activeFrameId)
        }
      }
    } else {
      // 모든 프레임 변형
      tab.frameCanvasData = tab.frameCanvasData.map(frameData => ({
        ...frameData,
        canvasData: flipHorizontal(frameData.canvasData)
      }))

      // 현재 프레임도 업데이트
      if (tab.canvasData) {
        tab.canvasData = flipHorizontal(tab.canvasData)
      }

      // 모든 썸네일 재생성
      get().regenerateAllThumbnails()
    }

    tab.isDirty = true
  })
}
```

**중요 고려사항**:
1. **회전 시 캔버스 크기 변경**: 90°/270° 회전은 width/height 교환 필요
   - Project 객체의 width/height 업데이트 필요
   - 모든 프레임에 일괄 적용 시 일관성 유지 필요

2. **히스토리 관리**:
   - Undo/Redo 지원을 위해 변형 전 상태 저장
   - 모든 프레임 변형 시 메모리 효율성 고려

3. **썸네일 동기화**:
   - 변형 후 즉시 썸네일 재생성
   - Frame Manager의 실시간 미리보기 업데이트

### 3. 파일 구조

#### 새로 생성할 파일들

```
lib/
└── utils/
    └── canvas-transform.ts        # Transform 로직 모음

components/
└── modals/
    └── transform-scope-modal.tsx  # 범위 선택 모달
```

#### canvas-transform.ts
```typescript
// lib/utils/canvas-transform.ts

import type { PixelData } from '@/lib/types/api'
import { createPixelCanvas } from '@/lib/utils'

export function flipHorizontal(pixelData: PixelData): PixelData {
  // Implementation above
}

export function flipVertical(pixelData: PixelData): PixelData {
  // Implementation above
}

export function rotate90Clockwise(pixelData: PixelData): PixelData {
  // Implementation above
}

export function rotate180(pixelData: PixelData): PixelData {
  return rotate90Clockwise(rotate90Clockwise(pixelData))
}

export function rotate270Clockwise(pixelData: PixelData): PixelData {
  return rotate90Clockwise(rotate90Clockwise(rotate90Clockwise(pixelData)))
}

export function rotateFree(
  pixelData: PixelData,
  angleDegrees: number
): PixelData {
  // Implementation above
}

export type TransformType = 'flip-h' | 'flip-v' | 'rotate-90' | 'rotate-free'
export type TransformScope = 'current' | 'all'

export interface TransformOptions {
  type: TransformType
  scope: TransformScope
  angle?: number  // For rotate operations
}
```

#### transform-scope-modal.tsx
```typescript
// components/modals/transform-scope-modal.tsx

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import type { TransformType, TransformScope } from '@/lib/utils/canvas-transform'
import {
  flipHorizontal,
  flipVertical,
  rotate90Clockwise,
  rotate180,
  rotate270Clockwise,
  rotateFree,
} from '@/lib/utils/canvas-transform'

interface TransformScopeModalProps {
  isOpen: boolean
  onClose: () => void
  transformType: TransformType
}

export function TransformScopeModal({
  isOpen,
  onClose,
  transformType,
}: TransformScopeModalProps) {
  const {
    activeTabId,
    getActiveTab,
    flipHorizontal: storeFlipH,
    flipVertical: storeFlipV,
    rotateCanvas,
    rotateFreeCanvas,
  } = useProjectStore()

  const [scope, setScope] = useState<TransformScope>('current')
  const [rotationAngle, setRotationAngle] = useState(90)
  const [freeRotationAngle, setFreeRotationAngle] = useState(0)
  const previewRef = useRef<HTMLCanvasElement>(null)

  const activeTab = getActiveTab()
  const frames = activeTab?.frames || []
  const currentFrameIndex = frames.findIndex(
    (f) => f.id === activeTab?.project.activeFrameId
  )

  // Preview update effect
  useEffect(() => {
    if (!isOpen || !previewRef.current || !activeTab?.canvasData) return

    const canvas = previewRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Apply transform for preview
    let transformedData = activeTab.canvasData

    switch (transformType) {
      case 'flip-h':
        transformedData = flipHorizontal(transformedData)
        break
      case 'flip-v':
        transformedData = flipVertical(transformedData)
        break
      case 'rotate-90':
        if (rotationAngle === 90) transformedData = rotate90Clockwise(transformedData)
        else if (rotationAngle === 180) transformedData = rotate180(transformedData)
        else if (rotationAngle === 270) transformedData = rotate270Clockwise(transformedData)
        break
      case 'rotate-free':
        transformedData = rotateFree(transformedData, freeRotationAngle)
        break
    }

    // Render preview
    canvas.width = transformedData.width * 2  // 2x zoom for preview
    canvas.height = transformedData.height * 2
    ctx.imageSmoothingEnabled = false

    const imageData = new ImageData(
      transformedData.data,
      transformedData.width,
      transformedData.height
    )
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = transformedData.width
    tempCanvas.height = transformedData.height
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.putImageData(imageData, 0, 0)

    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height)
  }, [isOpen, transformType, rotationAngle, freeRotationAngle, activeTab?.canvasData])

  const handleApply = () => {
    if (!activeTabId) return

    switch (transformType) {
      case 'flip-h':
        storeFlipH(activeTabId, scope)
        break
      case 'flip-v':
        storeFlipV(activeTabId, scope)
        break
      case 'rotate-90':
        rotateCanvas(activeTabId, rotationAngle as 90 | 180 | 270, scope)
        break
      case 'rotate-free':
        rotateFreeCanvas(activeTabId, freeRotationAngle, scope)
        break
    }

    onClose()
  }

  const getTitle = () => {
    switch (transformType) {
      case 'flip-h': return '좌우 반전'
      case 'flip-v': return '상하 반전'
      case 'rotate-90': return '90도 회전'
      case 'rotate-free': return '자유 회전'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            변형을 적용할 범위를 선택하세요
          </DialogDescription>
        </DialogHeader>

        {/* Preview */}
        <div className="border rounded p-4 bg-gray-50 flex justify-center">
          <canvas
            ref={previewRef}
            className="pixel-canvas border border-gray-300"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Scope Selection */}
        <RadioGroup value={scope} onValueChange={(v) => setScope(v as TransformScope)}>
          <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
            <RadioGroupItem value="current" id="current" />
            <Label htmlFor="current" className="flex flex-col flex-1 cursor-pointer">
              <span className="font-semibold">현재 프레임만</span>
              <span className="text-xs text-gray-500">
                Frame {currentFrameIndex + 1}에만 적용
              </span>
            </Label>
          </div>

          <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all" className="flex flex-col flex-1 cursor-pointer">
              <span className="font-semibold">모든 프레임</span>
              <span className="text-xs text-gray-500">
                총 {frames.length}개 프레임에 일괄 적용
              </span>
            </Label>
          </div>
        </RadioGroup>

        {/* Rotation Angle Selection (90° rotation) */}
        {transformType === 'rotate-90' && (
          <div className="space-y-2">
            <Label>회전 각도</Label>
            <RadioGroup
              value={rotationAngle.toString()}
              onValueChange={(v) => setRotationAngle(parseInt(v))}
            >
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="90" id="angle-90" />
                  <Label htmlFor="angle-90" className="cursor-pointer">90°</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="180" id="angle-180" />
                  <Label htmlFor="angle-180" className="cursor-pointer">180°</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="270" id="angle-270" />
                  <Label htmlFor="angle-270" className="cursor-pointer">270°</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Free Rotation Slider */}
        {transformType === 'rotate-free' && (
          <div className="space-y-2">
            <Label>회전 각도: {freeRotationAngle}°</Label>
            <Slider
              min={-180}
              max={180}
              step={1}
              value={[freeRotationAngle]}
              onValueChange={([angle]) => setFreeRotationAngle(angle)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>-180°</span>
              <span>0°</span>
              <span>180°</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleApply}>적용</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

## 구현 단계 (Implementation Phases)

### Phase 1: Core Transform Logic
**목표**: 픽셀 데이터 변형 로직 구현 및 테스트

1. **파일 생성**:
   - `lib/utils/canvas-transform.ts` 생성
   - Flip, Rotate 함수 구현

2. **단위 테스트**:
   - 각 transform 함수의 정확성 검증
   - Edge cases 처리 (빈 캔버스, 1x1 픽셀 등)

3. **성능 최적화**:
   - TypedArray 최적화
   - 대용량 캔버스 처리 검증

### Phase 2: Store Integration
**목표**: Zustand store에 transform 액션 추가

1. **project-store.ts 수정**:
   - `flipHorizontal`, `flipVertical` 액션 추가
   - `rotateCanvas`, `rotateFreeCanvas` 액션 추가
   - 히스토리 관리 통합

2. **프레임 일괄 ���리**:
   - `scope: 'all'` 로직 구현
   - 썸네일 재생성 트리거

3. **캔버스 크기 변경 처리**:
   - 회전 시 Project의 width/height 업데이트
   - 모든 프레임 데이터 동기화

### Phase 3: UI Components
**목표**: Transform Tools UI 및 모달 구현

1. **Toolbar 수정**:
   - `components/toolbar.tsx`에 Transform Tools 섹션 추가
   - 버튼 레이아웃 및 스타일링
   - 키보드 단축키 통합

2. **모달 컴포넌트**:
   - `components/modals/transform-scope-modal.tsx` 생성
   - Preview 캔버스 렌더링
   - Scope 선택 UI
   - Rotation 각도 선택 UI

3. **상태 관리**:
   - Modal open/close state
   - Transform type 전달
   - Apply/Cancel 핸들러

### Phase 4: Integration & Polish
**목표**: 전체 기능 통합 및 사용자 경험 개선

1. **Toolbar ↔ Modal 연결**:
   - Transform tool 버튼 클릭 → 모달 오픈
   - 모달에서 Apply → Store 액션 호출

2. **실시간 Preview**:
   - 모달 내 미리보기 캔버스
   - Rotation angle 변경 시 즉시 반영

3. **UX 개선**:
   - Loading state (대용량 프레임 일괄 처리 시)
   - Success toast notification
   - Undo/Redo 지원 확인

4. **접근성 (Accessibility)**:
   - ARIA labels for buttons
   - Keyboard navigation in modal
   - Focus management

### Phase 5: Testing & Documentation
**목표**: 철저한 테스트 및 문서화

1. **기능 테스트**:
   - 단일 프레임 transform
   - 다중 프레임 transform
   - Undo/Redo 동작
   - Edge cases (1x1, 500x500 등)

2. **성능 테스트**:
   - 100 프레임 일괄 처리
   - 메모리 사용량 모니터링
   - 썸네일 재생성 속도

3. **사용자 테스트**:
   - 키즈 친화성 확인 (9-12세 타겟)
   - 모바일 UX 검증
   - 버튼 hit target 크기 (44px minimum)

4. **문서화**:
   - 코드 주석 추가
   - 사용자 가이드 업데이트
   - Changelog 작성

## 기술적 고려사항

### 1. 픽셀 아트 특성 유지
- **Nearest-neighbor scaling**: `imageSmoothingEnabled = false`
- **픽셀 정렬**: Transform 후에도 정확한 픽셀 그리드 유지
- **투명도 처리**: Alpha 채널 보존

### 2. 성능 최적화
- **TypedArray 사용**: `Uint8ClampedArray` 직접 조작
- **배치 처리**: 모든 프레임 변형 시 진행 상태 표시
- **웹 워커 고려**: 100+ 프레임 처리 시 메인 스레드 차단 방지

### 3. 메모리 관리
- **히스토리 제한**: Undo stack 크기 제한 (현재 설정 확인)
- **썸네일 캐싱**: 불필요한 재생성 방지
- **가비지 컬렉션**: 임시 캔버스 즉시 해제

### 4. 회전 시 캔버스 크기 변경
- **90°/270° 회전**: width ↔ height 교환
  - Project 객체 업데이트 필요
  - 모든 프레임 일관성 유지
  - UI 레이아웃 재조정 (캔버스 영역)

- **자유 회전**: 잘림 방지를 위한 캔버스 확장
  - 새 크기 = `sqrt(width² + height²)` 근사값
  - 배경 투명 처리

### 5. 브라우저 호환성
- **Canvas API**: 모든 주요 브라우저 지원
- **TypedArray**: IE11+ (프로젝트 타겟 확인)
- **CSS `image-rendering`**: Safari, Firefox, Chrome 모두 지원

## UI/UX 흐름도

```
사용자 클릭 Transform Tool 버튼
    ↓
Transform Scope Modal 열림
    ↓
[Preview Canvas 표시]
    ↓
사용자 선택:
  - Scope: Current Frame / All Frames
  - (Rotate only) Angle: 90° / 180° / 270° / Custom
    ↓
"적용" 버튼 클릭
    ↓
Project Store 액션 호출
    ↓
Canvas Data Transform 수행
    ↓
History Entry 추가 (Undo 지원)
    ↓
Thumbnail 재생성
    ↓
Modal 닫힘
    ↓
Success Toast Notification
```

## 키보드 단축키

| 단축키 | 기능 | 설명 |
|--------|------|------|
| `F` | Flip Horizontal | 좌우 반전 모달 열기 |
| `V` | Flip Vertical | 상하 반전 모달 열기 |
| `R` | Rotate 90° | 90도 회전 모달 열기 |
| `T` | Free Rotate | 자유 회전 모달 열기 |

**모달 내 단축키**:
- `Enter`: 적용
- `Esc`: 취소
- `Tab`: 포커스 이동

## 예상 문제 및 해결 방안

### 문제 1: 모든 프레임 변형 시 느린 속도
**해결 방안**:
- Loading indicator 표시
- Progress bar (처리된 프레임 수 / 전체 프레임 수)
- 웹 워커 사용 검토 (100+ 프레임 시)

### 문제 2: 자유 회전 시 픽셀 아트 품질 저하
**해결 방안**:
- 1도 단위 회전만 허용 (Fine-grained control)
- Nearest-neighbor 보간 강제
- 사용자에게 90도 단위 권장 (안내 메시지)

### 문제 3: 회전 후 캔버스 크기 변경으로 인한 레이아웃 깨짐
**해결 방안**:
- PixelCanvas 컴포넌트의 zoom/pan 로직 재사용
- 자동으로 뷰포트 중앙 정렬
- 사용자에게 변경 사항 알림 (Toast)

### 문제 4: Undo/Redo 메모리 오버헤드
**해결 방안**:
- 히스토리 스택 크기 제한 (기본 20개)
- 압축 고려 (RLE 인코딩)
- "모든 프레임" 변형 시 단일 히스토리 엔트리

## 성공 지표 (Success Metrics)

1. **기능 완성도**:
   - ✅ Flip Horizontal/Vertical 정확성 100%
   - ✅ Rotate 90°/180°/270° 정확성 100%
   - ✅ Free Rotation 정상 동작
   - ✅ Undo/Redo 지원

2. **성능**:
   - ⏱️ 단일 프레임 transform < 100ms
   - ⏱️ 10 프레임 일괄 처리 < 1초
   - ⏱️ 썸네일 재생성 < 50ms/frame

3. **사용자 경험**:
   - 👍 키즈 친화적 UI (9-12세 타겟)
   - 📱 모바일 호환성 (44px minimum hit target)
   - ♿ WCAG AA 준수

4. **코드 품질**:
   - 📝 TypeScript 타입 안정성
   - ✅ 단위 테스트 커버리지 > 80%
   - 📚 코드 주석 및 문서화 완료

## 참고 자료

- [Canvas API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Image Rotation Algorithms](https://en.wikipedia.org/wiki/Image_rotation)
- [Pixel Art Scaling](https://en.wikipedia.org/wiki/Pixel-art_scaling_algorithms)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## 다음 단계

1. ✅ 이 계획서 검토 및 승인
2. 🔧 Phase 1 시작: Core Transform Logic 구현
3. 🧪 단위 테스트 작성
4. 🎨 UI 컴포넌트 개발
5. 🚀 통합 및 배포

---

**문서 버전**: 1.0
**작성일**: 2025-10-05
**작성자**: Claude (AI Assistant)
**검토자**: [To be filled]
