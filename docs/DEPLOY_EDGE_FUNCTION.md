# Edge Function 배포 가이드

## 🚀 video-generate Edge Function 수동 배포

Supabase CLI 링크에 인증 문제가 있는 경우, Supabase Dashboard를 통해 수동으로 배포할 수 있습니다.

---

## 방법 1: Supabase Dashboard (권장)

### Step 1: Edge Functions 페이지 열기

```bash
open https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/functions
```

### Step 2: video-generate Function 선택

1. Functions 목록에서 **video-generate** 클릭
2. 우측 상단의 **"Edit function"** 버튼 클릭

### Step 3: 코드 업데이트

다음 파일의 전체 내용을 복사:

```
/Users/seinoh/Desktop/github/AI_pixel_art_editor/supabase/functions/video-generate/index.ts
```

Dashboard 에디터에 붙여넣기 후 **"Deploy"** 버튼 클릭

### Step 4: 배포 확인

1. **"Logs"** 탭에서 배포 성공 확인
2. 테스트 요청 전송:

```bash
curl -X POST https://fdiwnymnikylraofwhdu.supabase.co/functions/v1/video-generate \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"prompt": "test", "width": 32, "height": 32, "colorCount": 16}'
```

---

## 방법 2: Supabase CLI (로컬 환경)

### Step 1: 환경 변수 확인

먼저 Supabase 액세스 토큰이 필요합니다:

1. **액세스 토큰 생성**:
   ```bash
   open https://supabase.com/dashboard/account/tokens
   ```

2. **"Generate new token"** 클릭
3. Token name: `cli-deploy`
4. 생성된 토큰을 복사

### Step 2: 환경 변수 설정

```bash
# 토큰을 환경 변수로 설정
export SUPABASE_ACCESS_TOKEN="your-access-token-here"

# 확인
echo $SUPABASE_ACCESS_TOKEN
```

### Step 3: 프로젝트 링크

```bash
npx supabase link --project-ref fdiwnymnikylraofwhdu
```

### Step 4: Edge Function 배포

```bash
npx supabase functions deploy video-generate
```

### Step 5: 배포 확인

```bash
# 로그 확인
npx supabase functions logs video-generate --tail

# 또는 Dashboard에서 확인
open https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/functions/video-generate/logs
```

---

## 방법 3: GitHub Actions (자동 배포)

### Step 1: GitHub Secrets 설정

GitHub 저장소 설정에서 다음 secrets 추가:

1. `SUPABASE_ACCESS_TOKEN`: Supabase 액세스 토큰
2. `SUPABASE_PROJECT_REF`: `fdiwnymnikylraofwhdu`

### Step 2: Workflow 파일 생성

`.github/workflows/deploy-edge-functions.yml`:

```yaml
name: Deploy Edge Functions

on:
  push:
    branches:
      - main
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Deploy video-generate function
        run: |
          npx supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          npx supabase functions deploy video-generate
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

## 🔍 배포 검증

### 1. Function이 배포되었는지 확인

```bash
# Dashboard에서 확인
open https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/functions/video-generate

# 또는 CLI
npx supabase functions list
```

### 2. 로그 확인

```bash
# Real-time logs
npx supabase functions logs video-generate --tail

# 또는 Dashboard
open https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/functions/video-generate/logs
```

### 3. 테스트 요청

프론트엔드에서 비디오 생성을 다시 시도하고, 개선된 에러 메시지가 표시되는지 확인:

**이전 에러**:
```
❌ invalid input syntax for type uuid: "tab-1759902384467"
```

**개선된 에러** (마이그레이션 전):
```
❌ Database schema error: project_id column needs to be TEXT type instead of UUID.
Please run the migration: 20250118000000_fix_video_jobs_project_id_type.sql
```

**성공** (마이그레이션 후):
```
✅ Video job created: <job-id>
⏱️  Estimated completion: 120s
```

---

## 🎯 변경 사항 요약

### 개선된 코드 위치

[supabase/functions/video-generate/index.ts:211-255](../supabase/functions/video-generate/index.ts#L211-L255)

### 주요 변경사항

1. **상세 로깅 추가**:
   ```typescript
   console.log(`💾 [${requestId}] Inserting job record:`, {
     user_id: authenticatedUserId,
     project_id: projectId || null,
     // ...
   });
   ```

2. **UUID 에러 감지**:
   ```typescript
   const isUuidError = jobError?.message?.includes('uuid') ||
                      jobError?.message?.includes('UUID');
   ```

3. **명확한 에러 메시지**:
   ```typescript
   if (isUuidError) {
     return {
       error: {
         message: 'Database schema error: project_id needs to be TEXT type',
         code: 'SCHEMA_ERROR',
         details: {
           migration: '20250118000000_fix_video_jobs_project_id_type.sql'
         }
       }
     };
   }
   ```

---

## 🚨 트러블슈팅

### 문제: "Unauthorized" 에러

**해결책**: Supabase 액세스 토큰 생성 및 설정

```bash
# 1. 토큰 생성 페이지 열기
open https://supabase.com/dashboard/account/tokens

# 2. 환경 변수 설정
export SUPABASE_ACCESS_TOKEN="sbp_..."

# 3. 다시 링크 시도
npx supabase link --project-ref fdiwnymnikylraofwhdu
```

### 문제: "Cannot find project ref"

**해결책**: 명시적으로 project-ref 지정

```bash
npx supabase functions deploy video-generate --project-ref fdiwnymnikylraofwhdu
```

### 문제: Function이 업데이트되지 않음

**해결책**: 캐시 클리어 후 재배포

```bash
# 1. Function 삭제 (Dashboard에서)
open https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/functions

# 2. 재배포
npx supabase functions deploy video-generate --no-verify-jwt
```

---

## ✅ 다음 단계

1. **Edge Function 배포** (이 가이드 사용)
2. **데이터베이스 마이그레이션 적용** ([VIDEO_GENERATION_FIX.md](./VIDEO_GENERATION_FIX.md) 참조)
3. **앱에서 테스트**:
   - 브라우저 캐시 클리어
   - 비디오 생성 모달 열기
   - 프롬프트 입력 후 생성
   - ✅ 정상 작동 확인!

---

## 📚 관련 문서

- [VIDEO_GENERATION_FIX.md](./VIDEO_GENERATION_FIX.md) - 전체 버그 수정 가이드
- [Migration File](../supabase/migrations/20250118000000_fix_video_jobs_project_id_type.sql)
- [Updated Edge Function](../supabase/functions/video-generate/index.ts)

Happy deploying! 🚀
