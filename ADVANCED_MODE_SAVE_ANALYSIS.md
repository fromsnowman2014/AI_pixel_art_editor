# Advanced Mode & Save Project 기능 분석

## 개요

PixelBuddy 웹 애플리케이션의 Project Settings 패널에 있는 **Advanced Mode**와 **Save Project** 기능에 대한 현재 구현 상태, 계획된 기능, 그리고 구현 방향을 분석한 문서입니다.

---

## 🎯 Advanced Mode 분석

### 현재 구현 상태

#### Frontend 구현 (`components/project-panel.tsx`)
```typescript
// Mode 토글 UI
<div className='flex space-x-2'>
  <Button
    variant={project.mode === 'beginner' ? 'default' : 'outline'}
    size='sm'
    onClick={() => handleModeChange('beginner')}
    className='flex-1'
  >
    Beginner
  </Button>
  <Button
    variant={project.mode === 'advanced' ? 'default' : 'outline'}
    size='sm'
    onClick={() => handleModeChange('advanced')}
    className='flex-1'
  >
    Advanced
  </Button>
</div>

// Mode 변경 핸들러
const handleModeChange = (mode: 'beginner' | 'advanced') => {
  updateProject(activeTabId, { mode });
};
```

#### 타입 정의 (`lib/types/api.ts`)
```typescript
export type ProjectMode = 'beginner' | 'advanced'

export interface Project {
  // ... 다른 필드들
  mode: ProjectMode
  // ...
}
```

#### Backend 구현 (`backend/src/routes/projects.ts`)
- ✅ **완전 구현**: PATCH `/api/projects/:id` 엔드포인트에서 mode 업데이트 지원
- ✅ **데이터베이스**: projects 테이블에 mode 컬럼 존재
- ✅ **검증**: UpdateProjectRequest 스키마에 mode 필드 포함

### Advanced Settings 패널

현재 구현된 Advanced Settings 토글 패널:

```typescript
{showAdvancedSettings && (
  <div className='space-y-3 text-sm'>
    <div className='flex items-center space-x-2'>
      <Grid className='h-4 w-4 text-gray-500' />
      <span>Grid visible</span>
      <input type='checkbox' className='ml-auto' defaultChecked />
    </div>
    
    <div className='flex items-center space-x-2'>
      <Layers className='h-4 w-4 text-gray-500' />
      <span>Layer mode</span>
      <input type='checkbox' className='ml-auto' />
    </div>
    
    <div className='flex items-center space-x-2'>
      <Image className='h-4 w-4 text-gray-500' />
      <span>Auto-save</span>
      <input type='checkbox' className='ml-auto' defaultChecked />
    </div>
  </div>
)}
```

**⚠️ 현재 문제점**: 
- UI만 존재하고 실제 기능은 구현되지 않음
- 체크박스 상태 변경이 실제 애플리케이션 동작에 영향을 주지 않음
- `defaultChecked`만 있고 상태 관리나 이벤트 핸들러 없음

### 계획된 기능 구현 방향

#### 1. Beginner Mode 특징
- **간소화된 UI**: 핵심 기능만 노출
- **제한된 옵션**: 복잡한 설정 숨김
- **가이드 강화**: 더 많은 툴팁과 도움말
- **자동화**: 사용자 선택을 최소화

```typescript
// 예상 구현
const getVisibleFeatures = (mode: ProjectMode) => ({
  showLayerPanel: mode === 'advanced',
  showAdvancedBrush: mode === 'advanced',
  showGridControls: mode === 'advanced',
  showPerformanceStats: mode === 'advanced',
  autoSave: mode === 'beginner', // 초보자는 자동 저장
  showTooltips: mode === 'beginner' ? 'detailed' : 'minimal'
});
```

#### 2. Advanced Mode 특징
- **전체 기능 접근**: 모든 도구와 설정 노출
- **레이어 시스템**: 다중 레이어 편집 지원
- **고급 브러시**: 커스텀 브러시, 패턴 등
- **성능 모니터링**: 메모리 사용량, 렌더링 성능 표시
- **수동 제어**: 사용자가 모든 것을 제어

#### 3. 구현 우선순위
1. **High Priority**: Grid 표시/숨김 기능
2. **Medium Priority**: Auto-save 활성화/비활성화
3. **Low Priority**: Layer mode (향후 레이어 시스템과 함께)

---

## 💾 Save Project 분석

### 현재 구현 상태

#### Frontend 구현 (`components/project-panel.tsx`)
```typescript
// Save 버튼 UI
<Button
  onClick={handleSave}
  disabled={!activeTab?.isDirty}
  className='w-full'
  variant={activeTab?.isDirty ? 'default' : 'outline'}
>
  <Upload className='mr-2 h-4 w-4' />
  {activeTab?.isDirty ? 'Save Project' : 'Saved'}
</Button>

// Save 핸들러 (현재 구현)
const handleSave = () => {
  saveProject(activeTabId);
};
```

#### Store 구현 (`lib/stores/project-store.ts`)
```typescript
saveProject: async (tabId) => {
  const tab = get().getTab(tabId)
  if (!tab) return

  set((state) => {
    state.isLoading = true
    state.error = null
  })

  try {
    // TODO: Implement API save
    console.log('Saving project:', tab.project)
    
    set((state) => {
      const tabToUpdate = state.tabs.find(t => t.id === tabId)
      if (tabToUpdate) {
        tabToUpdate.isDirty = false // 🚨 실제 저장 없이 플래그만 변경
      }
      state.isLoading = false
    })
  } catch (error) {
    set((state) => {
      state.error = error instanceof Error ? error.message : 'Save failed'
      state.isLoading = false
    })
  }
}
```

