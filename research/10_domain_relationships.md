# Miyabi ドメイン関係マップ - 全システム間接続・相互作用の網羅的分析

---

## 1. システム間依存関係マップ

### 1.1 パッケージ依存グラフ

```
                        ┌─────────────────────────────────────────────────┐
                        │              External APIs                      │
                        │  Anthropic API / GitHub API / Gemini API /      │
                        │  Discord API / Firebase / npm Registry          │
                        └──────┬──────────┬──────────┬───────────────────┘
                               │          │          │
    ┌──────────────────────────┼──────────┼──────────┼──────────────────────┐
    │                    MIYABI MONOREPO (pnpm workspace)                    │
    │                                                                       │
    │  ┌─────────────────────────────────────────────────────────────────┐  │
    │  │                    packages/cli (miyabi)                         │  │
    │  │  Commander.js + Inquirer + 30コマンド                            │  │
    │  │  ━━━ エントリポイント：全ユーザーインタラクションの窓口 ━━━       │  │
    │  └───────┬──────────┬──────────┬──────────┬───────────────────────┘  │
    │          │          │          │          │                           │
    │          ▼          ▼          ▼          ▼                           │
    │  ┌──────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐ │
    │  │ @agentic  │ │ miyabi-     │ │ agent-skill  │ │ @miyabi/context  │ │
    │  │ -os/core  │ │ agent-sdk   │ │ -bus         │ │ -engineering     │ │
    │  │ (基盤)    │ │ (SDK)       │ │ (110+skills) │ │ (最適化)         │ │
    │  └────┬─────┘ └──────┬──────┘ └──────────────┘ └────────┬─────────┘ │
    │       │              │                                    │           │
    │       ▼              ▼                                    │           │
    │  ┌──────────────────────────────────┐                     │           │
    │  │   packages/coding-agents          │                     │           │
    │  │   7 Coding + 14 Business Agents   │◄────────────────────┘           │
    │  │   BaseAgent, AgentRegistry        │                                 │
    │  └────────────┬─────────────────────┘                                 │
    │               │                                                       │
    │               ▼                                                       │
    │  ┌──────────────────────────────────┐    ┌────────────────────────┐   │
    │  │   packages/task-manager           │◄──►│ packages/github-       │   │
    │  │   状態マシン, DAG, 実行エンジン    │    │ projects               │   │
    │  │   Worktree Coordinator            │    │ Projects V2統合        │   │
    │  └──────────────────────────────────┘    └────────────────────────┘   │
    │                                                                       │
    │  ┌──────────────────────────────────┐    ┌────────────────────────┐   │
    │  │   packages/mcp-bundle             │    │ packages/miyabi-web    │   │
    │  │   172ツール, 21カテゴリ            │    │ Next.js 15ダッシュボード│   │
    │  │   バンドルMCPサーバー              │    │ React Flow ワークフロー│   │
    │  └──────────────────────────────────┘    └────────────────────────┘   │
    │                                                                       │
    │  ┌──────────────────────────────────┐    ┌────────────────────────┐   │
    │  │   packages/doc-generator          │    │ packages/shared-utils  │   │
    │  │   ts-morph + Handlebars           │    │ 純TypeScript (依存0)   │   │
    │  │   API ドキュメント自動生成         │    │ リトライ,キャッシュ,   │   │
    │  └──────────────────────────────────┘    │ ファイルIO, 最適化     │   │
    │                                          └────────────────────────┘   │
    └───────────────────────────────────────────────────────────────────────┘
```

### 1.2 依存方向の詳細マトリクス

| 依存元 → 依存先 | core | cli | sdk | coding-agents | shared-utils | task-mgr | gh-projects | mcp-bundle | web | doc-gen | ctx-eng |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **cli** | **直接** | - | **直接** | 間接(core経由) | **直接** | 間接 | 間接 | - | - | - | - |
| **core** | - | - | - | **再export** | - | - | - | - | - | - | - |
| **coding-agents** | **直接** | - | **直接** | - | **直接** | - | - | - | - | - | **直接** |
| **task-manager** | - | - | - | **直接** | - | - | **直接** | - | - | - | - |
| **mcp-bundle** | - | - | - | - | - | - | - | - | - | - | - |
| **miyabi-web** | - | - | - | - | - | - | - | - | - | - | - |
| **doc-generator** | - | - | - | - | - | - | - | - | - | - | - |
| **context-eng** | - | - | - | - | - | - | - | - | - | - | - |
| **shared-utils** | - | - | - | - | - | - | - | - | - | - | - |

**凡例**: `直接` = package.jsonに宣言された依存, `再export` = 型・クラスの再エクスポート, `間接` = 推移的依存

### 1.3 データフロー方向

```
┌─────────────┐   HTTP/REST    ┌────────────────┐
│ miyabi-web   │◄──────────────►│ GitHub API      │
│ (Next.js)    │                │ (REST/GraphQL)  │
└──────┬───────┘                └────────┬────────┘
       │ WebSocket (port 3001)           │
       ▼                                 │
┌─────────────┐                          │
│ Dashboard    │                          │
│ Server       │                          │
└──────────────┘                          │
                                         │
┌─────────────┐   stdio (MCP)  ┌─────────┴────────┐
│ Claude Code  │◄──────────────►│ MCP Servers (7)   │
│ / Desktop    │                │ 180+ ツール        │
└──────────────┘                └──────────────────┘
                                         │
                                         │ CLI実行
                                         ▼
┌─────────────┐   HTTP          ┌──────────────────┐
│ Context Eng  │◄───────────────│ coding-agents     │
│ API (9001)   │                │ (エージェント群)    │
└──────────────┘                └────────┬─────────┘
                                         │
       ┌─────────────────────────────────┤
       │                                 │
       ▼                                 ▼
┌──────────────┐                ┌──────────────────┐
│ Anthropic API │                │ GitHub API        │
│ (Claude)      │                │ (Issues/PRs/      │
│ HTTPS         │                │  Labels/Actions)  │
└──────────────┘                └──────────────────┘
```

### 1.4 通信プロトコル一覧

| 接続 | プロトコル | ポート/経路 | 方向 | データ形式 |
|---|---|---|---|---|
| CLI → GitHub API | HTTPS (REST/GraphQL) | api.github.com | 双方向 | JSON |
| CLI → Anthropic API | HTTPS | api.anthropic.com | リクエスト/レスポンス | JSON |
| CLI → Context Engineering | HTTP | localhost:9001 | リクエスト/レスポンス | JSON |
| MCP Servers → Claude Code | stdio | プロセス間 | 双方向 | JSON-RPC 2.0 |
| MCP → Gemini API | HTTPS | generativelanguage.googleapis.com | リクエスト/レスポンス | JSON |
| MCP → Discord API | HTTPS | discord.com/api | 双方向 | JSON |
| Dashboard → Browser | WebSocket | localhost:3001 | 双方向 | JSON |
| miyabi-web → API Routes | HTTP | localhost:3000/api | 内部 | JSON |
| GitHub Actions → Agent | プロセス実行 | GitHub Runner | 単方向 | env/stdout |
| Webhook Handler → Agent | HTTP(S) | configurable | イベント駆動 | JSON |
| Agent → git worktree | プロセス実行 | ローカルファイルシステム | 単方向 | ファイルI/O |
| Agent間通信 | インメモリ MessageBus | - | 双方向 | AgentMessage型 |
| TaskManager → GitHub | HTTPS (GraphQL) | api.github.com | 双方向(Sync) | JSON |
| Docker → PostgreSQL | TCP | 5432 | 双方向 | PostgreSQL wire |
| Docker → Redis | TCP | 6379 | 双方向 | RESP |

