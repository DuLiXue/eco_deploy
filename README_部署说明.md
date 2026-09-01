# EcoStitch MVP 部署到 Vercel(接入真实AI生图)

这个文件夹是一份**独立、可以直接部署**的完整拷贝——`index.html`/`calculator.html` 是从 `MVP流程/` 复制过来的最新版本，`api/generate-creative-image.js` 是新增的服务端云函数。部署之后，MVP 流程里"生成效果图"那一步会真正调用 Gemini API 生成图片，不再是占位卡片。

⚠️ **这份代码没有在真实网络环境下跑通过**——写代码、部署这台机器本身连不到 Gemini 的服务器(交接文档里记录过，是账号/会话层面的网络限制)，所以下面的步骤和代码是照着 Google 官方文档写的，但从没有机会亲眼看到一次真实成功的调用。Vercel 自己的服务器不受这个限制，理论上部署后就能跑通，但**请你部署完之后一定按下面"验证"那一步实际测一次**，如果报错，大概率是下面标注的几个常见原因之一，照着排查就行。

## 部署前要准备的东西

1. 一个 Vercel 账号(vercel.com，用 GitHub 账号登录最省事)
2. 你已经在 Google AI Studio 申请到的 Gemini API key(交接文档里提到你已经有了)
3. **重要**：这个 API key 所在的 Google Cloud 项目，需要开通"结算"(billing)——Gemini 的图片生成模型现在**没有免费额度**，哪怉 key 本身能正常调用文字模型，图片模型也必须先在 [Google Cloud 控制台](https://console.cloud.google.com/billing) 给这个项目挂一个有效的结算账号(绑银行卡/信用卡)，不然调用会报错。费用大概每张图 0.04~0.07 美元左右(取决于生成图片的分辨率)，正常测试用量成本很低，但账号层面这一步不能跳过。

## 部署方式 A：网页操作(推荐，不用装任何东西)

1. 把这个 `部署/vercel/` 文件夹上传到一个新建的 GitHub 仓库(可以设为 Private，不影响部署)。
2. 打开 [vercel.com](https://vercel.com)，登录后点 **Add New → Project**，选择刚才那个仓库，点 Import。
3. Vercel 会自动识别出这是一个带 `api/` 文件夹的项目，不用改任何构建设置，直接下一步。
4. 在 **Environment Variables** 这一栏，添加一条：
   - Name: `GEMINI_API_KEY`
   - Value: 你的 Gemini API key(粘贴进去)
5. 点 **Deploy**，等一两分钟部署完成，会给你一个域名，形如 `https://你的项目名.vercel.app`。

## 部署方式 B：命令行(适合熟悉终端的情况)

```bash
npm i -g vercel          # 安装 Vercel 命令行工具(只需要装一次)
cd 部署/vercel            # 进到这个文件夹
vercel                   # 第一次运行会引导你登录、起项目名，跟着提示走就行
vercel env add GEMINI_API_KEY   # 会提示你粘贴 key 的值，粘贴后回车
vercel --prod             # 部署到正式环境，完成后会打印出访问域名
```

## 部署完成后：验证

1. 用手机或电脑浏览器打开 `https://你的域名.vercel.app/index.html`(不再是本地文件，是真实网址——顺带这一步也应该会解决之前"拍照选项不显示"的问题，因为那大概率是本地文件权限限制导致的)。
2. 走一遍完整流程：上传旧衣 → 拆解引导 → 拍裁开后照片 → 量两条边 → 选包型/风格 → 确认理解 → 生成。
3. 到"生成中"那一步之后，如果看到的是**真实生成的图片**，说明接通了；如果看到的还是"效果图占位·真实 AI 生成图将显示在这里"这张占位卡片，说明调用失败了，回退到了诚实降级——这时候按下面"常见问题"排查。

## 常见问题排查

- **报错提示"服务端没有配置 GEMINI_API_KEY"**：环境变量没加成功，回 Vercel 项目的 Settings → Environment Variables 检查，名字必须完全是大写的 `GEMINI_API_KEY`，改完要重新部署一次(Redeploy)才会生效。
- **报错提示 403 / PERMISSION_DENIED 或者提到 billing**：大概率是上面"部署前准备"第3条没做——去 Google Cloud 控制台确认这个 API key 所在项目的结算账号是不是真的生效了。
- **报错提示模型不存在 / model not found / deprecated**：去 [Gemini 模型列表页](https://ai.google.dev/gemini-api/docs/models) 查一下现在图片生成用的模型 ID 是不是变了，把 `api/generate-creative-image.js` 里最上面的 `MODEL_ID` 常量换成最新的那个(写这份代码时官方文档同时出现过 `gemini-2.5-flash-image` 和更新的 `gemini-3.1-flash-image`，选一个文档里标注支持"图片编辑/图生图"的型号)。
- **报错提示"Gemini 返回了内容，但里面没有图片数据"**：说明接口本身连通了，但返回结构可能和这份代码假设的不一样(Google 后续调整过接口字段名)。把报错信息里附带的原始返回内容发出来，照着实际字段名调整 `api/generate-creative-image.js` 里读取 `parts`/`inlineData` 那几行就行，不用重写整个逻辑。
- **函数执行超时**：`vercel.json` 里已经把这个函数的超时时间设成了30秒；如果你用的是 Vercel 免费的 Hobby 套餐，实际允许的最长时间以 Vercel 官方文档为准(套餐限制可能会变，如果部署时提示这个数值超出套餐上限，改小一点或者去 Vercel 文档查当前免费套餐的函数超时上限)。

## 部署完之后：把主项目的入口指过去

`MVP流程/index.html` 里的 `CREATIVE_IMAGE_ENDPOINT` 常量已经写的是相对路径 `/api/generate-creative-image`，只要 `index.html` 和 `api/generate-creative-image.js` 部署在同一个 Vercel 项目/同一个域名下(这份 `部署/vercel/` 文件夹就是这么组织的)，不需要改任何代码，直接就能用。

## 这份拷贝和 `MVP流程/index.html`、`纸样计算器/` 的关系

`部署/vercel/index.html`、`部署/vercel/calculator.html` 是从 `MVP流程/` 复制过来的独立拷贝，为了让 Vercel 能直接部署这一个文件夹。**这两处以后如果谁改了(比如 MVP 流程加新功能，或者纸样计算器加新包型)，需要手动把改动同步过来**，不会自动联动——这和交接文档里之前提到过的 `MVP流程/calculator.html` 需要手动从纸样计算器同步是同一类问题，下次改动 `MVP流程/index.html` 之后记得也 `cp` 一份到这里，重新部署一次(`vercel --prod`)才会生效到真实网址上。
