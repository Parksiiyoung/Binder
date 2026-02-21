import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/threads";
import { saveToken } from "@/lib/token";

// GET /api/auth/threads/callback - OAuth callback
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/settings?error=no_code", request.url)
    );
  }

  try {
    const token = await exchangeCodeForToken(code);
    await saveToken(token);

    return NextResponse.redirect(
      new URL("/settings?success=true", request.url)
    );
  } catch (err) {
    console.error("Threads OAuth error:", err);
    return NextResponse.redirect(
      new URL("/settings?error=token_exchange_failed", request.url)
    );
  }
}
