import { site } from "./site";

export type NavItem = {
  label: string;
  href: string;
  ready: boolean;
  highlight?: boolean;
};

const hasPublicStoreAddress = Boolean(
  site.address.street && site.address.locality,
);

export const primaryNav: NavItem[] = [
  { label: "Products", href: "/products/", ready: true },
  { label: "Offers", href: "/offers/", ready: true, highlight: true },
  { label: "Bulk Orders", href: "/bulk-orders/", ready: true },
  { label: "Support", href: "/contact/", ready: true },
];

export const footerNav = {
  "Quick Links": [
    { label: "About Us", href: "/about/", ready: true },
    ...(hasPublicStoreAddress
      ? [{ label: "Our Store", href: "/stores/", ready: true }]
      : []),
    { label: "Offers", href: "/offers/", ready: true },
    { label: "Bulk Orders", href: "/bulk-orders/", ready: true },
    { label: "AC Size Calculator", href: "/ac-size-calculator/", ready: true },
    { label: "Compare Products", href: "/compare/", ready: true },
    { label: "Contact Us", href: "/contact/", ready: true },
  ],
  "Customer Service": [
    { label: "Delivery & Installation", href: "/policies/delivery/", ready: true },
    { label: "Returns & Exchange", href: "/policies/returns/", ready: true },
    { label: "Warranty", href: "/policies/warranty/", ready: true },
    { label: "Privacy Policy", href: "/policies/privacy/", ready: true },
    { label: "Terms & Conditions", href: "/policies/terms/", ready: true },
  ],
} satisfies Record<string, NavItem[]>;
