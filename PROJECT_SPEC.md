# Binder - AI 슈퍼 북마크 앱

## 프로젝트 한줄 요약

Threads 계정을 "수집 창구"로 사용하여 유튜브, 인스타그램, 트위터, 웹페이지 등의 콘텐츠를 모으고, AI가 자동으로 요약/태그/분류하여 보여주는 개인용 북마크 앱.

---

## 1. 프로젝트 개요

### 1.1 해결하려는 문제

- 여러 플랫폼(유튜브, 인스타, 트위터, 웹)에서 유용한 콘텐츠를 발견하지만, 나중에 찾기 어려움
- 각 플랫폼 북마크가 분산되어 관리 불가
- 저장해도 링크만 남아서 무슨 내용이었는지 기억이 안 남

### 1.2 핵심 아이디어

```
[유튜브/인스타/트위터/웹페이지]
        |
        | (모바일: 공유 버튼 → Threads에 공유)
        | (PC: 브라우저 확장 또는 직접 입력)
        v
   [Threads 계정] ← 모든 링크가 여기로 모임
        |
        | (Threads API로 자동 수집)
        v
   [Binder 백엔드]
        |
        | (콘텐츠 추출 + AI 처리)
        v
   [정리된 콘텐츠]
   - AI 생성 제목/요약
   - 자동 태그/카테고리
   - 원본 콘텐츠 미리보기
   - 전문 검색
```

### 1.3 사용자

- 나 혼자 쓰는 개인용 앱 (싱글 유저)
- 인증/회원가입 불필요 (또는 간단한 비밀번호만)

---

## 2. 시스템 아키텍처

### 2.1 기술 스택

| 영역 | 기술 | 선택 이유 |
|------|------|-----------|
| **프론트엔드** | Next.js 14+ (App Router) | React 기반, SSR 지원, 풀스택 가능 |
| **스타일링** | Tailwind CSS | 빠른 UI 개발 |
| **백엔드 API** | Next.js API Routes | 별도 서버 불필요, 프론트와 같은 프로젝트 |
| **데이터베이스** | SQLite (via Prisma) | 개인용이라 가볍게, 파일 하나로 관리 |
| **ORM** | Prisma | 타입 안전한 DB 쿼리 |
| **AI** | Claude API (Anthropic) | 요약, 태그 생성, 제목 생성 |
| **콘텐츠 수집** | Threads API (Meta) | 모바일 공유의 수집 창구 |
| **배포** | Vercel 또는 로컬 | 개인용이니 간단하게 |

### 2.2 전체 구조

```
binder/
├── prisma/
│   └── schema.prisma          # DB 스키마
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── page.tsx           # 메인: 북마크 피드
│   │   ├── bookmarks/
│   │   │   └── [id]/page.tsx  # 개별 북마크 상세
│   │   ├── settings/
│   │   │   └── page.tsx       # 설정 (Threads 연동 등)
│   │   └── api/
│   │       ├── bookmarks/     # CRUD API
│   │       ├── sync/          # Threads 동기화 API
│   │       ├── extract/       # 콘텐츠 추출 API
│   │       └── ai/            # AI 처리 API
│   ├── lib/
│   │   ├── threads.ts         # Threads API 클라이언트
│   │   ├── extractors/        # 플랫폼별 콘텐츠 추출기
│   │   │   ├── youtube.ts
│   │   │   ├── twitter.ts
│   │   │   ├── instagram.ts
│   │   │   ├── webpage.ts
│   │   │   └── opengraph.ts   # 범용 OG 태그 추출 (폴백)
│   │   ├── ai.ts              # Claude API 연동
│   │   └── db.ts              # Prisma 클라이언트
│   ├── components/            # 재사용 UI 컴포넌트
│   └── types/                 # TypeScript 타입 정의
├── public/
├── .env.local                 # API 키들 (gitignore 대상)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

---

## 3. 데이터 모델

### 3.1 Prisma 스키마

```prisma
model Bookmark {
  id            String   @id @default(cuid())

  // 원본 정보
  originalUrl   String               // 원본 콘텐츠 URL
  platform      Platform             // YOUTUBE, TWITTER, INSTAGRAM, WEB, OTHER
  threadsPostId String?  @unique     // Threads에서 수집된 경우 해당 post ID

  // 추출된 콘텐츠
  title         String?              // 원본 제목 또는 AI 생성 제목
  description   String?              // 원본 설명
  content       String?              // 추출된 본문 (article 등)
  thumbnailUrl  String?              // 썸네일/미리보기 이미지
  authorName    String?              // 원본 작성자
  publishedAt   DateTime?            // 원본 게시일

  // AI 처리 결과
  aiTitle       String?              // AI가 다듬은 제목
  aiSummary     String?              // AI 요약 (2~3줄)
  aiTags        String?              // AI 생성 태그 (JSON array)
  aiCategory    String?              // AI 분류 카테고리
  aiProcessed   Boolean  @default(false)

  // 사용자 관리
  isRead        Boolean  @default(false)
  isFavorite    Boolean  @default(false)
  userNote      String?              // 사용자 메모
  userTags      String?              // 사용자 수동 태그 (JSON array)

  // 메타
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  syncedAt      DateTime?            // Threads에서 마지막 동기화 시점
}

