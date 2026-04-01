# Miyabi MCP・プラグインシステム 詳細分析

## 概要

- **7 MCPサーバー**（180+ツール）
- **172ツール バンドルサーバー**（21カテゴリ）
- **10コマンド プラグインシステム**
- **リアルタイム監視ダッシュボード**（WebSocket）
- **6 自動化フック**

---

## 1. MCP設定ファイル

### `.claude/mcp.json`（プライマリ）

| サーバー | 用途 | タイムアウト |
|---|---|---|
| ide-integration | VS Code診断、Jupyter実行 | 120秒 |
| github-enhanced | GitHub Issue/PR管理、自動ラベリング | 120秒 |
| project-context | プロジェクト構造、依存関係、エージェント設定 | 120秒 |
| filesystem | ワークスペースファイルアクセス | 120秒 |
| context-engineering | AIコンテキスト分析、セマンティック検索 | 120秒 |
| miyabi | Miyabi CLI統合 | 120秒 |
| gemini-image-generation | Gemini 2.5 Flash画像/TTS生成 | 120秒 |

---

## 2. カスタムMCPサーバー実装

### 2.1 Miyabi Integration Server（635行）

**12ツール**:
| ツール名 | パラメータ | 用途 |
|---|---|---|
| `miyabi__init` | projectName, private? | 新プロジェクト作成 |
| `miyabi__install` | dryRun? | 既存プロジェクトに追加 |
| `miyabi__status` | watch? | リアルタイム状態表示 |
| `miyabi__agent_run` | issueNumber/issueNumbers[], concurrency | エージェント実行 |
| `miyabi__auto` | maxIssues, interval | Water Spider完全自動化 |
| `miyabi__todos` | path, autoCreate? | TODO検出→Issue作成 |
| `miyabi__config` | action, key?, value? | 設定管理 |
| `miyabi__docs` | type, format, output | ドキュメント自動生成 |
| `miyabi__deploy` | environment, action | デプロイ実行 |
| `miyabi__test` | type, coverage?, watch? | テスト実行 |

### 2.2 GitHub Enhanced Server（300+行）

**5ツール**:
- `create_issue_with_labels` - Issue作成+自動ラベリング
- `get_agent_tasks` - エージェント実行可能Issue取得
- `update_issue_progress` - 進捗更新
- `create_pr_from_agent` - エージェント生成PR作成
- `get_pr_review_status` - レビュー状態確認

### 2.3 Project Context Server（300+行）

**5ツール**:
- `get_project_structure` - ディレクトリツリー
- `get_dependencies` - package.json依存関係
- `get_agent_config` - エージェント設定
- `analyze_codebase` - LOC、ファイル数、複雑度
- `get_recent_changes` - 直近gitコミット

### 2.4 IDE Integration Server（300+行）

**3ツール**:
- `get_diagnostics` - TypeScript/ESLint診断
- `execute_code` - Jupyterカーネル実行
- `format_code` - Prettier/ESLintフォーマット

### 2.5 Image Generation Server（400+行）

**5ツール**:
- `gemini__generate_image` - 単一画像生成
- `gemini__generate_images_batch` - バッチ画像生成
- `gemini__generate_speech` - TTS生成
- `gemini__generate_speeches_batch` - バッチTTS
- `gemini__check_api_key` - APIキー検証

### 2.6 Discord Integration Server（400+行）

**7ツール**:
- `discord_send_message` - メッセージ送信（リッチEmbed対応）
- `discord_announce_release` - リリース告知
- `discord_notify_github_event` - GitHubイベント通知
- `discord_get_stats` - サーバー統計
- `discord_create_event` - イベント作成
- `discord_get_recent_messages` - 最近のメッセージ取得
- `discord_add_reaction` - リアクション追加

---

## 3. バンドルMCPサーバー（172ツール）

**パッケージ**: `miyabi-mcp-bundle` v3.8.0
**ファイル**: `packages/mcp-bundle/src/index.ts`（3629行）

### 21カテゴリ

