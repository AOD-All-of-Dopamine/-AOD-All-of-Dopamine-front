// tsc --noEmit 단독 실행용 CSS 모듈 타입 선언 (번들링은 Metro가 처리)
declare module "*.module.css" {
  const styles: Record<string, string>;
  export default styles;
}

declare module "*.css";