---

## 2. レイヤーアーキテクチャ

```
╔══════════════════════════════════════════════════════════════════════════╗
║                     PRESENTATION LAYER (表示層)                         ║
║                                                                        ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ ║
║  │ Miyabi CLI    │  │ miyabi-web   │  │ MCP Tools    │  │ Slash Cmds │ ║
║  │ 30コマンド     │  │ Next.js 15   │  │ Claude Code  │  │ 10コマンド  │ ║
║  │ Commander.js  │  │ React Flow   │  │ /Desktop UI  │  │ Skills 23  │ ║
║  │ Inquirer      │  │ Tailwind CSS │  │ stdio        │  │            │ ║
║  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ ║
╠═════════╪══════════════════╪══════════════════╪════════════════╪════════╣
║         │      APPLICATION LAYER (アプリケーション層)          │        ║
║         ▼                  ▼                  ▼                ▼        ║
║  ┌──────────────────────────────────────────────────────────────────┐  ║
║  │                    Pipeline / Orchestration                       │  ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │  ║
║  │  │ Pipeline      │  │ Omega System │  │ Water Spider           │ │  ║
║  │  │ Engine        │  │ (6段階)       │  │ (完全自律)              │ │  ║
║  │  │ |, &&, ||, &  │  │              │  │                        │ │  ║
║  │  └──────────────┘  └──────────────┘  └────────────────────────┘ │  ║
║  └──────────────────────────────┬───────────────────────────────────┘  ║
║                                 │                                      ║
║  ┌──────────────────────────────▼───────────────────────────────────┐  ║
║  │                    Agent Orchestration                             │  ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │  ║
║  │  │ Coordinator   │  │ Agent        │  │ MessageBus             │ │  ║
║  │  │ Agent         │  │ Registry     │  │ (AgentMessage型)       │ │  ║
║  │  │ (しきるん)     │  │ (Singleton)  │  │ 7種メッセージ           │ │  ║
║  │  └──────────────┘  └──────────────┘  └────────────────────────┘ │  ║
║  └──────────────────────────────┬───────────────────────────────────┘  ║
║                                 │                                      ║
║  ┌──────────────────────────────▼───────────────────────────────────┐  ║
║  │                    Specialist Agents (専門エージェント)            │  ║
║  │                                                                    │  ║
║  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌─────┐ │  ║
║  │  │ Issue   │ │ CodeGen│ │ Review │ │ Test   │ │ PR     │ │Deploy│ │  ║
║  │  │ Agent   │ │ Agent  │ │ Agent  │ │ Agent  │ │ Agent  │ │Agent │ │  ║
║  │  │みつけるん│ │つくるん │ │めだまん │ │たしか  │ │まとめ  │ │はこ  │ │  ║
║  │  │         │ │         │ │         │ │めるん  │ │めるん  │ │ぶん  │ │  ║
║  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └─────┘ │  ║
║  └──────────────────────────────┬───────────────────────────────────┘  ║
║                                 │                                      ║
║  ┌──────────────────────────────▼───────────────────────────────────┐  ║
║  │                    Task Manager                                    │  ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │  ║
║  │  │ State Machine │  │ LLM          │  │ Task Executor          │ │  ║
║  │  │ (10状態,28遷移)│  │ Decomposer   │  │ (並列/直列/DAG)        │ │  ║
║  │  └──────────────┘  └──────────────┘  └────────────────────────┘ │  ║
║  └──────────────────────────────────────────────────────────────────┘  ║
╠════════════════════════════════════════════════════════════════════════╣
║                     DOMAIN LAYER (ドメイン層)                          ║
║                                                                        ║
║  ┌──────────────────────────────────────────────────────────────────┐  ║
║  │  @agentic-os/core                                                │  ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │  ║
║  │  │ IAgent       │  │ AgentConfig  │  │ BusinessBaseAgent      │ │  ║
║  │  │ AgentRegistry│  │ AgentResult  │  │ (14 Business Agents)   │ │  ║
║  │  │ AgentStatus  │  │ Task         │  │                        │ │  ║
║  │  └──────────────┘  └──────────────┘  └────────────────────────┘ │  ║
║  └──────────────────────────────────────────────────────────────────┘  ║
║                                                                        ║
║  ┌──────────────────────────────────────────────────────────────────┐  ║
║  │  miyabi-agent-sdk                                                 │  ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │  ║
║  │  │ AgentContext  │  │ AgentResult  │  │ AgentMetrics           │ │  ║
║  │  │ (owner,repo,  │  │ (status,     │  │ (executionTime,        │ │  ║
║  │  │  token,config)│  │  artifacts)  │  │  tokenUsage, cost)     │ │  ║
║  │  └──────────────┘  └──────────────┘  └────────────────────────┘ │  ║
║  └──────────────────────────────────────────────────────────────────┘  ║
║                                                                        ║
║  ┌──────────────────────────────────────────────────────────────────┐  ║
║  │  @miyabi/shared-utils (外部依存ゼロ)                              │  ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │  ║
║  │  │ withRetry()   │  │ APIクライアント│  │ AsyncFileWriter       │ │  ║
║  │  │ 指数バックオフ │  │ HTTP Pool    │  │ バッチI/O (96%改善)    │ │  ║
║  │  │              │  │ LRU Cache    │  │                        │ │  ║
║  │  └──────────────┘  └──────────────┘  └────────────────────────┘ │  ║
║  │  ┌──────────────┐                                                │  ║
║  │  │ System       │                                                │  ║
║  │  │ Optimizer    │                                                │  ║
║  │  │ 並行数自動計算│                                                │  ║
║  │  └──────────────┘                                                │  ║
║  └──────────────────────────────────────────────────────────────────┘  ║
╠════════════════════════════════════════════════════════════════════════╣
║                     INFRASTRUCTURE LAYER (インフラ層)                  ║
║                                                                        ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ ║
║  │ MCP Servers   │  │ GitHub       │  │ Docker       │  │ Security │ ║
║  │ ┌──────────┐ │  │ Actions      │  │ ┌──────────┐ │  │ ┌──────┐ │ ║
║  │ │ Bundle   │ │  │ 24 Workflows │  │ │ miyabi-  │ │  │ │ 6層  │ │ ║
║  │ │ 172 tools│ │  │ ┌──────────┐ │  │ │ agent    │ │  │ │ Scan │ │ ║
║  │ └──────────┘ │  │ │ CI/CD    │ │  │ └──────────┘ │  │ └──────┘ │ ║
║  │ ┌──────────┐ │  │ │ State    │ │  │ ┌──────────┐ │  │ ┌──────┐ │ ║
║  │ │ Custom   │ │  │ │ Machine  │ │  │ │ postgres │ │  │ │Gitleak│ │ ║
║  │ │ 7 server │ │  │ │ Auto     │ │  │ │ redis    │ │  │ │CodeQL│ │ ║
║  │ │ 42 tools │ │  │ │ Label    │ │  │ │ ctx-api  │ │  │ │SBOM  │ │ ║
║  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │  │ └──────┘ │ ║
║  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘ ║
║                                                                        ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐ ║
║  │ Monitoring    │  │ Hooks (6)    │  │ GitNexus                     │ ║
║  │ ┌──────────┐ │  │ auto-format  │  │ コードインテリジェンス         │ ║
║  │ │ WebSocket│ │  │ validate-ts  │  │ グラフDB, Impact Analysis     │ ║
║  │ │ Dashboard│ │  │ log-commands │  │ 7ツール + 4リソース           │ ║
║  │ │ Alerts   │ │  │ agent-event  │  │                              │ ║
║  │ └──────────┘ │  │ session-cont │  │                              │ ║
║  └──────────────┘  │ webhook-fb   │  │                              │ ║
║                     └──────────────┘  └──────────────────────────────┘ ║
╠════════════════════════════════════════════════════════════════════════╣
║                     EXTERNAL LAYER (外部層)                            ║
║                                                                        ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ ║
║  │ GitHub API    │  │ Anthropic API│  │ Google       │  │ Discord  │ ║
║  │ ┌──────────┐ │  │              │  │ Gemini API   │  │ API      │ ║
║  │ │ REST v3  │ │  │ Claude       │  │              │  │          │ ║
║  │ │ GraphQL  │ │  │ Sonnet 4     │  │ gemini-3     │  │ Webhook  │ ║
║  │ │ Webhooks │ │  │              │  │ -flash       │  │ Bot      │ ║
║  │ └──────────┘ │  │ Max 8192 tok │  │              │  │          │ ║
║  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘ ║
║                                                                        ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ ║
║  │ npm Registry  │  │ Firebase     │  │ X (Twitter)  │  │ Teachable│ ║
║  │ (publish)     │  │ Hosting      │  │ API          │  │ API      │ ║
║  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘ ║
╚════════════════════════════════════════════════════════════════════════╝
```

