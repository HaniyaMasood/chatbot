# Shopify integration (Phase 1)

## Theme snippet (iframe)

1. Deploy this app to Vercel and set environment variables (see [.env.example](../.env.example)).
2. In [snippets/fromyheart-chatbot-embed.liquid](snippets/fromyheart-chatbot-embed.liquid), replace `https://YOUR-VERCEL-APP.vercel.app` with your deployment URL (no trailing slash).
3. In the Shopify admin: **Online Store → Themes → Edit code**, create a snippet (e.g. `fromyheart-chatbot-embed`) and paste the file contents, or include it from `theme.liquid` before `</body>`:

   `{% render 'fromyheart-chatbot-embed' %}`

4. Confirm `/embed` loads on your Vercel URL and that the chat works on the storefront (same-origin API calls from the iframe to Vercel).

## Catalog snapshot (optional)

`POST` or `GET` `/api/sync` warms an in-memory catalog snapshot used by `searchLocalCatalogSnapshot`. In production, set `CRON_SECRET` and call with header `Authorization: Bearer <CRON_SECRET>`. Schedule with any external cron (e.g. nightly) hitting your Vercel deployment.

## Theme app extension (Shopify CLI app)

The folder [../extensions/fromyheart-chatbot-embed](../extensions/fromyheart-chatbot-embed) is a **Theme app extension** scaffold. Copy it into a Shopify CLI app under `extensions/`, run `shopify app dev` / deploy, then enable the app embed under **Theme settings → App embeds** and set the chatbot base URL.

If Shopify CLI complains about `uid` in `shopify.extension.toml`, replace it with the value from `shopify app generate extension` or remove the key and let the CLI assign one on first push.
