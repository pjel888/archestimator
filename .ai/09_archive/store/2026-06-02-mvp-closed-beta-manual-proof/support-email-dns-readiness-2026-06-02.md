# Support Email DNS Readiness Evidence

Date: 2026-06-02
Scope: public DNS lookup for `archestimator.com` support email deliverability path.
Result: partial/provider-adjacent pass for DNS only.

This evidence does not prove that `SUPPORT_INBOX_PLACEHOLDER` is monitored, that an inbox receives messages, that a support form is configured, or that uptime/error alerts reach an owner.

## Commands

```bash
dig +noall +answer MX archestimator.com
dig +noall +answer TXT archestimator.com
dig +noall +answer TXT _dmarc.archestimator.com
dig +noall +answer A archestimator.com
```

## Results

```text
MX
archestimator.com. 1786 IN MX 10 eforward1.registrar-servers.com.
archestimator.com. 1786 IN MX 10 eforward2.registrar-servers.com.
archestimator.com. 1786 IN MX 10 eforward3.registrar-servers.com.
archestimator.com. 1786 IN MX 15 eforward4.registrar-servers.com.
archestimator.com. 1786 IN MX 20 eforward5.registrar-servers.com.

TXT apex
archestimator.com. 1786 IN TXT "v=spf1 include:spf.efwd.registrar-servers.com ~all"

DMARC
No answer returned for _dmarc.archestimator.com TXT.

A
archestimator.com. 1786 IN A 216.198.79.1
```

## Launch Meaning

- `archestimator.com` has MX records pointed at registrar email-forwarding hosts.
- The apex TXT record includes an SPF policy for that forwarding provider.
- No DMARC TXT answer was returned.
- This narrows support readiness only from "visible local support address" to "visible address plus DNS mail-routing evidence."

Closed beta remains **NO-GO** until a dated proof shows the inbox or selected support form is monitored, owner/alert routing exists, and incident/support escalation has a named owner.
