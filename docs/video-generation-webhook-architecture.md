# Video Generation Webhook Architecture - Implementation Plan

> **작성일**: 2025-10-05
> **버전**: v3.0 - Webhook-based Async Architecture
> **이전 버전 문제**: Luma API 비동기 처리 (1-3분 소요) vs Supabase Edge Function 타임아웃 (150초)

---

## Chain of Thought: 문제 분석 및 해결 방안

### 🔴 현재 문제점

1. **타임아웃 이슈**
   ```
   Luma API 비디오 생성: 1-3분 소요 (평균 90-120초)
   Supabase Edge Functions: 최대 150초 타임아웃
   → 동기 방식으로는 타임아웃 발생 (실제 테스트에서 확인됨)
   ```

2. **사용자 경험 문제**
   ```
   현재: 사용자가 1-3분간 화면에서 대기 (차단됨)
   문제: 브라우저 탭 전환 시 연결 끊김 위험
   문제: 네트워크 불안정 시 전체 작업 실패
   ```

3. **비용 효율성**
   ```
   실패 시: Luma API 비용 청구되지만 사용자는 결과물 못받음
   재시도: 전체 프로세스 다시 실행 (중복 비용)
   ```

### ✅ Webhook 방식의 장점

1. **타임아웃 해결**
   ```
   Edge Function 즉시 반환 (< 1초)
   Luma가 완료 시 Webhook으로 알림
   → 타임아웃 문제 완전 해결
   ```

2. **사용자 경험 개선**
   ```
   즉시 응답: "비디오 생성 중입니다" (Job ID 반환)
   백그라운드: 사용자는 다른 작업 가능
   알림: 완료 시 토스트 메시지 + 자동 로딩
   ```

3. **안정성 향상**
   ```
   네트워크 불안정: Webhook은 재시도 메커니즘 내장 (3회, 100ms 간격)
   실패 추적: DB에 상태 저장으로 실패 원인 분석 가능
   복구 가능: 실패한 작업 재개 가능
   ```

---

## 아키텍처 개요

### 전체 플로우

```
┌─────────────┐
│   사용자    │ 1. "Generate Animation" 클릭
│   브라우저  │
└──────┬──────┘
       │
       ▼ 2. POST /functions/v1/video-generate (prompt, width, height, colorCount, fps)
┌─────────────────────────────────┐
│  Edge Function: video-generate  │
│  (즉시 반환 < 1초)              │
└────────┬────────────────────────┘
         │
         ├─ 3. DB에 job 생성 (status: 'pending')
         │  → video_generation_jobs 테이블
         │
         ├─ 4. Luma API 호출 (callback_url 포함)
         │  POST https://api.lumalabs.ai/dream-machine/v1/generations
         │  {
         │    prompt: "...",
         │    duration: "5s",
         │    callback_url: "https://.../functions/v1/video-webhook?jobId=xxx"
         │  }
         │
         └─ 5. 즉시 응답 반환
            { jobId: "uuid", status: "pending", estimatedTime: 90 }

사용자: 다른 작업 진행 가능 ✅

        (1-3분 경과)

┌─────────────────────────────────┐
│        Luma API                 │ 6. 비디오 생성 완료
│   (비동기 처리 완료)            │
└────────┬────────────────────────┘
         │
         ▼ 7. POST /functions/v1/video-webhook?jobId=xxx
┌─────────────────────────────────┐
│  Edge Function: video-webhook   │
│  (Luma가 호출)                  │
└────────┬────────────────────────┘
         │
         ├─ 8. DB 업데이트 (status: 'processing')
         │
         ├─ 9. 비디오 URL 다운로드
         │  → FastVideoProcessor.processVideoFast()
         │  → MediaImporter.pixelateImage() (자동 픽셀화)
         │
         ├─ 10. 프레임 데이터 생성
         │   → frames: Array<{ imageData, delayMs }>
         │
         ├─ 11. Supabase Storage에 저장 (선택적)
         │   → 각 프레임을 PNG로 저장
         │
         └─ 12. DB 업데이트 (status: 'completed', frames: [...])

         ▼ 13. 클라이언트 폴링/실시간 구독으로 감지
┌─────────────┐
│   사용자    │ 14. 완료 토스트 + 자동 프레임 로딩
│   브라우저  │
└─────────────┘
```

---

## 데이터베이스 스키마

### 새 테이블: `video_generation_jobs`

