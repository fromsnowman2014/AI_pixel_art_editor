# Video Generation Feature - Complete Deployment Guide

## 📋 Overview

이 문서는 Webhook 기반 비동기 비디오 생성 기능의 전체 배포 가이드입니다.

### Architecture Summary

```
User → video-generate → DB Job → Luma API (with webhook)
                ↓
        Realtime Subscribe
                ↓
Luma → video-webhook → DB Update → Realtime Notify
                ↓
        Client receives update → Download video → Extract frames
```

## ✅ Implementation Status

### Phase 1: Database ✅ COMPLETED
- Migration file created and executed
- `video_generation_jobs` table created
- RLS policies configured
- Indexes and triggers set up

### Phase 2: video-generate Edge Function ✅ COMPLETED
- Edge Function implemented
- JWT authentication configured
- Luma API integration with callback URL
- Immediate job ID return

### Phase 3: video-webhook Edge Function ✅ COMPLETED
- Webhook endpoint created
- Job status updates handling
- Video URL storage
- Error handling

### Phase 4: Client Service Layer ✅ COMPLETED
- `supabaseAI.generateVideo()` updated to async
- `supabaseAI.subscribeToVideoJob()` added
- `supabaseAI.getVideoJob()` added
- Realtime subscription support

### Phase 5: UI Integration ✅ COMPLETED
- Complete test page created
- Real-time progress display
- Frame extraction integration
- Error handling UI

## 🚀 Deployment Steps

### Step 1: Deploy video-webhook Edge Function

**방법 1: Supabase Dashboard (권장)**

1. https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/functions 접속
2. "Deploy a new function" 클릭
3. Function name: `video-webhook`
4. Verify JWT: **체크 해제** (Luma webhook은 JWT 없음)
5. 로컬 파일 `supabase/functions/video-webhook/index.ts` 내용 전체 복사
6. Dashboard 에디터에 붙여넣기
7. "Deploy function" 클릭

**방법 2: CLI (인증 문제 발생 시 방법 1 사용)**

```bash
npx supabase functions deploy video-webhook --project-ref fdiwnymnikylraofwhdu
```

### Step 2: Enable Realtime for video_generation_jobs Table

1. Supabase Dashboard → Database → Replication 접속
2. `video_generation_jobs` 테이블 찾기
3. Realtime 토글을 **ON**으로 변경
4. INSERT, UPDATE 이벤트 모두 활성화

### Step 3: Verify Deployment

#### 3.1 Edge Functions 확인

Dashboard → Edge Functions에서 다음 함수들이 모두 Active 상태인지 확인:
- ✅ video-generate (Verify JWT: ON)
- ✅ video-webhook (Verify JWT: OFF)

#### 3.2 Secrets 확인

Dashboard → Settings → Edge Functions → Secrets에서:
- ✅ LUMA_API_KEY 설정됨
- ✅ SUPABASE_URL 자동 설정됨
- ✅ SUPABASE_SERVICE_ROLE_KEY 자동 설정됨

#### 3.3 Database 확인

Dashboard → Table Editor → video_generation_jobs:
- ✅ 테이블 존재
- ✅ Realtime 활성화됨
- ✅ RLS policies 3개 존재

### Step 4: Test the Complete Flow

#### 4.1 로컬 개발 서버 실행

```bash
npm run dev
```

#### 4.2 테스트 페이지 접속

브라우저에서 열기:
```
http://localhost:3000/test/video-full
```

#### 4.3 로그인 확인

테스트 전에 로그인되어 있어야 합니다:
```
http://localhost:3000/auth/signin
```

#### 4.4 테스트 실행

1. 프롬프트 입력 (예: "a cute pixel art cat walking")
2. 크기, 색상, FPS 설정
3. "Start Video Generation" 버튼 클릭
4. **즉시 Job ID 반환되는지 확인** (중요!)
5. Job 상태가 실시간으로 업데이트되는지 확인:
   - pending → queued → dreaming → processing → completed
