import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { getServerDb } from '@/lib/firebaseServer';

export const runtime = 'nodejs';

type Context = {
  params: { shareId: string };
};

export async function GET(_req: Request, context: Context) {
  const { shareId } = context.params;
  const db = getServerDb();
  if (!db) {
    return NextResponse.json({ error: 'firebase_not_configured' }, { status: 500 });
  }

  try {
    const snap = await getDoc(doc(db, 'plFinalTablePredictionShares', shareId));
    if (!snap.exists()) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const data = snap.data() as any;
    const raw = typeof data?.snapshotJson === 'string' ? data.snapshotJson : '';
    const parsed = raw ? JSON.parse(raw) : null;
    const selectedByRank = Array.isArray(parsed?.selectedByRank) ? parsed.selectedByRank : [];

    return NextResponse.json({ shareId, selectedByRank }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
