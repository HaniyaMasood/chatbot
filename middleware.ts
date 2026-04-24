import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Allow `/embed` to be framed by the Shopify storefront (and optional extra origins).
 * Set CSP in one place to avoid conflicting duplicate Content-Security-Policy headers.
 *
 * If the iframe still "refuses to connect", check Vercel **Deployment Protection**
 * (preview URLs often require login — disable for this project or use a Production URL).
 */
function embedFrameAncestorsCsp(): string {
  const override = process.env.CSP_EMBED_HEADER?.trim();
  if (override) return override;

  const extra = process.env.FRAME_ANCESTORS_EXTRA?.trim() || "";

  const base = [
    "'self'",
    "https://www.fromyheart.com",
    "https://fromyheart.com",
    "http://www.fromyheart.com",
    "http://fromyheart.com",
    "https://*.myshopify.com",
    "http://*.myshopify.com",
    "https://myshopify.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].join(" ");

  return extra ? `frame-ancestors ${base} ${extra}` : `frame-ancestors ${base}`;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/embed")) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", embedFrameAncestorsCsp());
  // If an upstream sets X-Frame-Options: DENY, embedding breaks; CSP frame-ancestors is preferred.
  response.headers.delete("x-frame-options");
  return response;
}

export const config = {
  matcher: ["/embed", "/embed/:path*"],
};
