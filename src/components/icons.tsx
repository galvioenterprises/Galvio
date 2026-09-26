/**
 * Inline icons.
 *
 * A whole icon package for a dozen glyphs would be several hundred
 * kilobytes of dependency on a site whose entire selling point is that it
 * is static and fast. These are traced from the Figma icon set.
 */

type IconProps = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
} as const;

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m14 6-6 6 6 6" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m10 6 6 6-6 6" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function GridIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.2" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" />
    </svg>
  );
}

export function ListIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function StarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z" />
    </svg>
  );
}

export function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.74.46 3.44 1.32 4.94L2 22l5.36-1.4a9.8 9.8 0 0 0 4.68 1.2h.01c5.43 0 9.84-4.4 9.84-9.84 0-2.63-1.03-5.1-2.89-6.96A9.77 9.77 0 0 0 12.04 2m0 1.8c2.15 0 4.17.84 5.69 2.36a7.99 7.99 0 0 1 2.36 5.69c0 4.44-3.61 8.05-8.06 8.05a8.05 8.05 0 0 1-4.1-1.12l-.29-.18-3.05.8.81-2.98-.19-.3a7.98 7.98 0 0 1-1.22-4.27c0-4.44 3.61-8.05 8.05-8.05m-3.5 4.1c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02s.87 2.34.99 2.5c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.05.14-1.16-.06-.1-.22-.16-.46-.28s-1.44-.71-1.66-.79c-.22-.08-.39-.12-.55.12s-.63.79-.77.95c-.14.16-.28.18-.52.06s-1.04-.38-1.98-1.22c-.73-.65-1.23-1.46-1.37-1.7-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42s-.55-1.33-.76-1.81c-.2-.48-.4-.41-.55-.42h-.47Z" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 4h3.5l1.5 4-2 1.4a12 12 0 0 0 5.6 5.6L15 13l4 1.5V18a2 2 0 0 1-2.2 2A15 15 0 0 1 4 6.2 2 2 0 0 1 5 4Z" />
    </svg>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  );
}

export function PinIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 21s7-5.2 7-10.4A7 7 0 0 0 5 10.6C5 15.8 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.5" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={2.4} className={className}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

/* Category icons, traced from the Figma icon set. */

export function AirConditionerIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5" width="18" height="7" rx="2" />
      <path d="M6 9h12" />
      <path d="M7 15c0 1.5.8 2.2 1.6 3M12 15c0 1.8.9 2.5 1.8 3.4M17 15c0 1.5.7 2.2 1.4 2.9" />
    </svg>
  );
}

export function RefrigeratorIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M6 10h12" />
      <path d="M9 6.2v2M9 12.8v2.4" />
    </svg>
  );
}

export function WashingMachineIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="2.5" width="16" height="19" rx="2.5" />
      <path d="M4 7.5h16" />
      <circle cx="12" cy="14.5" r="4" />
      <circle cx="16.8" cy="5" r=".6" fill="currentColor" />
    </svg>
  );
}

export function AirCoolerIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
      <circle cx="12" cy="9.5" r="3.6" />
      <path d="M8 16.5h8M8 19h5" />
    </svg>
  );
}

export function WaterDispenserIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 2.5h6l1 4H8z" />
      <rect x="6" y="6.5" width="12" height="15" rx="2" />
      <path d="M10.5 11h3" />
      <path d="M12 15.5c-.9 1-1.4 1.7-1.4 2.4a1.4 1.4 0 0 0 2.8 0c0-.7-.5-1.4-1.4-2.4Z" />
    </svg>
  );
}

export function TelevisionIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="4" width="19" height="12.5" rx="2" />
      <path d="M8.5 20h7M12 16.5V20" />
    </svg>
  );
}

/* Trust, offer and support icons. */

export function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 2.5 4.5 5.5v6c0 4.6 3.1 8.3 7.5 10 4.4-1.7 7.5-5.4 7.5-10v-6Z" />
      <path d="m8.8 11.8 2.3 2.3 4.1-4.6" />
    </svg>
  );
}

export function BadgeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="9" r="5.5" />
      <path d="m8.5 13.8-1.3 7 4.8-2.5 4.8 2.5-1.3-7" />
    </svg>
  );
}

export function TruckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 6.5h10.5v9H3z" />
      <path d="M13.5 10h3.8l2.7 3v2.5h-6.5z" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
    </svg>
  );
}

export function TagIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M11.4 3H3v8.4l9.6 9.6 8.4-8.4z" />
      <circle cx="7.3" cy="7.3" r="1.4" />
    </svg>
  );
}

export function ExchangeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 9h13l-3-3M20 15H7l3 3" />
    </svg>
  );
}

export function CreditCardIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.5h19M6 15h3" />
    </svg>
  );
}

export function HeadsetIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <path d="M4 13.5h2.2a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H5.5A1.5 1.5 0 0 1 4 17.5ZM20 13.5h-2.2a1 1 0 0 0-1 1V18a1 1 0 0 0 1 1h.7a1.5 1.5 0 0 0 1.5-1.5Z" />
    </svg>
  );
}

