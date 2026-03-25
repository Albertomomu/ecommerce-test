import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRequestLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const log = createRequestLogger(request);
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      log.done(302, 'OAuth callback success', { redirect: next });
      return NextResponse.redirect(`${origin}${next}`);
    }
    log.done(302, 'OAuth callback failed', { error: error.message });
  } else {
    log.done(302, 'OAuth callback — no code present');
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
