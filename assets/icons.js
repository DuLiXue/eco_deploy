// ====== EcoStitch 线条图标库(2026-09-03新增，替换原来偏"表情包"风格的emoji图标) ======
// Bedi 反馈"现在这套UI图标太low了，能不能换一套高级的类似instagram风格的简约图标"——这里统一定义
// 一套 24x24 viewBox 的描边线条图标(风格参考 calculator.html 里"下载纸样清单/重新计算"按钮本来就
// 已经在用的那套线条图标：fill=none + stroke=currentColor + stroke-width 1.5~1.6 + 圆头圆角)，
// 三个页面(index.html/flow.html/calculator.html)通过 <script src="assets/icons.js"> 共享同一份数据，
// 不再各自维护一份拷贝——图标改一次，三个页面都同步生效，不存在"忘了同步"的风险。
// 用法：icon('home', 20) 返回一段可以直接塞进 innerHTML 的 <svg> 字符串；iconFilled('heart', 18) 是
// 实心版本(点赞/收藏后的高亮状态用)；bagIcon('bucket', 28) 返回13个包型里对应那个的线条图标。
// 少数静态写在 HTML 里、不经过 JS 生成的图标(比如顶部 gnav 行)，直接把 icon()/bagIcon() 生成的
// <svg> 源码誊抄进了 HTML——数据源头仍然是这份文件里的 ICONS/BAG_ICONS，改路径记得两边一起改。

const ICONS = {
  home: '<path d="M4 10.5 12 4l8 6.5"/><path d="M6 9.5V19a1 1 0 0 0 1 1h3v-5.5h4V20h3a1 1 0 0 0 1-1V9.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
  heart: '<path d="M12 20.3s-7.1-4.4-9.6-8.9C.7 8 2.2 4.5 5.7 3.9c2-.35 3.9.6 6.3 2.9 2.4-2.3 4.3-3.25 6.3-2.9 3.5.6 5 4.1 3.3 7.5-2.5 4.5-9.6 8.9-9.6 8.9z"/>',
  comment: '<path d="M21 12a8 8 0 0 1-8 8H7.3L3 23l.9-4.4A8 8 0 1 1 21 12z"/>',
  bookmark: '<path d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4-6.5 4V5a1 1 0 0 1 1-1z"/>',
  send: '<path d="M21.5 2.5 10.8 13.2"/><path d="M21.5 2.5 14.8 21l-4-8-8-4z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  person: '<circle cx="12" cy="8.3" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  personAdd: '<circle cx="9" cy="8.3" r="3.2"/><path d="M2.3 20a6.7 6.7 0 0 1 13.4 0"/><path d="M18 7.5v6M15 10.5h6"/>',
  bag: '<path d="M6 8h12l1 12.2a1 1 0 0 1-1 1.1H6a1 1 0 0 1-1-1.1L6 8z"/><path d="M9 8V6.3a3 3 0 0 1 6 0V8"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.6 6.6 12 13l8.4-6.4"/>',
  bell: '<path d="M12 3a5 5 0 0 0-5 5v3.3c0 1-.4 2-1.1 2.7L4.5 16h15l-1.4-2c-.7-.7-1.1-1.7-1.1-2.7V8a5 5 0 0 0-5-5z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  edit: '<path d="M4 20l.8-4 11.4-11.4a1.5 1.5 0 0 1 2.1 0l1.1 1.1a1.5 1.5 0 0 1 0 2.1L8 19.2 4 20z"/><path d="M14 6.2l3 3"/>',
  refresh: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.6L4 16M4 20v-4h4"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.5 2.5L16 9.3"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  warning: '<path d="M12 3.3 21.3 20H2.7L12 3.3z"/><path d="M12 10v4"/><circle cx="12" cy="16.8" r="0.6" fill="currentColor" stroke="none"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.3"/><circle cx="12" cy="8" r="0.7" fill="currentColor" stroke="none"/>',
  camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9z"/><circle cx="12" cy="13" r="3.2"/>',
  ruler: '<path d="M3 16 16 3l5 5L8 21z"/><path d="M9.3 9.3l2 2M12.5 6.3l2 2M6.3 12.5l2 2"/>',
  palette: '<path d="M12 3a9 9 0 1 0 3.2 17.4c.8-.3 1-1.3.4-1.9-.3-.3-.5-.6-.5-1 0-.8.6-1.5 1.4-1.5h1.7A4.2 4.2 0 0 0 22.4 12 9.4 9.4 0 0 0 12 3z"/><circle cx="7.3" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="9.8" cy="7.3" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="7.3" r="1" fill="currentColor" stroke="none"/><circle cx="16.7" cy="11" r="1" fill="currentColor" stroke="none"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M19 15l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6z"/>',
  scissors: '<circle cx="6.2" cy="6.5" r="2.2"/><circle cx="6.2" cy="17.5" r="2.2"/><path d="M8 8 20 19M8 16 20 5"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  tag: '<path d="M20 12.5 12.5 20a1.5 1.5 0 0 1-2.1 0L3 12.5V4h8.5L20 12.5z"/><circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none"/>',
  receipt: '<path d="M6 3h12v18l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3V3z"/><path d="M9 8h6M9 12h6"/>',
  needle: '<path d="M4 15.5c3.2-4.2 8.3-6.3 12.6-3.2"/><circle cx="18.3" cy="7.3" r="2" /><path d="M16.8 5.8 5.5 17"/>',
  bookOpen: '<path d="M12 6.3c-2-1.3-4.6-1.8-7.2-1.5v13c2.6-.3 5.2.2 7.2 1.5 2-1.3 4.6-1.8 7.2-1.5v-13c-2.6-.3-5.2.2-7.2 1.5z"/><path d="M12 6.3v13"/>',
  page: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.3 12h5.4M9.3 15h5.4M9.3 9h2"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  more: '<circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
};

