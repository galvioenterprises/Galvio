import { serializeJsonLd } from "@/lib/json-ld";
import { FaqAccordion, type Faq } from "./product/faq-accordion";

/**
 * A titled FAQ group with its FAQPage markup.
 *
 * The visible accordion and the structured data are rendered from the same
 * array, so they cannot drift apart — a mismatch between the two is a rich
 * result Google quietly withdraws.
 */
export function FaqSection({
  id,
  title,
  faqs,
  schema = true,
}: {
  id?: string;
  title?: string;
  faqs: Faq[];
  /** One FAQPage per page. Pages with several groups emit it once. */
  schema?: boolean;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      {title && (
        <h3 className="mb-4 text-[0.9375rem] font-semibold tracking-tight">{title}</h3>
      )}
      <FaqAccordion faqs={faqs} />
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: { "@type": "Answer", text: f.answer },
              })),
            }),
          }}
        />
      )}
    </section>
  );
}