### 2.1 レイヤー間の呼び出しルール

| ルール | 説明 |
|---|---|
| **上位→下位のみ** | Presentation → Application → Domain → Infrastructure。逆方向の直接呼び出しは禁止 |
| **同一レイヤー間** | 同レイヤーのパッケージ間参照は許可（例: task-manager ↔ github-projects） |
| **Infrastructure→External** | Infrastructure層のみが外部APIに直接アクセス |
| **shared-utilsの特権** | 全レイヤーから参照可能な横断ユーティリティ |
| **Event駆動の逆方向通信** | WebSocket、Webhook、EventEmitterで下位→上位に通知（直接呼び出しではない） |

---

## 3. 実行フロー（End-to-End）

### 3.1 Issue → Deploy 完全フロー

```
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Issue 作成・トリアージ                                         │
│                                                                         │
│  [人間/自動]                                                             │
│       │                                                                 │
│       ▼                                                                 │
│  GitHub Issue #270 作成                                                  │
│       │                                                                 │
│       ├──► GitHub Webhook 発火 (issues.opened)                          │
│       │       │                                                         │
│       │       ▼                                                         │
│       │    webhook-handler.yml (中央イベントルーター)                      │
│       │       │                                                         │
│       │       ▼                                                         │
│       └──► ai-auto-label.yml                                            │
│               │                                                         │
│               ├── Anthropic API (Claude) → Issue内容分析                  │
│               ├── 53ラベル×10カテゴリから適切なラベル選択                    │
│               └── GitHub API → ラベル付与                                │
│                       │                                                 │
│  使用コンポーネント:                                                      │
│  - scripts/github/ai-label-issue.ts                                     │
│  - IssueAgent (みつけるん)                                               │
│  - @octokit/rest (GitHub REST API)                                      │
│  - @anthropic-ai/sdk (Claude API)                                       │
│  - shared-utils/api-client.ts (LRU Cache, Connection Pool)              │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: ステートマシン遷移                                              │
│                                                                         │
│  state-machine.yml                                                      │
│       │                                                                 │
│       ├── initial-triage: `state:pending` ラベル付与                      │
│       │                                                                 │
│       ├── `🤖agent-execute` ラベル検出                                   │
│       │       │                                                         │
│       │       ▼                                                         │
│       ├── coordinator-assignment: `state:pending` → `state:analyzing`   │
│       │                                                                 │
│  ラベル遷移:                                                             │
│  pending → analyzing → implementing → reviewing → done                  │
│                                                                         │
│  使用コンポーネント:                                                      │
│  - scripts/operations/label-state-machine.ts                            │
│  - GitHub API (Labels)                                                  │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: エージェント実行 (autonomous-agent.yml)                         │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │ CoordinatorAgent (しきるん) 🔴                               │        │
│  │                                                              │        │
│  │  1. Issue内容取得 → GitHub API                               │        │
│  │  2. LLM Decomposer → Anthropic API                          │        │
│  │     - タスク分解 (1-3時間のアトミックタスク)                     │        │
│  │     - Kahn's Algorithm → DAG構築                             │        │
│  │     - DFS → 循環依存検出                                      │        │
│  │  3. トポロジカルソート → 実行レベル計算                          │        │
│  │  4. 並行数決定: min(独立タスク数, CPU数, 5)                     │        │
│  │  5. AgentRegistry → エージェント割り当て                        │        │
│  └──────────────────────────┬──────────────────────────────────┘        │
│                              │                                          │
│                    MessageBus (TASK_ASSIGNMENT)                         │
│                              │                                          │
│           ┌──────────────────┼──────────────────┐                      │
│           ▼                  ▼                  ▼                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │ CodeGenAgent  │  │ CodeGenAgent  │  │ (他Agent)    │                 │
│  │ (つくるん) #1 │  │ (つくるん) #2 │  │              │                 │
│  │               │  │               │  │              │                 │
│  │ 1. Context    │  │ 並列実行      │  │              │                 │
│  │    Engineering│  │               │  │              │                 │
│  │    最適化      │  │               │  │              │                 │
│  │ 2. Claude API │  │               │  │              │                 │
│  │    コード生成  │  │               │  │              │                 │
│  │ 3. テスト生成  │  │               │  │              │                 │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                 │
│         │                  │                  │                          │
│         └──────────────────┼──────────────────┘                         │
│                            │ MessageBus (RESULT_REPORT)                │
│                            ▼                                            │
│  使用コンポーネント:                                                      │
│  - packages/coding-agents/coordinator.ts                                │
│  - packages/coding-agents/codegen.ts                                    │
│  - packages/task-manager/decomposition/llm-decomposer.ts               │
│  - packages/task-manager/execution/task-executor.ts                     │
│  - packages/context-engineering/ (プロンプト最適化)                       │
│  - shared-utils/system-optimizer.ts (並行数自動計算)                     │
│  - git worktree (並列タスク分離実行)                                     │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: 品質ゲート (Auto-Loop Pattern)                                 │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │ ReviewAgent (めだまん) 🔵                                    │        │
│  │                                                              │        │
│  │  品質スコア計算 (100点満点):                                   │        │
│  │  score = type_safety×0.3 + test_coverage×0.3                 │        │
│  │        + lint_compliance×0.2 + docs×0.2                      │        │
│  │                                                              │        │
│  │  ≥ 80点 → 合格 ✅ → PHASE 5へ                               │        │
│  │  < 80点 → 不合格 ❌ → フィードバック → CodeGenAgent          │        │
│  │                                                              │        │
│  │  Auto-Retry Loop: 最大3回                                    │        │
│  │  3回不合格 → エスカレーション → Guardian (@ShunsukeHayashi)  │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │ TestAgent (たしかめるん) 🟢 (オプション)                      │        │
│  │                                                              │        │
│  │  - Vitest 実行 (unit/integration)                            │        │
│  │  - カバレッジ収集 (v8)                                        │        │
│  │  - 閾値検証 (80%以上)                                         │        │
│  │  - 結果をCodeGenAgentにフィードバック                          │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                         │
│  state:implementing → state:reviewing                                  │
│                                                                         │
│  使用コンポーネント:                                                      │
│  - packages/coding-agents/review.ts                                     │
│  - packages/coding-agents/feedback-loop.ts                              │
│  - ESLint (コード品質検証)                                               │
│  - TypeScript Compiler (型チェック)                                      │
│  - Vitest (テスト実行)                                                   │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: PR 作成                                                        │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │ PRAgent (まとめるん) 🟡                                      │        │
│  │                                                              │        │
│  │  1. フィーチャーブランチ作成: agent/issue-270-{timestamp}     │        │
│  │  2. コード変更コミット (Conventional Commits)                 │        │
│  │     - feat/fix/refactor/docs/test                            │        │
│  │  3. ドラフトPR作成 → GitHub API                              │        │
│  │  4. 実行レポート付与                                          │        │
│  │  5. ラベル付与: 🤖agent-generated, automated, needs-review   │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                         │
│  state:reviewing (PR作成)                                               │
│  Guardian レビュー待ち (マージは人間承認必須)                               │
│                                                                         │
│  使用コンポーネント:                                                      │
│  - packages/coding-agents/pr.ts                                         │
│  - @octokit/rest (PR作成、ラベル付与)                                    │
│  - git (ブランチ作成、コミット)                                           │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: デプロイ                                                       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │ DeploymentAgent (はこぶん) 🟡                                │        │
│  │                                                              │        │
│  │  4段階パイプライン:                                           │        │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────────────┐    │        │
│  │  │ Build  │→│ Test   │→│ Deploy │→│ Health Check   │    │        │
│  │  │ (60s)  │  │ (120s) │  │ (60s)  │  │ (60s)          │    │        │
│  │  └────────┘  └────────┘  └────────┘  └────────────────┘    │        │
│  │                                                              │        │
│  │  Staging: 自動デプロイ                                       │        │
│  │  Production: Guardian承認必須                                │        │
│  │  ヘルスチェック失敗: 自動ロールバック (1時間以内)               │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                         │
│  state:reviewing → state:done                                          │
│  PR マージ + Issue クローズ                                              │
│                                                                         │
│  使用コンポーネント:                                                      │
│  - packages/coding-agents/deployment.ts                                 │
│  - GitHub Actions (integrated-system-ci.yml)                            │
│  - Docker (マルチプラットフォームビルド)                                    │
│  - Firebase Hosting (staging/production)                                │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 7: ナレッジ更新                                                    │
│                                                                         │
│  - 実行メトリクス → GitHub Projects V2 カスタムフィールド更新             │
│    (Agent, Duration, Cost, Quality Score)                               │
│  - LDDログ書き込み → .ai/logs/YYYY-MM-DD.md                            │
│  - 週次レポート生成 → scripts/reporting/weekly-report.ts                │
│  - GitNexus → コードグラフインデックス更新                               │
│                                                                         │
│  使用コンポーネント:                                                      │
│  - packages/github-projects/client.ts                                   │
│  - shared-utils/async-file-writer.ts                                    │
│  - packages/coding-agents/monitoring.ts                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 タイムライン（目標値）

| フェーズ | 所要時間 | 累積 |
|---|---|---|
| Issue分析 + ラベリング | ~15秒 | 0:15 |
| CoordinatorAgent DAG構築 | ~30秒 | 0:45 |
| CodeGenAgent コード生成 | 60-240秒 | 1:45-4:45 |
| ReviewAgent 品質チェック | ~90秒 | 3:15-6:15 |
| Auto-Retry (0-3回) | 0-450秒 | 3:15-13:45 |
| PRAgent PR作成 | ~30秒 | 3:45-14:15 |
| DeploymentAgent | ~300秒 | 8:45-19:15 |
| **合計** | **4-15分** | - |

---

## 4. クロスカッティング関心事

### 4.1 Security（セキュリティ強制ポイント）

```
┌───────────────────────────────────────────────────────────────────────┐
│                    セキュリティ強制マップ                               │
│                                                                       │
│  PRESENTATION LAYER                                                   │
│  ├── CLI: 入力バリデーション (CWE-22対策)                              │
│  │   ├── validateProjectPath() - パストラバーサル防止                   │
│  │   ├── validateGitHubToken() - フォーマット検証                      │
│  │   ├── validateFilePath() - ベースディレクトリ制約                    │
│  │   ├── validateFileSize() - 10MB制限                                │
│  │   └── sanitizeTemplateVariable() - 危険文字除去                     │
│  ├── MCP Bundle: セキュリティ機能                                      │
│  │   ├── コマンドインジェクション防止（特殊文字サニタイズ）               │
│  │   ├── パストラバーサル保護（解決パス検証）                            │
│  │   ├── シンボリックリンク攻撃防止（実パス解決）                        │
│  │   ├── DOS防止（入力長制限: query:1000, path:4096）                  │
│  │   └── PID検証（0 < pid < 4194304）                                 │
│  └── OAuth: デバイスフロー認証 + スコープ検証                           │
│                                                                       │
│  APPLICATION LAYER                                                    │
│  ├── IssueAgent: セキュリティラベル付与                                 │
│  │   └── eval, exec, sudo, シークレット含有検出                         │
│  ├── ReviewAgent: セキュリティスコアリング（25%重み）                    │
│  ├── DeployAgent: デプロイ前チェック                                    │
│  │   └── テスト→型チェック→lint→レビュー≥80→セキュリティ→env検証       │
│  └── Quality Gate: スコア<80でブロック                                  │
│                                                                       │
│  INFRASTRUCTURE LAYER                                                 │
│  ├── GitHub Actions: 6層セキュリティスキャン                            │
│  │   ├── Layer 1: npm audit (依存関係脆弱性)                           │
│  │   ├── Layer 2: Gitleaks (シークレット検出)                           │
│  │   ├── Layer 3: security-manager.ts (カスタムスキャナー)              │
│  │   ├── Layer 4: CodeQL (静的分析 security-extended)                  │
│  │   ├── Layer 5: SBOM生成 (サプライチェーン)                           │
│  │   └── Layer 6: OpenSSF Scorecard (ベストプラクティス)                │
│  ├── Docker: 非rootユーザー(miyabi:1001)、Alpine基盤                   │
│  ├── Secrets管理: GitHub Secrets + ~/.miyabi/credentials.json (0o600)  │
│  ├── pnpm overrides: 脆弱性パッケージ強制更新                           │
│  └── CODEOWNERS: 全ファイル @ShunsukeHayashi 承認必須                  │
│                                                                       │
│  EXTERNAL LAYER                                                       │
│  ├── Token優先度: gh CLI > 環境変数 > .env > OAuth Device Flow         │
│  ├── 脆弱性対応SLA: 48時間以内                                         │
│  └── Dependabot: 自動更新                                              │
└───────────────────────────────────────────────────────────────────────┘
```

### 4.2 Monitoring（メトリクス収集ポイント）

```
┌───────────────────────────────────────────────────────────────────────┐
│                    監視・メトリクス収集マップ                           │
│                                                                       │
│  ┌─ リアルタイム監視 ──────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  WebSocket Dashboard (port 3001)                                │  │
│  │  ├── activeAgents: ActiveAgentInfo[]                             │  │
│  │  ├── queuedTasks: number                                        │  │
│  │  ├── avgExecutionTime: number                                   │  │
│  │  ├── currentThroughput: tasks/minute                            │  │
│  │  └── alerts: DashboardAlert[]                                   │  │
│  │      ├── 高エラー率 > 10%                                       │  │
│  │      ├── 長時間タスク > 30分                                     │  │
│  │      └── キューオーバーフロー > 50タスク                          │  │
│  │                                                                  │  │
│  │  更新間隔: 1秒、データ保持: 7日                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─ エージェントメトリクス ──────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  BaseAgent ライフサイクル:                                       │  │
│  │  ├── globalMetricsCollector.onAgentStart()                      │  │
│  │  ├── PerformanceMonitor.startAgentTracking()                    │  │
│  │  ├── recordMetrics(result) → executionTime, tokenUsage, cost    │  │
│  │  └── performanceMonitor.endAgentTracking()                      │  │
│  │                                                                  │  │
│  │  SLAメトリクス:                                                  │  │
│  │  ├── Tier 1 (Coordinator, Deploy): 99.9%可用性, <10秒(P95)      │  │
│  │  ├── Tier 2 (CodeGen,Review,Issue,PR): 99.5%, <30秒(P95)       │  │
│  │  └── Tier 3 (Business, Test): 99.0%, <60秒(P95)                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─ GitHub Projects V2 メトリクス ──────────────────────────────────┐  │
│  │                                                                  │  │
│  │  カスタムフィールド:                                              │  │
│  │  ├── Agent (SINGLE_SELECT) - 担当エージェント                    │  │
│  │  ├── Duration (NUMBER) - 実行時間(ms)                            │  │
│  │  ├── Cost (NUMBER) - APIコスト(USD)                              │  │
│  │  ├── Quality Score (NUMBER) - 品質スコア(0-100)                  │  │
│  │  └── Sprint (ITERATION) - スプリント追跡                         │  │
│  │                                                                  │  │
│  │  集計:                                                           │  │
│  │  ├── calculateAgentMetrics() - エージェント別統計                  │  │
│  │  └── generateWeeklyReport() - 週次レポート                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─ スクリプトベース報告 ───────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  scripts/reporting/                                              │  │
│  │  ├── weekly-report.ts - 週次レポート生成                         │  │
│  │  ├── realtime-metrics.ts - リアルタイムメトリクス                 │  │
│  │  └── performance-report.ts - パフォーマンスレポート              │  │
│  │                                                                  │  │
│  │  npm scripts:                                                    │  │
│  │  ├── kpi:collect - KPI収集                                       │  │
│  │  ├── project:metrics - メトリクス計算                             │  │
│  │  └── project:report - 包括的レポート                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─ インフラ監視 ──────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  ├── MCP ヘルスチェック (mcp-health-check.yml) - 毎日             │  │
│  │  │   └── 障害時: Issue自動作成                                   │  │
│  │  ├── Docker コンテナヘルスチェック - 30秒間隔                     │  │
│  │  ├── GitHub Actions ワークフロー失敗検出                         │  │
│  │  └── HTTPコネクションプール統計 (getConnectionPoolStats())       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

