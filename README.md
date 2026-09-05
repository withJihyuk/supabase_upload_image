# supabase-upload-image

Cloudflare Workers 기반 이미지 업로드 서버. Supabase Auth로 인증하고, WebP·JPEG·PNG 이미지를 R2에 저장한다.

## 스택

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Storage**: Cloudflare R2
- **Auth**: Supabase Auth

## API

### `GET /`

헬스체크. `ok` 반환.

### `POST /image`

다중 이미지 업로드. WebP·JPEG·PNG 이미지를 R2에 저장.

**Headers**

| 이름 | 값 |
|---|---|
| Authorization | `Bearer <supabase_access_token>` |
| Content-Type | `multipart/form-data` |

**Body**

| 필드 | 타입 | 설명 |
|---|---|---|
| files | File[] | WebP·JPEG·PNG 파일 (최대 10개, 개당 16MB) |
| imageIds | string (선택) | files 순서에 맞춘 고유 UUID 배열의 JSON 문자열 |

- 허용 타입: `image/webp`, `image/jpeg`, `image/png`. MIME과 파일 시그니처를 함께 검사한다.
- 응답: UUID 배열 (`string[]`)

**예시**

```bash
curl -X POST http://localhost:8787/image \
  -H "Authorization: Bearer <token>" \
  -F "files=@photo1.webp" \
  -F "files=@photo2.webp"
```

```json
["550e8400-e29b-41d4-a716-446655440000", "6ba7b810-9dad-11d1-80b4-00c04fd430c8"]
```

`imageIds`를 보내면 같은 사용자·ID·파일 내용의 재요청은 같은 결과를 반환한다. ID는 소문자로 정규화한다. 다른 사용자나 다른 내용의 덮어쓰기는 409로 거절한다. 필드를 생략한 기존 요청도 계속 지원한다.

전체 파일 검증 후 R2에 저장한다. 저장 도중 네트워크 오류가 나면 같은 ID와 파일 바이트로 재시도한다. R2 조건부 쓰기와 owner/SHA-256 메타데이터로 동시 재시도도 보호한다. 파일을 다시 압축하거나 ID를 새로 만들지 않는다.

객체 경로와 CDN 주소는 그대로 유지한다. 기존 객체에 소유자 정보를 추측해서 붙이거나 파일을 자동 삭제하지 않는다.

검증: `pnpm exec tsc --noEmit`, `pnpm exec wrangler deploy --dry-run`. 로컬 Worker/R2와 가짜 인증 응답으로 재시도·동시 생성·소유자 및 내용 충돌·MIME 오류·파일 전체 사전 검증·기존 요청 호환성을 확인했다. 2026-09-05 운영 Worker에 배포했다. 배포 버전은 `4c5fe19b-d1dd-4493-b9d4-b792c6a598b2`이며 기존 변수·시크릿을 유지했다.

## 로컬 개발

```bash
# 의존성 설치
pnpm install
```

로컬에서 실행하기 전에 `wrangler.toml`의 R2 버킷 이름과 Supabase 환경값을 준비한다.

```bash
pnpm dev
```

## 필요한 값

### R2 버킷

`wrangler.toml`의 `bucket_name`은 실제 Cloudflare R2 버킷 이름과 같아야 한다.

```toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "diary-prod-01"
```

코드에서는 `R2_BUCKET` 바인딩을 사용한다.

### Supabase 환경 변수

Cloudflare Worker에는 아래 secret을 등록해야 한다.

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_PUBLISHABLE_KEY
```

| 이름 | 값 |
|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 URL (`https://<project-ref>.supabase.co`) |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (`sb_publishable_...`) |

`SUPABASE_PUBLISHABLE_KEY`는 Supabase의 최신 publishable key 방식을 사용한다.
기존 `SUPABASE_KEY` 환경 변수는 더 이상 사용하지 않는다.

## 배포

```bash
pnpm deploy
```

CI에서 배포하려면 Cloudflare API 토큰을 CI secret으로 등록해야 한다.

```text
CLOUDFLARE_API_TOKEN
```

현재 저장소에는 GitHub Actions workflow가 포함되어 있지 않다.

## 참고

- `wrangler.toml`의 `bucket_name`을 실제 R2 버킷명으로 변경할 것
- Supabase Auth 토큰은 API 요청의 `Authorization: Bearer <supabase_access_token>` 헤더로 전달한다.
