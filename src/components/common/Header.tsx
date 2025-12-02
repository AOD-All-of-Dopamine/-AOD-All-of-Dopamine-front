import { useNavigate } from "react-router-dom";
import Back from "../../assets/left-arrow.svg";
import SearchIcon from "../../assets/search-icon.svg";
import LogoutIcon from "../../assets/logout-icon.svg";

interface HeaderProps {
  title?: string;
  leftIcon?: "back" | "none" | JSX.Element;
  rightIcon?: "search" | "exit" | JSX.Element | null;
  onLeftClick?: () => void;
  onRightClick?: () => void;
  bgColor?: string;
}

const Header = ({
  title,
  leftIcon,
  rightIcon,
  onLeftClick,
  onRightClick,
  bgColor,
}: HeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onLeftClick) return onLeftClick();
    navigate(-1);
  };

  const renderLeftIcon = () => {
    if (leftIcon === "back") {
      return (
        <button onClick={handleBack} className="w-6 h-6">
          <img src={Back} alt="뒤로가기" />
        </button>
      );
    } else if (leftIcon instanceof Object) {
      return leftIcon;
    }
    return null;
  };

  const renderRightIcon = () => {
    if (rightIcon === "search") {
      return (
        <button onClick={onRightClick} className="w-6 h-6">
          <img src={SearchIcon} alt="검색" />
        </button>
      );
    } else if (rightIcon === "exit") {
      return (
        <button onClick={onRightClick} className="w-6 h-6">
          <img src={LogoutIcon} alt="나가기" />
        </button>
      );
    } else if (rightIcon instanceof Object) {
      return rightIcon;
    }
    return null;
  };

  return (
    <header
      className={`fixed max-w-2xl right-0 left-0 mx-auto top-0 w-full z-50 h-[50px] flex items-center justify-between px-4`}
      style={{ backgroundColor: bgColor || "#F8F8F8" }}
    >
      <div className="flex items-center justify-start w-1/4">
        {renderLeftIcon()}
      </div>

      <div className="flex items-center justify-center w-1/2">
        {title && (
          <h1 className="font-[PretendardVariable] font-semibold text-[18px] select-none">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center justify-end w-1/4">
        {renderRightIcon()}
      </div>
    </header>
  );
};

export default Header;
