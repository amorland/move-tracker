import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'logout') {
    const response = NextResponse.json({ success: true });
    response.cookies.delete('move_tracker_auth');
    return response;
  }

  const appPassword = process.env.APP_PASSWORD;

  if (password === appPassword) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('move_tracker_auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    return response;
  }

  return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
}
