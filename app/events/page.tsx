export default function EventsPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-bold">イベント情報</h1>
      <div className="mt-4">
        <a
          href="/events/premier-league-final-table"
          className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-950"
        >
          <div className="text-sm font-semibold text-gray-900 dark:text-white">Premier League 最終順位予想</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">並べ替えで順位予想（ローカル保存）</div>
        </a>
      </div>
    </div>
  );
}
