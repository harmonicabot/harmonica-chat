# Lifecycle: `status` — List Recent Sessions

Call `list_sessions` with `limit: 20`. Group the results by status and display:

> Your recent sessions:
>
> **Active ({count}):**
> - "{Topic}" — {N} participants, created {relative time ago}
> - "{Topic}" — {N} participants, created {relative time ago}
>
> **Completed ({count}):**
> - "{Topic}" — {N} participants, summary ready
> - "{Topic}" — {N} participants, summary ready

Do not show session UUIDs. Users reference sessions by topic text in other commands.

If there are no sessions, say: "You don't have any sessions yet. Run `/harmonica-chat` to create your first one."
