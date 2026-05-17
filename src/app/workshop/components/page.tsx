import { MainSidebar } from "@/components/sidebar/MainSidebar";

export default function ComponentsPage() {
  return (
    <main className="min-h-screen bg-white" aria-label="Components">
      <MainSidebar />
      <section className="min-h-screen bg-white lg:pl-[64px]" aria-label="Components canvas" />
    </main>
  );
}
