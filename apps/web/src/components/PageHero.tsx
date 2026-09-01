/** 서브 페이지 상단 공통 히어로 */
export default function PageHero({ title, description }: { title: string; description: string }) {
  return (
    <section className="border-b border-slate-200 bg-slate-50">
      <div className="container-wnc py-16 sm:py-20">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-slate-600">{description}</p>
      </div>
    </section>
  )
}