enum Platform {
  YOUTUBE
  TWITTER
  INSTAGRAM
  WEB
  OTHER
}
```

---

## 4. 핵심 기능 상세

### 4.1 콘텐츠 수집 (Threads → Binder)

**동작 흐름:**
1. 사용자가 모바일에서 유튜브/인스타/웹 콘텐츠를 Threads에 공유
2. Binder가 주기적으로 (또는 수동 버튼으로) Threads API 호출
3. `GET /me/threads?fields=id,text,permalink,timestamp` 로 내 글 목록 조회
4. 각 글에서 URL을 정규식으로 추출
5. 이미 저장된 `threadsPostId`는 건너뜀 (중복 방지)
6. 새 URL을 발견하면 Bookmark 레코드 생성 → 콘텐츠 추출 큐에 추가

**Threads API 설정:**
- Meta Developer 계정 생성 → 앱 생성 → "Access the Threads API" 선택
- OAuth 2.0 인증으로 long-lived token 발급 (60일 유효, 갱신 가능)
- 필요 권한: `threads_basic` (내 글 읽기)
- 개발 모드에서 Threads Tester로 내 계정 등록하면 앱 리뷰 없이 사용 가능
- API 기본 URL: `https://graph.threads.net/v1.0/`

**URL 추출 정규식:**
```typescript
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
```

### 4.2 콘텐츠 추출 (URL → 실제 내용)

플랫폼을 URL 패턴으로 감지한 뒤, 해당 추출기를 사용:

```typescript
function detectPlatform(url: string): Platform {
  if (/youtube\.com|youtu\.be/.test(url)) return 'YOUTUBE';
  if (/twitter\.com|x\.com/.test(url)) return 'TWITTER';
  if (/instagram\.com/.test(url)) return 'INSTAGRAM';
  return 'WEB';
}
```

#### YouTube
- **방법:** YouTube Data API v3
- **추출 가능:** 제목, 설명, 썸네일, 채널명, 게시일, 조회수
- **API:** `GET /youtube/v3/videos?id={VIDEO_ID}&key={API_KEY}&part=snippet,statistics`
- **무료:** 일 10,000 쿼터 유닛 (비디오 조회 1회 = 1유닛)
- **설정:** Google Cloud 프로젝트 → YouTube Data API v3 활성화 → API Key 발급
- **자막(선택):** `youtube-transcript-api` (Python) 또는 Supadata API로 자막 추출 가능

#### 웹페이지 (일반)
- **방법:** 서버에서 HTML 다운로드 → 본문 추출
- **1차:** 서버사이드에서 fetch → cheerio로 파싱 → readability 알고리즘으로 본문 추출
- **추천 라이브러리:** `@mozilla/readability` + `jsdom` (Node.js)
- **추출 가능:** 제목, 본문 텍스트, 대표 이미지, 작성자, 게시일
- **폴백:** Open Graph 메타 태그 (`og:title`, `og:description`, `og:image`)

#### Twitter / X
- **현실:** 공식 API 무료 티어는 읽기 불가. Basic $200/월.
- **실용적 방법:**
  - OG 태그 추출로 트윗 텍스트 + 이미지 확보 (무료, 불안정할 수 있음)
  - 또는 제3자 API (TwitterAPI.io 등) 사용 (저가)
