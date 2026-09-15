"use client";

import { useState } from "react";
import { ChevronDownIcon } from "../icons";

export type Faq = { question: string; answer: string };

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<string | null>(faqs[0]?.question ?? null);

  return (
    <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {faqs.map((faq) => {
        const isOpen = open === faq.question;
        return (
          <div key={faq.question}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : faq.question)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium"
              >
                {faq.question}
                <ChevronDownIcon
                  className={`size-4 shrink-0 text-text-muted transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </h3>
            {isOpen && (
              <p className="px-5 pb-4 text-sm leading-relaxed text-text-muted">
                {faq.answer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
