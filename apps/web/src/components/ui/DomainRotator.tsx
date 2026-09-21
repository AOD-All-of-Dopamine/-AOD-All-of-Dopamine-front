import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CaretRight, Pause, Play } from "@phosphor-icons/react";
import { useAutoRotate } from "../../hooks/useAutoRotate";

export interface RotatorSlide {
  id: string;
  /** 칩 라벨 (예: "게임") */
  label: string;
  content: ReactNode;
  /** 이 슬라이드의 이미지 URL - 차례가 오기 전에 미리 받아 둔다(들어오면서 빈 썸네일이 보이지 않게) */
  preload?: (string | null | undefined)[];
}

export interface DomainRotatorProps {
  title: string;
  moreLabel?: string;
  moreTo?: string;
  slides: RotatorSlide[];
  intervalMs?: number;
  startDelayMs?: number;
}

/** 나가는 슬라이드를 걷어 내는 시점 - index.css 의 .rotator-* 애니메이션 길이(0.5s)보다 조금 뒤 */
const LEAVE_MS = 540;
const preloaded = new Set<string>();

const chipClass =
  "relative inline-flex shrink-0 items-center overflow-hidden whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors active:scale-[0.98]";

/**
 * 홈 섹션 하나를 도메인별 슬라이드로 돌린다 - 제목 옆 칩이 "지금 어느 도메인인지"이자 직접 고르는 손잡이다.
 * 시간이 지나면 다음 도메인이 옆에서 밀고 들어온다(useAutoRotate - 호버·포커스·화면 밖·동작 줄이기에서는 멈춘다).
 * 활성 칩 아래의 진행 막대가 남은 시간을 보여 주고, 멈춤 버튼으로 끌 수 있다.
 * 화면에는 지금 슬라이드(와 나가는 중인 슬라이드)만 올린다 - 가려진 슬라이드의 링크가 Tab 에 걸리지 않게.
 * 슬라이드가 하나면 칩도 회전도 없다.
 */
const DomainRotator = ({
  title,
  moreLabel,
  moreTo,
  slides,
  intervalMs = 7000,
  startDelayMs = 0,
}: DomainRotatorProps) => {
  const rotate = useAutoRotate({
    ids: slides.map((s) => s.id),
    intervalMs,
    startDelayMs,
  });
  const current = slides.find((s) => s.id === rotate.currentId) ?? slides[0];

  // 나가는 슬라이드 - 전환 동안만 위에 겹쳐 두었다가 걷는다.
  // 렌더 중에 바로 잡는다(이펙트로 미루면 새 슬라이드가 제자리에 한 프레임 보였다가 튄다).
  const [shownId, setShownId] = useState(current?.id);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  if (current?.id !== shownId) {
    setShownId(current?.id);
    setLeavingId(shownId ?? null);
  }
  useEffect(() => {
    if (leavingId === null) return;
    const timer = window.setTimeout(() => setLeavingId(null), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leavingId, current?.id]);

  // 다음 차례의 이미지를 미리 받아 둔다
  useEffect(() => {
    if (slides.length < 2 || !current) return;
    const next = slides[(slides.indexOf(current) + 1) % slides.length];
    for (const url of next.preload ?? []) {
      if (!url || preloaded.has(url)) continue;
      preloaded.add(url);
      new Image().src = url;
    }
  }, [slides, current]);

  if (!current) return null;
  const leaving = slides.find((s) => s.id === leavingId && s.id !== current.id);
  const multiple = slides.length > 1;
  const enterClass = leaving
    ? rotate.direction === 1
      ? "rotator-in-right"
      : "rotator-in-left"
    : "";
  const leaveClass =
    rotate.direction === 1 ? "rotator-out-left" : "rotator-out-right";

  return (
    <section
      {...rotate.bind}
      aria-roledescription={multiple ? "carousel" : undefined}
      aria-label={title}
      className="mt-14"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <h2 className="text-[21px] font-extrabold tracking-[-0.02em] text-ink">
          {title}
        </h2>
        {multiple && (
          <div className="order-3 -mx-6 flex w-[calc(100%+3rem)] items-center gap-1.5 overflow-x-auto px-6 scrollbar-hide sm:order-none sm:mx-0 sm:w-auto sm:px-0">
            {slides.map((slide) => {
              const active = slide.id === current.id;
              return (
                <button
                  key={slide.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => rotate.select(slide.id)}
                  className={`${chipClass} ${
                    active
                      ? "border-ink bg-ink text-surface"
                      : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink"
                  }`}
                >
                  {slide.label}
                  {active && rotate.running && (
                    <span
                      key={rotate.cycle}
                      aria-hidden="true"
                      className="rotator-progress"
                      style={{ "--rotator-ms": `${intervalMs}ms` } as CSSProperties}
                    />
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={rotate.toggleUserPaused}
              aria-label={rotate.userPaused ? "자동 넘김 켜기" : "자동 넘김 멈추기"}
              aria-pressed={rotate.userPaused}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink motion-reduce:hidden"
            >
              {rotate.userPaused ? (
                <Play size={14} weight="fill" />
              ) : (
                <Pause size={14} weight="fill" />
              )}
            </button>
          </div>
        )}
        {moreLabel && moreTo && (
          <Link
            to={moreTo}
            className="ml-auto inline-flex items-center gap-[3px] text-sm font-semibold text-ink-2 transition-colors hover:text-accent-ink"
          >
            {moreLabel}
            <CaretRight size={14} />
          </Link>
        )}
      </div>

      <div className="rotator-viewport">
        {leaving && (
          <div
            key={`leave-${leaving.id}`}
            aria-hidden="true"
            ref={(node) => {
              if (node) node.inert = true;
            }}
            className={`rotator-leaving ${leaveClass}`}
          >
            {leaving.content}
          </div>
        )}
        <div
          key={current.id}
          role={multiple ? "group" : undefined}
          aria-roledescription={multiple ? "slide" : undefined}
          aria-label={multiple ? `${current.label} ${title}` : undefined}
          className={enterClass}
        >
          {current.content}
        </div>
      </div>
    </section>
  );
};

export default DomainRotator;
