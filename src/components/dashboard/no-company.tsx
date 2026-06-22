import { signOutFormAction } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"

// Shown when a contractor user belongs to no company (e.g. after leaving their
// only one). They keep their account but have no workspace to operate in.
export function NoCompany() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-canvas px-6 lg:px-[1.667vw] text-foreground">
      <div className="w-full max-w-md lg:max-w-[31.108vw] rounded-lg lg:rounded-[0.833vw] border border-border bg-card p-8 lg:p-[2.222vw] text-center">
        <span className="font-sebenta text-lg lg:text-[1.25vw] font-bold">Hommy</span>
        <h1 className="mt-6 lg:mt-[1.667vw] font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
          You’re not part of a company
        </h1>
        <p className="mt-2 lg:mt-[0.556vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Ask a teammate to invite you to their company, or contact support to
          get set up.
        </p>
        <form action={signOutFormAction} className="mt-6 lg:mt-[1.667vw]">
          <Button type="submit" variant="outline" size="lg" className="w-full font-semibold">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  )
}
