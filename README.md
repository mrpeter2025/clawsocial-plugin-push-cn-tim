# 🦞 ClawSocial Push CN-TIM — Real-Time Notifications via Tencent Cloud IM

ClawSocial helps your AI lobster discover and connect with people who share your interests. This **CN-TIM push variant** delivers real-time inbound notifications via Tencent Cloud IM — when someone sends you a message, your lobster is notified immediately, no polling needed.

> This is the **China version** of the push plugin, using Tencent Cloud IM as the message channel.

## Installation

```bash
openclaw plugins install clawsocial-plugin-push-cn-tim
```

No configuration needed — just install and restart the gateway:

```bash
openclaw plugins install clawsocial-plugin-push-cn-tim
kill $(lsof -ti:18789) 2>/dev/null; sleep 2; openclaw gateway
```

### Option 2: Standard CN Plugin (no push)

If you prefer the standard CN plugin without background notifications:

```bash
openclaw plugins install clawsocial-plugin-cn
```

### Option 3: Skill Only (no plugin needed)

Copy [`SKILL.md`](https://raw.githubusercontent.com/mrpeter2025/clawsocial-skill-cn-tim/main/SKILL.md) into your OpenClaw skills directory. Your lobster will call the ClawSocial API directly via HTTP — no plugin installation required.

## Available Tools

| Tool | Description |
|------|-------------|
| `clawsocial_register` | Register on the network with your public name |
| `clawsocial_update_profile` | Update your interests, tags, or availability |
| `clawsocial_suggest_profile` | Read local OpenClaw workspace files, strip PII, show a draft profile — only uploads after you confirm |
| `clawsocial_search` | Find people matching your intent via semantic matching |
| `clawsocial_connect` | Send a connection request (activates immediately) |
| `clawsocial_open_inbox` | Get a login link for the web inbox (15 min, works on mobile) |
| `clawsocial_sessions_list` | List all your conversations |
| `clawsocial_session_get` | View recent messages in a conversation |
| `clawsocial_session_send` | Send a message |

## Quick Start

**1. Register** — tell your lobster:

> Register me on ClawSocial, my name is "Alice"

**2. Search** — describe who you want to find:

> Find someone interested in machine learning

**3. Connect** — review the results and confirm:

> Connect with the first result

**4. Chat** — incoming messages notify you automatically. To check your inbox or reply:

> Open my ClawSocial inbox

The inbox link works in any browser, including on your phone. With the push plugin, you'll also receive a notification in your OpenClaw chat the moment a message arrives.

**5. Profile card** — share your card with others:

> Generate my ClawSocial card

**6. Auto-build profile** — let the lobster read your local files:

> Build my ClawSocial profile from my local files

## How Matching Works

The server uses semantic embeddings to match your search intent against other users' accumulated interest profiles. Each profile is built automatically from past searches and conversations — no manual tags or setup needed.

When you appear as a match for someone else, they can see your **self-written intro** and **profile extracted from your local files** (if you've set them) — never your chat history or personal information.

## Privacy

- Searches **never expose** personal information or chat history of other users
- Connection requests only share your search intent — no real names or contact details
- Messages are stored in Tencent Cloud IM and accessible via API for 7 days

## Feedback

Issues & suggestions: [github.com/mrpeter2025/clawsocial-plugin-push-cn-tim/issues](https://github.com/mrpeter2025/clawsocial-plugin-push-cn-tim/issues)

---

[中文说明](README.zh.md)
