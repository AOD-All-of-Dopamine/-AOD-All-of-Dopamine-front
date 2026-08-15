import { Link } from "react-router-dom";
import { Stack } from "@phosphor-icons/react";
import EmptyState from "../components/ui/EmptyState";

/**
 * C-FE2 전까지의 자리 라우트 (/collections/new · /collections/:id/edit).
 * 발견·상세의 진입점(새 컬렉션, 편집)이 404로 떨어지지 않게 받아두는 임시 표면 -
 * C-FE2가 생성/편집 페이지로 교체한다.
 */
export default function CollectionWipPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-10 lg:px-6 lg:py-14">
      <EmptyState
        icon={<Stack size={44} />}
        title="이 화면은 아직 준비 중이에요"
        description="컬렉션 만들기·편집 기능이 곧 열려요."
        action={
          <Link
            to="/collections"
            className="inline-block rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]"
          >
            컬렉션으로 돌아가기
          </Link>
        }
      />
    </div>
  );
}
