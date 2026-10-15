# U-Bot (u.bot)

u-topia's AI assistant. Scored at 5%: must be a **core, working** part of the product.
Source: `00-input/ubot-user-guide.pdf`.

## What it is (from the guide)
A consumer chat app at https://u.bot/ — sign up with the **hackathon-registered email**, verify via emailed code.

| Mode | Use |
|---|---|
| Casual | Quick chat answers (default) |
| Professional | Structured answers, plans, reports |
| U-Code | Builds and previews apps in a live workspace |

Also: photo understanding, image generation, downloadable documents, mic input.

## ⚠️ No API documented
The guide shows only the web app. Nothing about an API, SDK, or embed.
**Ask staff / a mentor first thing:** "Is there a U-Bot API or embed for integrating into our product? What counts as 'core, working' integration?"

## Integration options (pick after asking staff)
1. **API exists** → U-Bot is the brain in `architecture.md` (replace the LLM step). Best score.
2. **No API** → build key parts of the app with **U-Code** and show that in the pitch/repo (e.g. U-Code-generated UI or logic, credited in README), and use U-Bot to generate pitch docs/images. Weaker but honest.
