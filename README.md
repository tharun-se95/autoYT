This is a [Next.js](https://nextjs.org) app for **Upgrade Life** — channel desk (ideas + videos), studio (script / audio / visuals), and Imagen thumbnails.

## Getting started

```bash
npm install
cp .env.example .env.local
# Edit .env.local — see “Studio thumbnails” below, then:
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Studio thumbnails (disk + Supabase)

For thumbnails that **survive refresh** and load from `/api/studio/thumbnails/...`:

1. Create a writable folder and set **`UPGRADE_LIFE_LOCAL_ASSETS_ROOT`** in `.env.local` to its **absolute** path (see `.env.example`).
2. Set **`NEXT_PUBLIC_SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** (service role, server-only).
3. Apply migrations in **`supabase/migrations/`** to that project, then **restart** `npm run dev`.

Details and prompt-layer notes: [`src/prompts/README.md`](src/prompts/README.md).

## Learn More

To learn more about Next.js, see the [Next.js Documentation](https://nextjs.org/docs).