### 4.3 Logging（LDDパターン）

```
┌───────────────────────────────────────────────────────────────────────┐
│                    Log-Driven Development (LDD)                       │
│                                                                       │
│  原則: 「全てログ記録。追跡可能性の法則。」                              │
│                                                                       │
│  ┌─ ログ出力先 ────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  .ai/logs/YYYY-MM-DD.md  (日次ログファイル)                      │  │
│  │  ├── BaseAgent.updateLDDLog(result) - 全エージェント実行結果      │  │
│  │  ├── traceLogger.endAgentExecution() - 実行トレース              │  │
│  │  └── AsyncFileWriter (96.34%改善のバッチ書込み)                  │  │
│  │                                                                  │  │
│  │  GitHub Issue コメント                                           │  │
│  │  ├── エージェント実行レポート                                     │  │
│  │  ├── エスカレーション通知                                         │  │
│  │  └── 品質スコア報告                                               │  │
│  │                                                                  │  │
│  │  GitHub Projects V2 カスタムフィールド                            │  │
│  │  └── Duration, Cost, Quality Score (構造化メトリクス)             │  │
│  │                                                                  │  │
│  │  コンソール出力 (構造化)                                          │  │
│  │  ├── chalk + ora (カラー + スピナー)                              │  │
│  │  └── BusinessBaseAgent.log(message, level)                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─ フック統合 ────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  log-commands.sh - 全CLIコマンド実行をログ記録                    │  │
│  │  agent-event.sh  - エージェントイベント (started/progress/        │  │
│  │                    completed/error) をログ                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

### 4.4 Error Handling（エスカレーションパス）

```
┌───────────────────────────────────────────────────────────────────────┐
│                    エラーハンドリング・エスカレーション                   │
│                                                                       │
│  Level 1: 自動リカバリ                                                │
│  ├── withRetry() - 指数バックオフ (max 3回, delay×2, 上限10秒)        │
│  │   対象: ECONNRESET, ETIMEDOUT, ENOTFOUND, rate limit              │
│  ├── Auto-Loop - ReviewAgent不合格→CodeGen再生成 (max 3回)           │
│  ├── p-retry - SDK レベルリトライ (min 1s, max 4s, factor 2)         │
│  └── GitHub API LRU Cache - レート制限回避 (500エントリ, 5分TTL)      │
│                                                                       │
│  Level 2: グレースフルデグラデーション                                  │
│  ├── DeploymentAgent: ヘルスチェック失敗→自動ロールバック              │
│  ├── webhook-fallback.js: Webhook受信失敗時のフォールバック            │
│  ├── エスカレーションラベル: 🚨escalated, ❌agent-failed              │
│  └── state:blocked → blocked-escalation ジョブ発火                   │
│                                                                       │
│  Level 3: 人間エスカレーション                                         │
│  ├── Guardian (@ShunsukeHayashi) への通知                             │
│  │   ├── Sev.1 Critical: 24時間以内対応                               │
│  │   ├── Constitutional: 7日以内対応                                  │
│  │   └── Budget: 即時対応                                             │
│  ├── エスカレーション先:                                               │
│  │   ├── TechLead: 複雑なアーキテクチャ、セキュリティ問題              │
│  │   └── PO: 不明確な要件                                             │
│  └── フィードバックIssue自動作成 → github.com/ShunsukeHayashi/Miyabi  │
│                                                                       │
│  Level 4: サーキットブレーカー                                         │
│  ├── 経済的閾値超過 (150%) → ワークフロー自動無効化                    │
│  │   対象: agent-runner, continuous-improvement, agent-onboarding     │
│  ├── 復旧要件:                                                        │
│  │   ├── Guardian承認                                                 │
│  │   ├── 根本原因分析                                                 │
│  │   └── リソースクリーンアップ                                        │
│  └── Sev.1-Critical エスカレーションIssue自動作成                      │
│                                                                       │
│  CLI ExitCode体系:                                                    │
│  ├── 0: SUCCESS                                                       │
│  ├── 1: GENERAL_ERROR                                                 │
│  ├── 2: CONFIG_ERROR (GITHUB_TOKEN不足)                               │
│  ├── 3: VALIDATION_ERROR (無効な引数)                                  │
│  ├── 4: NETWORK_ERROR (API到達不可)                                    │
│  └── 5: AUTH_ERROR (認証失敗)                                          │
└───────────────────────────────────────────────────────────────────────┘
```

### 4.5 Configuration（設定フロー）

```
┌───────────────────────────────────────────────────────────────────────┐
│                    設定フロー                                          │
│                                                                       │
│  ┌─ 環境変数 (最優先) ─────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  必須:                                                           │  │
│  │  ├── GITHUB_TOKEN - GitHub PAT (repo, workflow, write:packages) │  │
│  │  └── REPOSITORY - owner/repo形式                                │  │
│  │                                                                  │  │
│  │  オプション:                                                     │  │
│  │  ├── ANTHROPIC_API_KEY - Claude API                              │  │
│  │  ├── GEMINI_API_KEY - Google Gemini                              │  │
│  │  ├── DEVICE_IDENTIFIER - マシン識別子                             │  │
│  │  ├── LOG_DIRECTORY - ログ出力先 (default: .ai/logs)              │  │
│  │  ├── DEFAULT_CONCURRENCY - 並列実行数 (default: 2)               │  │
│  │  ├── USE_WORKTREE - git worktree使用 (default: false)           │  │
│  │  ├── FIREBASE_STAGING_PROJECT / FIREBASE_PROD_PROJECT            │  │
│  │  └── TECH_LEAD_GITHUB - テックリードGitHubアカウント              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                          │                                            │
│                          ▼                                            │
│  ┌─ 設定ファイル ──────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  検索順: .miyabi.yml → .miyabirc → .miyabi.yaml                 │  │
│  │                                                                  │  │
│  │  MiyabiConfig:                                                   │  │
│  │  ├── github: { token, defaultPrivate, defaultOrg }               │  │
│  │  ├── project: { defaultLanguage, defaultFramework }              │  │
│  │  ├── labels: { custom: Array<{name, color, description}> }      │  │
│  │  ├── workflows: { autoLabel, autoReview, autoSync }             │  │
│  │  └── cli: { language: 'ja'|'en', theme, verboseErrors }        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                          │                                            │
│                          ▼                                            │
│  ┌─ 設定の伝搬経路 ────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  .env / 環境変数                                                 │  │
│  │      ↓ dotenv                                                   │  │
│  │  CLI config/loader.ts                                            │  │
│  │      ↓ AgentConfig構築                                          │  │
│  │  AgentContext { owner, repo, token, workdir, config }            │  │
│  │      ↓                                                           │  │
│  │  BaseAgent constructor                                           │  │
│  │      ↓                                                           │  │
│  │  各Specialist Agent                                              │  │
│  │      ↓                                                           │  │
│  │  External API呼び出し (token使用)                                │  │
│  │                                                                  │  │
│  │  GitHub Actions:                                                 │  │
│  │  secrets.GITHUB_TOKEN → ${{ secrets.* }} → .env作成 → Agent実行 │  │
│  │                                                                  │  │
│  │  Docker:                                                         │  │
│  │  docker-compose.yml → environment → コンテナ内環境変数            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─ ガバナンス設定 ────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  AGENTS.md v5.0 - 自律の三法則 (Constitutional)                  │  │
│  │  GUARDIAN.md - エスカレーション基準                               │  │
│  │  WORKFLOW_RULES.md - IDD/LDD/Zero Surprise                     │  │
│  │  BUDGET.yml - 経済ガバナンス                                     │  │
│  │  labels.yml - 53ラベル定義                                       │  │
│  │  CODEOWNERS - コード所有権                                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 5. GitHub as OS マッピング

