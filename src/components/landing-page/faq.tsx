import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

const FAQS = [
  {
    q: "Does it cost anything to post a job?",
    a: "No. Homei is completely free for homeowners — you never pay us a cent. Roofers pay us only when they win your job, so the quotes you get are exactly what you pay them.",
  },
  {
    q: "Will I get spammed with calls?",
    a: "No. We share your job with a few vetted local roofers, not twenty — and never sell your number to a call center. You stay in control of who you talk to.",
  },
  {
    q: "How fast will I hear back?",
    a: "Usually within an hour. Matched roofers see your job the moment you post it, and most reach out the same day with a first estimate.",
  },
  {
    q: "Are the roofers actually licensed and insured?",
    a: "Yes. Every roofer shows us a valid license and proof of insurance before they can quote a single job — and we re-check it, so you don't have to chase paperwork.",
  },
  {
    q: "How many quotes will I get?",
    a: "Typically two to three. Enough to compare price and approach side by side, without drowning in calls. If no one's available nearby yet, we'll tell you straight away.",
  },
  {
    q: "What if I'm not sure what's wrong with my roof?",
    a: "That's fine — most people aren't. Just describe what you're seeing (a leak, missing shingles, storm damage, or you simply want it checked) and the roofer will diagnose it on the visit.",
  },
  {
    q: "Do I have to hire anyone?",
    a: "Never. Compare the quotes, pick the one you like, or walk away. There's no obligation and no fee at any point.",
  },
  {
    q: "Is my information kept private?",
    a: "Yes. Your details only go to the matched roofers handling your job — never to advertisers or anyone outside the platform.",
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      className="bg-background scroll-mt-20 lg:scroll-mt-[5.556vw] py-24 lg:py-[8.889vw]"
    >
      <div className="max-w-[90vw] mx-auto grid gap-12 lg:gap-[3.333vw] px-5 lg:px-[1.389vw] lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="mt-4 lg:mt-[1.111vw] font-sebenta text-3xl md:text-4xl lg:text-[3.333vw] font-semibold  tracking-tight">
            Common Questions, Answered
          </h2>
        </div>

        <Accordion type="single" collapsible className="h-fit border-border">
          {FAQS.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="py-5 lg:py-[1.389vw] text-[17px] lg:text-[1.2vw] font-semibold hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="font-medium text-base lg:text-[1.111vw] leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