export function LeafIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20 4c0 9-5.5 13-11 13a5 5 0 0 1 0-10c3.5 0 5-3 11-3Z" />
      <path d="M4 20c2.5-4.5 6-7 11-9" />
    </svg>
  );
}

export function SnowflakeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 2.5v19M4 7l16 10M20 7 4 17" />
      <path d="m9.5 4.5 2.5 2.5 2.5-2.5M9.5 19.5 12 17l2.5 2.5" />
    </svg>
  );
}

export function BoltIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M13.5 2.5 5 13.5h6l-.5 8 8.5-11h-6z" />
    </svg>
  );
}

export function GaugeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 17a8 8 0 1 1 16 0" />
      <path d="m12 13 3.5-3.5" />
      <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function VolumeLowIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 9.5h3l4-3.5v12l-4-3.5H4z" />
      <path d="M15 10a3 3 0 0 1 0 4" />
    </svg>
  );
}

export function BoxIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7z" />
      <path d="M3.5 7 12 11.3 20.5 7M12 11.3v9.9" />
    </svg>
  );
}

export function WrenchIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M15 3.5a5 5 0 0 0-4.6 7l-6.2 6.2a1.8 1.8 0 0 0 2.5 2.5l6.2-6.2A5 5 0 1 0 15 3.5Z" />
    </svg>
  );
}

export function CartIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 4h2.2l2.2 10.5h9.6L19 7H6.3" />
      <circle cx="9" cy="19" r="1.4" />
      <circle cx="17" cy="19" r="1.4" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 6.5h16M9.5 6.5V4.5h5v2M6.5 6.5l1 13h9l1-13" />
    </svg>
  );
}

/* Categories with no artwork in the Figma set yet. */

export function WaterHeaterIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="6" y="2.5" width="12" height="16" rx="6" />
      <path d="M9.5 21.5h5" />
      <path d="M12 12v-1.5" />
      <path d="M9.5 7.5h5" />
      <circle cx="12" cy="15" r="1.2" />
    </svg>
  );
}

export function StabiliserIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m12.6 8.5-3.1 4.4h3l-.5 3.1 3.1-4.4h-3z" />
      <path d="M6 5.5V4M18 5.5V4" />
    </svg>
  );
}

export function FreezerIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M2.5 9.5h19" />
      <path d="M11 12.5h7" />
      <path d="M6 4.5h12" />
    </svg>
  );
}

export function VisiCoolerIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="5" y="2.5" width="14" height="19" rx="2" />
      <path d="M9 2.5v19" />
      <path d="M7 11h.01M11.5 11h5M11.5 14.5h5" />
    </svg>
  );
}

export function AirPurifierIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="6" y="2.5" width="12" height="19" rx="3" />
      <path d="M9 7h6M9 10h6M9 13h6" />
      <circle cx="12" cy="17.5" r="1.4" />
    </svg>
  );
}

export function MicrowaveIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <rect x="5" y="7.5" width="10" height="9" rx="1" />
      <path d="M18 8.5v2M18 13v2.5" />
    </svg>
  );
}

/* Buyer types and support topics. */

export function BuildingIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" />
      <path d="M15 9h4a1 1 0 0 1 1 1v11" />
      <path d="M8 8h3M8 12h3M8 16h3M3 21h18" />
    </svg>
  );
}

export function BriefcaseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12.5h18" />
    </svg>
  );
}

export function BedIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" />
      <circle cx="7" cy="11" r="1.6" />
    </svg>
  );
}

export function HospitalIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M12 7v6M9 10h6M9 21v-4h6v4" />
    </svg>
  );
}

export function SchoolIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m2.5 9 9.5-5 9.5 5-9.5 5z" />
      <path d="M6.5 11.2V16c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-4.8M21.5 9v5" />
    </svg>
  );
}

export function StoreIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 10v10h16V10M3 6l1.5-3h15L21 6v2a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-3 0z" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

export function ReceiptIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function ReturnIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
    </svg>
  );
}

export function HeartIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
    </svg>
  );
}

export function TicketIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4V7Z" />
      <path d="M14 7v10" strokeDasharray="2 2" />
    </svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M5 15V6a1 1 0 0 1 1-1h9" />
    </svg>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

export function BankIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 9.5 12 4l9 5.5H3ZM5 10v7M9.5 10v7M14.5 10v7M19 10v7M3 20h18" />
    </svg>
  );
}

export function WalletIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7a2 2 0 0 1 2-2h11v4" />
      <rect x="4" y="8" width="16" height="11" rx="2" />
      <path d="M16 13.5h.01" />
    </svg>
  );
}

export function UpiIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m7 5 5 7-5 7M12 5l5 7-5 7" />
    </svg>
  );
}

export function PackageIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </svg>
  );
}