6. 진행률 바가 업데이트되는지 확인
7. 1-3분 후 비디오 처리 시작되는지 확인
8. 프레임 추출 완료되는지 확인

#### 4.5 Expected Timeline

- **0초**: Job 생성 (즉시 반환)
- **1-10초**: Luma API 호출, status → queued
- **10-180초**: Luma 비디오 생성 (status → dreaming)
- **180-190초**: Webhook 수신, status → processing
- **190-220초**: 클라이언트에서 프레임 추출
- **220초**: 완료! (총 ~3-4분)

### Step 5: Verify in Production

#### 5.1 Vercel 환경 변수 확인

Vercel Dashboard에서 다음 변수들이 설정되어 있는지 확인:
- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY

#### 5.2 Production 배포

```bash
git add .
git commit -m "Add webhook-based async video generation"
git push origin main
```

Vercel이 자동으로 배포합니다.

#### 5.3 Production 테스트

```
https://ai-pixel-art-editor.vercel.app/test/video-full
```

같은 테스트 진행.

## 🔍 Troubleshooting

### Issue: Job 생성 실패 (401 Unauthorized)

**원인**: JWT 토큰 문제
**해결**:
1. 로그인 상태 확인
2. 로컬 스토리지에 auth token 있는지 확인
3. 재로그인

### Issue: Job이 "pending"에서 진행 안 됨

**원인**: video-generate 함수가 Luma API 호출에 실패
**해결**:
1. Edge Function 로그 확인:
   ```bash
   npx supabase functions logs video-generate
   ```
2. LUMA_API_KEY 설정 확인
3. Luma API 계정 크레딧 확인

### Issue: Job이 "dreaming"에서 멈춤

**원인**: Luma webhook이 실행 안 됨
**해결**:
1. video-webhook 함수 배포 확인
2. Webhook URL이 올바른지 확인:
   ```
   https://fdiwnymnikylraofwhdu.supabase.co/functions/v1/video-webhook?job_id=<JOB_ID>
   ```
3. Webhook 로그 확인:
   ```bash
   npx supabase functions logs video-webhook
   ```

### Issue: Realtime 업데이트 안 옴

**원인**: Realtime 활성화 안 됨
**해결**:
1. Database → Replication에서 video_generation_jobs Realtime 활성화
2. RLS policy 확인 (Users can view own video jobs)
3. 브라우저 콘솔에서 subscription 에러 확인

### Issue: Video 다운로드 실패 (CORS)

**원인**: Luma video URL CORS 제한
**해결**:
1. Luma 비디오는 공개 URL이므로 CORS 문제 없어야 함
2. 브라우저 Network 탭에서 실제 요청 확인
3. Video URL이 유효한지 직접 브라우저에서 열어보기

### Issue: Frame 추출 실패

**원인**: FastVideoProcessor 에러
**해결**:
1. 브라우저 콘솔 로그 확인
2. Video 형식이 지원되는지 확인 (Luma는 MP4 반환)
3. 메모리 부족 가능성 (큰 비디오의 경우)

## 📊 Monitoring

### Dashboard 링크

1. **Supabase Dashboard**:
   - Edge Functions: https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/functions
   - Database: https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/editor
   - Logs: https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/logs

2. **Vercel Dashboard**:
   - Deployments: https://vercel.com/seinoh/ai-pixel-art-editor
   - Analytics: https://vercel.com/seinoh/ai-pixel-art-editor/analytics

### Key Metrics to Monitor

- Job creation rate (video_generation_jobs 테이블)
- Job success rate (status = 'completed' / total jobs)
- Average processing time (processing_time_ms)
- Edge Function errors (Supabase Logs)
- Webhook delivery rate (video-webhook logs)

## 📝 API Reference

### 1. Start Video Generation

**Endpoint**: `POST /functions/v1/video-generate`