### 5.1 OSコンセプト対応表

| OS概念 | 従来のOS | GitHub as OS (Miyabi) | 実装詳細 |
|---|---|---|---|
| **プロセス管理** | PID, fork, exec | GitHub Issues | 各Issueが1つのワークフローインスタンス。Issue番号がプロセスID相当 |
| **タスクキュー** | cron, at, systemd timer | Issue + Labels (`🤖agent-execute`) | ラベル付与でキューイング。FIFO+優先度ベース |
| **ステートマシン** | プロセス状態 (Running/Sleeping/Stopped) | 53ラベル×10カテゴリ | `state:pending` → `state:analyzing` → ... → `state:done` |
| **実行エンジン** | カーネル, init | GitHub Actions (24 Workflows) | `autonomous-agent.yml` がメインスケジューラー |
| **イベントバス** | D-Bus, signals | GitHub Webhooks | issues.opened, issues.labeled, pull_request.* 等 |
| **データ永続化** | ファイルシステム, DB | GitHub Projects V2 | カスタムフィールド (Agent, Duration, Cost, Quality Score, Sprint) |
| **セキュアボールト** | /etc/shadow, keychain | GitHub Secrets | GITHUB_TOKEN, ANTHROPIC_API_KEY, NPM_TOKEN 等 |
| **アクセス制御** | chmod, chown, ACL | CODEOWNERS + Branch Protection | 全ファイル @ShunsukeHayashi 承認必須 |
| **パッケージ管理** | apt, npm | npm Registry + GitHub Releases | npm publish (OIDC署名) |
| **ログシステム** | syslog, journald | Issue Comments + .ai/logs/ | LDD (Log-Driven Development) |
| **メッセージキュー** | POSIX MQ, ZMQ | GitHub Discussions | エージェント間非同期メッセージ |
| **ダッシュボード** | htop, /proc | GitHub Pages + miyabi-web | リアルタイムWebSocket監視 |
| **スケジュール実行** | cron | workflow_dispatch + schedule | `mcp-health-check.yml`: 毎日, `codeql.yml`: 毎週月曜 |
| **IPC (プロセス間通信)** | pipes, shared memory | MessageBus (AgentMessage型) | インメモリ通信、7種メッセージタイプ |

