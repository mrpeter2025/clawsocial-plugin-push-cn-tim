/**
 * TIM Client — 腾讯云 IM 实时消息接收
 *
 * 替代 ws-client.ts，使用 @tencentcloud/chat Node.js SDK
 * 接收来自对方 Agent 的消息，dispatch 到 OpenClaw 活跃会话
 */

import { getState, upsertSession, getSession, addMessage } from "./store.js";
import api from "./api.js";

// @tencentcloud/chat exports a default object with create() + EVENT + TYPES
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let TencentCloudChat: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let timSdk: any = null;

let _ready = false;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

// Dispatch function injected by index.ts (subagent.run → real agent run)
let _dispatch: ((text: string, conversationId: string, senderName: string) => Promise<void>) | null = null;

export function setDispatch(fn: (text: string, conversationId: string, senderName: string) => Promise<void>): void {
  _dispatch = fn;
}

function log(msg: string): void {
  console.log(`[ClawSocial TIM] ${msg}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleMessage(msg: any): Promise<void> {
  // Only handle C2C (one-to-one) messages
  if (!TencentCloudChat || msg.conversationType !== TencentCloudChat.TYPES.CONV_C2C) return;

  const fromUserId: string = msg.from as string;
  const myId = getState().agent_id;
  if (!fromUserId || fromUserId === myId) return; // ignore own messages (echo)

  // Extract text payload
  const elements: unknown[] = Array.isArray(msg.payload?.elems) ? msg.payload.elems : [];
  let text = "";
  for (const el of elements) {
    const e = el as { type?: string; content?: { text?: string } };
    if (e.type === "TIMTextElem" && e.content?.text) {
      text += e.content.text;
    }
  }
  // Fallback: tim-js-sdk shape (payload.text)
  if (!text && (msg.payload as { text?: string })?.text) {
    text = (msg.payload as { text: string }).text;
  }
  if (!text) return;

  // Look up session & partner name from local store
  // session id is stored as the sessionId key in sessions.json
  // We search by partner_agent_id
  const session = Object.values(
    (await import("./store.js")).getSessions()
  ).find((s) => s.partner_agent_id === fromUserId);

  const sessionId = session?.id ?? fromUserId; // fallback to userId as conversationId
  const partnerName = session?.partner_name ?? fromUserId;

  addMessage(sessionId, {
    id: `tim-${Date.now()}`,
    from_self: false,
    partner_name: partnerName,
    content: text,
    created_at: (msg.time as number) || Math.floor(Date.now() / 1000),
  });

  log(`来自 ${partnerName}：${text.slice(0, 60)}`);

  if (_dispatch) {
    await _dispatch(text, sessionId, partnerName);
  }
}

async function initTIM(): Promise<void> {
  if (!TencentCloudChat) {
    // Dynamic import so the module resolves at runtime (ESM)
    const mod = await import("@tencentcloud/chat");
    TencentCloudChat = mod.default ?? mod;
  }

  const state = getState();
  if (!state.agent_id) {
    log("尚未注册，跳过 TIM 初始化");
    return;
  }

  // Fetch UserSig from our server (server-cn-tim /auth/usersig endpoint)
  let userSigResult: { user_id: string; user_sig: string; sdk_app_id: number };
  try {
    userSigResult = await api.getUserSig();
  } catch (err) {
    log(`获取 UserSig 失败：${(err as Error).message}，30s 后重试`);
    _reconnectTimer = setTimeout(initTIM, 30_000);
    return;
  }

  const { user_sig: userSig, sdk_app_id: sdkAppId } = userSigResult;

  // Destroy previous instance if any
  if (timSdk) {
    try { timSdk.destroy(); } catch { /* ignore */ }
    timSdk = null;
    _ready = false;
  }

  timSdk = TencentCloudChat.create({ SDKAppID: sdkAppId });
  timSdk.setLogLevel(2); // 0=debug, 1=log, 2=warn, 3=error

  timSdk.on(TencentCloudChat.EVENT.SDK_READY, () => {
    _ready = true;
    log("TIM SDK 就绪，开始接收消息");
  });

  timSdk.on(TencentCloudChat.EVENT.SDK_NOT_READY, () => {
    _ready = false;
    log("TIM SDK 未就绪");
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timSdk.on(TencentCloudChat.EVENT.MESSAGE_RECEIVED, (event: any) => {
    const messages: unknown[] = Array.isArray(event?.data) ? event.data : [];
    for (const msg of messages) {
      handleMessage(msg).catch((err) =>
        console.error("[ClawSocial TIM] dispatch error:", err)
      );
    }
  });

  timSdk.on(TencentCloudChat.EVENT.KICKED_OUT, () => {
    log("账号被踢下线，30s 后重新登录");
    _ready = false;
    _reconnectTimer = setTimeout(initTIM, 30_000);
  });

  // Login
  const loginRes = await timSdk.login({ userID: state.agent_id, userSig });
  if (loginRes.code !== 0) {
    log(`登录失败 code=${loginRes.code}，30s 后重试`);
    _reconnectTimer = setTimeout(initTIM, 30_000);
    return;
  }

  log(`已登录 TIM，用户 ID: ${state.agent_id}`);
}

export function startTimClient(): void {
  initTIM().catch((err) => {
    console.error("[ClawSocial TIM] 初始化错误:", err);
    _reconnectTimer = setTimeout(startTimClient, 30_000);
  });
}

export function reconnectTimClient(): void {
  if (_reconnectTimer) clearTimeout(_reconnectTimer);
  initTIM().catch((err) => {
    console.error("[ClawSocial TIM] 重连错误:", err);
    _reconnectTimer = setTimeout(startTimClient, 30_000);
  });
}

export function stopTimClient(): void {
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
  if (timSdk) {
    try { timSdk.destroy(); } catch { /* ignore */ }
    timSdk = null;
    _ready = false;
  }
}
