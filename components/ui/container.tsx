import { cn } from "@/lib/utils"

type ContainerProps = {
  children: React.ReactNode
  size?: "default" | "narrow"
  className?: string
}

export function Container({
  children,
  size = "default",
  className,
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 sm:px-6 lg:px-8",
        size === "narrow" && "max-w-3xl",
        size === "default" && "max-w-6xl",
        className
      )}
    >
      {children}
    </div>
  )
}
