# supabase-upload-image

Cloudflare Workers 기반 이미지 업로드 서버. Supabase Auth로 인증하고, WebP 이미지를 R2에 저장한다.

## 스택

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Storage**: Cloudflare R2
- **Auth**: Supabase Auth

## API

### `GET /`

헬스체크. `ok` 반환.

### `POST /image`

다중 이미지 업로드. WebP 이미지를 R2에 저장.

**Headers**

| 이름 | 값 |
|---|---|
| Authorization | `Bearer <supabase_access_token>` |
| Content-Type | `multipart/form-data` |

**Body**

| 필드 | 타입 | 설명 |
|---|---|---|
| files | File[] | WebP 이미지 파일 (최대 10개, 개당 16MB) |

- 허용 타입: `webp`
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
