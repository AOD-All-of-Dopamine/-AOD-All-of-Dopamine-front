import { FormEvent, useState } from "react";
import {
  CircleNotch,
  GlobeHemisphereEast,
  LockSimple,
} from "@phosphor-icons/react";
import type {
  CollectionCreateBody,
  CollectionTint,
  CollectionVisibility,
} from "@aod/shared/api";
import { DOMAIN_LABEL_MAP } from "@aod/shared/constants";
import { categoryOf } from "../../constants/thumbnail";
import TintPicker from "../ui/TintPicker";
import VisibilityOption from "../ui/VisibilityOption";
import { DOMAIN_ICON } from "./domainIcon";
import { SHELF_DOMAINS } from "./shelfFormat";
import ShelfPreview from "./ShelfPreview";

const TITLE_MAX = 60;
const DESC_MAX = 300;

/** 분야마다 다른 이름 예시 - 빈 칸 앞에서 막히지 않게 */
const TITLE_EXAMPLE: Record<string, string> = {
  GAME: "인생을 갈아넣은 갓겜 모음",
  WEBTOON: "퇴근길에 몰아 보는 웹툰",
  MOVIE: "주말 밤을 책임질 영화",
  TV: "시작하면 못 끊는 시리즈",
  WEBNOVEL: "밤새 읽은 회귀·빙의·환생",
};

const fieldInputClass =
  "w-full rounded-input border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:border-ink";
const fieldLabelClass = "mb-1.5 block text-[13px] font-bold text-ink";

export interface NewShelfFormProps {
  /** <lg 상단 바의 제출 버튼이 form 속성으로 이 폼을 가리킨다 */
  formId: string;
  initialDomain: string;
  pending: boolean;
  serverError: string | null;
  onSubmit: (body: CollectionCreateBody) => void;
  onCancel: () => void;
  /** lg+ 에서만 이름 칸에 바로 포커스 (모바일은 키보드가 미리보기를 가린다) */
  autoFocusTitle?: boolean;
}

/**
 * 새 컬렉션 폼 - 맨 위 미리보기(ShelfPreview)가 입력을 그대로 비춘다.
 * 순서는 "되돌릴 수 없는 것 먼저": 이름 → 분야(만든 뒤 못 바꾼다) → 뒷벽 색 → 공개 범위 → 설명(선택).
 * 제출 버튼은 막지 않는다 - 이름이 비면 눌렀을 때 그 자리에서 알려 준다.
 */
const NewShelfForm = ({
  formId,
  initialDomain,
  pending,
  serverError,
  onSubmit,
  onCancel,
  autoFocusTitle = false,
}: NewShelfFormProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState(initialDomain);
  const [tint, setTint] = useState<CollectionTint>("PINE");
  const [visibility, setVisibility] = useState<CollectionVisibility>("PUBLIC");
  const [showTitleError, setShowTitleError] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setShowTitleError(true);
      document.getElementById("collection-title")?.focus();
      return;
    }
    if (pending) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      domain,
      tint,
      visibility,
    });
  };

  return (
    <form id={formId} onSubmit={handleSubmit}>
      <ShelfPreview
        title={title}
        domain={domain}
        tint={tint}
        visibility={visibility}
      />

      {serverError && (
        <div
          role="alert"
          className="mt-4 rounded-panel border border-danger/40 bg-danger/5 px-4 py-3 text-[13.5px] text-danger"
        >
          {serverError}
        </div>
      )}

      <div className="mt-4 rounded-panel border border-line bg-surface p-[18px] shadow-card lg:p-6">
        <div>
          <label htmlFor="collection-title" className={fieldLabelClass}>
            이름
          </label>
          <input
            id="collection-title"
            value={title}
            maxLength={TITLE_MAX}
            autoFocus={autoFocusTitle}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value.trim()) setShowTitleError(false);
            }}
            placeholder={TITLE_EXAMPLE[domain] ?? TITLE_EXAMPLE.GAME}
            aria-invalid={showTitleError}
            aria-describedby={showTitleError ? "collection-title-error" : undefined}
            className={fieldInputClass}
          />
          <div className="mt-1 flex items-baseline justify-between gap-2">
            {showTitleError ? (
              <p
                id="collection-title-error"
                className="text-xs font-semibold text-danger"
              >
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

        <fieldset className="mt-4">
          <legend className={fieldLabelClass}>분야</legend>
          <div role="radiogroup" aria-label="분야" className="flex flex-wrap gap-2">
            {SHELF_DOMAINS.map((d) => {
              const DomainIcon = DOMAIN_ICON[categoryOf(d)];
              const selected = domain === d;
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setDomain(d)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors active:scale-[0.98] ${
                    selected
                      ? "border-ink bg-ink text-surface"
                      : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink"
                  }`}
                >
                  <DomainIcon
                    size={15}
                    weight={selected ? "fill" : "regular"}
                    aria-hidden="true"
                  />
                  {DOMAIN_LABEL_MAP[d]}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-3">
            같은 분야의 작품만 꽂을 수 있고, 만든 뒤에는 바꿀 수 없어요.
          </p>
        </fieldset>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <fieldset>
            <legend className={fieldLabelClass}>뒷벽 색</legend>
            <TintPicker value={tint} onChange={setTint} ariaLabel="뒷벽 색" />
          </fieldset>
          <fieldset>
            <legend className={fieldLabelClass}>공개 범위</legend>
            <div role="radiogroup" aria-label="공개 범위" className="flex gap-2">
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
          </fieldset>
        </div>

        <div className="mt-5">
          <label htmlFor="collection-desc" className={fieldLabelClass}>
            설명 <span className="font-medium text-ink-3">(선택)</span>
          </label>
          <textarea
            id="collection-desc"
            value={description}
            maxLength={DESC_MAX}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="어떤 작품을 모으는 컬렉션인지 한두 줄로"
            className={`${fieldInputClass} resize-none`}
          />
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <p className="text-xs text-ink-3">컬렉션 카드와 상세 상단에 보여요.</p>
            <span className="text-xs tabular-nums text-ink-3">
              {description.length}/{DESC_MAX}
            </span>
          </div>
        </div>
      </div>

      {/* lg+ 액션 행 - <lg 는 상단 바의 제출 버튼이 맡는다 */}
      <div className="mt-5 hidden items-center justify-end gap-2.5 lg:flex">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-line-strong bg-surface px-[18px] py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink active:scale-[0.98]"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent-ink px-[22px] py-2.5 text-sm font-bold text-surface transition-opacity hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending && (
            <CircleNotch size={15} className="animate-spin" aria-hidden="true" />
          )}
          {pending ? "만드는 중" : "만들고 작품 꽂기"}
        </button>
      </div>
    </form>
  );
};

export default NewShelfForm;
