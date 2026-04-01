# Miyabi パッケージ & モジュール依存関係ドキュメント

## 1. モノレポパッケージ構造

### 1.1 pnpm workspace 構成

**ファイル**: `pnpm-workspace.yaml`
```yaml
packages:
  - 'packages/*'
```

**ルートパッケージ**: `autonomous-operations` v0.22.0 (ESM, `"type": "module"`)

### 1.2 全11パッケージ一覧

| # | パッケージ名 | npm name | version | 公開/非公開 | モジュール | Node要件 |
|---|---|---|---|---|---|---|
| 1 | cli | `miyabi` | 0.22.0 | **公開** (npmjs.com) | ESM | >=18.0.0 |
| 2 | core | `@agentic-os/core` | 0.1.0 | 公開 | ESM | >=18.0.0 |
| 3 | coding-agents | `@miyabi/coding-agents` | 0.1.0 | **非公開** | ESM | >=20.0.0 |
| 4 | shared-utils | `@miyabi/shared-utils` | 0.1.0 | **非公開** | ESM | - |
| 5 | miyabi-agent-sdk | `@miyabi/agent-sdk` | 0.1.0 | 公開 (GitHub Packages) | ESM | - |
| 6 | task-manager | `@miyabi/task-manager` | 0.1.0 | **非公開** | ESM | >=18.0.0 |
| 7 | github-projects | `@agentic-os/github-projects` | 1.0.0 | **非公開** | ESM | - |
| 8 | mcp-bundle | `miyabi-mcp-bundle` | 3.8.0 | **公開** (npmjs.com) | ESM | >=18.0.0 |
| 9 | miyabi-web | `@miyabi/web` | 1.0.0 | **非公開** | ESM | - |
| 10 | doc-generator | `@agentic-os/doc-generator` | 1.0.0 | **非公開** | ESM | >=18.0.0 |
| 11 | context-engineering | `@miyabi/context-engineering` | 0.1.0 | **非公開** | ESM | >=18.0.0 |

**注**: CLAUDE.md には `business-agents/` が言及されているが、packages/ ディレクトリには存在しない（計画中または core 内に統合済み）。

### 1.3 TypeScript project references

全パッケージが個別の `tsconfig.json` を保持。ルートレベルの `tsconfig.json` による project references 構成。
共通設定: `strict: true`, `target: ES2022`, `module: ESNext`, `moduleResolution: bundler/node16`

---

## 2. パッケージ間依存グラフ

### 2.1 ASCII 依存グラフ

```
                          +-----------------+
                          |     miyabi      |
                          |   (CLI v0.22)   |
                          +--------+--------+
                                   |
              +--------------------+--------------------+
              |                    |                    |
              v                    v                    v
    +------------------+  +----------------+  +------------------+
    | @agentic-os/core |  | agent-skill-bus|  | miyabi-agent-sdk |
    |     (v0.1.0)     |  |  (npm ^1.2.0)  |  | (npm ^0.1.0-a.2) |
    +--------+---------+  +----------------+  +------------------+
             |
             | re-export
             v
    +--------------------+
    | @miyabi/           |
    | coding-agents      |
    |    (v0.1.0)        |
    +--------+-----------+
             |
    +--------+-----------+
    |                    |
    v                    v
+------------------+  +------------------+
| @miyabi/         |  | miyabi-agent-sdk |
| shared-utils     |  | (npm ^0.1.0-a.2) |
| (v0.1.0, 0 deps) |  +------------------+
+------------------+


    +--------------------+         +------------------------+
    | @miyabi/           |         | @agentic-os/           |
    | task-manager       |         | github-projects        |
    |    (v0.1.0)        |         |    (v1.0.0)            |
    +--------+-----------+         +--------+---------------+
             |                              |
             | peer dep                     | file: link
             v                              v
    +--------------------+         +------------------+
    | @miyabi/           |         | @miyabi/agent-sdk|
    | coding-agents      |         | (file:../miyabi- |
    +--------------------+         |  agent-sdk)      |
                                   +------------------+


    独立パッケージ (内部依存なし):
    +------------------+  +------------------+  +------------------+
    | miyabi-mcp-bundle|  | @miyabi/web      |  | @agentic-os/     |
    |   (v3.8.0)       |  |   (v1.0.0)       |  | doc-generator    |
    +------------------+  +------------------+  |   (v1.0.0)       |
                                                 +------------------+
    +------------------------+
    | @miyabi/               |
    | context-engineering    |
    |   (v0.1.0)             |
    +------------------------+
```

### 2.2 依存関係マトリクス

