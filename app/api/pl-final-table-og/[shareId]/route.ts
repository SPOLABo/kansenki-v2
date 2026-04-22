export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Context = {
  params: { shareId: string };
};

export async function GET(req: Request, context: Context) {
  void req;
  void context;
  return new Response('not_found', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function HEAD(req: Request, context: Context) {
  return GET(req, context);
}
