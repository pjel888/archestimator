import { MainSidebar } from "@/components/sidebar/MainSidebar";

export default function ProjectsPage() {
  return (
    <main className="min-h-screen bg-white" aria-label="Projects">
      <MainSidebar />
      <section className="min-h-screen bg-white lg:pl-[64px]" aria-label="Projects canvas" />
    </main>
  );
}