### 5.2 エージェント↔GitHub プリミティブ相互作用

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌─────────────┐     Issues API      ┌──────────────────────────┐  │
│  │ IssueAgent   │────────────────────►│ GitHub Issues             │  │
│  │ (みつけるん)  │     (REST/GraphQL)  │ ├── 内容読取り             │  │
│  │              │◄────────────────────│ ├── ラベル付与 (53種)      │  │
│  │              │     Labels API      │ └── コメント追加           │  │
│  └─────────────┘                      └──────────────────────────┘  │
│                                                                     │
│  ┌─────────────┐     Issues API      ┌──────────────────────────┐  │
│  │ Coordinator  │────────────────────►│ GitHub Issues             │  │
│  │ (しきるん)    │                     │ ├── Issue読取り            │  │
│  │              │     Labels API      │ ├── state:ラベル遷移       │  │
│  │              │────────────────────►│ ├── agent:ラベル割当       │  │
│  │              │     Projects API    │ └── Sub-Issue作成          │  │
│  │              │────────────────────►│                            │  │
│  └─────────────┘     (GraphQL)       └──────────────────────────┘  │
│                                                                     │
│  ┌─────────────┐     Repos API       ┌──────────────────────────┐  │
│  │ CodeGenAgent │────────────────────►│ GitHub Repository         │  │
│  │ (つくるん)    │     (Contents)      │ ├── ファイル読取り         │  │
│  │              │     Git API         │ ├── ブランチ作成           │  │
│  │              │────────────────────►│ ├── コード Push            │  │
│  │              │     Worktree        │ └── Worktree操作          │  │
│  └─────────────┘     (Local git)     └──────────────────────────┘  │
│                                                                     │
│  ┌─────────────┐     Pulls API       ┌──────────────────────────┐  │
│  │ PRAgent      │────────────────────►│ GitHub Pull Requests      │  │
│  │ (まとめるん)  │     (REST)          │ ├── ドラフトPR作成         │  │
│  │              │     Labels API      │ ├── ラベル付与             │  │
│  │              │────────────────────►│ │   (agent-generated等)   │  │
│  │              │     Reviews API     │ └── レビューリクエスト      │  │
│  └─────────────┘                      └──────────────────────────┘  │
│                                                                     │
│  ┌─────────────┐     Actions API     ┌──────────────────────────┐  │
│  │ DeployAgent  │────────────────────►│ GitHub Actions            │  │
│  │ (はこぶん)    │     Deployments API │ ├── ワークフロー起動       │  │
│  │              │────────────────────►│ ├── デプロイ状態更新       │  │
│  │              │     Environments    │ └── 環境管理              │  │
│  └─────────────┘     API             └──────────────────────────┘  │
│                                                                     │
│  ┌─────────────┐     Projects V2     ┌──────────────────────────┐  │
│  │ TaskManager  │────────────────────►│ GitHub Projects V2        │  │
│  │              │     (GraphQL)       │ ├── フィールド更新         │  │
│  │              │◄────────────────────│ ├── メトリクス取得         │  │
│  │              │     Bidirectional   │ └── 双方向同期             │  │
│  └─────────────┘     Sync            └──────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 ラベルステートマシン遷移図

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    ラベルステートマシン（完全遷移図）                       │
│                                                                           │
│  ┌────────┐                                                               │
│  │ (Issue  │                                                               │
│  │ Created)│                                                               │
│  └────┬───┘                                                               │
│       │ issues.opened → initial-triage                                    │
│       ▼                                                                   │
│  ┌─────────┐   `🤖agent-execute`    ┌───────────┐   agent割当完了         │
│  │ state:   │──────────────────────►│ state:     │──────────────────┐     │
│  │ pending  │   ラベル付与           │ analyzing  │                  │     │
│  └─────────┘                        └─────┬─────┘                  │     │
│       ▲                                   │                        │     │
│       │ reopen                             │ タスク分解完了          │     │
│       │                                   ▼                        │     │
│  ┌─────────┐                        ┌───────────────┐              │     │
│  │ state:   │◄──── retry ──────────│ state:         │              │     │
│  │ failed   │                       │ implementing   │              │     │
│  └─────────┘                        └───────┬───────┘              │     │
│       │                                     │                      │     │
│       ▼                                     │ コード生成完了        │     │
│  ┌──────────┐                               ▼                      │     │
│  │ state:    │                        ┌───────────┐                │     │
│  │ cancelled │                        │ state:     │                │     │
│  └──────────┘                        │ reviewing  │                │     │
│                                       └─────┬─────┘                │     │
│                                             │                      │     │
│                                ┌────────────┼────────────┐         │     │
│                                │            │            │         │     │
│                                ▼            ▼            ▼         │     │
│                          score < 80   score >= 80   ┌─────────┐   │     │
│                          (3回リトライ) (合格)        │ state:   │   │     │
│                                │            │       │ blocked  │   │     │
│                                │            ▼       └────┬────┘   │     │
│                                │     ┌───────────┐       │        │     │
│                                │     │ state:     │       │ 解消   │     │
│                                │     │ deploying  │       ▼        │     │
│                                │     └─────┬─────┘  pendingに戻る  │     │
│                                │           │                       │     │
│                                │           │ Health Check OK       │     │
│                                │           ▼                       │     │
│                                │     ┌─────────┐                  │     │
│                                │     │ state:   │                  │     │
│                                │     │ done     │                  │     │
│                                │     └─────────┘                  │     │
│                                │                                   │     │
│                                └── 3回失敗→エスカレーション         │     │
│                                                                    │     │
│  agent:ラベル (並行して付与):                                        │     │
│  ├── agent:coordinator → Coordinator割当                            │     │
│  ├── agent:codegen → CodeGen割当                                    │     │
│  ├── agent:review → Review割当                                      │     │
│  ├── agent:issue → Issue分析割当                                    │     │
│  ├── agent:pr → PR作成割当                                          │     │
│  └── agent:deployment → Deploy割当                                  │     │
│                                                                     │     │
│  quality:ラベル (ReviewAgent付与):                                   │     │
│  ├── quality:excellent (90-100点)                                   │     │
│  ├── quality:good (80-89点)                                         │     │
│  ├── quality:needs-improvement (60-79点)                            │     │
│  └── quality:poor (<60点)                                           │     │
│                                                                     │     │
│  トリガーラベル:                                                     │     │
│  ├── 🤖agent-execute → autonomous-agent.yml起動                    │     │
│  ├── 🤖generate-report → レポート生成                               │     │
│  ├── 🤖deploy-staging → Staging デプロイ                            │     │
│  └── 🤖deploy-production → Production デプロイ                      │     │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 6. 経済ガバナンス

