# Import Media Modal - 간결화 계획

## 🎯 Ultra-Minimal Goal
**이모지 + 한단어** 라벨과 **hover tooltip 설명**으로 세상에서 가장 간결하고 직관적인 import 경험 창조

## 📊 현재 복잡성 문제
- 버튼에 긴 설명들이 붙어있음 ("Auto Colors (8 colors)")
- 기술정보가 UI에 직접 노출 ("72×128", "Pixel Sunset")  
- 한 화면에 텍스트가 너무 많음
- 사용자가 핵심 선택사항을 빠르게 파악하기 어려움

## 🔥 간결화 전략

### **Step 1: 미니멀 메인 UI**
```
📁 [Drop files here]

Colors:  ● 🤖 Auto    ○ 🎨 Project ⭐   ○ ✏️ Custom
         [■■■■■■■■] [■■■■■■]      [■■■■■■]

Size:    ● ⚡ Smart ⭐  ○ 📐 Original   ○ 🔲 Fill

                    [Import]
```

### **Step 2: 스마트 툴팁 시스템**

**팔레트 hover tooltips:**
- `🤖 Auto` → "AI가 이미지에서 8가지 색상 자동 추출"
- `🎨 Project ⭐` → "현재 프로젝트: Pixel Sunset (6색상) - 추천!"
- `✏️ Custom` → "나만의 색상 팔레트 직접 선택"

**크기조절 hover tooltips:**  
- `⚡ Smart ⭐` → "품질 유지하며 캔버스에 완벽 맞춤 - 추천!"
- `📐 Original` → "원본 크기 유지 (72×64px)"
- `🔲 Fill` → "캔버스 전체 채움 (일부 잘릴 수 있음)"

### **극도 간결화 원칙:**
1. **라벨**: 이모지 + 핵심단어 1개만
2. **설명**: 100% hover tooltip으로만  
3. **시각정보**: 색상 스와치만 바로 표시
4. **공간**: 수직공간 최소화, 한눈에 모든 옵션 파악
5. **직관성**: 언어 무관한 이모지 우선

## 🎨 Before/After 비교

### **Before (복잡함):**
```
🎨 Choose Colors:
   ● Auto Colors (8)    [■■■■■■■■] Generate from image
   ○ Project Colors (6) [■■■■■■] ⭐ "Pixel Sunset"  
   ○ Custom Colors ▼    [Choose colors...]

📐 Resize Image:
   ● Smart Resize ⭐    Fits perfectly, keeps quality
   ○ Keep Original      Use exact size (72×64)
   ○ Fill Canvas        Stretch to fill (128×128)
```

### **After (간결함):**
```
Colors:  ● 🤖 Auto    ○ 🎨 Project ⭐   ○ ✏️ Custom
         [■■■■■■■■] [■■■■■■]      [■■■■■■]

Size:    ● ⚡ Smart ⭐  ○ 📐 Original   ○ 🔲 Fill
```

## 🛠 기술적 구현

### **Tooltip-First 컴포넌트:**
```tsx
<MinimalOption 
  emoji="🤖" 
  label="Auto"
  tooltip="AI가 이미지에서 8가지 색상 자동 추출"
  colorPreview={autoColors}
  recommended={false}
/>

<MinimalOption 
  emoji="🎨" 
  label="Project"
  tooltip={`현재 프로젝트: ${project?.name} (${project?.palette.length}색상) - 추천!`}
  colorPreview={project?.palette}
  recommended={project?.palette?.length >= 3}
/>
```

### **Hover 인터랙션 패턴:**
- **즉시 tooltip**: hover 0.2초 후 표시
- **Rich tooltip**: 색상 개수, 프로젝트명, 권장사유 포함  
- **Visual feedback**: hover시 옵션 하이라이트
- **키보드 지원**: Tab으로 이동시에도 tooltip 표시

### **Ultra-Clean Layout System:**
- **Grid 레이아웃**: 팔레트 3개가 한 줄로 나열
- **컴팩트 spacing**: 옵션간 최소 간격
- **색상 프리뷰**: 각 옵션 바로 아래 한 줄로  
- **단일 CTA**: Import 버튼 하나만 눈에 띄게

### **파일 수정사항:**
1. **`components/frame-import-options-modal.tsx`**:
   - Quick Presets 완전 제거
   - MinimalOption 컴포넌트로 교체
   - 모든 설명 텍스트를 tooltip으로 이동
   - Grid 레이아웃으로 수직 공간 최소화

2. **새로운 컴포넌트:**
   - `MinimalOption`: 이모지 + 라벨 + tooltip 시스템
   - `ColorPreview`: 간결한 색상 스와치 표시  
   - `SmartTooltip`: Rich content tooltip with delay

### **스마트 디폴트 로직:**
- **프로젝트 팔레트 3색 이상**: 🎨 Project ⭐ 자동 선택
- **프로젝트 팔레트 없음**: 🤖 Auto 자동 선택
- **크기**: ⚡ Smart ⭐ 항상 디폴트
- **액션**: Add frames (더 안전함)

## ✅ 간결성 성공지표

- **라벨 길이**: 이모지 + 5글자 이하로 제한
- **tooltip 의존도**: 모든 설명 100% hover로만
- **인지부하**: 3초 안에 모든 옵션 파악 가능
- **클릭수**: 99% 사용자가 2클릭으로 완료
- **화면 공간**: 현재 대비 60% 수직공간 절약
- **직관성**: 텍스트 없이도 이모지로 의미 파악 가능

## 📋 구현 단계

### **Phase 1: UI 간결화 (30분)**
- 모든 긴 라벨을 이모지 + 한단어로 교체
- MinimalOption 컴포넌트 구현
- 모든 설명을 tooltip으로 이동
- Grid 레이아웃으로 수직공간 압축

### **Phase 2: 스마트 툴팁 시스템 (20분)**
- Rich tooltip 컴포넌트 구현 (프로젝트명, 색상개수, 권장사유)
- Hover delay 및 키보드 접근성 구현
- 동적 tooltip 내용 (현재 프로젝트 정보 반영)

### **Phase 3: 검증 및 완성도 (10분)**
- 모든 기능이 tooltip으로 정상 작동하는지 확인
- 이모지가 직관적으로 이해되는지 검증
- 2클릭 완료 플로우 테스트

## 🎯 핵심 개선사항

1. **텍스트 90% 제거**: 라벨에서 설명 완전 분리
2. **이모지 직관성**: 🤖=자동, 🎨=프로젝트, ✏️=커스텀  
3. **hover 리치 정보**: tooltip에 모든 세부정보 집중
4. **시각적 깔끔함**: 색상 스와치만 바로 표시
5. **공간 효율성**: 수직 스크롤 없이 한 화면에 모든 옵션
6. **즉시 이해**: 언어 장벽 없는 글로벌 UI

이 간결화로 **세상에서 가장 직관적인 미디어 import 모달**을 만들어 사용자가 생각할 필요 없이 바로 원하는 옵션을 선택할 수 있게 합니다.