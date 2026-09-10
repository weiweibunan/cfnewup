# cfnewup

Cloudflare Pages 上的 WebSocket 代理与订阅管理。保留现有 VLESS、SOCKS5、HTTP/HTTPS CONNECT、订阅转换和管理页面入口。

## 部署

仓库根目录的 `_worker.js` 是已构建的单文件 Pages Advanced Mode 产物，随源码一起提交。已有 Pages Git 集成继续部署这个文件即可，无需增加构建步骤或改变现有环境变量、KV 绑定。`VERSION.txt` 继续记录上游版本。

管理页面：`/<u>`；订阅：`/<u>/sub?target=clash`（也支持现有其他格式）。设置 `d` 后改为 `/<d>` 与 `/<d>/sub`，支持多级路径。配置 API 使用同一基础路径。

主要配置仍为 `u`（UUID）、`d`（自定义路径）、`s`（上游代理）、`p`（备用地址）、`qj`（代理策略）、`C`/`c`（KV 绑定），以及管理页面中已有的其他选项。

## 开发

需要 Node.js 20 或更高版本，无第三方构建依赖。

```sh
npm run build
npm run check
```

也可直接执行：

```sh
node scripts/build.mjs
node scripts/build.mjs --check
node --check _worker.js
node --test tests/*.test.mjs
```

修改 `src/` 后运行构建，并把更新后的 `_worker.js` 一起提交。CI 检查源码与部署产物一致、语法和回归测试。

| 文件 | 职责 |
| --- | --- |
| `src/protocol.js` | 协议头、分片解析、代理地址与 SOCKS 目标编码 |
| `src/transport.js` | 连接生命周期、重试、超时、流量队列与 DNS 消息 |
| `src/worker.js` | Pages 请求入口、原有管理页面、订阅转换和配置 |
| `scripts/build.mjs` | 生成不依赖本地模块的单文件 `_worker.js` |
| `tests/` | 协议、传输和实际部署产物的回归测试 |

## 连接行为

- `qj=no`：先直连，失败后尝试已配置代理，再尝试 `p`。
- `qj=only`：只使用代理；代理配置无效时拒绝连接。DNS 也通过代理访问 TCP DNS 上游。
- 其他 `qj` 值：有代理时先使用代理，否则直连；失败后可尝试 `p`。
- 自动重试只发生在尚未收到上游响应、上传重放缓存完整时。重放缓存超过 256 KiB 后停止自动重试，不截断重放。
- 未消费的上传数据最多 256 KiB，超限关闭连接。连接和代理握手合计超时 5 秒；首字节超时保持 1.2 秒；单次写入超时 10 秒。
- DNS 保留原来的 TCP DNS 目标 `8.8.4.4:53`，按长度字段收发完整消息，收到完整回答后关闭该查询的上游连接，不等待对端 EOF。`customDNS` 是订阅中的 ECH 解析器参数，不是这个 DNS 中继的配置项。
- 客户端关闭、连接失败、超时和重试都统一清理旧 socket 与流锁。每条 WebSocket 在建立时固定自己的认证和代理设置。

## 本轮修复

修复读取异常时过早关闭 WebSocket、重试丢失后续上传数据、连续 DNS 查询阻塞、SOCKS 失败与客户端断开后的资源清理、缺失握手超时、无效上传队列限制、仅代理模式误直连、自定义域名端口丢失。

同时修复配置写入失败仍报告成功、多级自定义路径被提前拦截，以及 ECH 环境变量读取不一致。页面和订阅转换器保留原有实现，未重新混淆。

配置页面会规范化结尾及重复斜杠，因此 `/<路径>` 与 `/<路径>/` 都能正确访问同一个 KV 配置接口；非 KV 类的接口错误也不会再误报为“KV 未配置”。

## 上游同步

现有 `.github/workflows/sync-from-cfnew.yml` 按要求保留。本轮没有修改上游同步策略；它仍会直接覆盖 `_worker.js`，并不会更新 `src/`。如该工作流再次同步，上游部署产物与本地源码可能不一致，CI 的构建一致性检查会报告这一问题。

## 验证范围

回归测试使用原生 Web Streams 和模拟的 Workers socket/WebSocket，覆盖错误、超时、分片、握手残留字节、DNS 连续查询、队列限制、配置保存和 Pages 入口。Cloudflare Pages 部署成功表示产物被平台接受，完整代理连通性仍取决于实际客户端、代理服务和网络。
