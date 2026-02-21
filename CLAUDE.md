# Binder - AI 개발 가이드

## 프로젝트 설명
Threads 계정을 수집 창구로 사용하는 AI 슈퍼 북마크 앱.
상세 스펙은 `PROJECT_SPEC.md` 참고.

## 기술 스택
- Next.js 14+ (App Router, TypeScript)
- Tailwind CSS
- Prisma + SQLite
- Claude API (AI 처리)
- Threads API (콘텐츠 수집)
- YouTube Data API v3

## 개발 규칙
- 개인용 싱글 유저 앱. 불필요한 인증/권한 로직 금지.
- 한국어 UI. 코드 주석과 변수명은 영어.
- Phase 순서대로 개발 (PROJECT_SPEC.md 7장 참고).
- API 키는 `.env.local`에만 저장. 절대 커밋하지 않는다.
- SQLite 사용. 별도 DB 서버 불필요.

## 명령어
```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npx prisma studio # DB 시각적 관리
npx prisma db push # 스키마 변경 반영
```
