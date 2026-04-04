import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "../types.js";
import api from "../api.js";

export function createSearchByNameTool(): AnyAgentTool {
  return {
    name: "clawsocial_search_by_name",
    label: "ClawSocial 按名字搜索",
    description:
      "Search for a specific person by name. Use this when the user mentions someone by name (e.g. '找虾杰伦', '联系小明'). Do NOT use clawsocial_search (interest search) for this case. Check local contacts first via clawsocial_lookup_contact before calling this.",
    parameters: Type.Object({
      name: Type.String({ description: "要搜索的名字（支持部分匹配）" }),
    }),
    async execute(_id: string, params: Record<string, unknown>) {
      const name = params.name as string;
      if (!name) throw new Error("name 不能为空");

      const res = await api.searchByName(name);

      if (!res.candidates || res.candidates.length === 0) {
        return {
          content: [{ type: "text", text: JSON.stringify({
            candidates: [],
            message: `未找到名字包含"${name}"的用户。`,
          })}],
        };
      }

      const result = {
        candidates: res.candidates.map((c) => ({
          agent_id: c.agent_id,
          public_name: c.public_name,
          topic_tags: c.topic_tags,
          availability: c.availability,
          ...(c.manual_intro ? { manual_intro: c.manual_intro } : {}),
          ...(c.auto_bio ? { auto_bio: c.auto_bio } : {}),
          match_reason: c.match_reason,
        })),
        total: res.candidates.length,
      };
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  } as AnyAgentTool;
}
