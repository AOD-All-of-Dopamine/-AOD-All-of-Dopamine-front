import { useWorks } from "@aod/shared/hooks";
import { DOMAIN_LABEL_MAP } from "@aod/shared/constants";
import DomainRotator, { type RotatorSlide } from "./DomainRotator";
import RailCard from "./RailCard";

const DEMO_DOMAINS = ["MOVIE", "TV", "GAME", "WEBTOON", "WEBNOVEL"] as const;

/**
 * dev 갤러리(/dev/components) 전용 - 홈의 도메인별 슬라이드를 작품 목록 API 로 돌려 본다.
 * 로컬 DB 에는 최근 3개월 신작·출시 예정·랭킹이 거의 없어 실제 홈에서는 회전을 볼 수 없다.
 * 간격을 짧게(3.5초) 둬서 자동 넘김·호버 멈춤·칩 선택·멈춤 버튼을 바로 확인한다.
 */
const DomainRotatorDemo = () => {
  const movie = useWorks({ domain: "MOVIE", size: 8 });
  const tv = useWorks({ domain: "TV", size: 8 });
  const game = useWorks({ domain: "GAME", size: 8 });
  const webtoon = useWorks({ domain: "WEBTOON", size: 8 });
  const webnovel = useWorks({ domain: "WEBNOVEL", size: 8 });
  const byDomain = [movie, tv, game, webtoon, webnovel];

  const slides: RotatorSlide[] = DEMO_DOMAINS.flatMap((domain, i) => {
    const works = byDomain[i].data?.content ?? [];
    if (works.length === 0) return [];
    return [
      {
        id: domain,
        label: DOMAIN_LABEL_MAP[domain],
        preload: works.map((w) => w.thumbnail),
        content: (
          <div className="scrollbar-rail flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-1.5">
            {works.map((work) => (
              <RailCard
                key={work.id}
                title={work.title}
                meta={DOMAIN_LABEL_MAP[work.domain]}
                imageUrl={work.thumbnail}
                domain={work.domain}
                to={`/work/${work.id}`}
              />
            ))}
          </div>
        ),
      },
    ];
  });

  if (slides.length === 0) {
    return <p className="text-sm text-ink-2">작품을 불러오는 중이에요.</p>;
  }
  return (
    <div className="-mt-14">
      <DomainRotator
        title="새로 나온 작품"
        moreLabel="전체 보기"
        moreTo="/new"
        slides={slides}
        intervalMs={3500}
      />
    </div>
  );
};

export default DomainRotatorDemo;
