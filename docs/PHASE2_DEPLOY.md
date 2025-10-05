# Phase 2: video-generate Edge Function 배포 가이드

## 개요
Phase 2에서는 video-generate Edge Function을 배포합니다. 이 함수는:
1. 사용자 인증 확인
2. DB에 job 레코드 생성
3. Luma API 호출 (callback URL 포함)
4. job ID를 즉시 반환

## 배포 방법

### 방법 1: Supabase Dashboard 사용 (권장)

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/functions 접속

2. **새 Edge Function 생성**
   - 우측 상단 "Deploy a new function" 클릭
   - Function name: `video-generate`
   - Verify JWT: **체크** (사용자 인증 필요)

3. **코드 복사**
   - 로컬 파일 `supabase/functions/video-generate/index.ts` 내용 전체 복사
   - Dashboard의 코드 에디터에 붙여넣기

4. **배포**
   - "Deploy function" 버튼 클릭
   - 배포 완료 메시지 확인

### 방법 2: CLI 사용 (인증 문제 발생 시 방법 1 사용)

```bash
npx supabase functions deploy video-generate --project-ref fdiwnymnikylraofwhdu
```

## 배포 후 확인 사항

### 1. Function이 정상 배포되었는지 확인
Dashboard에서 Functions 목록에 `video-generate`가 표시되는지 확인

### 2. 환경 변수 확인
다음 secrets가 설정되어 있어야 합니다:
- `LUMA_API_KEY`: 이미 Phase 1 전에 설정됨
- `SUPABASE_URL`: 자동 설정됨
- `SUPABASE_SERVICE_ROLE_KEY`: 자동 설정됨

확인 방법:
1. Dashboard → Settings → Edge Functions → Secrets
2. `LUMA_API_KEY`가 있는지 확인

### 3. 테스트 요청 실행

다음 명령어로 테스트:

```bash
curl -X POST "https://fdiwnymnikylraofwhdu.supabase.co/functions/v1/video-generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkaXdueW1uaWt5bHJhb2Z3aGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjczNjI4OTcsImV4cCI6MjA0MjkzODg5N30.wWUi5xhI9_bZGJHVHSGZ7a7d73X5xAICQ7TXk2xrVlw" \
  -d '{
    "prompt": "a cute pixel art cat walking",
    "width": 64,
    "height": 64,
    "colorCount": 16,
    "fps": 24
  }'
```

**주의**: `YOUR_USER_JWT_TOKEN`은 실제 로그인한 사용자의 JWT 토큰으로 교체해야 합니다.

### 4. 예상 응답

성공 시:
```json
{
  "success": true,
  "data": {
    "jobId": "uuid-here",
    "status": "queued",
    "estimatedTimeSeconds": 120,
    "message": "Video generation started. Subscribe to job updates for progress."
  }
}
```

실패 시:
```json
{
  "success": false,
  "error": {
    "message": "에러 메시지",
    "code": "ERROR_CODE"
  }
}
```

### 5. 데이터베이스 확인

1. Supabase Dashboard → Table Editor → video_generation_jobs
2. 새로운 레코드가 생성되었는지 확인
3. 필드 확인:
   - `status`: "queued"
   - `luma_generation_id`: Luma API에서 받은 ID
   - `progress`: 10
   - `progress_message`: "Video generation queued at Luma..."

## 문제 해결

### 401 Unauthorized
- JWT 토큰이 올바른지 확인
- 로그인한 사용자의 토큰을 사용해야 함

### 503 Service Not Configured
- `LUMA_API_KEY`가 설정되어 있는지 확인
- Dashboard → Settings → Edge Functions → Secrets

### Job 생성 실패
- Database의 RLS 정책 확인
- video_generation_jobs 테이블이 존재하는지 확인

## 다음 단계

Phase 2가 완료되면:
- Phase 3: video-webhook Edge Function 구현
- Luma API callback을 받아서 처리하는 로직

## 파일 위치

- Edge Function: `supabase/functions/video-generate/index.ts`
- Config: `supabase/config.toml` (video-generate 함수 설정 추가됨)
