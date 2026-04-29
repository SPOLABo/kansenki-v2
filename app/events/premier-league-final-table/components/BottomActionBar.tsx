import { useRouter } from 'next/navigation';

export function BottomActionBar({
  saveState,
  savedAtText,
  isLoggedIn,
  onSave,
  onShare,
  onReset,
}: {
  saveState: 'idle' | 'saving' | 'saved';
  savedAtText: string;
  isLoggedIn: boolean;
  onSave: () => void;
  onShare: () => void;
  onReset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999]">
      <div className="mx-auto max-w-3xl px-4 pb-4">
        <div className="rounded-2xl border border-black/10 bg-white/80 backdrop-blur px-3 py-3">
          <div className="px-1 pb-2 text-[11px] font-semibold text-slate-500">
            {saveState === 'saving' ? '保存中...' : saveState === 'saved' ? `保存済み：${savedAtText}` : ''}
          </div>
          <div className="flex items-center justify-between gap-2">
            {!isLoggedIn ? (
              <button
                type="button"
                onClick={() => router.push(`/login?redirect=${encodeURIComponent('/events/premier-league-final-table')}`)}
                className="flex-1 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400"
              >
                ログインして保存
              </button>
            ) : (
              <button
                type="button"
                onClick={onSave}
                disabled={saveState === 'saving'}
                className="flex-1 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400"
              >
                {saveState === 'saving' ? '保存中...' : '保存'}
              </button>
            )}
            <button
              type="button"
              onClick={onShare}
              className="flex-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              シェア
            </button>
            <button
              type="button"
              onClick={onReset}
              className="flex-1 rounded-full bg-black/5 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-black/10"
            >
              リセット
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
