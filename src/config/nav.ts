export type NavItem = {
  label: string;
  href: string;
  /** False while the page has not been built yet. Unbuilt items render as
   *  plain text rather than links, so the navigation shows the full site
   *  without shipping links that 404. */
  ready: boolean;
};

export const primaryNav: NavItem[] = [
  { label: "Home", href: "/", ready: true },
  { label: "Products", href: "/products/", ready: true },
  { label: "Brands", href: "/brands/", ready: false },
  { label: "Offers", href: "/offers/", ready: false },
  { label: "Bulk Orders", href: "/bulk-orders/", ready: false },
  { label: "Support", href: "/support/", ready: false },
];

export const footerNav = {
  "Quick Links": [
    { label: "About Us", href: "/about/", ready: false },
    { label: "Our Stores", href: "/stores/", ready: false },
    { label: "Bulk Orders", href: "/bulk-orders/", ready: false },
    { label: "Contact Us", href: "/contact/", ready: false },
  ],
  "Customer Service": [
    { label: "Shipping Policy", href: "/policies/shipping/", ready: false },
    { label: "Return & Refund", href: "/policies/returns/", ready: false },
    { label: "Warranty", href: "/policies/warranty/", ready: false },
    { label: "FAQs", href: "/faqs/", ready: false },
  ],
} satisfies Record<string, NavItem[]>;