```
依存元 (行) → 依存先 (列)

                 core  coding  shared  agent-sdk  skill-bus  task-mgr  gh-proj  mcp  web  docgen  ctx-eng
cli              x                       x(npm)    x(npm)
core                   re-exp
coding-agents          -       x         x(npm)
shared-utils
miyabi-agent-sdk
task-manager                                                                                           peer:coding
github-projects                          x(file)
mcp-bundle
miyabi-web
doc-generator
context-eng
```

### 2.3 依存関係の種類別整理

**直接依存 (dependencies)**:
```
cli               → agent-skill-bus (^1.2.0), miyabi-agent-sdk (^0.1.0-alpha.2)
core              → (re-export: @miyabi/coding-agents)
coding-agents     → @miyabi/shared-utils (*), miyabi-agent-sdk (^0.1.0-alpha.2)
github-projects   → @miyabi/agent-sdk (file:../miyabi-agent-sdk)
```

**Peer Dependencies**:
```
miyabi-agent-sdk  → @anthropic-ai/sdk (>=0.65.0), @octokit/rest (>=20.0.0)
task-manager      → @miyabi/coding-agents (*)
```

**外部npm依存 (CLI から)**:
```
cli → agent-skill-bus (^1.2.0)       # npm registry
cli → miyabi-agent-sdk (^0.1.0-alpha.2)  # npm registry (注: ローカルは @miyabi/agent-sdk)
```

---

## 3. 外部依存関係マップ

### 3.1 AI / エージェントインフラ

| パッケージ | バージョン | 使用先 |
|---|---|---|
| `@anthropic-ai/sdk` | ^0.71.2 | core, coding-agents, task-manager |
| `@modelcontextprotocol/sdk` | ^1.27.1 | mcp-bundle |
| `agent-skill-bus` | ^1.2.0 | cli |

### 3.2 GitHub 統合

| パッケージ | バージョン | 使用先 |
|---|---|---|
| `@octokit/rest` | ^21.1.1 | cli, core, coding-agents, task-manager, github-projects, mcp-bundle |
| `@octokit/graphql` | ^8.2.1 | cli, core, task-manager, github-projects |
| `simple-git` | ^3.33.0 | mcp-bundle |

### 3.3 CLI / ターミナルUI

| パッケージ | バージョン | 使用先 |
|---|---|---|
| `commander` | ^11.1.0 | cli, doc-generator |
| `inquirer` | ^9.2.12 | cli |
| `chalk` | ^5.3.0 | cli, core, coding-agents, miyabi-agent-sdk, doc-generator |
| `ora` | ^9.0.0 | cli, core, miyabi-agent-sdk, doc-generator |
| `cli-table3` | ^0.6.5 | cli, core |
| `boxen` | ^8.0.1 | core |
| `open` | ^10.0.3 | cli |

### 3.4 ユーティリティ

| パッケージ | バージョン | 使用先 |
|---|---|---|
| `dotenv` | ^16.6.1 | cli |
| `yaml` | ^2.3.4 / ^2.7.0 | cli, coding-agents |
| `uuid` | ^13.0.0 | task-manager |
| `p-retry` | ^7.1.0 | miyabi-agent-sdk |
| `axios` | ^1.13.6 | context-engineering |
| `glob` | ^10.5.0 | mcp-bundle |
| `zod` | ^3.23.8 | mcp-bundle |
| `systeminformation` | ^5.31.5 | mcp-bundle |

### 3.5 Web フレームワーク

| パッケージ | バージョン | 使用先 |
|---|---|---|
| `next` | ^15.5.14 | miyabi-web |
| `react` | ^18.3.1 | miyabi-web |
| `react-dom` | ^18.3.1 | miyabi-web |
| `@xyflow/react` | ^12.3.6 | miyabi-web |
| `tailwindcss` | ^3.4.15 | miyabi-web (devDep) |
| `autoprefixer` | ^10.4.20 | miyabi-web (devDep) |
| `postcss` | ^8.4.49 | miyabi-web (devDep) |

### 3.6 ドキュメント生成

| パッケージ | バージョン | 使用先 |
|---|---|---|
| `ts-morph` | ^21.0.1 | doc-generator |
| `handlebars` | ^4.7.8 | doc-generator |

### 3.7 テスト / 開発

