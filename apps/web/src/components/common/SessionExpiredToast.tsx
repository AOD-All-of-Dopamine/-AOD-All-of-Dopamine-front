import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/useToast";
import Toast from "../ui/Toast";

/** 안내 토스트라 되돌리기(5초)보다 조금 길게 둔다. */
const SESSION_TOAST_MS = 8000;

/**
 * 로그인 만료 안내. 공용 레이아웃에 한 번만 둔다.
 *
 * 로그인 화면으로 강제로 보내지 않는다 — 공개 화면을 보던 사람까지 튕겨 나가게 된다.
 * 로그인이 필요한 화면은 각자의 가드가 처리한다. 이미 로그인 화면에 있으면 이동 버튼은 뺀다.
 */
const SessionExpiredToast = () => {
  const { sessionExpiredAt, dismissSessionExpired } = useAuth();
  const { toast, show, hide } = useToast(SESSION_TOAST_MS);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onLoginPage = pathname === "/login";

  useEffect(() => {
    if (sessionExpiredAt === null) return;
    const id = show(
      onLoginPage
        ? { message: "로그인이 만료됐어요" }
        : {
            message: "로그인이 만료됐어요",
            actionLabel: "다시 로그인",
            onAction: () => {
              hide(id);
              navigate("/login");
            },
          },
    );
    // 한 번 알리면 지운다 — 레이아웃이 다시 그려져도 같은 안내가 반복되지 않게
    dismissSessionExpired();
  }, [sessionExpiredAt, onLoginPage, show, hide, navigate, dismissSessionExpired]);

  if (!toast) return null;
  return (
    <Toast
      key={toast.id}
      message={toast.message}
      actionLabel={toast.actionLabel}
      onAction={toast.onAction}
    />
  );
};

export default SessionExpiredToast;
