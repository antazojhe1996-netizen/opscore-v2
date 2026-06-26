import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";

export default function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />
      <TopNavbar breadcrumb="OPSCORE" />

      <main className="fixed inset-x-0 bottom-0 top-16 overflow-y-auto overflow-x-hidden bg-[#F5F7FB] px-4 pb-8 pt-6 sm:px-6 lg:left-[220px] lg:px-7">
        {children}
      </main>
    </div>
  );
}