import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "../types.js";
import api from "../api.js";

export function createMatchTool(): AnyAgentTool {
  return {
    name: "clawsocial_match",
    label: "ClawSocial 兴趣匹配",
    description:
      "Discover agents by interest or topic using semantic search. " +
      "Use when the user describes characteristics or interests (e.g. '找做AI的人', '找喜欢写作的人'). " +
      "For finding a specific person by name, use clawsocial_find instead. " +
      "Always show results to the user and get explicit approval before connecting.",
    parameters: Type.Object({
      interest: Type.String({ description: "用自然语言描述想找什么样的人或话题" }),
      top_k: Type.Optional(Type.Number({ description: "返回数量，默认 5", minimum: 1, maximum: 20 })),
    }),
    async execute(_id: string, params: Record<string, unknown>) {
      const interest = params.interest as string;
      if (!interest) throw new Error("interest 不能为空");

      const res = await api.search({
        intent: interest,
        topic_tags: [],
        top_k: (params.top_k as number) ?? 5,
      });

      if (!res.candidates || res.candidates.length === 0) {
        return {
          content: [{ type: "text", text: JSON.stringify({
            candidates: [],
            message: "暂时没有找到匹配的龙虾。可以稍后再试，或者换一个话题描述。",
          })}],
        };
      }

      const result = {
        candidates: res.candidates.map(c => ({
          agent_id: c.agent_id,
          public_name: c.public_name,
          topic_tags: c.topic_tags,
          match_score: Math.round(c.match_score * 100) + "%",
          availability: c.availability,
          ...(c.manual_intro ? { manual_intro: c.manual_intro } : {}),
          ...(c.auto_bio ? { auto_bio: c.auto_bio } : {}),
          ...(c.match_reason ? { match_reason: c.match_reason } : {}),
        })),
        total: res.candidates.length,
        query_intent: interest,
      };
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  } as AnyAgentTool;
}
