# Frame Animation Debugging Strategy

## 현재 문제 분석

### 관찰된 증상
- 몇 개의 frame만 바뀌고 지속적인 애니메이션 효과가 나오지 않음
- 일부 프레임은 전환되지만 순서대로 연속 전환되지 않음

### 로그 분석에서 발견된 핵심 문제들

#### 1. 🚨 **Revoked Proxy Error (가장 심각)**
```
⚠️ [ProjectStore] Failed to add history entry after frame switch: TypeError: Cannot perform 'get' on a proxy that has been revoked
```
- **원인**: Immer proxy가 이미 무효화된 상태에서 접근 시도
- **영향**: frame switch 후 history 추가가 실패하여 상태 불일치 발생
- **위치**: `project-store.ts:1806:73`

#### 2. 🔄 **Interval 실행 부족**
로그에서 다음이 보이지 않음:
- `🔧 [startSimpleAutoPlay] setInterval created with ID: X` - 한 번만 보임
- `⏭️ [AutoAdvance] Moving to next frame` - 반복적으로 보이지 않음

#### 3. 🛑 **중복된 Stop 호출**
```
🛑 [ProjectStore] stopPlayback called for tabId: tab-1755847603671 (두 번 연속)
```
- 불필요한 중복 정리 작업으로 인한 성능 저하

## 우선순위별 디버깅 전략

### Priority 1: Revoked Proxy Error 해결
**목표**: Immer proxy 무효화 문제 근본 해결

**Action Items**:
1. `project-store.ts:1803-1810` 라인의 `addHistoryEntry` 함수 검토
2. `setActiveFrame` 호출 시점에서 proxy 상태 확인
3. Immer draft 사용 패턴이 올바른지 검증
4. 비동기 작업 중 proxy 접근을 동기화

**예상 해결 방법**:
```typescript
// Before: 위험한 패턴
setTimeout(() => {
  // proxy가 이미 무효화될 수 있음
  draft.history.push(entry)
}, 0)

// After: 안전한 패턴  
const entry = prepareHistoryEntry()
draft.history.push(entry)
```

### Priority 2: Interval 지속 실행 보장
**목표**: setInterval이 500ms마다 확실히 실행되도록 함

**Action Items**:
1. `startSimpleAutoPlay`에서 interval 생성 즉시 테스트 실행
2. interval callback 내부 예외 처리 강화
3. frame switching 중 interval이 멈추지 않도록 보장

**디버깅 코드 추가**:
```typescript
intervalRef.current = setInterval(() => {
  console.log('⏰ [AutoAdvance] Interval executing at', Date.now())
  const framesBefore = frames.length
  const indexBefore = playbackFrameIndex
  
  try {
    handleNextFrame()
    console.log('✅ [AutoAdvance] Frame advanced', { 
      from: indexBefore, 
      to: playbackFrameIndex, 
      total: framesBefore 
    })
  } catch (error) {
    console.error('❌ [AutoAdvance] Critical error:', error)
    // interval을 계속 유지할지 중단할지 결정
  }
}, 500)
```

### Priority 3: Stop 호출 중복 제거
**목표**: 불필요한 리소스 사용 최소화

**Action Items**:
1. `handleStop` 함수에서 중복 호출 방지 로직 추가
2. stopPlayback 호출 전 상태 확인

## 테스트 계획

### Phase 1: Proxy Error 검증
1. Frame switching 없이 history entry만 추가해보기
2. Draft 생명주기 동안 모든 접근 로깅
3. setTimeout 사용 부분을 찾아 제거 또는 보완

### Phase 2: Animation 지속성 검증  
1. 5초간 실행하여 10번의 frame advance 발생 확인
2. 각 frame index가 순환하는지 확인 (0→1→2→...→9→0)
3. UI 업데이트가 실제로 반영되는지 확인

### Phase 3: 통합 테스트
1. Play → 정상 순환 → Stop 전체 플로우 검증
2. 다른 탭으로 전환 시에도 정상 동작 확인
3. 여러 번 play/stop 반복 시 메모리 누수 없음 확인

## 예상 코드 수정 지점

### 1. project-store.ts (Immer 패턴 수정)
```typescript
// setActiveFrame 함수 내 history 추가 부분
// 비동기 콜백에서 draft 접근 방지
```

### 2. frame-manager.tsx (Interval 안정성 향상)
```typescript
// startSimpleAutoPlay에 즉시 실행 테스트 추가
// interval callback 예외 처리 강화
// stop 중복 호출 방지
```

## 성공 기준
- ✅ 10개 프레임이 0→1→2→...→9→0 순서로 완전히 순환
- ✅ 5초 동안 최소 10회 frame advance 발생  
- ✅ Proxy revoked 에러 0건
- ✅ Play/Stop 5회 반복해도 메모리 누수 없음

## 다음 단계
Priority 1부터 순서대로 해결하되, 각 단계마다 로그 확인하여 개선 효과 검증 후 다음 단계로 진행.