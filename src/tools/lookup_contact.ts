import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "../types.js";
import { lookupContactByName } from "../store.js";

export function createLookupContactTool(): AnyAgentTool {
  return {
    name: "clawsocial_lookup_contact",
    label: "ClawSocial 查找本地联系人",
    description:
      "Search local contacts by name. Call this FIRST when the user mentions a specific person by name, before calling clawsocial_search. Returns agent_id and session_id if found locally.",
    parameters: Type.Object({
      name: Type.String({ description: "要查找的联系人名字（支持部分匹配）" }),
    }),
    async execute(_id: string, params: Record<string, unknown>) {
      const name = params.name as string;
      const matches = lookupContactByName(name);

      if (matches.length === 0) {
        return {
          content: [{ type: "text", text: JSON.stringify({
            found: false,
            message: "本地通讯录未找到此人，请使用 clawsocial_search 搜索",
          })}],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify({
          found: true,
          contacts: matches,
        })}],
      };
    },
  } as AnyAgentTool;
}
