import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";

type Bindings = { R2_BUCKET: R2Bucket; SUPABASE_URL: string; SUPABASE_PUBLISHABLE_KEY: string };
const app = new Hono<{ Bindings: Bindings }>();
const MAX_FILE_SIZE = 16 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mime(bytes: Uint8Array): string | undefined {
  const text = new TextDecoder();
  if (bytes.length >= 12 && text.decode(bytes.slice(0, 4)) === 'RIFF' && text.decode(bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10') return 'image/png';
}
app.get('/', (c) => c.text('ok'));
app.post('/image', async (c) => {
  const authorization = c.req.header('Authorization');
  if (!authorization?.startsWith('Bearer ')) return c.json({ error: 'Login required' }, 401);
  const client = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_PUBLISHABLE_KEY);
  const { data: { user }, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !user) return c.json({ error: 'Login required' }, 401);
  let body;
  try { body = await c.req.parseBody({ all: true }); }
  catch { return c.json({ error: 'Invalid multipart body' }, 400); }
  const raw = body.files;
  const files = Array.isArray(raw) ? raw : [raw];
  if (files.length === 0 || files.length > 10 || files.some(f => !(f instanceof File))) {
    return c.json({ error: 'Provide 1 to 10 image files' }, 400);
  }
  let ids: string[];
  try {
    const supplied = body.imageIds === undefined ? files.map(() => crypto.randomUUID()) : JSON.parse(String(body.imageIds));
    if (!Array.isArray(supplied) || supplied.length !== files.length ||
      supplied.some(id => typeof id !== 'string' || !UUID.test(id)) || new Set(supplied).size !== supplied.length) throw new Error();
    ids = supplied.map(id => id.toLowerCase());
    if (new Set(ids).size !== ids.length) throw new Error();
  } catch { return c.json({ error: 'imageIds must contain one unique UUID per file' }, 400); }
  // Validate every file before creating any object.
  const imageFiles = files as File[];
  for (const file of imageFiles) {
    if (file.size === 0 || file.size > MAX_FILE_SIZE) return c.json({ error: 'Each image must be between 1 byte and 16MB' }, 400);
    const detected = mime(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
    if (!detected || detected !== file.type) return c.json({ error: 'Image bytes and MIME must match WebP, JPEG or PNG' }, 400);
  }
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const bytes = await file.arrayBuffer();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
    const key = `diary-prod-01/${ids[i]}`;
    const matches = (object: R2Object | null) => object?.customMetadata?.owner === user.id && object.customMetadata.sha256 === hash;
    const existing = await c.env.R2_BUCKET.head(key);
    if (existing) {
      if (!matches(existing)) return c.json({ error: 'Image ID already belongs to different content' }, 409);
      continue;
    }
    const created = await c.env.R2_BUCKET.put(key, bytes, {
      onlyIf: { etagDoesNotMatch: '*' },
      httpMetadata: { contentType: file.type },
      customMetadata: { owner: user.id, sha256: hash },
    });
    if (created === null && !matches(await c.env.R2_BUCKET.head(key))) {
      return c.json({ error: 'Image ID already belongs to different content' }, 409);
    }
  }
  return c.json(ids);
});
app.onError((_error, c) => c.json({ error: 'Image upload failed; retry with the same imageIds' }, 500));
export default app;
