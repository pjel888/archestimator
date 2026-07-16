import { Sparkle } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

// F10 (UNIT-011) AI operator — honest NOT-ACTIVATED state.
// Per the pack: the AI operator is conditional, gated on a measured need and
// success criterion. When activated it must be read-only, source-grounded, and
// human-controlled (no autonomous actions). This surface makes the gate visible;
// it does not fabricate an AI that isn't wired.
const CONTRACT = [
  "Read-only: the operator can read and summarize, never mutate production data.",
  "Source-grounded: every claim cites a concrete source (route, row, log).",
  "Human-controlled: no autonomous actions; the founder approves every step.",
  "Gated: activated only when a measured operator need and success criterion exist.",
];

export default function AdminCopilotPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="flex items-center gap-1 text-[12px] font-medium leading-5 text-ink">
          <Sparkle size={13} weight="regular" aria-hidden="true" /> AI Copilot
        </h1>
        <p className="text-[10px] leading-4 text-tertiary">
          The AI operator is not activated. It is a conditional, gated capability — building it
          speculatively would violate the plan. This page states the activation contract.
        </p>
      </div>

      <Card className="p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-medium leading-4 text-ink">Activation contract</h2>
          <Badge tone="neutral" size="xs" className="min-w-0 px-1">
            not activated
          </Badge>
        </div>
        <ul className="space-y-1" aria-label="AI operator contract">
          {CONTRACT.map((item) => (
            <li key={item} className="flex items-start gap-2 text-[10px] leading-4 text-secondary">
              <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-tertiary" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[9px] leading-3 text-tertiary">
          To activate: define the measured operator need + success criterion, then wire a
          read-only, source-grounded, human-controlled assistant (F10).
        </p>
      </Card>
    </div>
  );
}
