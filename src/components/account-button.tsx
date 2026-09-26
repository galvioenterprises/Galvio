"use client";

import Link from "next/link";
import { useSession } from "@/lib/api";
import { UserIcon } from "./icons";

/** "Account" in the header; the first name once signed in. */
export function AccountButton() {
  const session = useSession();
  const label =
    session.status === "signed-in" ? session.user.name.split(" ")[0] || "Account" : "Account";
  return (
    <Link
      href="/account/"
      className="flex h-10 items-center gap-2 rounded-lg px-2 text-sm text-text-invert-muted transition-colors hover:text-white"
      aria-label={session.status === "signed-in" ? `Your account (${label})` : "Sign in or view your account"}
    >
      <UserIcon className="size-5" />
      <span className="hidden max-w-24 truncate sm:inline">{label}</span>
    </Link>
  );
}
