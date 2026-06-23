export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 px-5 lg:px-[1.389vw] pb-24 lg:pb-[9vw] mt-8 lg:mt-[10vw]">
      <div className="lg:max-w-[80vw] mx-auto">
        {/* Base font-size scales with vw on large screens; prose sizes headings,
            spacing, etc. in em, so the whole document scales proportionally. */}
        <article className="prose prose-neutral max-w-none dark:prose-invert text-base lg:text-[1.111vw] prose-headings:font-sebenta prose-headings:tracking-tight prose-a:text-primary">
          {children}
        </article>
      </div>
    </main>
  );
}
