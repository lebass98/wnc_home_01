import { componentImageUrl, useComponentSettings } from '../../lib/componentSettings'
import { Link } from 'react-router-dom'
import HeroSlider from '../../components/HeroSlider'
import MainVisualVideo from '../../components/MainVisualVideo'
import HomeSectionHeading from '../../components/HomeSectionHeading'
import HomeCategoryNav from '../../components/HomeCategoryNav'
import HomeSampleGrid from '../../components/HomeSampleGrid'
import HomeProcess from '../../components/HomeProcess'
import HomeBrandCompare from '../../components/HomeBrandCompare'
import HomeFaq from '../../components/HomeFaq'
import HomeQuickLinks from '../../components/HomeQuickLinks'
import Reveal from '../../components/Reveal'

/*
 * 2구역 배경 — 오른쪽 위에서 옅게 번지는 푸른 빛 두 겹.
 * 피그마의 방사형 그러데이션 두 장을 CSS 로 옮겨 적었다.
 */
const SECTION2_BG = [
  'radial-gradient(2177px 5428px at 98% -25%, rgba(77,146,226,0.2) 0%, rgba(119,171,231,0.2) 5%, rgba(161,196,237,0.16) 10%, rgba(203,221,242,0.12) 16%, rgba(245,246,248,0) 21%)',
  'radial-gradient(707px 703px at 72% 11%, rgba(151,199,255,0.2) 0%, rgba(198,223,251,0.14) 13%, rgba(245,246,248,0) 100%)',
  'linear-gradient(90deg, #fff 0%, #fff 100%)',
].join(', ')

/* FAQ 배경 — 가운데 아래쪽에서 퍼지는 연한 하늘빛. */
const FAQ_BG = 'radial-gradient(1169px 578px at 41% 56%, #dbeaf9 0%, rgba(247,250,253,0) 100%)'

export default function HomePage() {
  const { mainVisual } = useComponentSettings()

  return (
    <>
      {/* 관리자 [메인 비주얼]에서 '배경 영상'을 고르면 슬라이드 대신 영상을 깐다. */}
      {mainVisual.mode === 'video' && mainVisual.video?.src ? (
        <MainVisualVideo video={mainVisual.video} align="left" className="h-screen h-[100dvh]" />
      ) : (
        <HeroSlider
          key={JSON.stringify(mainVisual)}
          slides={mainVisual.slides.map((slide) => ({ title: slide.title.split('\n'), desc: slide.description.split('\n'), image: componentImageUrl(slide.image) }))}
          interval={mainVisual.interval}
          autoplay={mainVisual.autoplay}
        />
      )}

      {/* 1구역 — 업종을 고르고 디자인 샘플을 둘러본다 */}
      <section className="bg-white py-20">
        <div className="container-wnc">
          <HomeSectionHeading
            title="어떤 홈페이지가 필요하세요?"
            desc="마음에 드는 디자인을 골라 그대로 제작하거나, 내맘대로 수정을 할 수 있어요."
          />

          <div className="mt-10">
            <HomeCategoryNav />
          </div>

          <div className="mt-[60px]">
            <HomeSampleGrid />
          </div>

          <Reveal rise index={3} step={150} className="mt-10 flex flex-wrap items-end justify-center gap-4 text-[17px] leading-[1.5] tracking-[-0.425px]">
            <p className="text-[#64748b]">원하는 디자인이 없으신가요?</p>
            <Link to="/contact" className="font-bold text-[#044acf] underline">
              맞춤 제작 상담하기 →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 2구역 — 제작 네 단계 */}
      <section className="py-[100px]" style={{ backgroundImage: SECTION2_BG }}>
        <div className="container-wnc">
          <HomeSectionHeading
            title={
              <>
                디자인 셀렉부터 홈페이지 오픈까지,
                <br />네 단계로 간편하게 시작하세요.
              </>
            }
            desc="마음에 드는 디자인과 준비한 콘텐츠로, 우리 브랜드의 홈페이지를 완성합니다."
          />

          <div className="mt-14">
            <HomeProcess />
          </div>

          <Reveal rise index={4} step={160} className="mt-8 text-center text-[17px] leading-[24px] text-[#0c42bc]">
            <p>
              제작 일정은 자료 전달 완료 후 안내하며, 오픈 이후 <strong className="font-bold">유지관리</strong>는{' '}
              <strong className="font-bold">별도로 상담</strong>해 드립니다.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 3구역 — 브랜딩에 따라 달라지는 결과 */}
      <section className="bg-white py-[120px]">
        <div className="container-wnc">
          <HomeSectionHeading
            title="같은 사이트도 브랜딩에 따라 달라집니다."
            desc="기본 디자인에서 브랜드가 적용된 결과까지"
          />

          <div className="mt-14">
            <HomeBrandCompare />
          </div>

          <Reveal rise index={5} step={170} className="mt-8 text-center text-[17px] leading-[1.5] tracking-[-0.425px] text-[#0c42bc]">
            <p>
              기존 제작 샘플과 <strong className="font-bold">카테고리가 달라도</strong> 우리 브랜드에 맞게{' '}
              <strong className="font-bold">적용할 수 있어요!</strong>
            </p>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white">
        <div className="container-wnc">
          <div className="rounded-[24px] px-6 py-[60px] sm:px-[100px]" style={{ backgroundImage: FAQ_BG }}>
            <HomeSectionHeading title="어떤점이 궁금하세요?" desc="궁금한 점이 있다면 먼저 확인해 보세요." />

            <div className="mt-6">
              <HomeFaq />
            </div>

            <Reveal rise index={5} step={110} className="mt-8 flex flex-wrap items-start justify-center gap-4 text-center text-[17px] leading-[1.5] tracking-[-0.425px]">
              <p className="text-[#0c42bc]">
                템플릿만으로 어렵다면 <strong className="font-bold">제작 상담</strong>을 이용해 보세요.
              </p>
              <Link to="/contact/faq" className="font-bold text-[#00154c] underline">
                FAQ 전체보기 →
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 다음 걸음 단추 */}
      <section className="bg-white pb-[120px] pt-16">
        <div className="container-wnc">
          <HomeQuickLinks />
        </div>
      </section>
    </>
  )
}
