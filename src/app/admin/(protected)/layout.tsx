import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/mcqs", label: "MCQs" },
  { href: "/admin/sources", label: "Sources" },
  { href: "/admin/syllabus", label: "Syllabus" },
  { href: "/admin/extraction-history", label: "Extraction History" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/job-profiles", label: "Job Profiles" }
];

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    <div>
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-ink-200 dark:border-ink-800">
        <div>
          <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Admin panel</span>
          <div className="text-sm text-ink-600 dark:text-ink-200">Signed in as {admin.email}</div>
        </div>
        <LogoutButton />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 -mx-1 px-1">
        {ADMIN_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="focus-ring shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-ink-200 dark:border-ink-700 hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            {item.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
