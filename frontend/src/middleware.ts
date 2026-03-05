import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('acw_token')?.value ||
                request.headers.get('authorization');
  const isLoginPage = request.nextUrl.pathname === '/login';

  if (!isLoginPage && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (isLoginPage && token) {
    return NextResponse.redirect(new URL('/war-room', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
