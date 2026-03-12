import { ParallelWordmark } from "@/components/ui/parallel-wordmark"

export function Header({ isShareView }: { isShareView?: boolean }) {
  return (
    <header className="border-b border-border/40">
      <div className="mx-auto max-w-2xl px-5 sm:px-8">
        <div className="flex items-center justify-between py-5">
          <div className="flex items-baseline gap-2">
            <h1 className="text-[17px] font-semibold tracking-tight text-foreground">
              <ParallelWordmark />
            </h1>
          </div>
          {isShareView && (
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              shared view
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
