import { Sparkle } from "@phosphor-icons/react/dist/ssr";

import { AdminCopilot } from "@/components/admin/AdminCopilot";
import { AdminPage, AdminPageHeader, AdminSection } from "@/components/admin/AdminPage";
import { Badge } from "@/components/ui/badge";
import { hasDeepSeekApiKey } from "@/lib/ai/deepseek";

// F10 (UNIT-011) AI Copilot. Real + read-only when DEEPSEEK_API_KEY is set;
// honest activation gate otherwise. Built on existing DeepSeek infra.
const CONTRACT = [
  "Read-only: the operator can read and summarize, never mutate production data.",
  "Source-grounded: answers use a server-derived admin snapshot, not invented data.",
  "Human-controlled: no autonomous actions.",
  "Bounded: admin-gated, audited per ask.",
];

export default async function AdminCopilotPage() {
  const configured = hasDeepSeekApiKey();

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Admin"
        title={
          <span className="flex items-center gap-1">
            <Sparkle size={13} weight="regular" aria-hidden="true" /> AI Copilot
          </span>
        }
        description="Read-only, source-grounded assistant for the founder. Grounded in a live admin snapshot; it never mutates data and won't fabricate numbers or revenue."
      />

      <AdminSection
        title="Ask"
        actions={
          <Badge tone={configured ? "success" : "neutral"} size="xs" className="min-w-0 px-1">
            {configured ? "activated" : "not activated"}
          </Badge>
        }
      >
        <AdminCopilot configured={configured} />
      </AdminSection>

      <AdminSection title="Operating contract">
        <ul className="space-y-1" aria-label="AI operator contract">
          {CONTRACT.map((item) => (
            <li key={item} className="flex items-start gap-2 text-[10px] leading-4 text-secondary">
              <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-tertiary" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </AdminSection>
    </AdminPage>
  );
}
