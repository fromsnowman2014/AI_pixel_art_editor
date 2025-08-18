# 향상된 디버그 로그 수집 가이드

## 🎯 목표
캔버스 그리기가 작동하지 않는 정확한 원인을 찾아내기

## 📋 단계별 진행

### 1단계: 브라우저 설정
1. **Chrome/Edge/Firefox** 사용 (Safari는 피하세요)
2. **시크릿/프라이빗 모드**로 열기 (캐시 문제 방지)
3. **https://ai-pixel-art-editor.vercel.app** 접속

### 2단계: 디버그 모드 활성화
1. **F12** 키를 눌러 개발자 도구 열기
2. **Console** 탭으로 이동
3. 다음 코드를 **정확히** 입력:
   ```javascript
   localStorage.setItem('pixelbuddy-debug', 'true');
   console.log('Debug mode enabled');
   ```
4. **Enter** 키 누르기
5. **페이지 새로고침** (F5 또는 Ctrl+R)

### 3단계: 초기 로딩 확인
새로고침 후 콘솔에서 다음과 같은 로그들이 나타나야 합니다:
```
🏪 ProjectStore [INIT_START]: Initializing app
🎨 PixelCanvas [COMPONENT_MOUNT]: PixelCanvas component mounted
🎨 PixelCanvas [PROPS_UPDATE]: PixelCanvas props updated
🎨 PixelCanvas [RENDER_START]: Canvas render effect triggered
```

### 4단계: 그리기 테스트
1. **Local Mode**로 시작
2. **검은색** 선택 (기본값이어야 함)
3. **Pencil 도구** 선택 (기본값이어야 함)
4. **캔버스 중앙 클릭** (드래그 말고 단순 클릭)

### 5단계: 로그 분석
클릭 후 다음과 같은 로그 시퀀스가 나타나야 합니다:

**정상적인 경우:**
```
🎨 PixelCanvas [MOUSE_DOWN]: Mouse down event triggered
🎨 PixelCanvas [DRAW_START]: Drawing at (x, y)
🎨 PixelCanvas [DRAW_COORDS]: Pixel coordinates
🎨 PixelCanvas [DRAW_BEFORE]: Pixel data before change
🎨 PixelCanvas [DRAW_PENCIL]: Applied pencil with color
🎨 PixelCanvas [DRAW_AFTER]: Pixel data after change
🎨 PixelCanvas [DRAW_UPDATE_START]: Calling updateCanvasData
🏪 ProjectStore [UPDATE_CANVAS_START]: Updating canvas data
🏪 ProjectStore [UPDATE_CANVAS_COMPLETE]: Canvas data updated successfully
🎨 PixelCanvas [PROPS_UPDATE]: PixelCanvas props updated
🎨 PixelCanvas [RENDER_START]: Canvas render effect triggered
🎨 PixelCanvas [RENDER_VERIFICATION]: Canvas content verification
```

## 🚨 중요한 체크포인트

### 체크포인트 1: 마우스 이벤트
- `MOUSE_DOWN` 로그가 나타나는가?
- **NO** → 마우스 이벤트 리스너 문제

### 체크포인트 2: 그리기 함수 호출
- `DRAW_START` 로그가 나타나는가?
- **NO** → 이벤트 핸들러에서 drawPixel 호출 실패

### 체크포인트 3: 상태 업데이트
- `UPDATE_CANVAS_COMPLETE` 로그가 나타나는가?
- **NO** → Zustand 스토어 업데이트 실패

### 체크포인트 4: 컴포넌트 리렌더링
- `UPDATE_CANVAS_COMPLETE` 후에 `PROPS_UPDATE`가 나타나는가?
- **NO** → React 리렌더링 실패

### 체크포인트 5: 캔버스 렌더링
- `RENDER_VERIFICATION: hasNonWhitePixels: true`가 나타나는가?
- **NO** → 캔버스 실제 렌더링 실패

## 📋 로그 수집 방법

1. **모든 로그를 복사**해서 텍스트 파일에 저장
2. **타임스탬프와 함께** 전체 시퀀스를 확인
3. **어느 단계에서 멈추는지** 정확히 파악

## 🔧 추가 디버그 정보

다음 코드도 콘솔에서 실행해보세요:
```javascript
// 현재 상태 확인
console.log('Current canvas elements:', document.querySelectorAll('canvas'));
console.log('Canvas visibility:', document.querySelector('canvas')?.offsetParent !== null);

// 수동 그리기 테스트
window.testManualDraw = function() {
    const canvas = document.querySelector('canvas.pixel-canvas');
    if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const event = new MouseEvent('mousedown', {
            clientX: rect.left + 50,
            clientY: rect.top + 50,
            bubbles: true
        });
        canvas.parentElement.dispatchEvent(event);
        
        setTimeout(() => {
            canvas.parentElement.dispatchEvent(new MouseEvent('mouseup', {
                clientX: rect.left + 50,
                clientY: rect.top + 50,
                bubbles: true
            }));
        }, 100);
    }
};
```

실행 후 `testManualDraw()`를 호출해서 수동으로 그리기를 테스트해보세요.