import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { CircleNotch, SignIn, X } from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import { useCreateCollection } from "@aod/shared/hooks";
import { useIsLg } from "../hooks/useIsLg";
import EmptyState from "../components/ui/EmptyState";
import NewShelfForm from "../components/shelf/NewShelfForm";
import { SHELF_DOMAINS } from "../components/shelf/shelfFormat";

/**
 * /collections/new - 새 컬렉션 = 내 책장에 선반 한 단을 더 다는 일.
 * 폼(NewShelfForm) 맨 위의 미리보기가 입력을 그대로 비춘다 - 이름은 이름표, 분야는 빈 책등의
 * 규격, 색은 뒷벽. 만들고 나면 편집 화면이 아니라 **그 책장(상세)으로** 가서 "작품 꽂기"가
 * 열린 채로 시작한다 - 만들기와 채우기가 끊기지 않게. (제목·색·공개 범위를 고치는 일은 편집 화면.)
 *
 * - 분야 선택지는 5종(영화/시리즈 분리) - 서버 domain 이 Domain enum 단수라 통합 선택이 불가하다.
 * - ?domain= 프리필 (담기 메뉴의 "새 컬렉션 만들기" 진입 경로).
 */

const FORM_ID = "new-shelf-form";

const parseDomainParam = (raw: string | null): string => {
  const upper = raw?.toUpperCase() ?? "";
  return (SHELF_DOMAINS as readonly string[]).includes(upper) ? upper : "GAME";
};

export default function CollectionNewPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const isLg = useIsLg();
  const createMutation = useCreateCollection();

  // 명시 경로로 닫기 - 편집 페이지(상세/발견)와 대칭, 히스토리 상태 무관 동작
  const handleClose = () => navigate("/collections");

  // 서버가 준 문구(검증 실패 등)가 있으면 그대로, 없으면(네트워크 오류 등) 일반 안내
  const serverError: string | null = createMutation.isError
    ? ((axios.isAxiosError(createMutation.error)
        ? (createMutation.error.response?.data as { error?: string } | undefined)
            ?.error
        : undefined) ?? "컬렉션을 만들지 못했어요. 잠시 후 다시 시도해 주세요.")
    : null;

  /** <lg 는 SiteHeader 가 숨는 라우트라 자체 상단 바가 필요하다 */
  const topBar = (action?: React.ReactNode) => (
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
      {action}
    </div>
  );

  if (!isAuthenticated) {
    return (
      <>
        {topBar()}
        <div className="mx-auto max-w-[720px] px-4 py-10 lg:px-6 lg:py-14">
          <EmptyState
            icon={<SignIn size={44} />}
            title="로그인하면 컬렉션을 만들 수 있어요"
            description="취향이 담긴 나만의 책장을 꾸려보세요."
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
    <>
      {topBar(
        <button
          type="submit"
          form={FORM_ID}
          disabled={createMutation.isPending}
          className="mr-2 inline-flex flex-none items-center gap-1.5 rounded-full bg-accent-ink px-4 py-2 text-[13.5px] font-bold text-surface transition-opacity active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createMutation.isPending && (
            <CircleNotch size={14} className="animate-spin" aria-hidden="true" />
          )}
          {createMutation.isPending ? "만드는 중" : "만들기"}
        </button>,
      )}

      <div className="mx-auto max-w-[760px] px-4 pb-16 pt-5 lg:px-6 lg:pb-20 lg:pt-8">
        <div className="mb-4 hidden lg:mb-5 lg:block">
          <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink">
            새 컬렉션
          </h1>
          <p className="mt-1 text-[14.5px] text-ink-2">
            내 책장에 선반 한 단을 더 답니다. 만들고 나면 바로 작품을 꽂을 수 있어요.
          </p>
        </div>

        <NewShelfForm
          formId={FORM_ID}
          initialDomain={parseDomainParam(searchParams.get("domain"))}
          pending={createMutation.isPending}
          serverError={serverError}
          autoFocusTitle={isLg}
          onCancel={handleClose}
          onSubmit={(body) =>
            createMutation.mutate(body, {
              // 빈 책장의 상세로 - 그 화면에서 "작품 꽂기"가 열린 채로 시작한다.
              // replace: 뒤로가기가 생성 폼으로 돌아오지 않게
              onSuccess: (created) =>
                navigate(`/collections/${created.id}`, {
                  replace: true,
                  state: { justCreated: true },
                }),
            })
          }
        />
      </div>
    </>
  );
}
