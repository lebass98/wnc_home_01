# 로고 글꼴 (Bitcoa)

로고에 쓰는 글꼴 파일을 이 폴더에 넣는다. 파일 이름은 아래 그대로 맞춘다.

- `Bitcoa.woff2` (권장 — 가장 가볍다)
- `Bitcoa.otf` 또는 `Bitcoa.ttf` (woff2 가 없을 때 쓰는 예비)

둘 중 하나만 있어도 된다. 등록은 `apps/web/src/index.css` 의 `@font-face` 가 맡고,
Tailwind 에서는 `font-logo` 로 쓴다 (`apps/web/tailwind.config.js`).

파일이 없으면 로고는 사이트 기본 글꼴(프리텐다드)로 보인다 — 화면이 깨지지는 않는다.

라이선스: Bitcoa 는 Produc Type 의 유료 글꼴이다. 웹에 배포하려면 웹폰트 사용이
허용된 정식 구매본을 넣어야 한다. 개인용 Trial 버전을 배포본에 쓰면 안 된다.
