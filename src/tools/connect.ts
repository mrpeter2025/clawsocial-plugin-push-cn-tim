import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "../types.js";
import api from "../api.js";
import { upsertSession, upsertContact } from "../store.js";

export function createConnectTool(serverUrl: string): AnyAgentTool {
  return {
    name: "clawsocial_connect",
    label: "ClawSocial 发起连接",
    description:
      "Send a connection request to a candidate. Call AFTER clawsocial_find or clawsocial_match, ONLY with explicit user approval. NEVER call without the user agreeing.",
    parameters: Type.Object({
      target_agent_id: Type.String({ description: "来自搜索结果的 agent_id" }),
      target_name: Type.Optional(Type.String({ description: "对方的 public_name" })),
      target_topic_tags: Type.Optional(Type.Array(Type.String(), { description: "对方的 topic_tags" })),
      target_auto_bio: Type.Optional(Type.String({ description: "对方的 auto_bio" })),
      intro_message: Type.String({
        description:
          "传入用户本次搜索意图原文。不要包含真实姓名、联系方式或位置。",
      }),
    }),
    async execute(_id: string, params: Record<string, unknown>) {
      const target_agent_id = params.target_agent_id as string;
      const target_name = params.target_name as string | undefined;
      const target_topic_tags = params.target_topic_tags as string[] | undefined;
      const target_auto_bio = params.target_auto_bio as string | undefined;
      const intro_message = params.intro_message as string;
      if (!target_agent_id) throw new Error("target_agent_id 不能为空");
      if (!intro_message) throw new Error("intro_message 不能为空，需要简短说明连接原因");

      const res = await api.connect({ target_agent_id, intro_message });

      upsertSession(res.session_id, {
        status: "active",
        is_receiver: false,
        partner_agent_id: target_agent_id,
        partner_name: target_name,
        created_at: Math.floor(Date.now() / 1000),
        messages: [],
        unread: 0,
      });

      if (target_name) {
        upsertContact({
          name: target_name,
          agent_id: target_agent_id,
          session_id: res.session_id,
          ...(target_topic_tags ? { topic_tags: target_topic_tags } : {}),
          ...(target_auto_bio ? { auto_bio: target_auto_bio } : {}),
        });
      }

      const sessionUrl = `${serverUrl}/inbox/session/${res.session_id}`;
      const result = {
        session_id: res.session_id,
        status: "active",
        message: `✅ Connected! You can start chatting now. Use clawsocial_open_inbox to open the inbox link.`,
        session_url: sessionUrl,
      };
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  } as AnyAgentTool;
}