- **최소 MVP:** URL + OG 태그 정보만 저장, 나중에 개선

#### Instagram
- **현실:** API 접근이 가장 어려운 플랫폼
- **실용적 방법:**
  - OG 태그에서 썸네일 + 간단한 설명 추출 시도
  - 자체 인스타 계정 연동 시 Instagram Graph API로 캡션/이미지 가능
- **최소 MVP:** URL + OG 태그 정보만 저장

#### 범용 OG 태그 폴백
- 모든 플랫폼에서 실패 시 최후의 수단
- HTML `<head>`에서 `og:title`, `og:description`, `og:image` 파싱
- 거의 모든 웹사이트가 OG 태그를 제공함

### 4.3 AI 처리 (Claude API)

저장된 콘텐츠를 Claude API로 분석:

```typescript
// AI에게 보낼 프롬프트 구조
const prompt = `
다음 콘텐츠를 분석해서 JSON으로 응답해줘:

원본 URL: ${bookmark.originalUrl}
플랫폼: ${bookmark.platform}
원본 제목: ${bookmark.title}
본문/설명: ${bookmark.content || bookmark.description}

응답 형식:
{
  "aiTitle": "한국어로 핵심을 담은 깔끔한 제목 (20자 이내)",
  "aiSummary": "핵심 내용 2~3줄 요약",
  "aiTags": ["태그1", "태그2", "태그3"],
  "aiCategory": "기술|디자인|비즈니스|자기계발|건강|엔터테인먼트|기타"
}
`;
```

**처리 시점:**
- 콘텐츠 추출 직후 자동 실행
- 사용자가 수동으로 "다시 분석" 버튼을 눌렀을 때

**비용:**
- Claude API Haiku 모델 사용 시 매우 저렴 (개인용이면 월 $1 미만 예상)

### 4.4 프론트엔드 UI

**메인 피드 (홈):**
- 카드 형태로 북마크 목록 표시
- 각 카드: 썸네일 + AI 제목 + AI 요약 + 태그 + 플랫폼 아이콘
- 무한 스크롤 또는 페이지네이션
- 필터: 플랫폼별, 카테고리별, 태그별, 즐겨찾기, 읽음/안읽음

**상세 페이지:**
- 추출된 전체 콘텐츠 표시
- 유튜브: 임베드 플레이어 + 설명 + 자막
- 웹페이지: 읽기 모드로 본문 표시
- AI 요약/태그 표시 및 편집 가능
- 원본 링크로 이동 버튼
- 사용자 메모 추가

**검색:**
- 전문 검색 (제목, 요약, 본문, 태그 통합)
- 태그 클릭으로 필터링

**설정:**
- Threads 계정 연동 (OAuth)
- 동기화 주기 설정
- API 키 관리

---

## 5. API 엔드포인트 설계

### 5.1 북마크 CRUD

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/bookmarks` | 목록 조회 (필터, 검색, 페이지네이션) |
| GET | `/api/bookmarks/:id` | 단건 조회 |
| POST | `/api/bookmarks` | 수동 추가 (URL 입력) |
| PATCH | `/api/bookmarks/:id` | 수정 (메모, 태그, 즐겨찾기 등) |
| DELETE | `/api/bookmarks/:id` | 삭제 |

### 5.2 동기화 & 처리

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/sync/threads` | Threads에서 새 글 동기화 |
| POST | `/api/extract/:id` | 특정 북마크 콘텐츠 재추출 |
| POST | `/api/ai/process/:id` | 특정 북마크 AI 재처리 |
| POST | `/api/ai/process-all` | 미처리 북마크 전체 AI 처리 |

### 5.3 인증 (Threads OAuth)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/auth/threads` | Threads OAuth 시작 (리다이렉트) |
| GET | `/api/auth/threads/callback` | OAuth 콜백 (토큰 수령) |

---

## 6. 환경 변수

```env
# Threads API (Meta)
THREADS_APP_ID=              # Meta 앱 ID
THREADS_APP_SECRET=          # Meta 앱 시크릿
THREADS_REDIRECT_URI=        # OAuth 콜백 URL
THREADS_ACCESS_TOKEN=        # 장기 액세스 토큰 (발급 후 저장)

# YouTube Data API
YOUTUBE_API_KEY=             # Google Cloud API 키

# Claude API (Anthropic)
ANTHROPIC_API_KEY=           # Claude API 키

# App
DATABASE_URL="file:./dev.db" # SQLite 경로
APP_SECRET=                  # 세션/암호화용 시크릿 (선택)
```

