# Reference: Template Matching

Use this table to match user intent to the best template. If multiple templates could fit, suggest the strongest match and briefly mention alternatives. If nothing matches well, say so and proceed freeform.

| Template | ID | Trigger Intents | When to Suggest |
|----------|-----|-----------------|-----------------|
| Retrospective | `retrospective` | retro, review, reflect, post-mortem, lessons learned, what went well | Looking back at completed work |
| Brainstorming | `brainstorming` | ideate, explore, generate ideas, creative, possibilities, what if | Divergent thinking, generating options |
| SWOT Analysis | `swot-analysis` | strengths, weaknesses, assess, evaluate position, competitive | Strategic assessment of a project or product |
| Theory of Change | `theory-of-change` | impact, outcomes, logic model, how do we get to X | Planning how actions lead to desired outcomes |
| OKRs Planning | `okrs-planning` | goals, objectives, key results, quarterly planning, metrics | Setting measurable targets |
| Action Planning | `action-planning` | next steps, roadmap, what do we do, prioritize, action items | Converting decisions into tasks |
| Community Policy | `community-policy-proposal` | rules, guidelines, governance, community standards, norms | Group norm-setting or policy design |
| Weekly Team Check-ins | `weekly-checkins` | standup, sync, how's everyone, weekly pulse, check-in | Regular team health check |
| Risk Assessment | `risk-assessment` | risks, concerns, what could go wrong, mitigation, threats | Identifying and planning for risks |

**Important:** Template IDs must match exactly what the Harmonica API accepts. If `create_session` returns a validation error for a template ID, fall back to creating a freeform session (omit `template_id`) and inform the user.
