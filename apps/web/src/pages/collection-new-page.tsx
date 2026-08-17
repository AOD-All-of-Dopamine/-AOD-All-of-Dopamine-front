import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  CircleNotch,
  GlobeHemisphereEast,
  LockSimple,
  SignIn,
  X,
} from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import { useCreateCollection } from "@aod/shared/hooks";
import {
  CollectionTint,
  CollectionVisibility,
} from "@aod/shared/api";
import { DOMAIN_LABEL_MAP } from "@aod/shared/constants";
import CollectionCollage from "../components/ui/CollectionCollage";
import TintPicker from "../components/ui/TintPicker";
import VisibilityOption from "../components/ui/VisibilityOption";
import EmptyState from "../components/ui/EmptyState";

/**
 * /collections/new - 컬렉션 생성 (플랜 C-FE2).
 * 목업 3(편집)의 좌측 꾸미기 패널 문법을 생성 폼으로 재구성 - 커버 미리보기
 * (포스터 0장 + 틴트 veil), 틴트 6종, 이름(60자)/설명(300자), 도메인 선택
 * (생성 시만 - PATCH는 domain 불가), 공개 설정. POST 후 편집 화면으로 이동해
 * 바로 작품을 채울 수 있게 한다.
 *
 * 목업·계약 대비 편차:
 * - 도메인 선택지는 5종(영화/시리즈 분리) - 서버 domain이 Domain enum 단수라
 *   "영화·시리즈" 통합 선택이 불가하다 (표기는 발견/상세에서 통합).
 * - ?domain= 프리필 (담기 메뉴의 "새 컬렉션 만들기" 진입 경로).
 */

const DOMAIN_OPTIONS = ["GAME", "WEBTOON", "MOVIE", "TV", "WEBNOVEL"] as const;

const TITLE_MAX = 60;
const DESC_MAX = 300;

const parseDomainParam = (raw: string | null): string => {
  const upper = raw?.toUpperCase() ?? "";
  return (DOMAIN_OPTIONS as readonly string[]).includes(upper) ? upper : "GAME";
};

const fieldInputClass =
  "w-full rounded-input border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-3";

const fieldLabelClass = "mb-1.5 block text-[13px] font-bold text-ink";