### 6.1 予算追跡フロー

```
┌───────────────────────────────────────────────────────────────────────┐
│                    経済ガバナンス全体像                                 │
│                                                                       │
│  ┌─ 月次予算配分 ──────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  BUDGET.yml                                                      │  │
│  │  ┌──────────────────────────────────────────────────────────┐   │  │
│  │  │  monthly_budget_usd: $500                                │   │  │
│  │  │  ├── Anthropic API: $400 (10M tokens/月)                 │   │  │
│  │  │  ├── GitHub Actions: $0 (無料枠使用)                      │   │  │
│  │  │  └── Firebase: $100 (Hosting)                            │   │  │
│  │  └──────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                        │
│                              ▼                                        │
│  ┌─ コスト発生ポイント ────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  1. CodeGenAgent (つくるん)                                      │  │
│  │     └── Claude Sonnet 4 API呼び出し                              │  │
│  │         Max 8,192 tokens/リクエスト                               │  │
│  │         目標: <$0.10/タスク                                       │  │
│  │                                                                  │  │
│  │  2. ReviewAgent (めだまん)                                       │  │
│  │     └── Claude API (品質分析)                                    │  │
│  │                                                                  │  │
│  │  3. CoordinatorAgent (しきるん)                                  │  │
│  │     └── Claude API (タスク分解)                                  │  │
│  │                                                                  │  │
│  │  4. IssueAgent (みつけるん)                                      │  │
│  │     └── Claude API (Issue分析・ラベリング)                        │  │
│  │                                                                  │  │
│  │  5. BusinessBaseAgent (14体)                                     │  │
│  │     └── Claude API (各種ビジネス分析)                             │  │
│  │                                                                  │  │
│  │  6. Context Engineering API                                      │  │
│  │     └── Gemini API (セマンティック検索)                           │  │
│  │                                                                  │  │
│  │  7. 画像/音声/動画生成                                            │  │
│  │     └── Gemini API (gemini-3-flash)                              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                        │
│                              ▼                                        │
│  ┌─ コスト追跡メカニズム ──────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  BaseAgent.recordMetrics(result)                                 │  │
│  │      │                                                           │  │
│  │      ├── tokenUsage → コスト計算                                 │  │
│  │      ├── executionTime → 効率分析                                │  │
│  │      └── cost → GitHub Projects V2 "Cost" フィールド更新         │  │
│  │                                                                  │  │
│  │  集計:                                                           │  │
│  │  ├── calculateAgentMetrics() → エージェント別totalCost           │  │
│  │  ├── generateWeeklyReport() → 週次totalCost                     │  │
│  │  └── project:metrics スクリプト → 包括的コスト分析               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                        │
│                              ▼                                        │
│  ┌─ サーキットブレーカー ──────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  ┌──────────────────────────────────────────────────────────┐   │  │
│  │  │  閾値監視 (時間単位)                                      │   │  │
│  │  │                                                          │   │  │
│  │  │  使用率 0-79%: 🟢 通常運用                               │   │  │
│  │  │  ├── 全エージェント稼働                                   │   │  │
│  │  │  └── 制限なし                                             │   │  │
│  │  │                                                          │   │  │
│  │  │  使用率 80%: 🟡 WARNING                                  │   │  │
│  │  │  ├── アラート送信                                         │   │  │
│  │  │  ├── 非クリティカルタスク制限                               │   │  │
│  │  │  └── Guardian通知                                         │   │  │
│  │  │                                                          │   │  │
│  │  │  使用率 150%: 🔴 EMERGENCY (サーキットブレーカー発動)      │   │  │
│  │  │  ├── ワークフロー自動無効化                                 │   │  │
│  │  │  │   ├── agent-runner                                     │   │  │
│  │  │  │   ├── continuous-improvement                           │   │  │
│  │  │  │   └── agent-onboarding                                 │   │  │
│  │  │  ├── Sev.1-Critical Issue自動作成                          │   │  │
│  │  │  └── Guardian即時通知                                      │   │  │
│  │  └──────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │  │
│  │  復旧プロセス:                                                   │  │
│  │  ┌──────────────────────────────────────────────────────────┐   │  │
│  │  │  1. Guardian承認 (必須)                                   │   │  │
│  │  │  2. 根本原因分析 (RCA)                                    │   │  │
│  │  │     ├── どのエージェントが過剰消費したか                    │   │  │
│  │  │     ├── 無限ループや不要なリトライはないか                   │   │  │
│  │  │     └── プロンプト最適化の余地はあるか                      │   │  │
│  │  │  3. リソースクリーンアップ                                 │   │  │
│  │  │     ├── 不要なワークフロー実行停止                          │   │  │
│  │  │     ├── キャッシュクリア                                    │   │  │
│  │  │     └── 実行中タスクの優先度再評価                          │   │  │
│  │  │  4. ワークフロー再有効化                                   │   │  │
│  │  └──────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─ エージェント別コスト配分 ──────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  高コスト (Anthropic API 主要消費者):                             │  │
│  │  ├── CodeGenAgent: ~$0.05-0.10/タスク (Max 8,192 tokens)        │  │
│  │  │   └── 最もトークン消費が大きい (コード生成+テスト生成)         │  │
│  │  ├── CoordinatorAgent: ~$0.03-0.05/タスク                        │  │
│  │  │   └── タスク分解にLLM使用                                     │  │
│  │  └── ReviewAgent: ~$0.02-0.04/タスク                             │  │
│  │      └── Auto-Retry時は×3の可能性                                │  │
│  │                                                                  │  │
│  │  中コスト:                                                       │  │
│  │  ├── IssueAgent: ~$0.01-0.02/タスク                              │  │
│  │  └── Business Agents: ~$0.02-0.05/タスク                         │  │
│  │                                                                  │  │
│  │  低コスト/無料:                                                   │  │
│  │  ├── PRAgent: ~$0 (API呼び出しのみ)                              │  │
│  │  ├── DeploymentAgent: ~$0 (Actions無料枠)                        │  │
│  │  └── TestAgent: ~$0 (ローカル実行)                                │  │
│  │                                                                  │  │
│  │  コスト最適化ツール:                                              │  │
│  │  ├── Context Engineering: トークン52%削減                        │  │
│  │  ├── LRU Cache: 重複API呼び出し削減                              │  │
│  │  └── System Optimizer: 並行数最適化によるリソース効率化           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

### 6.2 コスト最適化の連鎖

```
Context Engineering (52%トークン削減)
    ↓
  CodeGenAgent プロンプト最適化
    ↓
  Anthropic API コスト削減
    ↓
  月次予算内での運用タスク数増加
    ↓
  サーキットブレーカー発動リスク低減
