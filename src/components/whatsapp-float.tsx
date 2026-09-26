"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { site } from "@/config/site";
import { trackCommerceEvent } from "@/lib/analytics";
import { WhatsAppIcon } from "./icons";

/**
 * The floating "chat on WhatsApp" button most Indian retailers show. On a
 * product page the message names the product, so whoever answers knows
 * what the customer is looking at. Hidden until a WhatsApp number is set
 * in src/config/site.ts, and on checkout and admin pages where it would
 * cover the pay button.
 */
export function WhatsAppFloat() {
  const pathname = usePathname() ?? "/";
  const [title, setTitle] = useState("");
  const [hint, setHint] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- document.title is only readable after mount
    setTitle(document.title.split(" | ")[0]);
    const shown = window.setTimeout(() => setHint(true), 8000);
    const hidden = window.setTimeout(() => setHint(false), 16000);
    return () => {
      window.clearTimeout(shown);
      window.clearTimeout(hidden);
    };
  }, [pathname]);

  const number = site.contact.whatsapp;
  if (!number || /^\/(checkout|admin)\//.test(pathname)) return null;

  const onProduct = pathname.startsWith("/product/");
  const message = onProduct
    ? `Hi ${site.shortName}, I have a question about the ${title} (${site.url}${pathname}).`
    : `Hi ${site.shortName}, I need help choosing an appliance.`;

  return (
    <div className={`fixed right-4 z-40 flex items-center gap-3 ${onProduct ? "bottom-24 lg:bottom-6" : "bottom-6"}`}>
      {hint && (
        <span className="hidden rounded-xl bg-surface px-3 py-2 text-sm font-medium text-text shadow-lg sm:block">
          Questions? Chat with us
        </span>
      )}
      <a
        href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`}
        onClick={() =>
          trackCommerceEvent("whatsapp_click", {
            context: onProduct ? "product" : "site",
            path: pathname,
          })
        }
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="flex size-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_10px_30px_-6px_rgba(37,211,102,0.7)] transition-transform hover:scale-105"
      >
        <WhatsAppIcon className="size-7" />
      </a>
    </div>
  );
}