export default function CollectionNewPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState<string>(() =>
    parseDomainParam(searchParams.get("domain")),
  );
  const [tint, setTint] = useState<CollectionTint>("PINE");
  const [visibility, setVisibility] = useState<CollectionVisibility>("PUBLIC");
  const [showTitleError, setShowTitleError] = useState(false);

  const createMutation = useCreateCollection();

  const valid = title.trim().length > 0;

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!valid) {
      setShowTitleError(true);
      return;
    }
    if (createMutation.isPending) return;
    createMutation.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        domain,
        tint,
        visibility,
      },
      {
        // 빈 컬렉션이므로 편집 화면으로 - 작품 추가 동선 안내가 그곳에 있다.
        // replace: 뒤로가기가 생성 폼으로 돌아오지 않게
        onSuccess: (created) =>
          navigate(`/collections/${created.id}/edit`, { replace: true }),
      },
    );
  };

  // 명시 경로로 닫기 - 편집 페이지(상세/발견)와 대칭, 히스토리 상태 무관 동작
  const handleClose = () => navigate("/collections");

  const serverError = createMutation.isError
    ? ((axios.isAxiosError(createMutation.error) &&
        (createMutation.error.response?.data as { error?: string } | undefined)
          ?.error) ??
      "컬렉션을 만들지 못했어요. 잠시 후 다시 시도해 주세요.")
    : null;

  const submitLabel = createMutation.isPending ? (
    <span className="inline-flex items-center gap-1.5">
      <CircleNotch size={15} className="animate-spin" aria-hidden="true" />
      만드는 중
    </span>
  ) : (
    "만들기"
  );

  if (!isAuthenticated) {
    return (
      <>
        {/* <lg는 SiteHeader가 숨는 라우트라 게이트 화면에도 자체 상단 바 필요 */}
        <div className="sticky top-0 z-40 flex h-14 items-center gap-0.5 border-b border-line bg-surface/90 px-2 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={handleClose}
            aria-label="닫기"
            className="grid h-11 w-11 flex-none place-items-center rounded-full text-ink transition-colors active:bg-ink/5"
          >
            <X size={21} />
          </button>
          <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">
            새 컬렉션
          </span>
        </div>
        <div className="mx-auto max-w-[720px] px-4 py-10 lg:px-6 lg:py-14">
          <EmptyState
            icon={<SignIn size={44} />}
            title="로그인하면 컬렉션을 만들 수 있어요"
            description="취향이 담긴 나만의 목록을 꾸려보세요."
            action={
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]"
              >
                로그인
              </button>
            }
          />
        </div>
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* <lg 상단 바 - X + 제목 + 만들기 (목업 5c 편집 바 문법) */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-0.5 border-b border-line bg-surface/90 px-2 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={handleClose}
          aria-label="닫기"
          className="grid h-11 w-11 flex-none place-items-center rounded-full text-ink transition-colors active:bg-ink/5"
        >
          <X size={21} />
        </button>
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">
          새 컬렉션
        </span>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="mr-2 flex-none rounded-full bg-accent-ink px-4 py-2 text-[13.5px] font-bold text-surface transition-opacity active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </div>

      <div className="mx-auto max-w-[640px] px-4 pb-16 pt-5 lg:px-6 lg:pb-20 lg:pt-8">
        <div className="hidden lg:block">
          <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink">
            새 컬렉션
          </h1>
          <p className="mt-1 text-[14.5px] text-ink-2">
            취향이 담긴 목록의 틀을 만들고, 작품은 편집에서 채워보세요.
          </p>
        </div>

        {serverError && (
          <div
            role="alert"
            className="mt-4 rounded-panel border border-danger/40 bg-danger/5 px-4 py-3 text-[13.5px] text-danger lg:mt-5"
          >
            {serverError}
          </div>
        )}

        {/* 커버 틴트 (목업 .edit-panel + 5c 커버 미리보기) */}
        <section className="mt-4 rounded-panel border border-line bg-surface p-[18px] shadow-card lg:mt-6">
          <h2 className="text-sm font-extrabold text-ink">커버 틴트</h2>
          <CollectionCollage
            posters={[]}
            tint={tint}
            domain={domain}
            className="mt-3 aspect-video rounded-input"
          />
          <TintPicker value={tint} onChange={setTint} className="mt-3.5" />
          <p className="mt-2.5 text-xs leading-relaxed text-ink-3">
            커버는 담긴 작품 포스터로 자동 구성되고, 틴트가 살짝 덮여 컬렉션의
            분위기를 만듭니다.
          </p>
        </section>

        {/* 소개 */}
        <section className="mt-4 rounded-panel border border-line bg-surface p-[18px] shadow-card">
          <h2 className="text-sm font-extrabold text-ink">소개</h2>
          <div className="mt-3">
            <label htmlFor="collection-title" className={fieldLabelClass}>
              이름
            </label>
            <input
              id="collection-title"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value.trim()) setShowTitleError(false);
              }}
              placeholder="예) 인생을 갈아넣은 갓겜 모음"
              aria-invalid={showTitleError}
              className={fieldInputClass}
            />
            <div className="mt-1 flex items-baseline justify-between gap-2">
              {showTitleError ? (
                <p className="text-xs font-semibold text-danger">
                  이름을 입력해 주세요.
                </p>
              ) : (
                <span />
              )}
              <span className="text-xs tabular-nums text-ink-3">
                {title.length}/{TITLE_MAX}
              </span>
            </div>
          </div>
          <div className="mt-2.5">
            <label htmlFor="collection-desc" className={fieldLabelClass}>
              설명
            </label>
            <textarea
              id="collection-desc"
              value={description}
              maxLength={DESC_MAX}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="이 컬렉션에 담을 이야기를 소개해 주세요"
              className={`${fieldInputClass} resize-none`}
            />
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <p className="text-xs text-ink-3">
                컬렉션 카드와 상세 상단에 보여요.
              </p>
              <span className="text-xs tabular-nums text-ink-3">
                {description.length}/{DESC_MAX}
              </span>
            </div>
          </div>
        </section>

        {/* 도메인 - 생성 시만 선택 가능 (PATCH는 domain 불가) */}
        <section className="mt-4 rounded-panel border border-line bg-surface p-[18px] shadow-card">
          <h2 className="text-sm font-extrabold text-ink">도메인</h2>
          <div
            role="radiogroup"
            aria-label="도메인"
            className="mt-3 flex flex-wrap gap-2"
          >
            {DOMAIN_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={domain === d}
                onClick={() => setDomain(d)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors active:scale-[0.98] ${
                  domain === d
                    ? "border-ink bg-ink text-surface"
                    : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink"
                }`}
              >
                {DOMAIN_LABEL_MAP[d]}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-xs text-ink-3">
            컬렉션에는 같은 도메인의 작품만 담을 수 있고, 만든 뒤에는 바꿀 수
            없어요.
          </p>
        </section>

        {/* 공개 설정 */}
        <section className="mt-4 rounded-panel border border-line bg-surface p-[18px] shadow-card">
          <h2 className="text-sm font-extrabold text-ink">공개 설정</h2>
          <div
            role="radiogroup"
            aria-label="공개 설정"
            className="mt-3 flex gap-2"
          >
            <VisibilityOption
              active={visibility === "PUBLIC"}
              onClick={() => setVisibility("PUBLIC")}
              icon={<GlobeHemisphereEast size={16} aria-hidden="true" />}
              label="공개"
            />
            <VisibilityOption
              active={visibility === "PRIVATE"}
              onClick={() => setVisibility("PRIVATE")}
              icon={<LockSimple size={16} aria-hidden="true" />}
              label="나만 보기"
            />
          </div>
        </section>

        {/* lg+ 액션 행 - <lg는 상단 바의 만들기 버튼이 담당 */}
        <div className="mt-6 hidden items-center justify-end gap-2.5 lg:flex">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-line-strong bg-surface px-[18px] py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink active:scale-[0.98]"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-full bg-accent-ink px-[22px] py-2.5 text-sm font-bold text-surface transition-opacity hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
