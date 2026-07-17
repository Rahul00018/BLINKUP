import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "./lib/supabase/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createMiddlewareClient(request, response);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = request.nextUrl.clone();
  const { pathname } = url;

  // Bypass static files, api routes, and callbacks
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/auth/callback"
  ) {
    return response;
  }

  const isAuthRoute = pathname.startsWith("/auth/login") || pathname.startsWith("/auth/signup");
  const isOnboardingRoute = pathname === "/onboarding";

  // Unauthenticated user
  if (!session) {
    if (!isAuthRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/auth/login";
      if (pathname !== "/") {
        redirectUrl.searchParams.set("redirect", request.url);
      }
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  // Authenticated user
  if (isAuthRoute) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Check onboarding status
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", session.user.id)
    .single();

  const onboardingComplete = profile?.onboarding_complete ?? false;

  if (!onboardingComplete && !isOnboardingRoute) {
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  if (onboardingComplete && isOnboardingRoute) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
