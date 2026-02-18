import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';

type Bindings = {
  R2_BUCKET: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB
const MAX_FILES = 10;

app.get('/', (c) => {
  return c.text('ok');
});

app.post('/image', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);
  const { error: authError } = await supabase.auth.getUser(token);
  if (authError) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.parseBody({ all: true });
  const rawFiles = body['files'];
  if (!rawFiles) {
    return c.json({ error: 'No files provided' }, 400);
  }

  const files = Array.isArray(rawFiles) ? rawFiles : [rawFiles];
  const imageFiles = files.filter((f): f is File => f instanceof File);

  if (imageFiles.length === 0) {
    return c.json({ error: 'No valid files provided' }, 400);
  }
  if (imageFiles.length > MAX_FILES) {
    return c.json({ error: `Maximum ${MAX_FILES} files allowed` }, 400);
  }

  const ids: string[] = [];

  for (const file of imageFiles) {
    if (file.type !== 'image/webp') {
      return c.json(
        { error: `Invalid file type: ${file.type}. Allowed: webp` },
        400,
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` }, 400);
    }

    const id = crypto.randomUUID();
    await c.env.R2_BUCKET.put(id, file, {
      httpMetadata: { contentType: 'image/webp' },
    });

    ids.push(id);
  }

  return c.json(ids);
});

export default app;
