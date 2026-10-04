import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (the
// `middleware` export is deprecated). This file only performs *optimistic*
// redirects from the session cookie — every route handler and Server
// Component still re-verifies auth/tenant/role itself (see
// `src/lib/auth/session.ts`), since Proxy is not a substitute for real
// authorization.

const PUBLIC_PATHS = ["/login", "/register", "/api/auth", "/api/register"];
const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
};

function applySecurityHeaders(response: NextResponse) {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(?:css|js|png|jpg|jpeg|svg|ico|webp|map)$/)
  ) {
    return applySecurityHeaders(NextResponse.next());
  }

  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  const token = secret ? await getToken({ req: request, secret }) : null;

  const isAuthenticated = Boolean(token);
  const isOnboarded = Boolean(token?.tenant);
  // Indication tirée du jeton, utilisée uniquement pour orienter les
  // redirections : l'espace /admin et les API /api/admin revérifient le
  // statut de super administrateur en base à chaque requête.
  const isSuperAdmin = Boolean(token?.superAdmin);
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path));
  const isOnboardingPath = pathname === "/onboarding";
  const isAuthPage = pathname === "/login" || pathname === "/register";
  // Public landing page: visitors see it, signed-in users are sent straight
  // to their own space (same destination as from /login).
  const isLandingPage = pathname === "/";

  let response: NextResponse;

  if (!isAuthenticated && !isPublicPath && !isLandingPage && !pathname.startsWith("/api")) {
    response = NextResponse.redirect(new URL("/login", request.url));
  } else if (!isAuthenticated && !isPublicPath && pathname.startsWith("/api")) {
    response = NextResponse.next(); // let the route handler return a clean 401 JSON body
  } else if (isAuthenticated && (isAuthPage || isLandingPage)) {
    const home = isSuperAdmin ? "/admin" : isOnboarded ? "/dashboard" : "/onboarding";
    response = NextResponse.redirect(new URL(home, request.url));
  } else if (
    isAuthenticated &&
    !isOnboarded &&
    // Un super administrateur n'a pas d'organisation : ce n'est pas un
    // onboarding inachevé. Les pages /admin décident elles-mêmes (le jeton
    // peut être antérieur à la promotion du compte).
    !isSuperAdmin &&
    !isAdminPath &&
    !isOnboardingPath &&
    !pathname.startsWith("/api")
  ) {
    response = NextResponse.redirect(new URL("/onboarding", request.url));
  } else if (isAuthenticated && isOnboarded && isOnboardingPath) {
    response = NextResponse.redirect(new URL("/dashboard", request.url));
  } else {
    response = NextResponse.next();
  }

  return applySecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