---

## 7. 구현 순서 (Phase별)

### Phase 1: 기본 뼈대 (MVP)
> 목표: 링크를 수동으로 입력하면 저장하고 목록으로 보여주기

- [ ] Next.js 프로젝트 초기화 (TypeScript, Tailwind, Prisma)
- [ ] DB 스키마 생성 및 마이그레이션
- [ ] 북마크 CRUD API 구현
- [ ] 메인 피드 UI (카드 목록)
- [ ] 북마크 수동 추가 폼 (URL 입력)
- [ ] 삭제, 즐겨찾기 토글

### Phase 2: 콘텐츠 추출
> 목표: URL을 입력하면 자동으로 제목/설명/이미지 추출

- [ ] 플랫폼 감지 함수 (`detectPlatform`)
- [ ] OG 태그 추출기 (범용 폴백)
- [ ] YouTube 추출기 (YouTube Data API v3)
- [ ] 웹페이지 추출기 (@mozilla/readability)
- [ ] 트위터 추출기 (OG 태그 기반)
- [ ] 북마크 추가 시 자동 추출 파이프라인 연결

### Phase 3: Threads 연동
> 목표: Threads 계정에 공유한 링크가 자동으로 Binder에 저장

- [ ] Meta Developer 앱 설정 가이드 문서
- [ ] Threads OAuth 인증 플로우
- [ ] Threads API 클라이언트 (`GET /me/threads`)
- [ ] URL 추출 및 중복 체크 로직
- [ ] 동기화 API (`POST /api/sync/threads`)
- [ ] 설정 페이지에 동기화 버튼 + 상태 표시

### Phase 4: AI 처리
> 목표: 저장된 콘텐츠를 AI가 자동으로 요약/태그/분류

- [ ] Claude API 연동 (Anthropic SDK)
- [ ] AI 처리 프롬프트 설계 및 테스트
- [ ] 북마크 저장 시 자동 AI 처리
- [ ] "다시 분석" 버튼
- [ ] AI 태그/카테고리 기반 필터 UI

### Phase 5: 검색 & 고도화
> 목표: 쌓인 콘텐츠를 쉽게 찾고 관리

- [ ] 전문 검색 기능 (SQLite FTS5)
- [ ] 태그 클라우드 / 카테고리 사이드바
- [ ] 읽음/안읽음 관리
- [ ] 대시보드 (통계: 플랫폼별 개수, 카테고리 분포 등)
- [ ] (선택) 자동 동기화 (cron 또는 Vercel Cron)
- [ ] (선택) 유튜브 자막 추출 및 AI 요약

---

## 8. 외부 API 요약

| API | 용도 | 무료 범위 | 키 발급처 |
|-----|------|-----------|-----------|
| **Threads API** | 북마크 수집 창구 | 개발 모드 무제한 | developers.facebook.com |
| **YouTube Data API v3** | 영상 메타데이터 | 일 10,000 유닛 | console.cloud.google.com |
| **Claude API** | 요약/태그/분류 | 유료 (Haiku 저렴) | console.anthropic.com |
| **OG 태그** | 범용 메타데이터 | 무료 (직접 파싱) | 없음 |

---

## 9. 제약 사항 & 고려 사항

1. **개인용 앱**: 멀티 유저, 권한 관리 불필요. 심플하게 유지.
2. **Threads 개발 모드**: 앱 리뷰 없이 테스터 계정으로 사용 가능. 프로덕션 배포 시 리뷰 필요.
3. **인스타그램/트위터**: 완벽한 콘텐츠 추출이 어려움. OG 태그 기반의 기본 정보로 시작하고 점진적 개선.
4. **Threads 토큰 갱신**: long-lived token은 60일 유효. 만료 전 갱신 로직 필요.
5. **AI 비용**: Claude Haiku 모델 사용 시 북마크 하나당 약 $0.001 이하. 월 1000개 저장해도 $1 미만.
6. **SQLite 한계**: 동시 접속이 거의 없으므로 충분. 추후 필요 시 PostgreSQL로 교체 가능 (Prisma 덕에 쉬움).
