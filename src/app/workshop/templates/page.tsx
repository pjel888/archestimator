import { redirect } from "next/navigation";

import { assertBetaFeaturePathAllowed } from "@/lib/feature-gates/enforce";

export default async function TemplatesPage() {
  await assertBetaFeaturePathAllowed("/workshop/templates");
  redirect("/workshop/library/templates");
}
