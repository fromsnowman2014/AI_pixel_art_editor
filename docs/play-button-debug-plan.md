# Play Button 디버깅 계획서

## 🚨 문제 현황

### 증상
- Play 버튼 클릭 시 아무런 애니메이션 동작이 발생하지 않음
- 로그에서는 모든 초기화 과정이 성공적으로 완료된 것으로 표시됨
- "Cannot perform 'get' on a proxy that has been revoked" 에러 발생

### 현재 로그 분석
```
🎬 [FrameManager] handlePlayPause START
🎬 [PlaybackDebug] PLAY_BUTTON_CLICKED: {activeTabId: 'tab-1755930387513', framesLength: 10, isCurrentlyPlaying: false, ...}
✅ [FrameManager] PlaybackDebugger.log PLAY_BUTTON_CLICKED completed
🚀 [FrameManager] Starting enhanced auto-play
🚀 [startEnhancedAutoPlay] Function called 
✅ [startEnhancedAutoPlay] startPlayback called successfully
🎉 [FrameManager] handlePlayPause completed successfully
```

## 🔍 근본 원인 분석

### 1. **Proxy Revocation 문제**
- `Cannot perform 'get' on a proxy that has been revoked` - Zustand store의 프록시가 무효화됨
- 이는 store의 참조가 손상되었거나, unmount 과정에서 cleanup이 잘못되었을 가능성

### 2. **이중 재생 시스템 충돌**
현재 코드에서 두 가지 재생 시스템이 혼재:

#### A. FrameManager의 Simple Auto-Play (setInterval 기반)
- `startSimpleAutoPlay()` 함수
- `handleNextFrame()` 호출을 500ms 간격으로 반복
- `intervalRef.current` 사용

#### B. ProjectStore의 Frame Loop (requestAnimationFrame 기반)
- `startPlayback()` 함수 
- RAF 기반 정밀한 타이밍
- `tab.playbackIntervalId` 사용

### 3. **상태 동기화 문제**
- `isPlaying` 상태가 두 시스템 간에 일관되지 않음
- Simple Auto-Play가 ProjectStore의 frameLoop를 정지시키면서 RAF 기반 애니메이션이 중단됨

## 🎯 디버깅 전략

### Phase 1: 근본 원인 식별 (우선순위: 높음)
1. **Proxy Revocation 추적**
   - Zustand store 참조 무효화 지점 찾기
   - Component unmount 시 cleanup 과정 검토
   - Store getter 호출 위치별 안전성 확인

2. **시스템 충돌 검증**
   - Simple Auto-Play vs RAF frameLoop 동작 순서 추적
   - `stopPlayback()` 호출이 interval을 방해하는지 확인
   - 상태 업데이트 타이밍 분석

### Phase 2: 시스템 통합 또는 분리 (우선순위: 중간)
3. **단일 재생 시스템 결정**
   - **옵션 A**: RAF 기반 시스템만 사용 (더 정밀한 타이밍)
   - **옵션 B**: Simple interval 시스템만 사용 (더 단순한 구조)
   - **옵션 C**: 하이브리드 접근 (역할 분리)

4. **상태 관리 일원화**
   - 모든 재생 상태를 ProjectStore에서 관리
   - FrameManager는 UI와 이벤트 처리만 담당

### Phase 3: 안정성 강화 (우선순위: 낮음)
5. **Error Boundary 추가**
   - Proxy revocation 등 store 에러 포착
   - Fallback UI 제공

6. **Memory Leak 방지**
   - Component unmount시 완전한 cleanup
   - Interval/RAF ID 추적 및 정리

## 🛠️ 구체적 실행 계획

### Step 1: 문제 재현 및 로깅 강화
```javascript
// 추가할 디버깅 코드 예시
const debugProxy = () => {
  try {
    const state = useProjectStore.getState()
    console.log('✅ Proxy still valid:', !!state)
    return state
  } catch (error) {
    console.error('❌ Proxy revoked:', error)
    throw error
  }
}
```

### Step 2: 시스템 분석 및 분리
- `startSimpleAutoPlay` 함수 비활성화 후 테스트
- RAF 기반 시스템만으로 동작 확인
- 각 시스템의 독립적 동작 검증

### Step 3: 통합 솔루션 구현
가장 가능성 높은 해결책:
```javascript
// FrameManager에서는 UI 상태만 관리
const handlePlayPause = () => {
  // ProjectStore의 togglePlayback만 호출
  togglePlayback(activeTabId)
  // Simple Auto-Play 로직 제거
}

// ProjectStore에서 모든 애니메이션 로직 처리
startPlayback: (tabId) => {
  // 기존 RAF 기반 시스템 사용
  // 모든 프레임 전환 로직 포함
}
```

## 🎮 테스트 시나리오

### 기본 시나리오
1. 2개 이상의 프레임이 있는 프로젝트 생성
2. Play 버튼 클릭
3. 프레임 자동 전환 확인
4. Stop 버튼으로 정지 확인

### 엣지 케이스
1. 프레임 1개만 있을 때 Play 버튼 비활성화 확인
2. 재생 중 다른 탭으로 전환 시 정지 확인
3. 재생 중 프레임 추가/삭제 시 동작 확인
4. 빠른 Play/Stop 반복 클릭 시 안정성 확인

## 📋 체크리스트

- [ ] Proxy revocation 원인 파악
- [ ] Simple Auto-Play vs RAF 시스템 충돌 확인
- [ ] 단일 재생 시스템 선택 및 구현
- [ ] 상태 동기화 문제 해결
- [ ] Error handling 강화
- [ ] Memory leak 방지 코드 추가
- [ ] 전체 시나리오 테스트 완료

## 🚦 성공 기준
- Play 버튼 클릭 시 즉시 애니메이션 시작
- 프레임이 설정된 간격으로 자동 전환
- Stop/Pause 즉시 반응
- Console 에러 없이 안정적 동작
- 메모리 누수 없는 정상적인 cleanup

---

**작성 시간**: 2025-08-26  
**우선순위**: Critical  
**예상 해결 시간**: 2-4시간