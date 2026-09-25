import { getLatestNews } from "@/lib/news";
import { formatGameDate } from "@/lib/datetime";

/**
 * The most recent line written about the league, across the top of the page.
 * Marked as written by a machine, because it is, and because it's drawn from
 * a scoresheet someone typed in — it can be as wrong as the numbers are.
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

      <p className="mt-3 text-[10px] text-rink-600">Written by AI from the recorded stats</p>
    </section>
  );
}
