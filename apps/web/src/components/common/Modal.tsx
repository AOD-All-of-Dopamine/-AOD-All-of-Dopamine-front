type ModalButton = {
  text: string;
  onClick: () => void;
  variant?: "gray" | "purple";
};

interface ModalProps {
  title: React.ReactNode;
  buttons?: ModalButton[];
}

const Modal = ({ title, buttons = [] }: ModalProps) => {
  const getButtonStyle = (variant: string = "gray") => {
    switch (variant) {
      case "purple":
        return "bg-[#855BFF] text-white hover:brightness-90";
      case "gray":
      default:
        return "bg-[#8D8C8E] text-white hover:brightness-90";
    }
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 flex items-center justify-center bg-black/40 z-[1000] p-10"
    >
      <div className="w-full max-w-[400px] px-4 py-4 pt-8 bg-[#302F31] rounded-xl shadow-[0px_2px_4px_rgba(0,0,0,0.25)] flex flex-col gap-6">
        <div className="w-full flex flex-col items-center gap-6 text-center">
          <h2 className='text-white text-base font-normal select-none font-["PretendardVariable"] break-keep'>
            {title}
          </h2>

          {buttons.length > 0 && (
            <div className="flex w-full gap-2 ">
              {buttons.map(({ text, onClick, variant }, idx) => (
                <button
                  key={idx}
                  onClick={onClick}
                  className={`w-full px-2 py-2 rounded-[10px] cursor-pointer ${getButtonStyle(variant)} `}
                >
                  <span className='text-base font-semibold font-["PretendardVariable"]'>
                    {text}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
