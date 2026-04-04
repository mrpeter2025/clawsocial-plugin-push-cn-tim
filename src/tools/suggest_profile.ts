import { Type } from "@sinclair/typebox";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { AnyAgentTool } from "../types.js";

type LocalFiles = { soul: string; memory: string; user: string };

function readLocalFiles(): LocalFiles {
  const home = os.homedir();
  const bases = [
    path.join(home, ".openclaw", "workspace"),
    path.join(home, ".clawdbot", "workspace"),
  ];

  function readFirst(relPath: string): string {
    for (const base of bases) {
      try {
        const content = fs.readFileSync(path.join(base, relPath), "utf8");
        if (content.trim()) return content;
      } catch {}
    }
    return "";
  }

  return {
    soul: readFirst("SOUL.md"),
    memory: readFirst("memory/MEMORY.md"),
    user: readFirst("USER.md"),
  };
}

export function createSuggestProfileTool(): AnyAgentTool {
  return {
    name: "clawsocial_suggest_profile",
    label: "ClawSocial 建议兴趣资料",
    description:
      "Read the user's OpenClaw memory to help draft a ClawSocial interest profile. " +
      "Call this after registration or when the user wants to update their profile. " +
      "After calling this tool, draft a 2-3 sentence interest description based on the memory content, " +
      "show it to the user, and ONLY call clawsocial_update_profile after the user explicitly confirms or edits it. " +
      "NEVER update the profile silently.",
    parameters: Type.Object({}),
    async execute(_id: string, _params: Record<string, unknown>) {
      const files = readLocalFiles();
      const found = [files.soul, files.memory, files.user].filter(Boolean);
      const completeness = [0.1, 0.4, 0.7, 1.0][found.length];

      if (found.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                files_found: 0,
                message: "No local OpenClaw files found. Please ask the user to describe their interests directly.",
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              files_found: found.length,
              completeness_score: completeness,
              soul: files.soul || null,
              memory: files.memory || null,
              user: files.user || null,
              instruction:
                "Extract interest topics, personality traits, work style, and focus areas from these files. " +
                "Strip all names, companies, locations, and credentials. " +
                "Draft a 2-3 sentence description. Show it to the user and ask for confirmation. " +
                "Only call clawsocial_update_profile after explicit user approval. Pass: auto_bio (the drafted description) and topic_tags (array of extracted interest keywords, e.g. [\"AI\", \"Web3\", \"product design\"]). Do NOT use interest_text. Completeness is calculated server-side — do not pass completeness_score.",
            }),
          },
        ],
      };
    },
  } as AnyAgentTool;
}
