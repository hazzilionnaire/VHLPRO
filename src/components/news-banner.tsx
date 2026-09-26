import { getLatestNews } from "@/lib/news";
import { formatGameDate } from "@/lib/datetime";

/**
 * The most recent line written about the league, across the top of the page.
 * Generated from the recorded stats, so it's only ever as accurate as the
 * scoresheet someone typed in.
 */
export async function NewsBanner() {
  const news = await getLatestNews().catch(() => null);
  if (!news) return null;

  return (
    <section className="rounded-2xl border border-ice-500/30 bg-ice-600/10 px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-ice-400 uppercase">
          From the rink
        </p>
        <span className="text-[10px] text-muted">{formatGameDate(news.created_at)}</span>
      </div>

      <p className="mt-2 text-lg leading-snug font-semibold text-chalk">{news.headline}</p>
      {news.body && <p className="mt-1 text-sm text-muted">{news.body}</p>}
    </section>
  );
}