| # | カテゴリ | ツール数 | 主要機能 |
|---|---|---|---|
| 1 | Git Inspector | 19 | status, branch, log, blame, diff, tags |
| 2 | Tmux Monitor | 10 | session/window/pane管理、capture |
| 3 | Log Aggregator | 7 | sources, search, errors, tail, stats |
| 4 | Resource Monitor | 10 | CPU, memory, disk, load, processes |
| 5 | Network Inspector | 15 | interfaces, ports, DNS, ping, SSL |
| 6 | Process Inspector | 14 | list, search, tree, fd, kill |
| 7 | File Watcher | 10 | stats, changes, search, compare |
| 8 | Claude Code Monitor | 8 | config, MCP status, session, logs |
| 9 | GitHub Integration | 21 | issues, PRs, workflows, releases |
| 10 | Linux systemd | 3 | service status, start/stop, logs |
| 11 | Windows Event Log | 2 | query, filter |
| 12 | Docker | 10 | containers, images, build, run |
| 13 | Docker Compose | 4 | services, up/down, logs |
| 14 | Kubernetes | 6 | pods, services, deployments |
| 15 | Spec-Kit | 9 | spec作成、検証、生成 |
| 16 | MCP Tool Discovery | 3 | 動的ツール検索 |
| 17 | Database | 6 | SQLite/PostgreSQL/MySQL |
| 18 | Time Tools | 4 | タイムゾーン変換 |
| 19 | Calculator | 3 | 数学、単位変換、統計 |
| 20 | Sequential Thinking | 3 | 構造化推論 |
| 21 | Generator | 4 | UUID、ランダム、ハッシュ |

### セキュリティ機能

- **コマンドインジェクション防止**: 特殊文字サニタイズ
- **パストラバーサル保護**: 解決パス検証
- **シンボリックリンク攻撃防止**: 実パス解決
- **DOS防止**: 入力長制限（query:1000, path:4096, hostname:253）
- **PID検証**: 整数範囲チェック（0 < pid < 4194304）

### キャッシュシステム

```typescript
class SimpleCache {
  get<T>(key: string): T | null  // TTL対応
  set<T>(key: string, data: T, ttlMs: number = 5000): void
  clear(): void
}
```

---

## 4. プラグインシステム

### plugin.json

```json
{
  "name": "miyabi-operations",
  "version": "1.0.0",
  "description": "Autonomous development operations with GitHub as OS"
}
```

### 10コマンド

| コマンド | カテゴリ | 説明 |
|---|---|---|
| `miyabi-init` | setup | 新プロジェクト作成 |
| `miyabi-status` | monitoring | リアルタイム状態表示 |
| `miyabi-auto` | automation | Water Spider完全自動化 |
| `miyabi-amembo` | monitoring | 軽量観察モード |
| `miyabi-watch` | monitoring | Webhook監視 |
| `miyabi-todos` | automation | TODO検出→Issue作成 |
| `miyabi-agent` | execution | 個別エージェント実行 |
| `miyabi-docs` | documentation | ドキュメント自動生成 |
| `miyabi-deploy` | deployment | staging/production デプロイ |
| `miyabi-test` | testing | テスト実行（unit/integration/e2e） |

### miyabi-auto 優先度アルゴリズム

1. 緊急度-高/即時ラベル → 高緊急
2. security/vulnerability → セキュリティ
3. status:blocked → ブロック
4. 規模-小 → クイックウィン
5. FIFO by creation date → 公平ローテーション

---

## 5. フックシステム

| フック | タイプ | 用途 |
|---|---|---|
| `auto-format.sh` | Shell | ESLint/Prettier pre-commit |
| `validate-typescript.sh` | Shell | TypeScript型チェック |
| `log-commands.sh` | Shell | LDD（Log-Driven Development）ログ |
| `agent-event.sh` | Shell | エージェントイベント発信 |
| `session-continue.sh` | Shell | セッション永続化 |
| `webhook-fallback.js` | Node.js | Webhookフォールバック |

### agent-event.sh イベントタイプ

```bash
./agent-event.sh started coordinator 47
./agent-event.sh progress codegen 58 50 "Generating code..."
./agent-event.sh completed review 47 '{"success":true,"score":85}'
./agent-event.sh error codegen 58 "Build failed"
```

---

## 6. 監視システム

### WebSocket プロトコル

**Server → Client**:
```json
{ "type": "dashboard", "data": { AgentDashboard }, "timestamp": "..." }
{ "type": "alert", "data": { DashboardAlert }, "timestamp": "..." }
```

**Client → Server**:
```json
{ "type": "request_dashboard" }
{ "type": "acknowledge_alert", "alertId": "..." }
```

### ダッシュボード構造

```typescript
interface AgentDashboard {
  realTimeMetrics: {
    activeAgents: ActiveAgentInfo[];
    queuedTasks: number;
    avgExecutionTime: number;
    currentThroughput: number;  // tasks/minute
  };
  historicalData: {
    dailyExecutions: Record<string, number>;
    successRate: Record<AgentType, number>;
    completionTimeDistribution: { fast, medium, slow };
  };
  alerts: DashboardAlert[];
}
```

### アラート閾値

| アラート | 閾値 |
|---|---|
| 高エラー率 | 10% |
| 長時間タスク | 30分 |
| キューオーバーフロー | 50タスク |

### 設定

```typescript
interface DashboardConfig {
  updateInterval: 1000;      // 1秒
  websocketPort: 3001;
  maxErrorLogs: 100;
  retentionDays: 7;
}
```
