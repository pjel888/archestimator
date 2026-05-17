import { MainSidebar } from "@/components/sidebar/MainSidebar";

export default function WorkshopPage() {
  return (
    <main className="min-h-screen bg-white" aria-label="Workshop">
      <MainSidebar />
      <section className="min-h-screen bg-white lg:pl-[64px]" aria-label="Workshop canvas" />
    </main>
  );
}
