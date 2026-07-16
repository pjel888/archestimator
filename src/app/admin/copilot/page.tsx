import { Sparkle } from "@phosphor-icons/react/dist/ssr";

import { AdminCopilot } from "@/components/admin/AdminCopilot";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="flex items-center gap-1 text-[12px] font-medium leading-5 text-ink">
          <Sparkle size={13} weight="regular" aria-hidden="true" /> AI Copilot
        </h1>
        <p className="text-[10px] leading-4 text-tertiary">
          Read-only, source-grounded assistant for the founder. Grounded in a live admin snapshot;
          it never mutates data and won&apos;t fabricate numbers or revenue.
        </p>
      </div>

      <Card className="p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-medium leading-4 text-ink">Ask</h2>
          <Badge tone={configured ? "success" : "neutral"} size="xs" className="min-w-0 px-1">
            {configured ? "activated" : "not activated"}
          </Badge>
        </div>
        <AdminCopilot configured={configured} />
      </Card>

      <Card className="p-2">
        <h2 className="text-[11px] font-medium leading-4 text-ink">Operating contract</h2>
        <ul className="mt-1 space-y-1" aria-label="AI operator contract">
          {CONTRACT.map((item) => (
            <li key={item} className="flex items-start gap-2 text-[10px] leading-4 text-secondary">
              <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-tertiary" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
