import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { collectFrameAncestorSources } from "@/lib/stores/registry";
import { resolveStoreForEmbedRequest, STORE_COOKIE } from "@/lib/stores/resolve-store";

/**
 * Allow storefronts to frame `/` and `/embed`, set store cookie on `/embed`, and redirect
 * mistaken iframe loads of `/` → `/embed`.
 *
 * Preview **401** / **X-Frame-Options: deny** come from Vercel Deployment Protection, not this app.
 */
function embedFrameAncestorsCsp(): string {
  const override = process.env.CSP_EMBED_HEADER?.trim();
  if (override) return override;

  const hosts = collectFrameAncestorSources();
  return `frame-ancestors ${hosts.join(" ")}`;
}

function shouldRedirectRootToEmbed(request: NextRequest): boolean {
  if (request.nextUrl.pathname !== "/") return false;
  if (request.nextUrl.searchParams.has("noEmbedRedirect")) return false;
  const dest = request.headers.get("sec-fetch-dest");
  if (dest === "iframe") return true;
  const mode = process.env.IFRAME_ROOT_REDIRECT_MODE?.trim();
  if (mode === "always") return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldRedirectRootToEmbed(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/embed";
    return NextResponse.redirect(url);
  }

  const applyFramingHeaders = pathname === "/" || pathname.startsWith("/embed");
  if (!applyFramingHeaders) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", embedFrameAncestorsCsp());
  response.headers.delete("x-frame-options");

  if (pathname.startsWith("/embed")) {
    const store = resolveStoreForEmbedRequest(request);
    if (store) {
      response.cookies.set(STORE_COOKIE, store.id, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
  }

  return response;
}

export const config = {
  matcher: ["/", "/embed", "/embed/:path*"],
};
