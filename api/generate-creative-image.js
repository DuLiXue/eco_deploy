// Vercel Serverless Function：把 MVP 前端(index.html)的"生成效果图"请求转发给 Gemini API。
// 存在的意义：Gemini API key 不能放进前端静态文件(任何人看源码都能偷走)，只能放在服务端的环境变量里，
// 由这个函数代为发起真正的调用，前端只调用这个函数自己的地址(同域下就是 /api/generate-creative-image)。
//
// ⚠️ 诚实说明：下面这个请求/响应结构是根据 Google 官方文档(ai.google.dev/gemini-api/docs/generate-content/image-generation
// 和 ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image)整理的，但这个开发环境本身的网络出站
// 连不到 generativelanguage.googleapis.com(交接文档里记录过，账号/会话层面的限制，不是单台机器的问题)，
// 所以这份代码没有能力从这个环境里真实跑一次、看到真实的成功响应——部署到 Vercel 后 Vercel 自己的服务器
// 出站不受这个限制，但第一次真实调用建议 Bedi 自己核对一下 Gemini API 后台/控制台返回的实际结果，
// 如果字段名对不上(比如 Google 那边后续又改了接口)，照着报错信息调整下面 parts/inlineData 这几处即可。
//
// 模型:如果调用后报"模型不存在"或"已弃用"，去 https://ai.google.dev/gemini-api/docs/models 查当前可用的
// 图片生成模型ID替换下面的 MODEL_ID(写这份代码时官方文档里同时出现过 gemini-2.5-flash-image 和更新的
// gemini-3.1-flash-image，选一个文档里明确标注支持"图生图"/"image editing"的型号)。
const MODEL_ID = 'gemini-2.5-flash-image';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`;

// 2026-09-12 新增：Bedi 反馈"多张照片一起生成时经常失败"。排查下来这里有两个平台层面的硬限制，都可能是
// 原因：①Vercel 云函数单次请求体大小上限(约 4.5MB，这个改不了，只能从前端把照片体积压小，见 index.html
// 里 resizePhotoDataUrl 的调用)；②Vercel 云函数默认执行超时时间比较短(Hobby 账号常见默认是 10 秒)，
// 多张图片一起发给 Gemini、模型需要处理的内容变多，真实耗时可能比单张图片长，容易撞到这个超时上限、
// 被 Vercel 直接掐断返回 504——这种情况前端也只会看到"请求失败"，看不出是超时。下面这行把这个函数自己
// 的最长执行时间显式提高到 60 秒(Vercel 的"Function-level configuration"写法)，减少因为超时被掐断的
// 概率。⚠️ 诚实说明：60 秒是否真的生效，取决于 Vercel 账号的套餐——免费的 Hobby 套餐目前允许把单个函数
// 的执行时间配置到最长 60 秒，但如果 Bedi 的项目套餐不允许，Vercel 部署时通常会在构建日志里给出提示，
// 到时候按提示调整这个数字即可(比如改回 10 或 30)。
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  // 允许跨域调用——如果以后 MVP 页面和这个函数没有部署在同一个 Vercel 项目/域名下，需要这个；
  // 同域部署(推荐做法，见部署说明)下这几行不影响正常使用。
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: '只支持 POST 请求' }); return; }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: '服务端没有配置 GEMINI_API_KEY 环境变量——去 Vercel 项目设置里加一条，值是你在 Google AI Studio 申请的 key' });
    return;
  }

  try {
    // 2026-09-12 新增多件旧衣拼合功能：前端现在可以额外传 photoDataUrls(数组，第一张仍是主旧衣照片，
    // 后面 1-2 张是用户额外上传的其他旧衣照片)，让 Gemini 同时看到多张图、把不同旧衣的面料拼进同一个
    // 设计里(比如包身用第一件、包带/侧边用第二件)。保留旧字段 photoDataUrl 做向后兼容——如果前端某处
    // 还是只传单图字段，这里照样按单图处理，不会破坏原有调用方式。
    const { photoDataUrl, photoDataUrls, prompt } = req.body || {};
    const urls = Array.isArray(photoDataUrls) && photoDataUrls.length
      ? photoDataUrls
      : (photoDataUrl ? [photoDataUrl] : []);
    if (!urls.length || !prompt) {
      res.status(400).json({ error: '请求里缺少 photoDataUrl(s) 或 prompt 字段' });
      return;
    }
    // 最多拼 3 张(1 张主图 + 2 张额外图)，避免请求体过大、也避免素材太多让生成结果变乱。
    const limitedUrls = urls.slice(0, 3);

    // 每张 photoDataUrl 都是形如 "data:image/png;base64,xxxxx" 的 data URL，
    // Gemini API 只要纯 base64 数据 + 单独的 mime type，这里逐张拆开、拼成多个 inline_data part。
    const imageParts = [];
    for (const url of limitedUrls) {
      const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(url);
      if (!match) {
        res.status(400).json({ error: 'photoDataUrl(s) 格式不对，应该是 data:image/xxx;base64,... 这样的完整 data URL' });
        return;
      }
      imageParts.push({ inline_data: { mime_type: match[1], data: match[2] } });
    }

    // 2026-09-13 新增：Bedi 截图反馈了一次真实失败——Gemini 这次调用"有返回内容，但内容是一段文字描述
    // (比如"这是使用您提供的旧衣物面料制作的波士顿枕头包……")，没有真的生成图片"，也就是模型把这次请求
    // 当成了"描述一下"而不是"画一张图"。这是 Gemini 图片生成模型已知会出现的情况，概率不算高但确实存在，
    // 之前把 temperature 调到 1.3(为了解决"重新生成总是同一个款式")之后，采样随机性变大，出现这种"文不对
    // 题、只回文字不出图"的概率也跟着变大了。这次做两处调整：
    // ①在 prompt 末尾强制补一句"必须输出图片，不能只用文字描述"，从指令层面降低模型选择"只回答文字"的
    //   概率；②把这次调用包一层重试——如果 Gemini 这次返回的内容里确实没有图片数据(不是网络错误，是"返回
    //   成功但没图"这种特定情况)，就自动换一次种子再请求一次(最多重试 2 次，一共最多 3 次尝试)，因为这种
    //   情况往往换一次生成就正常了，没必要让用户自己手动点"重试生成"。同时把 temperature 从 1.3 降回 1.0
    //   (Gemini 默认水平)——"每次换一个具体不同方向"这件事，前端 REGEN_VARIATIONS 那组明确的文字指令已经
    //   能保证了，不需要再额外靠调高 temperature 来碰运气，这样能在"保留生成结果多样性"和"降低只出文字不出
    //   图的概率"之间取一个更稳的平衡。
    const MUST_OUTPUT_IMAGE_SUFFIX = '（重要：这次请求必须输出一张真实生成的图片，不允许只用文字描述这个设计而不生成图片，如果无法生成图片也不要用文字回答，要重新尝试生成图片）';
    const finalPrompt = prompt + MUST_OUTPUT_IMAGE_SUFFIX;
    const MAX_ATTEMPTS = 3;
    let lastNoImageData = null;
    let lastHttpError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const geminiResp = await fetch(GEMINI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: finalPrompt },
              ...imageParts,
            ],
          }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'], temperature: 1.0 },
        }),
      });

      if (!geminiResp.ok) {
        // HTTP 层面的错误(比如 billing 没开通、模型ID不存在、请求格式错误)重试也没用，直接返回，不浪费
        // 重试次数——这类错误的报错信息里已经写清楚了常见原因：①这个 API key 所在的 Google Cloud 项目
        // 没有开通结算(billing)——Gemini 图片生成模型目前没有免费额度；②MODEL_ID 已经更新/弃用。
        const errText = await geminiResp.text();
        lastHttpError = { status: geminiResp.status, errText };
        break;
      }

      const data = await geminiResp.json();
      const parts = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
      const imgPart = parts.find(p => p.inlineData && p.inlineData.data);
      if (imgPart) {
        const outMime = imgPart.inlineData.mimeType || 'image/png';
        const imageDataUrl = 'data:' + outMime + ';base64,' + imgPart.inlineData.data;
        res.status(200).json({ imageDataUrl });
        return;
      }
      // 返回成功，但没有图片数据——记下来，如果还有重试次数就再来一次；用完了就把最后一次的原始返回带出去。
      lastNoImageData = data;
    }

    if (lastHttpError) {
      res.status(lastHttpError.status).json({ error: 'Gemini API 调用失败(状态码 ' + lastHttpError.status + '): ' + lastHttpError.errText });
      return;
    }
    res.status(502).json({ error: 'Gemini 返回了内容，但里面没有图片数据(已自动重试 ' + MAX_ATTEMPTS + ' 次仍是这样)，原始返回(截断): ' + JSON.stringify(lastNoImageData).slice(0, 800) });
  } catch (err) {
    res.status(500).json({ error: '服务端处理异常: ' + (err && err.message ? err.message : String(err)) });
  }
}
