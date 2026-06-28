type ProjectActivityPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectActivityPage({ params }: ProjectActivityPageProps) {
  const { projectId } = await params;

  return (
    <section
      className="flex h-full min-h-0 flex-col"
      aria-label="Project activity"
      data-project-id={projectId}
    />
  );
}