```sql
CREATE TABLE video_generation_jobs (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 사용자 정보
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NULL, -- 연결된 프로젝트 (선택적)

  -- 요청 파라미터
  prompt TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  color_count INTEGER NOT NULL,
  fps INTEGER NOT NULL CHECK (fps IN (12, 24, 30)),
  duration NUMERIC NOT NULL DEFAULT 5.0,

  -- Luma API 관련
  luma_generation_id TEXT NULL, -- Luma가 반환한 generation ID
  luma_video_url TEXT NULL, -- 완성된 비디오 URL

  -- 상태 관리
  status TEXT NOT NULL CHECK (status IN (
    'pending',      -- 생성 요청 전송됨
    'queued',       -- Luma API에서 대기 중
    'dreaming',     -- Luma API에서 생성 중
    'processing',   -- 비디오 다운로드 & 프레임 추출 중
    'completed',    -- 완료 (프레임 준비됨)
    'failed'        -- 실패
  )) DEFAULT 'pending',

  -- 진행 상황
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  progress_message TEXT NULL,

  -- 오류 정보
  error_code TEXT NULL,
  error_message TEXT NULL,
  error_details JSONB NULL,

  -- 결과 데이터
  total_frames INTEGER NULL,
  frame_storage_urls TEXT[] NULL, -- Supabase Storage URLs (선택적)
  frame_data JSONB NULL, -- 임베디드 프레임 데이터 (작은 경우)

  -- 메타데이터
  processing_time_ms INTEGER NULL, -- 총 처리 시간
  luma_processing_time_ms INTEGER NULL, -- Luma API 소요 시간
  frame_processing_time_ms INTEGER NULL, -- 프레임 추출 소요 시간

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);

-- 인덱스
CREATE INDEX idx_video_jobs_user_id ON video_generation_jobs(user_id);
CREATE INDEX idx_video_jobs_status ON video_generation_jobs(status);
CREATE INDEX idx_video_jobs_luma_id ON video_generation_jobs(luma_generation_id);
CREATE INDEX idx_video_jobs_created ON video_generation_jobs(created_at DESC);

-- RLS 정책
ALTER TABLE video_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own video jobs"
  ON video_generation_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own video jobs"
  ON video_generation_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can update (for webhooks)
CREATE POLICY "Service role can update video jobs"
  ON video_generation_jobs
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Updated at trigger
CREATE TRIGGER update_video_jobs_updated_at
  BEFORE UPDATE ON video_generation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Edge Functions 구조

### 1. `video-generate` (새로 생성)

**목적**: 비디오 생성 요청 접수 및 Luma API 호출 시작

**파일**: `supabase/functions/video-generate/index.ts`

**플로우**:
```typescript
1. 요청 검증 (prompt, width, height, colorCount, fps)
2. DB에 job 생성 (status: 'pending')
3. Luma API 호출 (callback_url 포함)
   - callback_url: https://<supabase-url>/functions/v1/video-webhook?jobId=xxx
4. DB 업데이트 (status: 'queued', luma_generation_id 저장)
5. 즉시 응답 반환
   {
     jobId: "uuid",
     status: "queued",
     estimatedTimeSeconds: 90
   }
```

**핵심 코드 구조**:
```typescript
interface VideoGenerateRequest {
  prompt: string;
  width: number;
  height: number;
  colorCount: number;
  fps: 12 | 24 | 30;
}

Deno.serve(async (req) => {
  // 1. 요청 파싱 및 검증
  const { prompt, width, height, colorCount, fps } = await req.json();

  // 2. 사용자 인증 (JWT)
  const userId = await getUserIdFromJWT(req);

  // 3. DB에 job 생성
  const { data: job } = await supabaseClient
    .from('video_generation_jobs')
    .insert({
      user_id: userId,
      prompt,
      width,
      height,
      color_count: colorCount,
      fps,
      status: 'pending'
    })
    .select()
    .single();

  // 4. Luma API 호출
  const callbackUrl = `${SUPABASE_URL}/functions/v1/video-webhook?jobId=${job.id}`;

  const lumaResponse = await fetch(
    'https://api.lumalabs.ai/dream-machine/v1/generations',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LUMA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: enhancePromptForVideo(prompt),
        duration: '5s',
        resolution: '720p',
        model: 'ray-2',
        callback_url: callbackUrl
      })
    }
  );

  const lumaData = await lumaResponse.json();

  // 5. DB 업데이트
  await supabaseClient
    .from('video_generation_jobs')
    .update({
      status: 'queued',
      luma_generation_id: lumaData.id
    })
    .eq('id', job.id);

  // 6. 즉시 응답
  return new Response(JSON.stringify({
    success: true,
    data: {
      jobId: job.id,
      status: 'queued',
      estimatedTimeSeconds: 90
    }
  }));
});
```

---

### 2. `video-webhook` (새로 생성)

**목적**: Luma API 완료 콜백 처리 및 프레임 추출

**파일**: `supabase/functions/video-webhook/index.ts`

**플로우**:
```typescript
1. Webhook 데이터 수신 (Luma가 호출)
2. jobId 추출 (query parameter)
3. Luma 응답 검증 (state 확인)
4. State별 처리:
   - 'queued'/'dreaming': progress 업데이트만
   - 'failed': error 저장
   - 'completed': 프레임 추출 진행
