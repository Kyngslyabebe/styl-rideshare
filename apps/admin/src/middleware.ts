import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Auth is handled client-side in the admin layout.
  // Middleware only ensures /login is accessible and passes through /admin routes.
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
