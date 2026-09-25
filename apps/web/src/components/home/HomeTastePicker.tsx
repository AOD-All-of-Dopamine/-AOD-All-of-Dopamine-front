import { useEffect, useReducer, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CaretRight } from "@phosphor-icons/react";
import { HOME_PICK_SOURCE } from "@aod/shared/constants";
import { useSetReaction } from "@aod/shared/hooks";
import {
  EMPTY_ONBOARDING_SELECTION,
  ONBOARDING_MIN_PICKS,
  canFinishOnboarding,
  isPicked,
  isSaved,
  onboardingReducer,
  onboardingSaveMessage,
  pendingPicks,
  recErrorStatus,
  runOnboardingSave,
  toOnboardingPick,
} from "@aod/shared/rec";
import type { RecRequestContext } from "@aod/shared/tracking";
import type { WorkSummary } from "@aod/shared/types";
import OnboardingWorkTile from "../onboarding/OnboardingWorkTile";

/** 홈에서 고른 좋아요의 맥락 — 서버가 reaction_changed.payload.source 로 남긴다. 온보딩 페이지와 구분된다. */
const HOME_PICK_REC: RecRequestContext = { source: HOME_PICK_SOURCE };

const isAuthError = (error: unknown) => recErrorStatus(error) === 401;

export interface HomeTastePickerProps {
  /** 고를 후보 — no_seed 응답의 대체 목록(랭킹 기반 · 성인 제외 · 웹툰 없음). */
  candidates: WorkSummary[];
  /** 전부 담겼다 — 추천을 다시 받는다(부모가 캐시를 비운다). */
  onSaved: () => void;
  /** 부분 실패 등 알릴 것. 인증 만료는 전역 안내(#49)가 맡으므로 부르지 않는다. */
  notify: (message: string) => void;
}

/**
 * 좋아요가 하나도 없을 때 홈에서 바로 작품을 고르는 줄 (홈 설계 2026-09-25 "인라인 취향 고르기").
 * 온보딩 페이지와 **같은 규칙**(최소 3개 · 저장 큐 · 부분 실패는 고른 채로 남겨 재시도)을 shared 조각으로 쓴다.
 * 온보딩 페이지는 저장 뒤 페이지를 옮기고, 여기는 제자리에서 추천으로 바뀐다 — 그 결선만 다르다.
 *
 * 부분 실패면 캐시를 비우지 않는다: 비우면 시드가 생겨 이 줄이 추천으로 바뀌면서
 * 실패한 작품과 재시도 수단이 함께 사라진다. 전부 담긴 뒤에 비운다.
 */
const HomeTastePicker = ({ candidates, onSaved, notify }: HomeTastePickerProps) => {
  const { mutateAsync: setReactionAsync } = useSetReaction();
  const [selection, dispatch] = useReducer(onboardingReducer, EMPTY_ONBOARDING_SELECTION);
  const [saving, setSaving] = useState(false);
  /** `고르기 끝` 연타로 저장이 두 번 시작되지 않게 상태와 별도로 잡는다. */
  const savingRef = useRef(false);
  /** 저장 도중 홈을 떠났으면 이 컴포넌트 상태를 건드리지 않는다. */
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const pickedCount = selection.picks.length;
  const canFinish = canFinishOnboarding(selection);

  const toggle = (work: WorkSummary) => {
    if (isSaved(selection, work.id)) {
      notify("이미 좋아요에 담긴 작품이에요");
      return;
    }
    dispatch({ type: "toggle", pick: toOnboardingPick(work) });
  };

  const finish = async () => {
    if (savingRef.current || !canFinish) return;
    const pending = pendingPicks(selection);
    if (pending.length === 0) {
      onSaved();
      return;
    }
    savingRef.current = true;
    setSaving(true);
    // runOnboardingSave 는 절대 거부되지 않는다 — 성공·실패를 갈라서 돌려준다.
    const result = await runOnboardingSave(
      pending.map((pick) => pick.contentId),
      (contentId) => setReactionAsync({ contentId, state: "LIKE", rec: HOME_PICK_REC }),
      { isAuthError },
    );
    savingRef.current = false;
    if (!aliveRef.current) return;
    setSaving(false);

    const savedNow = pending.filter((pick) => result.saved.includes(pick.contentId));
    if (savedNow.length > 0) dispatch({ type: "saved", picks: savedNow });

    // 인증 만료: 전역 로그아웃(#49)이 "로그인이 만료됐어요"를 띄우고 추천 캐시를 지운다 —
    // 여기서도 띄우면 같은 자리에 토스트가 두 장 겹친다.
    if (result.authFailed) return;
    if (result.failed.length > 0) {
      const message = onboardingSaveMessage(result);
      if (message) notify(message);
      return;
    }
    onSaved();
  };

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-[13.5px] text-ink-2">
          좋아하는 작품을 {ONBOARDING_MIN_PICKS}개 고르면 취향 추천을 시작할게요
        </p>
        <button
          type="button"
          onClick={() => void finish()}
          disabled={!canFinish || saving}
          className="rounded-full bg-ink px-[18px] py-2 text-[13.5px] font-semibold text-surface transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:bg-line-strong disabled:opacity-100"
        >
          {saving ? "담는 중…" : canFinish ? "고르기 끝" : `${pickedCount} / ${ONBOARDING_MIN_PICKS} 골랐어요`}
        </button>
      </div>

      <div
        role="region"
        aria-label="고를 작품"
        tabIndex={0}
        className="scrollbar-rail mt-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-1.5"
      >
        {candidates.map((work) => (
          <div key={work.id} className="w-[168px] flex-none snap-start">
            <OnboardingWorkTile
              work={work}
              selected={isPicked(selection, work.id)}
              onToggle={toggle}
              disabled={saving}
            />
          </div>
        ))}
      </div>

      <Link
        to="/onboarding"
        className="mt-3 inline-flex items-center gap-[3px] text-[13px] font-semibold text-ink-2 transition-colors hover:text-accent-ink"
      >
        더 많은 작품에서 고르기
        <CaretRight size={13} />
      </Link>
    </div>
  );
};

export default HomeTastePicker;