```

---

## 付録: 全コンポーネント接続サマリー

### パッケージ間の全接続（31接続）

| # | 接続元 | 接続先 | 接続方法 | データ |
|---|---|---|---|---|
| 1 | CLI | core | npm dependency | AgentConfig, AgentResult |
| 2 | CLI | miyabi-agent-sdk | npm dependency | AgentContext |
| 3 | CLI | shared-utils | npm dependency | withRetry, APIClient |
| 4 | CLI | agent-skill-bus | npm dependency | 110+スキル |
| 5 | CLI | GitHub API | HTTPS REST/GraphQL | Issues, PRs, Labels |
| 6 | CLI | Anthropic API | HTTPS | Claude Sonnet 4 |
| 7 | core | coding-agents | 再エクスポート | エージェントクラス |
| 8 | core | Anthropic API | HTTPS | BusinessBaseAgent.callClaude() |
| 9 | core | GitHub API | HTTPS REST/GraphQL | Octokit |
| 10 | coding-agents | core | npm dependency | BaseAgent, types |
| 11 | coding-agents | sdk | npm dependency | AgentContext, AgentResult |
| 12 | coding-agents | shared-utils | npm dependency | ユーティリティ |
| 13 | coding-agents | context-engineering | HTTP (port 9001) | プロンプト最適化 |
| 14 | coding-agents | Anthropic API | HTTPS | コード生成, 分析 |
| 15 | coding-agents | GitHub API | HTTPS | Issue/PR/Label操作 |
| 16 | task-manager | coding-agents | npm dependency | Agent実行者登録 |
| 17 | task-manager | github-projects | npm dependency | Projects V2同期 |
| 18 | task-manager | Anthropic API | HTTPS | LLMDecomposer |
| 19 | task-manager | GitHub API | HTTPS GraphQL | 双方向同期 |
| 20 | github-projects | GitHub API | HTTPS GraphQL | Projects V2操作 |
| 21 | mcp-bundle | 各種システムAPI | stdio/shell | 172ツール実行 |
| 22 | MCP Custom Servers | GitHub API | HTTPS | Issue/PR管理 |
| 23 | MCP Custom Servers | Gemini API | HTTPS | 画像/音声生成 |
| 24 | MCP Custom Servers | Discord API | HTTPS | メッセージ送信 |
| 25 | MCP Custom Servers | CLI | プロセス実行 | miyabiコマンド |
| 26 | context-engineering | Gemini API | HTTPS (port 8888) | セマンティック分析 |
| 27 | miyabi-web | GitHub API | HTTPS | ワークフローデータ |
| 28 | doc-generator | TypeScript AST | ts-morph | コード分析 |
| 29 | GitHub Actions | coding-agents | プロセス実行 | エージェント起動 |
| 30 | GitHub Actions | GitHub API | HTTPS | ラベル/PR/Deploy操作 |
| 31 | Dashboard Server | Browser | WebSocket (port 3001) | リアルタイム監視 |

### 設計パターン分布

| パターン | 使用パッケージ | 使用箇所 |
|---|---|---|
| Singleton | shared-utils, core | AsyncFileWriter, GitHubClient, AgentRegistry |
| Factory | core, CLI | AgentFactory, registerCommand関数群 |
| State Machine | task-manager, GitHub Actions | TaskState (10状態28遷移), Label遷移 |
| Observer/EventEmitter | CLI, coding-agents | Pipeline実行、エージェントイベント |
| Strategy | shared-utils, task-manager | リトライ戦略、同期コンフリクト戦略 |
| Builder | core, CLI | AgentConfig, PipelineContext |
| Composite | CLI | パイプラインコマンド合成 |
| DAG (Directed Acyclic Graph) | task-manager, miyabi-web | タスク分解、ワークフロー検証 |
| Circuit Breaker | インフラ層 | 経済ガバナンスサーキットブレーカー |
| Bidirectional Sync | task-manager | ローカル↔GitHub状態同期 |
| Worktree Isolation | task-manager, coding-agents | 並列タスク分離実行 |
| Message Bus | coding-agents | エージェント間通信 (AgentMessage) |
| Progressive Disclosure | skills | 3層コンテキストロード (500→1K→5Kトークン) |
| LRU Cache | shared-utils, mcp-bundle | API応答キャッシュ (500エントリ, 5分TTL) |
