export function ComingSoon({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="rounded-full border border-border bg-muted px-3 lg:px-[0.833vw] py-1 lg:py-[0.278vw] text-xs lg:text-[0.833vw] font-medium text-muted-foreground">
        Coming soon
      </span>
      <h1 className="mt-4 lg:mt-[1.111vw] text-xl lg:text-[1.389vw] font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 lg:mt-[0.278vw] max-w-sm lg:max-w-[26.664vw] text-sm lg:text-[0.972vw] text-muted-foreground">
        {description ?? "This section is on the roadmap."}
      </p>
    </div>
  )
}