| パッケージ | バージョン | 使用先 |
|---|---|---|
| `typescript` | ^5.8.3 | 全パッケージ (devDep) |
| `vitest` | ^3.2.4 | cli, coding-agents, mcp-bundle, miyabi-web, task-manager, doc-generator, context-engineering |
| `@vitest/coverage-v8` | ^3.2.4 | cli, mcp-bundle, task-manager, doc-generator, context-engineering |
| `@testing-library/react` | ^16.3.1 | miyabi-web (devDep) |
| `@testing-library/jest-dom` | ^6.9.1 | miyabi-web (devDep) |
| `@testing-library/user-event` | ^14.6.1 | miyabi-web (devDep) |
| `@playwright/test` | ^1.56.0 | ルートレベル (devDep) |
| `jsdom` | ^27.3.0 | miyabi-web (devDep) |
| `tsx` | ^4.7.0 | cli, core, mcp-bundle, doc-generator (devDep) |
| `eslint` | ^8.57.1 | mcp-bundle, miyabi-web (devDep) |
| `@vitejs/plugin-react` | ^5.1.2 | miyabi-web (devDep) |

---

## 4. エクスポート構造

### 4.1 `@agentic-os/core` (core)

```json
{
  ".":       "./dist/index.js",
  "./agents": "./dist/agents/index.js",
  "./types":  "./dist/types/index.js"
}
```

**型エクスポート**:
- `AgentStatus`, `AgentConfig`, `AgentResult<T>`, `Task`
- `IAgent`, `AgentRegistry` (Singleton)
- `BusinessBaseAgent` (abstract), `BusinessAgentConfig`, `BusinessTask`, `BusinessResult`

### 4.2 `@miyabi/coding-agents` (coding-agents)

```json
{
  ".":                "./dist/index.js",
  "./base-agent":     "./dist/base-agent.js",
  "./types":          "./dist/types/index.js",
  "./types/index":    "./dist/types/index.js",
  "./types/*":        "./dist/types/*.js",
  "./utils":          "./dist/utils/index.js",
  "./utils/*":        "./dist/utils/*.js",
  "./coordinator":    "./dist/coordinator/coordinator-agent.js",
  "./coordinator/*":  "./dist/coordinator/*.js",
  "./codegen":        "./dist/codegen/codegen-agent.js",
  "./codegen/*":      "./dist/codegen/*.js",
  "./review":         "./dist/review/review-agent.js",
  "./review/*":       "./dist/review/*.js",
  "./deployment":     "./dist/deployment/deployment-agent.js",
  "./deployment/*":   "./dist/deployment/*.js",
  "./issue":          "./dist/issue/issue-agent.js",
  "./issue/*":        "./dist/issue/*.js",
  "./pr":             "./dist/pr/pr-agent.js",
  "./pr/*":           "./dist/pr/*.js",
  "./feedback-loop":  "./dist/feedback-loop/feedback-loop.js",
  "./feedback-loop/*":"./dist/feedback-loop/*.js",
  "./ui/index":       "./dist/ui/index.js",
  "./ui/*":           "./dist/ui/*.js",
  "./water-spider/*": "./dist/water-spider/*.js",
  "./worktree/*":     "./dist/worktree/*.js",
  "./monitoring/*":   "./dist/monitoring/*.js",
  "./github/*":       "./dist/github/*.js",
  "./execution/*":    "./dist/execution/*.js",
  "./omega-system":   "./dist/omega-system/index.js",
  "./omega-system/*": "./dist/omega-system/*.js"
}
```

全エントリに `types` フィールド付き（`.d.ts` 対応）。

### 4.3 `@miyabi/shared-utils` (shared-utils)

```json
{
  ".":                  { "types": "./dist/index.d.ts",            "default": "./dist/index.js" },
  "./retry":            { "types": "./dist/retry.d.ts",            "default": "./dist/retry.js" },
  "./api-client":       { "types": "./dist/api-client.d.ts",       "default": "./dist/api-client.js" },
  "./async-file-writer":{ "types": "./dist/async-file-writer.d.ts","default": "./dist/async-file-writer.js" }
}
```

**型エクスポート**:
- `RetryOptions`, `withRetry<T>`
- `getGitHubClient`, `withGitHubCache<T>`, `getConnectionPoolStats`, `destroyAllConnections`
- `AsyncFileWriter` (Singleton)
- `ConcurrencyConfig`

### 4.4 `@miyabi/agent-sdk` (miyabi-agent-sdk)

```json
{
  ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" }
}
```

**型エクスポート**: `AgentContext`, `AgentResult`, `AgentMetrics`, `AgentArtifact`, `AgentError`

### 4.5 `@miyabi/task-manager` (task-manager)

```json
{
  ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" }
}
```

**型エクスポート**: `ManagedTask`, `TaskState`, `TaskStateTransition`, `DecompositionResult`, `DAGResult`, `ExecutionResult`, `BidirectionalSyncOptions`

### 4.6 `@agentic-os/github-projects` (github-projects)