5. 비디오 다운로드
6. FastVideoProcessor로 프레임 추출 + 픽셀화
7. 결과 저장 (DB JSONB)
8. DB 업데이트 (status: 'completed')
9. 200 OK 응답 (Luma 재시도 방지)
```

**핵심 코드 구조**:
```typescript
Deno.serve(async (req) => {
  // 1. jobId 추출
  const url = new URL(req.url);
  const jobId = url.searchParams.get('jobId');

  // 2. Luma webhook 데이터
  const lumaData = await req.json();

  // 3. State별 처리
  if (lumaData.state === 'queued' || lumaData.state === 'dreaming') {
    // 진행 중 - progress만 업데이트
    await supabaseClient
      .from('video_generation_jobs')
      .update({
        status: lumaData.state,
        progress: lumaData.state === 'queued' ? 20 : 60
      })
      .eq('id', jobId);

    return new Response('OK', { status: 200 });
  }

  if (lumaData.state === 'failed') {
    // 실패 처리
    await supabaseClient
      .from('video_generation_jobs')
      .update({
        status: 'failed',
        error_code: 'LUMA_GENERATION_FAILED',
        error_message: lumaData.failure_reason,
        error_details: lumaData
      })
      .eq('id', jobId);

    return new Response('OK', { status: 200 });
  }

  // 4. 완료 처리 (state === 'completed')
  const videoUrl = lumaData.assets.video;

  // Job 정보 가져오기
  const { data: job } = await supabaseClient
    .from('video_generation_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  // Processing 상태로 변경
  await supabaseClient
    .from('video_generation_jobs')
    .update({
      status: 'processing',
      luma_video_url: videoUrl,
      progress: 80
    })
    .eq('id', jobId);

  // 5. 프레임 추출
  const frames = await extractAndPixelateFrames(videoUrl, {
    width: job.width,
    height: job.height,
    colorCount: job.color_count,
    fps: job.fps
  });

  // 6. DB 저장
  await supabaseClient
    .from('video_generation_jobs')
    .update({
      status: 'completed',
      progress: 100,
      total_frames: frames.length,
      frame_data: frames.map(f => ({
        imageData: Array.from(f.imageData),
        delayMs: Math.round(1000 / job.fps)
      })),
      completed_at: new Date().toISOString()
    })
    .eq('id', jobId);

  return new Response('OK', { status: 200 });
});

// 프레임 추출 헬퍼
async function extractAndPixelateFrames(
  videoUrl: string,
  options: { width; height; colorCount; fps }
) {
  // 기존 FastVideoProcessor 로직 재사용
  // 1. fetch로 비디오 다운로드
  // 2. video element로 로드
  // 3. seeked 이벤트로 프레임 추출
  // 4. canvas + MediaImporter.pixelateImage() 호출
  // 5. 결과 반환
}
```

---

## 클라이언트 통합

### 1. Service Layer 변경

**파일**: `lib/services/supabase-ai.ts`

**새로운 메서드**:
```typescript
export interface VideoGenerationJob {
  jobId: string;
  status: 'pending' | 'queued' | 'dreaming' | 'processing' | 'completed' | 'failed';
  progress: number;
  estimatedTimeSeconds?: number;
  totalFrames?: number;
  frames?: Array<{ imageData: number[]; delayMs: number }>;
  error?: { message: string; code: string };
}

class SupabaseAIService {
  // 1. 비디오 생성 시작
  async startVideoGeneration(
    params: SupabaseVideoGenerateRequest
  ): Promise<VideoGenerationJob> {
    const response = await fetch(
      `${this.supabaseUrl}/functions/v1/video-generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey
        },
        body: JSON.stringify(params)
      }
    );

    const data = await response.json();
    return {
      jobId: data.data.jobId,
      status: data.data.status,
      progress: 0,
      estimatedTimeSeconds: data.data.estimatedTimeSeconds
    };
  }

  // 2. 실시간 구독 (Supabase Realtime)
  subscribeToVideoJob(
    jobId: string,
    callback: (job: VideoGenerationJob) => void
  ): RealtimeChannel {
    const channel = supabaseClient
      .channel(`video-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_generation_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          const data = payload.new;
          callback({
            jobId: data.id,
            status: data.status,
            progress: data.progress || 0,
            totalFrames: data.total_frames,
            frames: data.frame_data,
            error: data.error_code ? {
              message: data.error_message,
              code: data.error_code
            } : undefined
          });
        }
      )
      .subscribe();

    return channel;
  }
}
```

---

### 2. UI 컴포넌트 변경

**파일**: `components/video-generation-modal.tsx`

**주요 변경사항**:
```typescript
export function VideoGenerationModal({ open, onOpenChange }) {
  const [prompt, setPrompt] = useState('')
  const [fps, setFps] = useState<12 | 24 | 30>(24)
  const [isGenerating, setIsGenerating] = useState(false)

  // 새로 추가
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>('')

  const handleGenerate = async () => {
    setIsGenerating(true)

    // 1. 비디오 생성 시작
    const job = await supabaseAI.startVideoGeneration({
      prompt,
      width: currentProject.width,
      height: currentProject.height,
      colorCount: 16,
      fps
    })

    setJobId(job.jobId)
    setStatus('queued')

    toast.info('비디오 생성 중...', {
      description: `예상 시간: ${job.estimatedTimeSeconds}초`
    })

    // 2. 실시간 구독
    const channel = supabaseAI.subscribeToVideoJob(
      job.jobId,
      (updatedJob) => {
        setProgress(updatedJob.progress)
        setStatus(updatedJob.status)

        if (updatedJob.status === 'completed' && updatedJob.frames) {
          // 완료 - 프레임 로딩
          loadFrames(updatedJob.frames)
          channel.unsubscribe()
          setIsGenerating(false)
          onOpenChange(false)
        } else if (updatedJob.status === 'failed') {
          // 실패
          toast.error('생성 실패', {
            description: updatedJob.error?.message
          })
          channel.unsubscribe()
          setIsGenerating(false)
        }
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 기존 UI */}

      {/* 진행 상태 표시 */}
      {isGenerating && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{getStatusMessage(status)}</span>
          </div>
          <Progress value={progress} />
          <p className="text-xs text-muted-foreground">
            {progress}% 완료
          </p>
        </div>
      )}
    </Dialog>
  )
}

