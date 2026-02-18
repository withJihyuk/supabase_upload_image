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

# wrangler.toml에서 bucket_name 설정 후
pnpm dev
```

## 환경 변수 (Secrets)

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_KEY
```

## 배포

```bash
pnpm deploy
```

GitHub Actions로 `main` 브랜치 push 시 자동 배포된다. `CLOUDFLARE_API_TOKEN` secret 필요.

## 참고

- `wrangler.toml`의 `bucket_name`을 실제 R2 버킷명으로 변경할 것
