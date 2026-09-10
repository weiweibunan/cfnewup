# cfnewup — GrainTCP 完整内核版

Cloudflare Pages 上的 VLESS over WebSocket 代理与订阅管理。本版本已彻底移除旧 `TunnelSession` 数据面，改为基于 [ToiCF/GrainTCP](https://github.com/ToiCF/GrainTCP) 的完整 TCP 中继核心。

## GrainTCP 数据面

- 64 KiB BYOB socket 读取，不支持 BYOB 的运行时自动回退普通 reader。
- 20 KiB 上行机会性 grain 合包，减少连续小 WebSocket message 对应的 `writer.write()` 次数。
- 32 KiB 下行 grain 聚合，使用 512 B 尾部门限、最多 4 轮增长观察和 1 ms quiet window。
- 大于等于 32 KiB 的下行块直接发送，避免额外的大块复制。
- 同一路由默认并发发起 4 次 TCP 建连，保留最先成功的 socket 并关闭其余连接。
- WebSocket 使用 `allowHalfOpen`，固定二进制消息为 `arraybuffer`，关闭压缩扩展协商。
- UUID 在配置变化时预解码并缓存，请求热路径使用固定位置比较。
- `_worker.js` 使用固定版本 Terser 进行顶层与局部变量改名、三轮安全压缩，不生成 source map；仅保留 GPL 来源声明。

GrainTCP 是 TCP relay，因此本版本只接受 VLESS TCP 命令；旧版本的 UDP/DNS 中继、上传重放、首字节重试和旧传输超时状态机均已删除，没有兼容残留。

## 保留的外围能力

面板、KV 配置、订阅生成、自定义路径、优选地址和 ECH 参数仍由 `src/worker.js` 提供。`s`、`p`、`qj` 等出站设置作为 GrainTCP 的拨号适配层保留：

- `qj=no`：先直连；建连失败后尝试代理，再尝试 `p`。
- `qj=only`：只连接已配置代理，绝不回落直连。
- 其他值：有代理时使用代理，否则直连；建连失败后可尝试 `p`。
- SOCKS5 与 HTTP/HTTPS CONNECT 只参与 socket 建立和代理握手，不改变 GrainTCP 上下行算法。

## 部署

仓库根目录的 `_worker.js` 是 Pages Advanced Mode 单文件产物。已有 Cloudflare Pages Git 集成继续部署该文件，不需要改变 KV 绑定或环境变量。

管理页面：`/<u>`；订阅：`/<u>/sub?target=clash`。设置自定义路径 `d` 后改为 `/<d>` 与 `/<d>/sub`。

这个版本与上游 `cfnew` 的传输层有意分叉，因此自动定时覆盖已关闭。上游同步工作流只允许手动触发，避免部署中的 GrainTCP 内核被发行包覆盖。

## 开发与验证

需要 Node.js 20 或更高版本；构建依赖由 `package-lock.json` 固定，首次使用先运行 `npm install`。

```sh
npm run build
npm run check
```

| 文件 | 职责 |
| --- | --- |
| `src/graintcp.js` | 完整 GrainTCP 数据面、VLESS TCP 解析、拨号竞速和代理握手适配 |
| `src/worker.js` | Pages 请求入口、管理页面、订阅转换和 KV 配置 |
| `scripts/build.mjs` | 生成可直接部署的 `_worker.js` |
| `tests/` | Grain 合包、BYOB、大包直发、竞速、代理及 Pages 入口回归测试 |

修改 `src/` 后，CI 会验证语法与回归测试，并将确定性的 `_worker.js` 部署产物提交到当前功能分支。

部署产物的混淆只提高直接阅读门槛，不属于加密；可维护源码始终保留在 `src/`，运行时秘密必须继续使用 Cloudflare 环境变量或 KV。

## 开源许可

GrainTCP 原始实现由 ToiCF 发布，采用 GNU GPL v3。本仓库中的 GrainTCP 改编代码明确标注了来源和修改范围，整个派生版本按 GPL-3.0 发布，详见 `LICENSE`。
