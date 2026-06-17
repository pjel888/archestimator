import { redirect } from "next/navigation";

type ProjectChartsCompatPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectChartsCompatPage({ params, searchParams }: ProjectChartsCompatPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    } else if (value !== undefined) {
      query.set(key, value);
    }
  }

  redirect(`/workshop/projects/${projectId}/data${query.size ? `?${query.toString()}` : ""}`);
}
