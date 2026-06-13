import { OwnerShell } from "@/components/dashboard/OwnerShell";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <OwnerShell>{children}</OwnerShell>;
}
