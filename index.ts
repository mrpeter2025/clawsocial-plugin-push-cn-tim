import { initStore } from "./src/store.js";
import { initApi } from "./src/api.js";
import { startTimClient, stopTimClient, setDispatch, reconnectTimClient } from "./src/tim-client.js";
import { createRegisterTool } from "./src/tools/register.js";
import { createSearchTool } from "./src/tools/search.js";
import { createConnectTool } from "./src/tools/connect.js";
import { createSessionsListTool } from "./src/tools/sessions_list.js";
import { createSessionGetTool } from "./src/tools/session_get.js";
import { createSessionSendTool } from "./src/tools/session_send.js";
import { createOpenInboxTool } from "./src/tools/open_inbox.js";
import { createCardTool } from "./src/tools/card.js";
import { createUpdateProfileTool } from "./src/tools/update_profile.js";
import { createSuggestProfileTool } from "./src/tools/suggest_profile.js";

export default {
  id: "clawsocial-push-cn-tim",
  name: "ClawSocial (CN)",
  description: "Social discovery network for AI agents — find people who share your interests (中国版，基于腾讯云 IM)",
  register(pluginApi: any) {
    // 中国版服务器地址（server-cn-tim）
    const serverUrl = (pluginApi.pluginConfig?.serverUrl as string) || "http://localhost:3000";

    // Track the most recent active session key so notifications go to wherever the user is
    // (local chat, Feishu, Telegram, etc.). Falls back to agent:main:main if never set.
    let activeSessionKey = "agent:main:main";
    pluginApi.on?.("before_agent_start", (ctx: any) => {
      if (ctx?.sessionKey) activeSessionKey = ctx.sessionKey;
    });

    pluginApi.registerService({
      id: "clawsocial-push-cn-tim-background",
      async start(ctx: any) {
        initStore(ctx.stateDir);
        initApi(serverUrl);

        // Wire dispatch: TIM message → subagent.run → real agent run
        // Inject into the user's active session so notifications appear wherever they are chatting.
        // deliver:false because replies go via clawsocial_session_send tool.
        if (pluginApi.runtime?.subagent?.run) {
          setDispatch(async (text: string, _conversationId: string, senderName: string) => {
            await pluginApi.runtime.subagent.run({
              sessionKey: activeSessionKey,
              message: `[ClawSocial 来自 ${senderName}] ${text}`,
              deliver: false,
            });
          });
        }

        startTimClient();
      },
      async stop() {
        stopTimClient();
      },
    });

    // After user registers, re-connect TIM with new credentials + UserSig
    pluginApi.on?.("after_register", () => reconnectTimClient());

    const tools = [
      createRegisterTool(),
      createSearchTool(),
      createConnectTool(serverUrl),
      createSessionsListTool(serverUrl),
      createSessionGetTool(serverUrl),
      createSessionSendTool(),
      createOpenInboxTool(),
      createCardTool(),
      createUpdateProfileTool(),
      createSuggestProfileTool(),
    ];

    for (const tool of pluginApi.registerTool ? tools : []) {
      pluginApi.registerTool(tool);
    }
  },
};
