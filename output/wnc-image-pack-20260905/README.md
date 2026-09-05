# 워드앤코드 이미지 패키지

회사소개 본문 6장과 서브비주얼 10종, 총 16개의 신규 AI 생성 이미지입니다.
제작 도구: 내장 image_gen. 전체 제작 프롬프트는 prompts.json에 포함됩니다.
사진 속 인물, 사무실, 화면은 홍보용으로 생성한 가상 장면입니다.

## 폴더

- originals/: 생성된 PNG 원본
- images/about/: 홈페이지에 사용할 JPG 본문 이미지 6장
- images/subvisual/: 홈페이지에 사용할 JPG 배너 이미지 10장
- manifest.json: 파일별 실제 크기, 용도, 원본 경로 및 프롬프트

## 적용 위치

| 파일명 | 용도 |
|---|---|
| about_intro_01.jpg | 회사소개: 스마트 웹 서비스 |
| about_intro_02.jpg | 회사소개: 기획·개발 협업 |
| about_video.jpg | 회사소개: 홍보영상 썸네일 |
| about_strength_01.jpg | 회사소개: 충분한 정보 제공 |
| about_strength_02.jpg | 회사소개: 편리한 서비스 |
| about_strength_03.jpg | 회사소개: 사용자 의견 반영 |
| subvisual_about.jpg | 회사소개 /about |
| subvisual_services.jpg | 사업분야 /services |
| subvisual_products.jpg | 제품 목록 및 상세 /products, /products/:id |
| subvisual_board.jpg | 게시판 목록 및 상세 /board, /board/:id |
| subvisual_contact.jpg | 문의 /contact |
| subvisual_policy.jpg | 일반 안내 /page/:slug |
| subvisual_directions.jpg | 찾아오시는 길 /about/directions 전용 추가 이미지 |
| subvisual_faq.jpg | 자주 묻는 질문 /contact/faq 전용 추가 이미지 |
| subvisual_terms.jpg | 이용약관 /terms 전용 추가 이미지 |
| subvisual_privacy.jpg | 개인정보처리방침 /privacy 전용 추가 이미지 |

기존 12개 이미지와 동일한 파일명을 사용했습니다. images 폴더를 apps/web/public/images에 복사하면 기존 이미지 위치에 적용할 수 있습니다.
추가 전용 배너 4개를 적용하려면 apps/web/src/components/PageHero.tsx의 resolveSubVisual에서 해당 경로의 파일명을 위 표에 맞춰 변경하세요.
현재 사이트 파일은 이 패키지 제작 과정에서 교체하지 않았습니다.
배너에는 글자를 넣지 않았으므로 기존 제목과 어두운 오버레이를 그대로 사용할 수 있습니다.
