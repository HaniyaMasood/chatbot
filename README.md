
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Embedding in Shopify (iframe)

The chat UI for iframes is at **`/embed`**. Framing is allowed via `Content-Security-Policy: frame-ancestors` in [`middleware.ts`](middleware.ts).

If you see **401** and **`X-Frame-Options: deny`** for a URL like `chatbot-xxxxx-yourteam.vercel.app`, that response is usually **Vercel’s deployment protection page**, not your Next app — middleware cannot change those headers.

**Fix:** Vercel → your project → **Settings** → **Deployment Protection** → for **Preview** deployments choose **Standard Protection** with **“Only my team can access”** disabled for previews you need in iframes, or switch to **“Protection disabled for previews”** while testing. Prefer embedding your **production** hostname (e.g. `https://chatbot.yourdomain.com/embed`) once it works.

The iframe **`src` must end with `/embed`**. If it only points at the deployment root (`/` → `vercel.app/`), middleware redirects that to `/embed` when the browser sends `Sec-Fetch-Dest: iframe` (Safari sometimes omits it; set `IFRAME_ROOT_REDIRECT_MODE=always` only if you must, then use `/?noEmbedRedirect=1` to view the full homepage).

## Version 2 — Multi-store (one Vercel app, many Shopify sites)

See [docs/version-2-multistore.md](docs/version-2-multistore.md). Set **`MULTI_STORE_CONFIG`** (JSON) or keep legacy **`SHOPIFY_*`**. Use **`/embed?store=<storeId>`** in each theme’s iframe `src` so the correct catalog and branding load.
