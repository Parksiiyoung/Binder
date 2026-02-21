import { NextResponse } from "next/server";
import { getThreadsAuthUrl } from "@/lib/threads";

// GET /api/auth/threads - Redirect to Threads OAuth
export async function GET() {
  const authUrl = getThreadsAuthUrl();
  return NextResponse.redirect(authUrl);
}
