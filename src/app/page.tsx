import { EstimateWorkspace } from "@/components/estimate-workspace";
import { createLocalRepository } from "@/lib/local-data/repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const database = await createLocalRepository().getDatabase();

  return <EstimateWorkspace database={database} />;
}
