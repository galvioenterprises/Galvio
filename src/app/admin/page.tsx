import type { Metadata } from "next";
import { Container } from "@/components/container";
import { AdminView } from "@/components/admin/admin-view";
import { getModelReport } from "@/lib/inventory-report";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * Order, inventory, coupon and review management for the distributor. The page itself is a
 * static shell; everything behind it is checked by the Worker, which only
 * answers /api/admin/* for emails listed in ADMIN_EMAILS. Put Cloudflare
 * Access in front of /admin/* as a second lock (docs/commerce-plan.md).
 */
export default function AdminPage() {
  return (
    <Container size="listing" className="pb-24 pt-8">
      <AdminView models={getModelReport()} />
    </Container>
  );
}