function getStatusMessage(status: string) {
  const messages = {
    'queued': '대기열 추가됨...',
    'dreaming': 'AI 생성 중... (1-2분)',
    'processing': '프레임 추출 중...',
    'completed': '완료!'
  }
  return messages[status] || '처리 중...'
}
```

---

## 마이그레이션 파일

**파일**: `supabase/migrations/YYYYMMDDHHMMSS_create_video_jobs_table.sql`

```sql
-- Create extension for UUID generation (if not exists)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create video generation jobs table
CREATE TABLE IF NOT EXISTS video_generation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NULL,

  prompt TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  color_count INTEGER NOT NULL,
  fps INTEGER NOT NULL CHECK (fps IN (12, 24, 30)),
  duration NUMERIC NOT NULL DEFAULT 5.0,

  luma_generation_id TEXT NULL,
  luma_video_url TEXT NULL,

  status TEXT NOT NULL CHECK (status IN (
    'pending', 'queued', 'dreaming', 'processing', 'completed', 'failed'
  )) DEFAULT 'pending',

  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  progress_message TEXT NULL,

  error_code TEXT NULL,
  error_message TEXT NULL,
  error_details JSONB NULL,

  total_frames INTEGER NULL,
  frame_storage_urls TEXT[] NULL,
  frame_data JSONB NULL,

  processing_time_ms INTEGER NULL,
  luma_processing_time_ms INTEGER NULL,
  frame_processing_time_ms INTEGER NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_video_jobs_user_id
  ON video_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status
  ON video_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_luma_id
  ON video_generation_jobs(luma_generation_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_created
  ON video_generation_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE video_generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own video jobs"
  ON video_generation_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own video jobs"
  ON video_generation_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update video jobs"
  ON video_generation_jobs
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Updated at trigger
CREATE TRIGGER update_video_jobs_updated_at
  BEFORE UPDATE ON video_generation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 배포 체크리스트

### Phase 1: 데이터베이스 준비 ✅
- [ ] 마이그레이션 파일 생성
- [ ] 로컬에서 마이그레이션 테스트
- [ ] 프로덕션에 마이그레이션 배포
- [ ] RLS 정책 테스트
- [ ] 인덱스 성능 확인

### Phase 2: Edge Functions 구현 ✅
- [ ] `video-generate` 함수 작성
- [ ] `video-webhook` 함수 작성
- [ ] Luma API 통합 테스트
- [ ] 프레임 추출 로직 이식
- [ ] 에러 핸들링 구현
- [ ] 로그 추가

### Phase 3: 클라이언트 통합 ✅
- [ ] `supabase-ai.ts` 업데이트
- [ ] `video-generation-modal.tsx` 업데이트
- [ ] 진행 상태 UI 구현
- [ ] Realtime 구독 구현
- [ ] 에러 UI 추가
- [ ] 완료 알림 추가

### Phase 4: 테스트 🧪
- [ ] 정상 플로우 테스트
- [ ] 타임아웃 시나리오
- [ ] 실패 시나리오
- [ ] 네트워크 불안정
- [ ] 동시 요청 처리
- [ ] Edge case 테스트

### Phase 5: 모니터링 📊
- [ ] Luma API 사용량 모니터링
- [ ] Edge Function 로그 확인
- [ ] DB 쿼리 성능
- [ ] 사용자 피드백

---

## 코스트 분석

### Luma API 비용
```
5초 비디오: $0.20/generation
프레임 수: 24 FPS × 5초 = 120 프레임

vs. 개별 이미지 생성:
120 프레임 × $0.04/image = $4.80

비용 절감: 96% ($4.60 절감)
```

### Supabase 비용
```
DB 저장 (JSONB):
- 120 프레임 × 64×64 × 4 bytes = 1.97 MB/job
- 1000 jobs = 1.97 GB → Free tier 충분

Edge Functions:
- video-generate: <1초
- video-webhook: 5-10초
- Free tier: 500K 호출/월 → 충분

Realtime:
- Free tier: 200 동시 연결 → 충분
```

---

## 예상 성능

```
1. 사용자 요청 → 응답: 0.5초 ✅
2. Luma 비디오 생성: 60-120초 (백그라운드)
3. Webhook 처리: 8-19초
   - 다운로드: 2-5초
   - 추출: 3-8초
   - 픽셀화: 2-5초
   - 저장: 1초

총: 68-139초 (평균 90-100초)

사용자 체감: 즉시 응답 + 백그라운드 처리 ✅
```

---

## 리스크 및 완화

### 리스크 1: Webhook 실패
**완화**: Luma 자동 재시도 (3회) + DB 실패 로그

### 리스크 2: 네트워크 불안정
**완화**: Retry 로직 + Resume 다운로드

### 리스크 3: DB 부하
**완화**: Storage 전환 + 압축 + TTL 정책

### 리스크 4: 동시 요청 폭주
**완화**: Rate limiting + Queue + Quota 모니터링

---

## 결론

### 기술적 장점
✅ 타임아웃 완전 해결
✅ UX 대폭 개선 (즉시 응답)
✅ 안정성 향상
✅ 확장성 확보
✅ 비용 효율 (96% 절감)

### 구현 복잡도
⚠️ DB 스키마 추가
⚠️ 2개 Edge Functions
⚠️ 클라이언트 상태 관리
⚠️ Realtime 구독

### 권장 사항
**즉시 구현 추천** ✅

현재 동기 방식은 프로덕션 사용 불가
Webhook이 업계 표준
확장성과 안정성 확보

---

## 다음 단계

1. ✅ **계획 승인** ← 현재
2. **DB 마이그레이션**
3. **Edge Functions 구현**
4. **클라이언트 통합**
5. **테스트 및 배포**

**예상 소요 시간**: 2-3일
