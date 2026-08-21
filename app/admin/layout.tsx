import { InactivityTimer } from "@/components/admin/inactivity-timer";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <InactivityTimer />
      {children}
    </>
  );
}
