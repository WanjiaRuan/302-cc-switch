# 302 CC Switch — Fork Memo / 改造备忘录

> Fork of [farion1231/cc-switch](https://github.com/farion1231/cc-switch) v3.16.5 (MIT).
> Rebranded and repurposed for 302.AI on 2026-07-09, commit `2382bf82`.

---

## 中文

### 改了什么

**1. 预设清洗（核心改动）**

7 个客户端的预设列表全部重写，各文件只保留「官方 + 302.AI」，共删约 13,000 行第三方/赞助商预设：

| 文件（`src/config/`） | 保留条目 |
|---|---|
| `claudeProviderPresets.ts` | Claude Official + 302.AI |
| `codexProviderPresets.ts` | OpenAI Official + 302.AI |
| `geminiProviderPresets.ts` | Google Official + 302.AI + 自定义模板 |
| `claudeDesktopProviderPresets.ts` | Claude Desktop Official + 302.AI |
| `opencodeProviderPresets.ts` | 302.AI + 两个 Oh My OpenCode 自定义模板 |
| `openclawProviderPresets.ts` | 302.AI（OpenClaw 无官方供应商） |
| `hermesProviderPresets.ts` | Nous Research（官方）+ 302.AI |
| `universalProviderPresets.ts` | 未动（NewAPI / 自定义网关是网关模板，非供应商） |

302.AI 端点约定：
- **Anthropic 兼容**：`https://api.302.ai`（Claude Code / Claude Desktop / OpenClaw；OpenCode 用 `/v1`）
- **OpenAI 兼容**：`https://api.302.ai/v1`（Codex 走 chat completions 本地转换、Hermes）
- **国内节点**：`https://api.302ai.cn` 放进了各预设的端点候选（地址管理里可测速切换）
- Claude Code 预设按官方 302cc CLI 的写法用 `ANTHROPIC_API_KEY`（不是 AUTH_TOKEN）
- API Key 获取链接指向 `https://302.ai`（登录后进 API > API Keys；`dash.302.ai` 实测是 301 跳首页的别名，已弃用）

**2. 品牌**

- 应用名 `302 CC Switch`，bundle id `com.ai302.ccswitch`（原 `com.ccswitch.desktop`）
- 4 种语言 UI 文案、托盘、关于页全部改名；链接 ccswitch.io → 302.ai，仓库链接 → 本 fork
- README 重写为 302 版（仅 EN + ZH，删了日/德语版）；`assets/partners/` 整目录删除
- 302.AI logo（GitHub org 头像）注册为图标 `ai302`，名称含 "302" 的供应商自动推断此图标
- macOS 开机自启的 app 名匹配同步改为 `302 CC Switch`（`src-tauri/src/auto_launch.rs`，不改会静默失效）
- 深链接协议保持 `ccswitch://` 未动；配置目录仍是 `~/.cc-switch`（数据兼容）

**3. 更新与发版**

- 更新器指向本 repo Releases；已生成新签名密钥对，**私钥在本机 `~/.tauri/302-cc-switch.key`（空密码，未入库）**
- `release.yml` 产物改名 `302-CC-Switch-*`；latest.json 组装是模式匹配，不受影响
- flatpak 三个文件改名换 id 为 `com.ai302.ccswitch`

**4. 测试**

- 删了 9 个专测已移除供应商的测试文件
- 新增 `tests/config/ai302ProviderPresets.test.ts`，锁死「每个应用只有官方 + 302.AI」的约定

### 已验证 ✓

- `tsc --noEmit` 零错误
- 前端 vitest：58 文件 369 测试全过
- Rust `cargo check` + `cargo test`：1770 测试全过
- `pnpm tauri dev` 真机启动成功，进程稳定运行，前端无报错
- 更新器日志确认在请求新 endpoint（404 是因为还没发过 Release，属预期）

### ⚠️ 待验证（后续要做）

1. **Gemini CLI 端点方向已初步验证**（2026-07-09）：无 key 请求
   `api.302.ai/v1beta/models/...:generateContent` 返回「缺少 302 API 密钥」，
   带假 key（`x-goog-api-key` 头）返回「无效的API KEY」——网关认识 Gemini 原生路径和鉴权头。
   → 仍需真 key 在 Gemini CLI 里跑通一次才算数
2. **各预设未用真 key 实测**：Claude / Codex / OpenClaw / OpenCode / Hermes 的 302 预设
   写法有官方文档或 302cc / 302oc CLI 佐证，但没有实际发过请求
3. ~~`dash.302.ai` 待确认~~ **已确认并修正**：官方指引是登录 `https://302.ai` 进
   API > API Keys，预设 `apiKeyUrl` 已全部改为 `https://302.ai`
4. **GUI 未肉眼检查**：预设列表只显示官方 + 302 这一点靠单测锁定，
   截图因终端无屏幕录制权限没拿到
5. **模型 ID 待确认**：预设里写的 `claude-opus-4-8` / `claude-sonnet-5` / `gpt-5.5`
   假设 302 与官方模型 ID 一致，需对照 302 后台模型列表
6. **发版链路未跑过**：需把 `~/.tauri/302-cc-switch.key` 填进仓库 Secrets
   `TAURI_SIGNING_PRIVATE_KEY` 后打 tag 试一次完整 release
7. **环境变量出入（新发现）**：302 官方 Claude Code 帮助页写的是 `ANTHROPIC_AUTH_TOKEN`，
   我们的预设按 302cc CLI 用的 `ANTHROPIC_API_KEY`。两者对应不同请求头
   （Bearer vs x-api-key），拿真 key 时测一下网关是否都收；不收就改成 AUTH_TOKEN

### 📌 下一批任务：302 默认化（2026-07-09 已确认需求，未动工）

主理人确认「302 不是 default」要改两处，代码已定位：

1. **添加供应商弹窗默认选中 302.AI**（现在默认是「自定义」）
   - `src/components/providers/forms/ProviderForm.tsx:304`——`selectedPresetId` 初始值 `"custom"`；
     单纯改初始值不够，预填表单要走 `handlePresetChange`（`:1614`），
     需在其定义后加 effect：新建模式（无 `initialData`）时找 name 含 "302" 的
     preset entry 调 `handlePresetChange(entry.id)`
   - `src/components/providers/forms/ClaudeDesktopProviderForm.tsx:286`——同样默认 `"custom"`，
     预填走 `applyDesktopPreset`（`:403`）
2. **首次启动自动种一条 302.AI 供应商（无 key 占位）**
   - 机制现成：`src-tauri/src/database/dao/providers_seed.rs`（`OFFICIAL_SEEDS`）+
     `providers.rs:598` `init_default_official_providers`
   - ⚠️ 三个坑：
     a. category 在插入时写死 `"official"`（`providers.rs:632`）——302 应为 `"aggregator"`，
        需给 `OfficialProviderSeed` 加 category 字段
     b. 一次性 flag `official_providers_seeded` 在老库（含原版 cc-switch 留下的 `~/.cc-switch`）
        已置 true——302 种子要用**独立 flag**（如 `ai302_providers_seeded`）才能补种
     c. `is_official_seed_id` 要把 302 种子也算进去，否则 live 导入会被
        `has_non_official_seed_provider`（`providers.rs:558`）挡住
   - 种子配置照抄前端预设：Claude（`env.ANTHROPIC_BASE_URL=https://api.302.ai` + 空
     `ANTHROPIC_API_KEY`）、Gemini（`GOOGLE_GEMINI_BASE_URL` + `GEMINI_MODEL=gemini-3.5-flash`）、
     Codex（`generateThirdPartyConfig("302ai", "https://api.302.ai/v1")` 的 TOML）、
     Claude Desktop 对应预设；icon `ai302`、iconColor `#7C3AED`、website `https://302.ai`
   - 只种 4 个非 additive app（Claude / ClaudeDesktop / Codex / Gemini）；
     OpenCode / OpenClaw / Hermes 是 additive 模式不走这套
3. 完成后：tsc + vitest + cargo test，dev 启动截图验证（截图方案见下）

杂项备忘：
- 终端已有**屏幕录制**权限（全屏 `screencapture -x` 可用），但没有**辅助功能**权限
  （AppleScript 拿窗口坐标会报 -1719）；单窗口截图用 Swift `CGWindowListCopyWindowInfo`
  找 window id 再 `screencapture -l<id>`，注意窗口缩到托盘时 onscreen=false 截不到，要先弹出主窗口
- 主理人机器上 brew 装的原版 cc-switch（`/Applications/CC Switch.app`）常驻后台，
  和本 fork 共用 `~/.cc-switch`——测试时最好先退掉它，避免互写配置
- 本 fork 工作树当前有未提交改动：apiKeyUrl 修正（dash.302.ai → 302.ai，7 个预设文件）+ 本 MEMO 更新

### 刻意保留的灰色地带

- Coding Plan 配额查询（`codingPlanProviders.ts`，含 Kimi/智谱等厂商路由）——功能非广告
- 统一供应商面板的 NewAPI 模板——自部署网关模板
- 图标库里的第三方厂商图标——自定义供应商选图标时用
- GitHub Copilot / Codex OAuth / AWS Bedrock 的**预设**删了，但功能代码都在，要恢复只需加回预设条目

---

## English

### What changed

**1. Preset cleanup (the core change)**

All 7 tools' preset lists were rewritten to contain only **official + 302.AI**, deleting ~13,000 lines of third-party/sponsor presets (see table above for surviving entries per file in `src/config/`).

302.AI endpoint conventions:
- **Anthropic-compatible**: `https://api.302.ai` (Claude Code / Claude Desktop / OpenClaw; OpenCode uses `/v1`)
- **OpenAI-compatible**: `https://api.302.ai/v1` (Codex via local chat-completions conversion, Hermes)
- **Mainland China node** `https://api.302ai.cn` added to endpoint candidates for speed testing
- Claude Code preset uses `ANTHROPIC_API_KEY` (not AUTH_TOKEN), matching the official 302cc CLI
- API-key link points to `https://302.ai` (log in → API > API Keys; `dash.302.ai` turned out to be a 301 alias to the homepage, dropped)

**2. Branding**

- Product name `302 CC Switch`, bundle id `com.ai302.ccswitch` (was `com.ccswitch.desktop`)
- All UI copy in 4 locales, tray, about page renamed; ccswitch.io links → 302.ai, repo links → this fork
- README rewritten (EN + ZH only; JA/DE deleted); `assets/partners/` removed entirely
- 302.AI logo registered as icon `ai302`; providers named "302*" auto-infer it
- macOS auto-launch app-name matching updated to `302 CC Switch` (`src-tauri/src/auto_launch.rs` — would silently break otherwise)
- Deep-link scheme stays `ccswitch://`; config dir stays `~/.cc-switch` (data compatibility)

**3. Updater & release**

- Updater points to this repo's releases; a new signing keypair was generated —
  **private key lives at `~/.tauri/302-cc-switch.key` on this Mac (empty password, not committed)**
- `release.yml` artifacts renamed to `302-CC-Switch-*`; latest.json assembly is pattern-based and unaffected
- Flatpak files renamed to `com.ai302.ccswitch`

**4. Tests**

- 9 vendor-specific preset test files deleted
- New `tests/config/ai302ProviderPresets.test.ts` locks the "official + 302.AI only" invariant

### Verified ✓

- `tsc --noEmit` clean; vitest 369/369 passing
- Rust `cargo check` + `cargo test` 1770/1770 passing
- `pnpm tauri dev` launches and runs stably, no frontend errors
- Updater log confirms it now hits the new endpoint (404 expected — no release published yet)

### ⚠️ Verification still to do

1. **Gemini CLI endpoint direction pre-verified** (2026-07-09): keyless requests to
   `api.302.ai/v1beta/models/...:generateContent` return "Missing 302 Apikey", and a fake
   `x-goog-api-key` returns "Invalid API Key" — the gateway recognizes the Gemini-native
   path and auth header. Still needs a real-key run through Gemini CLI to count
2. **No preset has been exercised with a real API key** — configs follow 302 docs / 302cc / 302oc CLI, but no live request was made
3. ~~`dash.302.ai` unconfirmed~~ **Confirmed & fixed**: official guidance is to log in at
   `https://302.ai` → API > API Keys; all preset `apiKeyUrl`s now point to `https://302.ai`
4. **GUI not eyeballed** — the official+302-only list is locked by unit tests; no screenshot (terminal lacks screen-recording permission)
5. **Model IDs unconfirmed** — presets assume 302 mirrors official IDs (`claude-opus-4-8`, `claude-sonnet-5`, `gpt-5.5`); cross-check against the 302 dashboard model list
6. **Release pipeline untested** — add `~/.tauri/302-cc-switch.key` to repo secret `TAURI_SIGNING_PRIVATE_KEY`, then tag a test release

### 📌 Next batch: make 302 the default (confirmed 2026-07-09, not started)

1. **Add-provider dialog should default-select the 302.AI preset** (currently "custom"):
   `ProviderForm.tsx:304` initial state + trigger `handlePresetChange` (`:1614`) via an effect
   in create mode; same for `ClaudeDesktopProviderForm.tsx:286` (`applyDesktopPreset` at `:403`)
2. **Seed a keyless 302.AI provider entry on first launch**: extend
   `providers_seed.rs` / `init_default_official_providers` (`providers.rs:598`). Three traps:
   category is hardcoded `"official"` on insert (302 needs `"aggregator"`); the one-shot
   `official_providers_seeded` flag is already true on old DBs (incl. those left by the
   original brew cc-switch) so the 302 seeds need their own flag; `is_official_seed_id`
   must cover the new seeds or live-import gets blocked. Seed only the 4 non-additive
   apps (Claude / ClaudeDesktop / Codex / Gemini), configs copied from the frontend presets
3. Then: tsc + vitest + cargo test, dev-launch screenshot to verify

Misc: terminal has screen-recording permission but NOT accessibility (single-window capture:
Swift `CGWindowListCopyWindowInfo` → `screencapture -l<id>`; tray-hidden windows are
onscreen=false and uncapturable). The brew-installed original CC Switch runs in the background
sharing `~/.cc-switch` — quit it before testing. Working tree has uncommitted changes:
apiKeyUrl fix (dash.302.ai → 302.ai) + this memo.

### Deliberately kept (gray areas)

- Coding-plan quota queries (`codingPlanProviders.ts`, incl. Kimi/Zhipu vendor routing) — a feature, not an ad
- NewAPI template in the universal-provider panel — self-hosted gateway template
- Third-party vendor icons in the icon library — used by the custom-provider icon picker
- GitHub Copilot / Codex OAuth / AWS Bedrock **presets** removed, but all feature code remains; restoring = re-adding preset entries
