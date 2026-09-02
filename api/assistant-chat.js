// Vercel Serverless Function：改造小助手对话。
// 对应高保真设计稿"改造小助手能帮你"那屏定的三类能力：①产品答疑 ②缝纫知识 ③结合用户当前改造进度给建议
// (前端如果传了 context，就把"正在做什么包/卡在哪一步"这些信息一起给模型参考)。
// 复用已经被 Bedi 真实验证成功过的 generateContent 端点 + 同一个 GEMINI_API_KEY，不需要新的环境变量。
//
// ⚠️诚实说明：这个函数本身没能在写代码的这台机器上真实联网调用验证过(和这个项目里其他AI功能一样，卡在
// 同一个网络出站限制)，只做过本地 mock 测试(请求体拼得对不对、各种失败分支处理对不对)。真实调用效果需要
// Bedi 部署后实际发几条消息测一下才知道。
//
// 字段命名沿用这个项目里已经被真实验证过的规律——generate-creative-image.js 顶层字段(contents/generationConfig)
// 用驼峰、parts 里嵌套字段(inline_data/mime_type)用下划线——这次 systemInstruction 是和 contents 同级的顶层字段，
// 按同样的规律写成驼峰；这个具体字段本身没有被真实调用验证过，如果部署后报错提示字段不认识，去
// https://ai.google.dev/api/generate-content 核对一下 system_instruction 这个字段的准确写法再改。
const MODEL_ID = 'gemini-3.5-flash-lite'; // 和 identify-garment.js 用同一个型号(便宜、够用于对话问答)。
// 如果部署后发现聊天回答质量不够、经常答不到点上，可以把这个常量直接换成 gemini-3.7-flash(截至写这份代码时
// 是文档里列出的最强通用模型，2026-08-13发布)，不用改其他逻辑，模型越强通常越贵，先用便宜的够不够用测出来再说。
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`;

const SYSTEM_PROMPT = `你是"绿缝(EcoStitch)"旧衣改造小程序里的"改造小助手"。你能帮用户三类事：
①产品答疑——比如怎么打印纸样、这个App现在能不能下单买东西、为什么某块面料在某个包型上说"不够用"；
②缝纫知识——改造/缝纫相关的术语、面料特性、针法技巧，尽量给具体、可操作的解释，不要空泛；
③结合用户当前改造进度给建议——如果消息末尾带了"当前进度参考"这段信息，优先针对这个进度回答，不要答非所问。

如实回答的原则(必须遵守)：
- 不确定的问题，直接说不确定/不知道，不要编答案，尤其是具体的裁剪尺寸/数值这类容易编错的内容。
- 这个App目前**没有**真实的多用户社区、商城下单支付、真人客服、站内消息系统——如果用户问"能不能发到社区求助""能不能联系人工客服""能不能查订单/发货"这类，如实告知这些功能这个版本还没做，不要假装能做到、也不要编一个虚假的处理结果。
- 回答尽量简短、口语化，像手机聊天气泡里的一两句话，一般控制在120字以内，除非用户明确要更详细的说明。
- 你不是真人客服，不要自称"我们客服"、不要编造工号/姓名这类身份信息。`;

function buildContents(history, message) {
  const safeHistory = Array.isArray(history) ? history.slice(-12) : [];
  const contents = safeHistory
    .filter(h => h && typeof h.text === 'string' && h.text.trim())
    .map(h => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(h.text).slice(0, 2000) }],
    }));
  contents.push({ role: 'user', parts: [{ text: message }] });
  return contents;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: '只支持 POST 请求' }); return; }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { res.status(500).json({ error: '服务端没有配置 GEMINI_API_KEY' }); return; }

  const { message, history, context } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: '缺少 message 参数' });
    return;
  }

  let contextLine = '';
  if (context && (context.bagName || context.stepLabel || context.garmentTypeLabel)) {
    contextLine = '\n\n[当前进度参考，这不是用户说的话，是App传来的背景信息]：'
      + (context.garmentTypeLabel ? `旧衣类型=${context.garmentTypeLabel}；` : '')
      + (context.bagName ? `正在改造成=${context.bagName}；` : '')
      + (context.stepLabel ? `当前所在步骤=${context.stepLabel}` : '');
  }

  try {
    const resp = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT + contextLine }] },
        contents: buildContents(history, message.trim()),
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      res.status(resp.status).json({ error: 'Gemini 接口返回错误', detail: errText });
      return;
    }

    const data = await resp.json();
    const reply = data
      && data.candidates && data.candidates[0]
      && data.candidates[0].content && data.candidates[0].content.parts
      && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;

    if (!reply || !reply.trim()) {
      res.status(502).json({ error: 'Gemini 返回了内容，但没有找到文字回复', raw: data });
      return;
    }
    res.status(200).json({ reply: reply.trim() });
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : '调用失败' });
  }
}
