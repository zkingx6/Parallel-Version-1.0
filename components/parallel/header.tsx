export function Header() {
  return (
    <header className="border-b border-border/50">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <div className="flex items-center justify-between py-5 sm:py-6">
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-[17px] font-semibold tracking-tight">
              Parallel
            </h1>
            <span className="hidden sm:inline text-[13px] text-muted-foreground/60 font-normal">
              rotational fairness
            </span>
          </div>
          <span className="text-[13px] text-muted-foreground">
            Atlas Engineering
          </span>
        </div>
      </div>
    </header>
  )
}
