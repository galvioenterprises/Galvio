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
  { label: "Offers", href: "/offers/", ready: false },
  { label: "Bulk Orders", href: "/bulk-orders/", ready: false },
  { label: "About Us", href: "/about/", ready: true },
  { label: "Support", href: "/contact/", ready: true },
];

export const footerNav = {
  "Quick Links": [
    { label: "About Us", href: "/about/", ready: true },
    { label: "Our Store", href: "/stores/", ready: true },
    { label: "Bulk Orders", href: "/bulk-orders/", ready: false },
    { label: "Contact Us", href: "/contact/", ready: true },
  ],
  "Customer Service": [
    { label: "Delivery & Installation", href: "/policies/delivery/", ready: true },
    { label: "Returns & Refunds", href: "/policies/returns/", ready: true },
    { label: "Warranty", href: "/policies/warranty/", ready: true },
    { label: "Privacy Policy", href: "/policies/privacy/", ready: true },
    { label: "Terms & Conditions", href: "/policies/terms/", ready: true },
  ],
} satisfies Record<string, NavItem[]>;
