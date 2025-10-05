# 🎯 사용자 작업 필요: Video Generation 배포 완료하기

## 📋 현재 상태

### ✅ 완료된 작업
- Phase 1: Database migration 실행 완료
- Phase 2: video-generate Edge Function 배포 완료
- Phase 3: video-webhook Edge Function 구현 완료 (코드만, 배포 필요)
- Phase 4: Client Service Layer 업데이트 완료
- Phase 5: UI 통합 테스트 페이지 작성 완료
- 전체 문서화 완료

### ⏳ 사용자 작업 필요 (2단계)

아래 2개 작업만 완료하면 전체 시스템이 작동합니다!

---

## 🚀 작업 1: video-webhook Edge Function 배포

### Step 1.1: Supabase Dashboard 접속

https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/functions

### Step 1.2: 새 Function 생성

1. 우측 상단 **"Deploy a new function"** 클릭
2. 다음 내용 입력:
   - **Function name**: `video-webhook`
   - **Verify JWT**: ❌ **체크 해제** (중요! Luma webhook은 JWT 없이 호출됨)

### Step 1.3: 코드 복사

로컬 파일의 내용을 복사:
```
supabase/functions/video-webhook/index.ts
```

전체 내용을 Dashboard의 코드 에디터에 붙여넣기

### Step 1.4: 배포

**"Deploy function"** 버튼 클릭

### Step 1.5: 확인

Functions 목록에서 다음을 확인:
- ✅ video-webhook 함수가 "Active" 상태
- ✅ Verify JWT가 **OFF**로 표시됨

---

## 📡 작업 2: Realtime 활성화

### Step 2.1: Replication 페이지 접속

https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/database/replication

### Step 2.2: video_generation_jobs 테이블 찾기

페이지에서 `video_generation_jobs` 테이블을 찾습니다

### Step 2.3: Realtime 토글 ON

`video_generation_jobs` 테이블 옆의 **Realtime 토글을 ON**으로 변경

### Step 2.4: 이벤트 확인

다음 이벤트들이 활성화되어 있는지 확인:
- ✅ INSERT
- ✅ UPDATE
- ✅ DELETE (optional)

---

## ✅ 작업 완료 확인

위 2개 작업이 완료되었다면, 다음을 확인해주세요:

### 확인 1: Edge Functions

https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/functions

다음 3개 함수가 모두 Active인지:
- ✅ ai-generate
- ✅ video-generate (Verify JWT: ON)
- ✅ video-webhook (Verify JWT: OFF) ⬅️ **새로 추가됨**

### 확인 2: Realtime

https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/database/replication

- ✅ video_generation_jobs 테이블의 Realtime이 **ON**

### 확인 3: Secrets

https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/settings/vault/secrets

다음 secret이 존재하는지:
- ✅ LUMA_API_KEY

---

## 🧪 테스트

모든 작업이 완료되었다면 테스트를 진행합니다:

### 방법 1: 로컬 개발 서버에서 테스트

```bash
# 프로젝트 디렉토리에서
cd /Users/seinoh/Desktop/github/AI_pixel_art_editor

# 개발 서버 실행
npm run dev

# 브라우저에서 열기
open http://localhost:3000/test/video-full
```

### 방법 2: 테스트 절차

1. **로그인 확인**:
   - http://localhost:3000/auth/signin 에서 로그인

2. **테스트 페이지 접속**:
   - http://localhost:3000/test/video-full

3. **비디오 생성 시작**:
   - 프롬프트 입력 (예: "a cute pixel art cat walking in a garden")
   - 크기: 64x64
   - 색상: 16
   - FPS: 24
   - "Start Video Generation" 클릭

4. **예상 동작**:
   - ✅ **즉시** Job ID 반환 (1-2초 내)
   - ✅ Job 상태 표시: pending → queued
   - ✅ 진행률 바 업데이트
   - ✅ 1-3분 후: status → dreaming
   - ✅ 비디오 생성 완료: status → processing
   - ✅ 프레임 추출 시작 (클라이언트에서 자동)
   - ✅ 완료: 프레임들이 화면에 표시됨

5. **문제 발생 시**:
   - 브라우저 콘솔(F12) 확인
   - 에러 메시지 캡처
   - Supabase Edge Functions 로그 확인:
     ```bash
     npx supabase functions logs video-generate
     npx supabase functions logs video-webhook
     ```

### Expected Timeline

- **0초**: Job 생성 (즉시!)
- **0-10초**: Luma API 호출
- **10-180초**: Luma가 비디오 생성 (1-3분, status = dreaming)
- **180초**: Webhook 수신 (status = processing)
- **180-220초**: 클라이언트에서 프레임 추출
- **220초**: ✅ 완료!

---

## 🎉 성공 확인

테스트가 성공하면 다음이 표시됩니다:

1. ✅ Job ID (UUID 형식)
2. ✅ 실시간 상태 업데이트 (Realtime 동작 확인)
3. ✅ 진행률 바 증가
4. ✅ Luma Video URL 표시
5. ✅ 프레임 이미지들 (격자로 표시)
6. ✅ "Complete! Video successfully converted to N pixel art frames"

---

## 📚 추가 문서

더 자세한 정보는 다음 문서를 참고하세요:

- **전체 배포 가이드**: `docs/VIDEO_GENERATION_DEPLOYMENT_GUIDE.md`
- **아키텍처 설명**: `docs/video-generation-webhook-architecture.md`
- **Phase 2 가이드**: `docs/PHASE2_DEPLOY.md`

---

## ❓ 문제 해결

### Q: Job이 "pending"에서 멈춤
**A**: video-generate 함수 로그 확인:
```bash
npx supabase functions logs video-generate
```
LUMA_API_KEY 설정 확인

### Q: Job이 "dreaming"에서 멈춤
**A**: video-webhook 함수가 배포되지 않았거나, Luma가 webhook 호출 실패
- video-webhook 함수 배포 확인
- Webhook 로그 확인:
  ```bash
  npx supabase functions logs video-webhook
  ```

### Q: Realtime 업데이트가 안 옴
**A**: Realtime 활성화 확인
- Database → Replication에서 video_generation_jobs 확인
- 브라우저 콘솔에서 subscription 에러 확인

### Q: 401 Unauthorized
**A**: 로그인 상태 확인
- http://localhost:3000/auth/signin 에서 재로그인

---

## 📞 완료 보고

테스트가 성공적으로 완료되면:

**✅ 완료!** 라고 말씀해주세요.

문제가 발생하면:
- 스크린샷
- 에러 메시지
- 브라우저 콘솔 로그

를 공유해주세요.

---

## 🎯 요약

**해야 할 일 (2가지)**:
1. ✅ video-webhook Edge Function 배포
2. ✅ video_generation_jobs 테이블 Realtime 활성화

**예상 소요 시간**: 5분

**테스트 소요 시간**: 3-5분 (비디오 생성 대기 시간 포함)

모든 작업이 완료되면 사용자는 AI 비디오를 생성하고 자동으로 픽셀 아트 프레임으로 변환할 수 있습니다! 🎨🎬