```json
{
  ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" }
}
```

**型エクスポート**: `GitHubProjectsClient`, `AgentMetrics`, `WeeklyReport`, `ProjectInfo`, `ProjectItem`

### 4.7 `miyabi-mcp-bundle` (mcp-bundle)

```json
// main: "dist/index.js", types: "dist/index.d.ts"
// exports map は未定義（main/types のみ）
```

**型エクスポート**: `SimpleCache`

### 4.8 `@agentic-os/doc-generator` (doc-generator)

```json
{
  ".":           "./dist/index.js",
  "./analyzer":  "./dist/analyzer/CodeAnalyzer.js",
  "./generator": "./dist/generator/TemplateEngine.js"
}
```

**型エクスポート**: `FunctionInfo`, `ClassInfo`, `InterfaceInfo`, `AnalysisResult`

### 4.9 `@miyabi/context-engineering` (context-engineering)

```json
{
  ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" }
}
```

**型エクスポート**: `AnalysisResult`, `OptimizationResult`, `PromptTemplate`, `ContextEngineering`

### 4.10 `@miyabi/web` (miyabi-web)

Next.js App Router ベースのため exports map なし。`next dev/build/start` で実行。

### 4.11 バイナリエントリ (bin)

| パッケージ | bin名 | エントリ |
|---|---|---|
| `miyabi` (cli) | `miyabi` | `./dist/index.js` |
| `miyabi-mcp-bundle` | `miyabi-mcp-bundle` | `dist/cli.js` |
| `miyabi-mcp-bundle` | `miyabi-mcp` | `dist/cli.js` |
| `miyabi-mcp-bundle` | `miyabi-mcp-server` | `dist/index.js` |
| `@agentic-os/doc-generator` | `doc-gen` | `./dist/cli.js` |

---

## 5. ビルド依存関係

### 5.1 ビルドパイプライン

```
CLI パッケージ (packages/cli):
  tsc → fix-esm-imports.js → post-build.js
  ^^^    ^^^^^^^^^^^^^^^^     ^^^^^^^^^^^^^
  TypeScript  ESM拡張子修正     追加ビルド処理
  コンパイル  (.js追加等)

その他のパッケージ:
  tsc のみ (単純TypeScriptコンパイル)

miyabi-web:
  next build (Next.js独自ビルド)
```

### 5.2 ビルド順序（依存関係に基づく推奨順）

```
Level 0 (依存なし - 並列ビルド可能):
  shared-utils
  miyabi-agent-sdk
  context-engineering
  doc-generator
  mcp-bundle
  miyabi-web

Level 1 (Level 0 に依存):
  coding-agents     ← shared-utils, miyabi-agent-sdk
  github-projects   ← miyabi-agent-sdk

Level 2 (Level 1 に依存):
  core              ← coding-agents (re-export)
  task-manager      ← coding-agents (peer dep)

Level 3 (Level 2 に依存):
  cli               ← core, miyabi-agent-sdk, agent-skill-bus(外部)
```

### 5.3 Docker マルチステージビルド順序

```
Stage 1: base
  node:20-alpine + git, openssh-client, ca-certificates

Stage 2: deps
  pnpm 9 install --frozen-lockfile --prod

Stage 3: builder
  全依存関係インストール + ビルド
  除外: dashboard-server, github-projects

Stage 4: runtime
  非rootユーザー (miyabi:1001)
  ビルド成果物のみコピー
```

### 5.4 npm scripts（ルートレベル主要スクリプト）

```bash
npm run build           # 全パッケージの tsc コンパイル
npm run lint            # ESLint 検証
npm run typecheck       # tsc --noEmit
npm test                # vitest run
npm run verify:all      # lint + typecheck + test + security:scan
```

---

## 6. テスト依存関係

### 6.1 Vitest workspace projects

**ファイル**: `vitest.config.ts`（ルート）

```
vitest workspace projects:
  +------------------------------------------+
  | root                                      |
  |   include: tests/**/*.test.ts             |
  |            agents/**/*.test.ts            |
  |            .claude/**/*.test.ts           |
  |   exclude: tests/e2e/**, tests/integration/** |
  |            packages/**, *.spec.ts         |
  +------------------------------------------+
  | packages/cli         (独自 vitest.config.ts) |
  | packages/mcp-bundle  (独自 vitest.config.ts) |
  | packages/task-manager(独自 vitest.config.ts) |
  | packages/miyabi-web  (独自 vitest.config.ts) |
  +------------------------------------------+
```

### 6.2 Path aliases（テスト時）

