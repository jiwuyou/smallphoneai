# OpenHouseAI UI Preview

这是一个独立的前端页面预览项目，用于确认 OpenHouseAI Android App 的初始化安装与配置 UI。它不依赖也不修改 `openhouseai-app` 或 `openhouseai-bootstrap`。

## 启动

```bash
cd /root/projects/openhouseai/openhouseai-ui-preview
npm install
npm run dev -- --host 0.0.0.0 --port 4173
```

建议端口：`4173`。如果端口被占用，可以改用其他端口，例如：

```bash
npm run dev -- --host 0.0.0.0 --port 4174
```

## 预览内容

- 首屏是“初始化安装和配置”的主线流程。
- 主页面集中展示权限状态、一键初始化、进度、下一步操作、DeepSeek Key、启动 OpenCode 和地址复制。
- 侧边栏承载使用说明、运行环境说明、维护与修复、日志、高级设置。
- 底部终端默认折叠；日志页展示终端输出样式。
- 页面包含初始化进度、Key 输入、启动与复制等交互状态。
