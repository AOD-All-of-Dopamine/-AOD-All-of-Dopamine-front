import { Link } from "react-router-dom";
import type { RecNotice } from "@aod/shared/rec";

export interface RecNoticeBannerProps {
  notice: RecNotice;
}

/**
 * 대체 목록 위의 안내 (설계 §3 표).
 * 서버 사정(service_error·timeout·circuit_open·disabled·empty)에는 recNotice 가 null 을 주므로
 * 이 배너 자체가 렌더되지 않는다 — 조용히 대체 목록만 보인다.
 */
const RecNoticeBanner = ({ notice }: RecNoticeBannerProps) => (
  <section className="mt-5 flex flex-col gap-3 rounded-panel border border-line bg-surface px-5 py-[18px] shadow-card min-[640px]:flex-row min-[640px]:items-center">
    <div className="min-w-0 flex-1">
      <p className="text-[15px] font-bold text-ink">{notice.title}</p>
      <p className="mt-1 text-[13px] text-ink-2">{notice.description}</p>
    </div>
    <Link
      to={notice.actionTo}
      className="shrink-0 self-start rounded-full bg-ink px-[18px] py-2 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98] min-[640px]:self-auto"
    >
      {notice.actionLabel}
    </Link>
  </section>
);

export default RecNoticeBanner;
