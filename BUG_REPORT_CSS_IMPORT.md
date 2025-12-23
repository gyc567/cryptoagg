# Bug Report: CSS @import 顺序错误导致 Vercel 构建警告

## 问题描述

**标题**: Tailwind CSS 和 Google Fonts @import 顺序不当
**严重级别**: ⚠️ 中等（影响构建过程，不影响功能）
**影响范围**: Vercel 部署、生产构建
**发现地点**: `src/index.css` 第 5 行

## 现象

在 Vercel 部署时，构建日志显示警告：
```
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
^^^^^
```

## 根本原因

**问题**: Tailwind CSS `@import` 语句的位置不正确

当前代码顺序（**错误**）:
```css
@tailwind base;              /* 第1行 */
@tailwind components;         /* 第2行 */
@tailwind utilities;          /* 第3行 */
                              /* 空行 */
@import url('...');           /* 第5行 ← 错误位置！ */

@layer base {
  ...
}
```

**为什么错误**:
1. Tailwind 的 `@tailwind` 指令定义了基础样式
2. `@import` 应该在 **所有其他 CSS 之前** 加载外部资源
3. 当前顺序导致字体导入发生在 Tailwind 基础样式之后
4. 这违反了 CSS 级联顺序和 Tailwind 最佳实践

## 修复方案

### 方案 1: 调整 CSS 顺序（快速修复）✅ 推荐

```css
/* 最开始：导入外部资源 */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

/* 然后：Tailwind 指令 */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 最后：自定义层 */
@layer base {
  ...
}
```

### 方案 2: 使用 HTML <link> 标签（更优雅）

在 `src/main.tsx` 中：
```html
<!-- 在 <head> 中加载字体 -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

然后在 CSS 中移除 `@import` 语句。

**优点**：
- 字体加载在 HTML 级别，更快更清晰
- CSS 文件专注于样式
- 减少 CSS 文件大小
- 浏览器可以并行加载 CSS 和字体

## 实现（选择方案 1 - 快速修复）

修改 `src/index.css`:
```diff
+ @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
+
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

- @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

  @layer base {
    :root {
```

## 验证

修复后验证：
```bash
# 本地构建
npm run build

# 检查输出（应该无 @import 警告）
# 部署到 Vercel 再验证
```

## 相关资源

- [Tailwind CSS 文档：@import 规则](https://tailwindcss.com/docs/using-tailwind-with-preprocessors)
- [CSS 级联顺序](https://developer.mozilla.org/en-US/docs/Web/CSS/Cascade)
- [Google Fonts 最佳实践](https://fonts.google.com/)

## 状态

- [ ] Bug 已确认
- [ ] 修复方案已确定
- [ ] 代码已修改
- [ ] 本地测试通过
- [ ] Vercel 部署通过
