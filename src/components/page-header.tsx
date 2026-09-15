import { Container } from "./container";

/** The heading block every content page opens with, so About, Contact,
 *  Stores and the policies share one rhythm instead of five. */
export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
}) {
  return (
    <Container className="pb-4 pt-16 lg:pt-20">
      <p className="eyebrow text-text-muted">{eyebrow}</p>
      <h1 className="mt-3 text-[2.5rem] font-semibold leading-[1.1] tracking-[-0.02em] lg:text-[3rem]">
        {title}
      </h1>
      {intro && (
        <p className="mt-5 max-w-2xl text-[0.9375rem] leading-[1.8] text-text-muted">
          {intro}
        </p>
      )}
    </Container>
  );
}

/** Long-form body copy, measured for reading rather than for the grid. */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[68ch] space-y-5 text-[0.9375rem] leading-[1.85] text-text-muted [&_a]:text-accent [&_a:hover]:underline [&_h2]:pt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-text [&_li]:pl-1 [&_strong]:font-medium [&_strong]:text-text [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
      {children}
    </div>
  );
}
