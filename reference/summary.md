# Lifecycle: `summary <session reference>` — Read, Review or Improve a Summary

## Read the summary

1. Resolve the session using [check.md](check.md): use `get_session` for a validated ID, otherwise search and disambiguate.
2. Call `get_summary`. If a summary exists, present it clearly. A request to read a summary does not authorize changing instructions or regenerating it.
3. If none exists, say so. Use participant metadata and actual substantive responses, when available, to distinguish arrivals, unfinished conversations and contributions. Do not infer that everyone counted as a participant is still answering.

## Design summary instructions

Use this section when creating a custom report format or repairing summary instructions. Do not add a custom override automatically when a selected template already supplies suitable instructions.

- Start from the host's audience, goal, critical question and intended use. A comparison brief, reflective harvest and method-specific stage artifact need different structures. Do not force every session into decisions and action items.
- Put the main finding or requested comparison early. Give an ordinary brief a proportional length budget; use less for sparse input and preserve an explicitly requested longer report or required method artifact. Avoid a long mandatory field list under every option and sections that can only be filled with unknowns.
- Consolidate repeated points and state each material limitation once, near the claim it qualifies. Keep disagreement, qualifications and conditions that affect interpretation or the next decision.
- Check negative claims as carefully as positive ones. “Not recorded” is not “never happened”; an assessment described as existing is different from confirmed access to it. A limited fictional test does not establish real-world benefit, but may support checks of method fidelity or perceived usefulness. Do not invent an impossibility claim.
- Preserve eligibility, anonymity and attribution. Keep simulated perspectives visibly separate from human contributions; simulations do not establish demand, approval or commitments from the people they resemble. Use readable attribution without exposing identity metadata or unexplained internal source handles.

Inspect the connected schemas. `summary_prompt` is the report-generation instruction; `prompt_summary` is a recap of the facilitation approach. On paths where creation does not accept `summary_prompt`, use a supported confirmed update only if a custom override is needed. Do not pass unsupported fields or substitute raw HTTP/SQL.

## Review quality

For a requested quality review, read the summary, current brief and relevant contributions. Use only exposed, joinable metadata to connect inclusion settings to conversation threads. Some read surfaces return participant IDs separately from message thread IDs without a mapping; in that case disclose the unresolved eligibility/coverage gap and do not claim it was verified. Distinguish substantive human contributions, explicit simulations and opening-only threads where the evidence supports it; preserve inclusion settings.

Assess usefulness and fidelity separately. Does the output answer the host's question and preserve meaningful differences? Are claims, including claims of absence, supported at the strength stated? Separate participant proposals, facilitator suggestions, host background, AI interpretations and agreed decisions. Brevity alone is not an improvement if it introduces false caveats.

Trace the instructions before attributing the failure. A session override, template, platform default and shared instructions may all matter. Retrieve current instructions or revision history only through exposed authorized tools. If the read surface omits them, record the gap; do not infer their text or authoring path from the output.

Identify the responsible layer using [review.md](review.md). Missing background, repeated synthetic disclaimers, incorrect inclusion, an over-specified custom format, shared policy, incomplete provider output and a nonrepresentative eval call for different fixes. Treat suspected model effects as hypotheses unless compared under the same relevant inputs and runtime.

## Repair and verify

Use the host's existing authorization for the agreed repair; obtain it if missing. Patch only necessary supported fields, preserving other settings and contributions. Regeneration requires authorization for that operation and its model usage. Before running it, bound scope, attempts and timeout; do not mass-regenerate sessions or keep trying until a convenient output appears.

Read back the published result and check usefulness and fidelity against the sources, including negative claims and previously missed details. Distinguish a write acknowledgment from field readback when the API omits a field. Respect stops and exhausted attempt limits.

When the host requests a fix for all sessions, retain the shared repair, appropriate regression checks and release verification as the outcome. Reuse or file the corresponding tracker work; a local prompt edit does not complete it. Construction tests establish request wiring, not generated quality, and an eval must exercise the effective request before its scores can support a quality claim.
