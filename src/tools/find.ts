import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "../types.js";
import api from "../api.js";
import { readContacts, lookupContactByName } from "../store.js";

export function createFindTool(): AnyAgentTool {
  return {
    name: "clawsocial_find",
    label: "ClawSocial 找人",
    description:
      "Find a specific person by name or agent_id. Use when the user wants to locate a specific person " +
      "(e.g. '找虾杰伦', '联系小明', '找做AI的小明'). Checks local contacts first, then searches the server. " +
      "For broad interest-based discovery ('找做AI的人'), use clawsocial_match instead.",
    parameters: Type.Object({
      name: Type.Optional(Type.String({ description: "名字搜索（支持部分匹配）" })),
      agent_id: Type.Optional(Type.String({ description: "精确 agent ID 查找" })),
      interest: Type.Optional(Type.String({ description: "兴趣/描述，用于在多个同名结果中消歧" })),
    }),
    async execute(_id: string, params: Record<string, unknown>) {
      const name = params.name as string | undefined;
      const agentId = params.agent_id as string | undefined;
      const interest = params.interest as string | undefined;

      if (!name && !agentId) {
        throw new Error("至少提供 name 或 agent_id 之一");
      }

      // ── agent_id 查找 ──
      if (agentId) {
        const contacts = readContacts();
        const local = contacts.find(c => c.agent_id === agentId);
        if (local) {
          return ok({ source: "local_contact", results: [formatContact(local)] });
        }
        try {
          const agent = await api.getAgent(agentId);
          return ok({ source: "server", results: [agent] });
        } catch {
          return notFound(`未找到 ID 为 ${agentId} 的用户`);
        }
      }

      // ── 名字查找 ──
      // 1. 先查本地通讯录
      let localMatches = lookupContactByName(name!);
      if (interest && localMatches.length > 1) {
        const kw = interest.toLowerCase();
        const filtered = localMatches.filter(c =>
          c.topic_tags?.some(t => t.toLowerCase().includes(kw)) ||
          c.auto_bio?.toLowerCase().includes(kw)
        );
        if (filtered.length > 0) localMatches = filtered;
      }

      // 2. 查服务端（带 intent 做语义排序）
      let serverResults: Record<string, unknown>[] = [];
      try {
        const res = await api.searchByName(name!, interest);
        serverResults = (res.candidates || []).map(c => ({
          agent_id: c.agent_id,
          public_name: c.public_name,
          topic_tags: c.topic_tags,
          availability: c.availability,
          manual_intro: c.manual_intro || "",
          auto_bio: c.auto_bio || "",
          match_reason: c.match_reason || "名字匹配",
        }));
      } catch { /* 服务端不可达时依赖本地结果 */ }

      // 3. 合并去重（本地优先）
      const localIds = new Set(localMatches.map(c => c.agent_id));
      const merged = [
        ...localMatches.map(formatContact),
        ...serverResults.filter(c => !localIds.has(c.agent_id as string)),
      ];

      if (merged.length === 0) {
        return notFound(`未找到名字包含"${name}"的用户`);
      }

      return ok({ results: merged, total: merged.length });
    },
  } as AnyAgentTool;
}

function formatContact(c: { name: string; agent_id: string; session_id?: string; topic_tags?: string[]; auto_bio?: string }) {
  return {
    agent_id: c.agent_id,
    public_name: c.name,
    session_id: c.session_id,
    topic_tags: c.topic_tags || [],
    auto_bio: c.auto_bio || "",
    is_contact: true,
  };
}

function ok(data: Record<string, unknown>) {
  return { content: [{ type: "text", text: JSON.stringify({ found: true, ...data }) }] };
}

function notFound(message: string) {
  return { content: [{ type: "text", text: JSON.stringify({ found: false, message }) }] };
}
