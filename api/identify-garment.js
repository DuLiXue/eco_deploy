// Vercel Serverless Function：AI 识别旧衣类型（长裤/衬衫/裙装/外套/已是平整布料）+ 猜测材质。
// 存在的意义和 generate-creative-image.js 一样：Gemini API key 不能放进前端静态文件，只能放服务端环境变量里，
// 由这个函数代为发起真正的调用。前端(index.html 屏①上传照片后)只调用这个函数自己的地址(同域下就是
// /api/identify-garment)，拿到识别结果后【预选】对应的旧衣类型 chip，用户仍然可以在屏②手动点别的类型改过来
// ——AI 只是给个起点建议，不是唯一入口，识别错了也不会卡住流程。
//
// ⚠️ 诚实说明(和 generate-creative-image.js 同一条限制)：这个开发环境本身的网络出站连不到
// generativelanguage.googleapis.com，所以这份代码同样没能在写代码这台机器上真实调用验证过，只用本地 mock
// 测试确认了请求体拼接/响应解析逻辑没写错。generate-creative-image.js 那条链路已经被 Bedi 部署后真实验证成功，
// 这个函数用的是同一个 Gemini API key、同一个 generateContent 端点、同样的 inline_data 请求结构，原理上应该
// 一样能跑通，但"识别结果准不准"这件事本身，需要 Bedi 部署后拿真实旧衣照片测几次才能确认。
//
// 模型选择：分类任务不需要用生成图片的那个贵模型，用更便宜更快的 Flash-Lite 系列文字/多模态模型即可
// (2026-09-01 查询 ai.google.dev/gemini-api/docs/models 确认当前是 gemini-3.5-flash-lite，如果调用报"模型不存在"，
// 去这个页面查最新的 Flash-Lite 型号 ID 替换下面的 MODEL_ID)。
//
// 输出格式：没有依赖 Gemini 的 responseSchema/structured output 功能(这个功能的请求字段大小写在不同文档版本里
// 不完全一致，没能在这个环境里实测确认)，改用更保险的做法——直接在 prompt 里要求模型只回复一段 JSON 文本，
// 拿到文字后自己解析，容错处理了模型可能把 JSON 包在 ```json 代码块里的情况。这是已经很成熟的做法，风险比
// 依赖一个没验证过的字段名要低。
const MODEL_ID = 'gemini-3.5-flash-lite';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`;

const VALID_TYPES = ['pants', 'shirt', 'skirt', 'jacket', 'flat'];

const PROMPT = `你是一个旧衣改造 App 的辅助识别工具。请看这张旧衣照片，判断这件衣物属于下面哪一类，并猜测大致材质。
分类只能从这5个里选一个（用括号里的英文 id 作答）：
- 长裤/牛仔裤 (pants)
- 衬衫/T恤 (shirt)
- 裙装 (skirt)
- 外套/夹克 (jacket)
- 已经是一块平整布料，看不出原本是什么衣物 (flat)

只回复一段 JSON，不要任何其他文字、不要markdown代码块标记，格式严格如下：
{"garmentType":"pants","material":"牛仔布","confidence":"high"}

其中 garmentType 必须是上面5个英文id之一；material 用中文简短描述你猜测的材质(比如"牛仔布"/"棉布"/"涤纶"/"麻"/"羊毛"/"皮革"/"看不清楚材质"这类，不确定就写"看不清楚材质")；confidence 是你对这次分类判断的把握程度，只能是 "high"/"medium"/"low" 之一。`;

function extractJson(text) {
  if (!text) return null;
  // 去掉可能的 ```json ... ``` 包裹
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const raw = fenced ? fenced[1] : text;
  try {
    return JSON.parse(raw.trim());
  } catch (e) {
    // 再兜底：从文本里找第一个 { 到最后一个 } 之间的内容试一次
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try { return JSON.parse(raw.slice(start, end + 1)); } catch (e2) { return null; }
    }
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: '只支持 POST 请求' }); return; }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: '服务端没有配置 GEMINI_API_KEY 环境变量' });
    return;
  }

  try {
    const { photoDataUrl } = req.body || {};
    if (!photoDataUrl) {
      res.status(400).json({ error: '请求里缺少 photoDataUrl 字段' });
      return;
    }

    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(photoDataUrl);
    if (!match) {
      res.status(400).json({ error: 'photoDataUrl 格式不对，应该是 data:image/xxx;base64,... 这样的完整 data URL' });
      return;
    }
    const mimeType = match[1];
    const base64Data = match[2];

    const geminiResp = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mimeType, data: base64Data } },
          ],
        }],
      }),
    });

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      res.status(geminiResp.status).json({ error: 'Gemini API 调用失败(状态码 ' + geminiResp.status + '): ' + errText });
      return;
    }

    const data = await geminiResp.json();
    const parts = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    const textPart = parts.find(p => typeof p.text === 'string');
    const parsed = textPart ? extractJson(textPart.text) : null;

    if (!parsed || !VALID_TYPES.includes(parsed.garmentType)) {
      res.status(502).json({ error: 'Gemini 返回了内容，但没能从中解析出有效的分类结果，原始返回(截断): ' + JSON.stringify(data).slice(0, 800) });
      return;
    }

    res.status(200).json({
      garmentType: parsed.garmentType,
      material: typeof parsed.material === 'string' ? parsed.material : '看不清楚材质',
      confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'low',
    });
  } catch (err) {
    res.status(500).json({ error: '服务端处理异常: ' + (err && err.message ? err.message : String(err)) });
  }
}