function icon(name, size, cls) {
  const d = ICONS[name] || '';
  size = size || 20;
  return '<svg class="'+(cls||'')+'" viewBox="0 0 24 24" width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:block">'+d+'</svg>';
}
// 实心版本：点赞后的❤️、收藏后的🔖 这类"已激活"状态用填充色而不是再画一层描边，视觉上更接近
// Instagram 点赞后心形变红填满的效果。只有 heart/bookmark 这种本来就是封闭图形的图标适合填充。
function iconFilled(name, size, cls) {
  const d = ICONS[name] || '';
  size = size || 20;
  return '<svg class="'+(cls||'')+'" viewBox="0 0 24 24" width="'+size+'" height="'+size+'" fill="currentColor" stroke="none" style="display:block">'+d+'</svg>';
}

// ====== 13个包型的线条图标(2026-09-03新增，替换原来的emoji占位) ======
// 设计原则：形状差异对应真实的结构差异(不是瞎编花纹凑数量)——比如方底/拼接底/三段拼接三款托特包
// 本来就是同一个基础"托特包"轮廓、只是拼接缝的位置和数量不同(对应各自 BAGS 数据里 st 字段写的真实
// 结构描述)，所以图标也只用"轮廓相同、缝合线数量不同"来体现，没有为了"看起来不一样"而画不存在的
// 装饰细节；双肩包/水桶包/马鞍包这些结构本来就明显不同的包型，轮廓也画得明显不同。
const BAG_ICONS = {
  boxtote: '<path d="M5 9h14l-1 11.2a1 1 0 0 1-1 .8H7a1 1 0 0 1-1-.8L5 9z"/><path d="M8.3 9V7a3.7 3.7 0 0 1 7.4 0v2"/>',
  jointote: '<path d="M5 9h14l-1 11.2a1 1 0 0 1-1 .8H7a1 1 0 0 1-1-.8L5 9z"/><path d="M8.3 9V7a3.7 3.7 0 0 1 7.4 0v2"/><path d="M6.2 16.3h11.6"/>',
  beartote: '<path d="M5 9h14l-1 11.2a1 1 0 0 1-1 .8H7a1 1 0 0 1-1-.8L5 9z"/><path d="M8.3 9V7a3.7 3.7 0 0 1 7.4 0v2"/><path d="M5.9 13.2h12.2M6.2 16.7h11.6"/>',
  cardwallet: '<rect x="4" y="7.5" width="16" height="11.5" rx="2"/><path d="M7.3 7.5V5.3M11 7.5V4.3M14.7 7.5V5.3"/>',
  foldtote: '<path d="M5 9h14l-1 11.2a1 1 0 0 1-1 .8H7a1 1 0 0 1-1-.8L5 9z"/><path d="M8.3 9V7a3.7 3.7 0 0 1 7.4 0v2"/><path d="M6 13.5h12" stroke-dasharray="2.2 2.2"/>',
  bucket: '<path d="M7.3 8.3h9.4l-1.6 11a1 1 0 0 1-1 .9h-4.2a1 1 0 0 1-1-.9l-1.6-11z"/><path d="M9.3 8.3a2.7 2.7 0 0 1 5.4 0"/><path d="M6.5 7c1.7-1 9.3-1 11 0"/>',
  crescent: '<path d="M6 14.3a7 7 0 0 0 12.2 4.7A8.3 8.3 0 0 1 13 5a7 7 0 0 0-7 9.3z"/><path d="M10.2 5.3a3 3 0 0 1 2.8-2"/>',
  trianglepouch: '<path d="M4 19h16L12 4.3z"/><path d="M8 15h8"/><circle cx="12" cy="4.3" r="0.9" fill="currentColor" stroke="none"/>',
  jiaozi: '<path d="M4 13.3a8 5 0 0 1 16 0v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3z"/><path d="M5 12.8a7 4.3 0 0 1 14 0"/>',
  saddle: '<path d="M6 10.3a6 5 0 0 1 12 0v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6z"/><path d="M6.6 10.8a5.4 3.5 0 0 1 10.8 0"/><circle cx="12" cy="14.3" r="0.9" fill="currentColor" stroke="none"/>',
  roundbp: '<circle cx="12" cy="13.3" r="7"/><path d="M8.2 6.8c0-2.1 1.5-3.6 3.8-3.6M15.8 6.8c0-2.1-1.5-3.6-3.8-3.6"/>',
  zipbp: '<path d="M6 10.3a6 4 0 0 1 12 0v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19.3v-9z"/><rect x="8.7" y="13.3" width="6.6" height="4.4" rx="1"/><path d="M10.2 6.8a1.9 1.4 0 0 1 3.6 0"/>',
  boston: '<path d="M4 15a8 5.5 0 0 1 16 0 8 5.5 0 0 1-16 0z"/><path d="M9 9.5a3 2 0 0 1 6 0"/><path d="M5.6 15h12.8"/>',
};

function bagIcon(bag, size, cls) {
  const d = BAG_ICONS[bag] || BAG_ICONS.boxtote;
  size = size || 28;
  return '<svg class="'+(cls||'')+'" viewBox="0 0 24 24" width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="display:block">'+d+'</svg>';
}