```typescript
// vitest.config.ts (ルート)
resolve: {
  alias: {
    '@miyabi/coding-agents': path.resolve(__dirname, 'packages/coding-agents'),
    '@miyabi/shared-utils':  path.resolve(__dirname, 'packages/shared-utils/src'),
  }
}
```

**注意**: テスト時は `src/` を直接参照（ビルド不要）。プロダクションでは `dist/` を参照。

### 6.3 テスト構成の全体像

```
テストファイル配置:
  tests/                          # ルートテスト (vitest, node env)
  ├── *.test.ts                   # ユニットテスト
  ├── integration/                # 統合テスト (ルートprojectから除外)
  │   └── *.test.ts
  └── e2e/                        # E2Eテスト (Playwright, vitest除外)
      └── *.spec.ts

  packages/cli/tests/             # CLI固有テスト
  packages/mcp-bundle/tests/      # MCPバンドル固有テスト
  packages/task-manager/tests/    # タスク管理固有テスト
  packages/miyabi-web/tests/      # Web UI固有テスト
  packages/coding-agents/tests/   # コーディングエージェント固有テスト
  packages/doc-generator/tests/   # ドキュメント生成固有テスト
```

### 6.4 テストフレームワーク使い分け

```
Vitest (*.test.ts):
  - ユニットテスト: 全パッケージ
  - 統合テスト: tests/integration/
  - 設定: globals: true, environment: 'node', timeout: 30000ms
  - カバレッジ: v8 provider, text/json/html reporter

Playwright (*.spec.ts):
  - E2Eブラウザテスト: tests/e2e/
  - ダッシュボードテスト、デモテスト
  - vitest から明示的に除外 (exclude: '**/*.spec.ts')

@testing-library/react:
  - miyabi-web コンポーネントテスト
  - jsdom environment
```

### 6.5 テスト実行コマンド

```bash
# 全テスト
npm test                              # vitest run (全workspace projects)

# 単一ファイル
npx vitest run path/to/file.test.ts

# パターンマッチ
npx vitest run -t "test name pattern"

# パッケージ別
cd packages/cli && npm test
cd packages/mcp-bundle && npm test
cd packages/task-manager && npm test

# カバレッジ
npm run test:coverage                 # 各パッケージ: vitest run --coverage

# E2E (Playwright)
npx playwright test tests/e2e/
```

---

## 付録A: 依存関係リスク分析

### 重複依存の特定

| パッケージ | 重複使用箇所 | バージョン整合性 |
|---|---|---|
| `@octokit/rest` | cli, core, coding-agents, task-manager, github-projects, mcp-bundle | ^21.1.1 (統一) |
| `@octokit/graphql` | cli, core, task-manager, github-projects | ^8.2.1 (統一) |
| `@anthropic-ai/sdk` | core, coding-agents, task-manager | ^0.71.2 (統一) |
| `chalk` | cli, core, coding-agents, miyabi-agent-sdk, doc-generator | ^5.3.0 (統一) |
| `ora` | cli, core, miyabi-agent-sdk, doc-generator | ^9.0.0 (統一) |
| `commander` | cli, doc-generator | ^11.1.0 (統一) |

### npm名の不一致に注意

```
パッケージディレクトリ名     npm name                   備考
miyabi-agent-sdk            @miyabi/agent-sdk          ローカル名
                            miyabi-agent-sdk           cli dependencies での参照名
                                                       (npm registry では別パッケージの可能性)
```

CLI の `dependencies` では `miyabi-agent-sdk: ^0.1.0-alpha.2` として参照しているが、
ローカルパッケージの `name` は `@miyabi/agent-sdk`。pnpm workspace 内では
ディレクトリ解決されるが、npm publish 時に不整合が生じる可能性がある。

### 孤立パッケージ

以下のパッケージは他の内部パッケージから参照されていない:

| パッケージ | 状態 | 用途 |
|---|---|---|
| `miyabi-mcp-bundle` | 独立 | Claude Desktop/Claude Code 向けスタンドアロンサーバー |
| `@miyabi/web` | 独立 | Web ダッシュボード（スタンドアロン Next.js アプリ） |
| `@agentic-os/doc-generator` | 独立 | CLI ツール (`doc-gen`) としてスタンドアロン実行 |
| `@miyabi/context-engineering` | 独立 | Context Engineering API SDK（FastAPI バックエンド通信） |

### pnpm overrides（脆弱性修正）

```yaml
minimatch@<3.1.4     → 3.1.4   # DOS脆弱性
flatted@<=3.4.1      → 3.4.2   # オブジェクトインジェクション
glob@>=10.2.0 <10.5.0 → 10.5.0 # パフォーマンス
```