**Headers**:
```
Authorization: Bearer <USER_JWT_TOKEN>
apikey: <SUPABASE_ANON_KEY>
Content-Type: application/json
```

**Request Body**:
```json
{
  "prompt": "a cute pixel art cat walking",
  "width": 64,
  "height": 64,
  "colorCount": 16,
  "fps": 24,
  "projectId": "optional-uuid"
}
```

**Response** (즉시 반환):
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

### 2. Subscribe to Job Updates (Client-side)

```typescript
import { supabaseAI } from '@/lib/services/supabase-ai';

const unsubscribe = supabaseAI.subscribeToVideoJob(
  jobId,
  (job) => {
    console.log('Job updated:', job.status, job.progress);

    // When video is ready
    if (job.status === 'processing' && job.luma_video_url) {
      // Download and process video
      processVideo(job.luma_video_url);
    }
  },
  (error) => {
    console.error('Subscription error:', error);
  }
);

// Cleanup
useEffect(() => {
  return () => unsubscribe();
}, []);
```

### 3. Get Job Status (One-time)

```typescript
const job = await supabaseAI.getVideoJob(jobId);
console.log(job.status, job.progress);
```

## 🎯 Next Steps (Future Enhancements)

### Priority 1: Production Features
- [ ] Job queue management (rate limiting)
- [ ] User quota system (prevent abuse)
- [ ] Job expiration (auto-delete old jobs)
- [ ] Retry failed jobs

### Priority 2: UX Improvements
- [ ] Add to existing Video Generation Modal
- [ ] Progress notifications
- [ ] Background processing indicator
- [ ] Job history view

### Priority 3: Performance
- [ ] Optimize frame extraction
- [ ] Cache processed videos
- [ ] Parallel frame processing
- [ ] WebAssembly for faster quantization

### Priority 4: Monitoring
- [ ] Sentry error tracking
- [ ] Analytics events
- [ ] Cost monitoring (Luma API usage)
- [ ] Performance metrics dashboard

## 📄 File Locations

### Backend (Supabase)
- `supabase/migrations/20251005095952_create_video_jobs_table.sql` - DB schema
- `supabase/functions/video-generate/index.ts` - Job creation endpoint
- `supabase/functions/video-webhook/index.ts` - Luma callback handler
- `supabase/config.toml` - Edge Functions config

### Frontend
- `lib/services/supabase-ai.ts` - Video generation service
- `app/test/video-full/page.tsx` - Complete integration test page
- `app/test/video-generate/page.tsx` - video-generate API test page

### Documentation
- `docs/video-generation-webhook-architecture.md` - Architecture details
- `docs/VIDEO_GENERATION_DEPLOYMENT_GUIDE.md` - This file
- `docs/PHASE2_DEPLOY.md` - Phase 2 deployment instructions

## ✨ Success Criteria

완료 체크리스트:

- [x] Database migration deployed
- [x] video-generate Edge Function deployed
- [ ] video-webhook Edge Function deployed ⬅️ **사용자 작업 필요**
- [ ] Realtime enabled for video_generation_jobs ⬅️ **사용자 작업 필요**
- [ ] Local test successful
- [ ] Production test successful

## 🎉 Conclusion

이 시스템은 다음과 같은 이점을 제공합니다:

1. **No Timeouts**: Edge Functions은 즉시 반환, 타임아웃 없음
2. **Real-time Updates**: Supabase Realtime으로 진행 상황 실시간 추적
3. **Scalable**: Webhook 기반이라 동시 요청 처리 가능
4. **Reusable**: 기존 FastVideoProcessor 인프라 재사용
5. **User-friendly**: 진행률 표시와 에러 핸들링

모든 단계가 완료되면 사용자는:
- 프롬프트 입력만으로 비디오 생성 가능
- 실시간으로 진행 상황 확인
- 자동으로 픽셀 아트 프레임 추출
- 프로젝트에 바로 추가 가능
