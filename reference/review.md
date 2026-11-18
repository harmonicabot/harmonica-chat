# Lifecycle: `review <session reference>` — Diagnose Quality and Choose the Right Repair

Review the aspect the host requested: facilitation, synthesis or both. For summary quality, also load [summary.md](summary.md). A review alone does not authorize mutation, regeneration or outreach.

## Gather evidence

Resolve the session with `get_session` or search and disambiguate. Read its goal, critical question, context and relevant instructions through supported tools, then retrieve the relevant conversations. For synthesis review, also read `get_summary` and participant inclusion metadata.

Review substantive contributions. A short answer can contain decisive evidence; do not discard it solely because the thread has fewer than three user turns. Distinguish arrivals and opening-only threads from actual contributions. Preserve human/synthetic provenance and inclusion flags. Connect eligibility to threads only when the tools expose a reliable mapping; otherwise report unresolved coverage instead of claiming the reviewed sources match the generation set. Do not treat a simulated perspective as the real person's participation or endorsement.

Inspect exposed revision history when a prompt or template has changed. If current or historical instructions are not readable, state that gap rather than reconstructing them or assuming the platform generated them. Do not guess a tool name or bypass MCP through raw HTTP/SQL.

For facilitation, look for:

- Alignment with the session's purpose and selected method.
- Question shape and depth: whether follow-ups add useful information or repeat what is already known.
- Engagement, uncertainty, skips, early exits and endings in their conversational context.
- Cross-pollination timing, relevance and boundaries when enabled.
- Context or capabilities the facilitator needs but does not have.

Cite the exact exchange supporting a finding: the participant's contribution and the facilitator's adjacent question or framing. A summary finding should pair the disputed output claim with its supporting or contradictory source. Keep quotes minimal and protect private details.

## Diagnose the responsible layer

Use evidence to distinguish these causes; a single clear defect can be actionable, while repeated observations help establish a pattern.

| Layer | What to check | Appropriate repair |
|---|---|---|
| Host brief or method design | Is the purpose clear? Are necessary definitions, roles, inputs and outputs supplied? | Clarify the brief or process; do not invent the missing method. |
| Contributions and eligibility | Are sources substantive, included correctly and labelled accurately? Is repetition being confused with support? | Correct the evidenced source/eligibility issue with authorization; preserve provenance. |
| Selected instructions | Did a custom or template prompt impose the observed problem? Does it still fit the current goal? | Change the responsible instruction, retaining useful method requirements. |
| Shared runtime or tools | Did context, prompt resolution, rendering, completion handling or an unavailable capability cause the failure? | Reuse or file a systemic issue; a local prompt rule is not an implementation fix. |
| Model behaviour or evaluation | Did the model fail a justified requirement? Does the eval use the effective prompt, context and runtime? | Use a bounded relevant check. A test of a different request cannot validate this repair. |

Do not force every pattern into a prompt addition. A prompt change is appropriate only when the intended behaviour is missing or ambiguous at that layer. Do not propose a model swap, new judge, extra generation pass or broad tooling project without evidence that it addresses the gap.

## Present findings and apply authorized repairs

Lead with the effect on the host or participants. For each actionable finding, give the observed behaviour, source evidence, responsible layer, proposed repair and remaining uncertainty. Report what worked where it affects the decision; avoid an exhaustive audit format when a short explanation is sufficient.

Separate verified defects, plausible contributors and unknowns. Reuse existing tracker issues before creating duplicates. A requested product-wide fix remains active through the shared repair, checks and approved release; do not replace it with a per-session workaround or ask for another selection merely to continue the already-authorized scope.

If changes were requested and authorized, prepare the concrete patch, preserve unrelated settings and apply it through supported tools. Obtain approval only where it is still missing, including independent scope, publication and model usage. Read back supported fields and inspect generated output when regeneration is authorized. Follow agreed attempt limits; do not claim success from an acknowledgment, shorter text or green plumbing tests alone.

Save findings only when requested or required by the selected project. Do not send invitations, messages or other outreach as part of a review without explicit authorization.
