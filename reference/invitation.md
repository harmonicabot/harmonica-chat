# Invitation Flow

Run this after any successful session creation (from design, accelerated, or follow-up).

## Step 1: Show the Join URL

Always display the join URL prominently:

> **Join URL:** {join_url}
>
> Share this with participants. Each person gets their own 1-on-1 conversation with the AI facilitator.

## Step 2: Offer Invitation Options

Ask:

> How do you want to invite participants?
> - **"I'll share it myself"** — I'll stop here
> - **"Draft a message"** — I'll write an invite you can copy-paste

**If the user wants a draft message**, generate a short, context-aware invitation:

> Hey team — I've set up a structured conversation on **{topic}**.
>
> It takes about 10 minutes: you'll have a 1-on-1 chat with an AI facilitator about {goal, rephrased briefly}. Your responses help build a shared summary.
>
> Join here: {join_url}

Adapt the tone to the template type:
- Brainstorming — energetic, encouraging wild ideas
- Retrospective — reflective, safe space
- Risk Assessment — serious, thorough
- Community Policy — inclusive, democratic
- Other — neutral and professional

**If communication MCP tools are detected**, offer additional options. Check at runtime which tools are available:

- **Zapier MCP available** — Offer: "I can send this via Telegram, Discord, or Slack through Zapier. Which channel or group?"
- **Slack MCP available** — Offer: "I can post this directly to a Slack channel. Which one?"
- **Neither available** — Only offer "draft a message" and "share it yourself"

## Step 3: Community Participation Feed

Ask:

> Want to add this to a community's participation feed?

If the user says no, skip to Step 4.

If the user says yes:

1. First, check if `HARMONICA_API_KEY` is already set in the environment by running `echo "${HARMONICA_API_KEY:+set}"`. If it returns "set", use it directly. Otherwise, ask the user: "To post to a community feed, I need your Harmonica API key (the `hm_live_...` key you used when setting up harmonica-mcp). Can you share it?"
2. Use the Bash tool to call community-admin's API with `curl`. Note: the community-admin URL below is hardcoded — if the Railway deployment changes, update it here.

```bash
curl -s -H "Authorization: Bearer $HARMONICA_API_KEY" \
  https://community-admin-production.up.railway.app/api/communities
```

3. Handle failure cases:
   - **API unreachable or network error:** "Community participation feeds aren't available right now. Share the join URL directly instead."
   - **Auth error (401/403):** "Your API key doesn't have access to the community platform. Share the join URL directly instead."
   - **Empty list (0 communities):** "You're not an organizer for any communities. Share the join URL directly, or ask a community admin to add you."
4. If communities are returned, list them and ask the user to pick one
5. Use the Bash tool to post to community-admin:

```bash
curl -s -X POST \
  -H "Authorization: Bearer $HARMONICA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "community": "{selected_community_slug}",
    "title": "{session_topic}",
    "description": "{session_goal}",
    "type": "deliberation",
    "url": "{join_url}",
    "datetime": "{current ISO 8601 timestamp}"
  }' \
  https://community-admin-production.up.railway.app/api/events/manual
```

6. On success: "Added to {community name}'s participation feed. Members will see it in My Community and Dear Neighbors."
7. On auth error (403): "You don't have permission to post to {community name}. Ask the community admin to add you as an organizer."

## Step 4: Offer Follow-Up Check

After invitations are handled:

> Want to check on this session later? Just run:
>
> `/harmonica-chat check "{topic}"`
>
> to see who's joined and read responses anytime.