**⚠️ 현재 문제점**:
- API 호출이 구현되지 않음 (TODO 주석 상태)
- 실제 데이터 저장 없이 `isDirty` 플래그만 false로 변경
- 로컬 상태만 업데이트되고 서버 동기화 없음

#### Backend 구현 (`backend/src/routes/projects.ts`)
✅ **완전 구현된 API 엔드포인트**:
- `PATCH /api/projects/:id` - 프로젝트 업데이트
- 모든 필드 업데이트 지원 (name, palette, mode, activeFrameId)
- 사용자 권한 검증 포함
- UUID 검증 및 에러 처리 구현

### 저장 메커니즘 설계

#### 1. 현재 데이터 모델
```
User -> Project -> Frame -> Layer (optional)
```

#### 2. 저장되는 데이터
- **Project 메타데이터**: name, dimensions, colorLimit, palette, mode
- **Frame 데이터**: 각 프레임의 pixel data, delay, inclusion 상태
- **Canvas 상태**: 현재 활성 프레임, 편집 히스토리

#### 3. 저장 전략
```typescript
// 예상 구현
const saveProject = async (tabId: string) => {
  const tab = get().getTab(tabId)
  if (!tab) return

  try {
    // 1. 프로젝트 메타데이터 저장
    await api.projects.update(tab.project.id, {
      name: tab.project.name,
      palette: tab.project.palette,
      mode: tab.project.mode
    })

    // 2. 변경된 프레임 데이터 저장
    for (const frame of tab.frames) {
      if (frame.isDirty) {
        await api.frames.update(frame.id, {
          rawImageData: encodePixelData(frame.pixelData),
          delayMs: frame.delayMs,
          included: frame.included
        })
      }
    }

    // 3. 상태 업데이트
    markProjectAsSaved(tabId)
  } catch (error) {
    handleSaveError(error)
  }
}
```

### 저장 UI/UX 개선 방향

#### 1. 자동 저장 (Auto-save)
```typescript
// 구현 계획
const useAutoSave = (project: Project) => {
  const { mode } = project
  const autoSaveEnabled = mode === 'beginner' || userSettings.autoSave
  
  useEffect(() => {
    if (!autoSaveEnabled) return
    
    const timeoutId = setTimeout(() => {
      if (project.isDirty) {
        saveProject(project.id)
      }
    }, AUTO_SAVE_DELAY)
    
    return () => clearTimeout(timeoutId)
  }, [project.lastModified])
}
```

#### 2. 저장 상태 표시
- **Saved** (초록): 모든 변경사항 저장됨
- **Saving...** (파랑): 저장 진행 중
- **Save Project** (기본): 저장되지 않은 변경사항 있음
- **Save Failed** (빨강): 저장 실패, 재시도 필요

#### 3. 오프라인 지원
```typescript
// 구현 계획
const saveWithOfflineSupport = async (project: Project) => {
  if (navigator.onLine) {
    try {
      await saveToServer(project)
      clearLocalBackup(project.id)
    } catch (error) {
      saveToLocalStorage(project)
      showOfflineNotice()
    }
  } else {
    saveToLocalStorage(project)
    scheduleRetryWhenOnline(project.id)
  }
}
```

---

## 🚀 구현 로드맵

### Phase 1: Save Project 완성 (우선순위: 높음)
- [ ] API 클라이언트에 project update 메소드 추가
- [ ] project-store.ts의 saveProject 함수 실제 구현
- [ ] 에러 처리 및 재시도 로직 구현
- [ ] 저장 상태 UI 개선

### Phase 2: Advanced Settings 기능 구현 (우선순위: 중간)
- [ ] Grid 표시/숨김 기능 구현
- [ ] Auto-save 설정 구현
- [ ] 설정 상태 관리 시스템 구축
- [ ] 설정 저장 및 복원 기능

### Phase 3: Mode별 차별화 기능 (우선순위: 중간)
- [ ] Beginner mode UI 간소화
- [ ] Advanced mode 고급 기능 노출
- [ ] Mode별 기본값 설정
- [ ] 사용자 가이드 시스템

### Phase 4: 고급 저장 기능 (우선순위: 낮음)
- [ ] 자동 저장 구현
- [ ] 오프라인 지원
- [ ] 버전 히스토리
- [ ] 클라우드 동기화

---

## 📊 기술적 고려사항

### 1. 성능 최적화
- **Debounced Saving**: 연속된 변경사항을 묶어서 저장
- **Incremental Updates**: 변경된 부분만 전송
- **Compression**: 픽셀 데이터 압축으로 네트워크 사용량 감소

### 2. 데이터 무결성
- **Atomic Operations**: 저장 실패 시 롤백 메커니즘
- **Validation**: 클라이언트와 서버 양쪽에서 데이터 검증
- **Conflict Resolution**: 동시 편집 시 충돌 해결

### 3. 사용자 경험
- **Loading States**: 명확한 로딩 상태 표시
- **Error Recovery**: 사용자 친화적인 에러 메시지와 복구 옵션
- **Keyboard Shortcuts**: Ctrl+S 등 단축키 지원

---

## 📝 결론

**Advanced Mode**는 기본적인 토글 기능은 구현되어 있지만, 실제 모드별 차별화된 기능은 아직 구현되지 않았습니다. Advanced Settings 패널은 UI만 있고 실제 기능이 없는 상태입니다.

**Save Project**는 백엔드 API는 완전히 구현되어 있지만, 프론트엔드에서 실제 API 호출이 이루어지지 않고 있습니다. 이는 우선순위가 높은 구현 과제입니다.

두 기능 모두 사용자 경험에 중요한 영향을 미치므로, 단계적인 구현을 통해 점진적으로 완성해 나가는 것이 권장됩니다.