/** 사이트 푸터 - 홈 목업 하단과 동일 */
const SiteFooter = () => (
  <footer className="border-t border-line">
    <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-5 px-6 pb-10 pt-7 text-[13.5px] text-ink-3">
      <span className="text-[17px] font-extrabold tracking-tighter text-ink">
        AOD<em className="not-italic text-accent">.</em>
      </span>
      <a href="#" className="transition-colors hover:text-ink-2">
        이용약관
      </a>
      <a href="#" className="transition-colors hover:text-ink-2">
        개인정보 처리방침
      </a>
      <span className="ml-auto">© 2026 AOD</span>
    </div>
  </footer>
);

export default SiteFooter;
