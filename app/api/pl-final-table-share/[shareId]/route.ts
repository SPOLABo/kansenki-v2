import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Context = {
  params: { shareId: string };
};

export async function GET(_req: Request, context: Context) {
  void _req;
  void context;
  return NextResponse.json({ error: 'not_found' }, { status: 404 });
}
