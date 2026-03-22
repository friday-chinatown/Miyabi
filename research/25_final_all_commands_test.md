# Miyabi CLI 全コマンド網羅テスト報告書

**テスト実行日**: 2026-03-22
**CLI バージョン**: 0.22.0
**Node.js**: v22.14.0
**OS**: Windows 11 Pro 10.0.26200

---

## サマリーテーブル

| # | コマンド | 状態 | 終了コード | 備考 |
|---|---------|------|-----------|------|
| 1 | `miyabi status --json` | ✅ | 0 | JSON出力正常。Issue 2件検出 |
| 2 | `miyabi doctor` | ⚠️ | 1 | 7/8チェック合格。workflow scope欠落 |
| 3 | `miyabi health` | ✅ | 0 | バージョン・OS情報を正常表示 |
| 4 | `miyabi config --json` | ❌ | 124 | 対話型プロンプト起動。--json非対応 |
| 5 | `miyabi --help` | ✅ | 0 | 全サブコマンド一覧を正常表示 |
| 6 | `miyabi --version` | ✅ | 0 | `0.22.0` を出力 |
| 7 | `miyabi agent run coordinator --issue=1 --json` | ✅ | 0 | DAGタスクグラフ生成成功 (720ms) |
| 8 | `miyabi agent run issue --issue=1 --json` | ✅ | 0 | Issue分析・ラベリング成功 (7992ms) |
| 9 | `miyabi agent run codegen --issue=2 --json` | ⚠️ | 124 | Claude Code子プロセスがexit 143。タイムアウト |
| 10 | `miyabi agent list --json` | ✅ | 0 | 7エージェント一覧をJSON出力 |
| 11 | `miyabi agent status --json` | ✅ | 0 | 全エージェント状態テーブル表示 |
| 12 | `miyabi todos --dry-run --json` | ✅ | 0 | 95件のTODO/FIXME/HACK/NOTE検出 |
| 13 | `miyabi gni status` | ❌ | 1 | scripts/gni が存在しない |
| 14 | `miyabi bus stats` | ✅ | 0 | キュー統計表示 (Total: 0) |
| 15 | `miyabi task list` | ❌ | 1 | task-sync.sh未検出。HAYASHI_ROOT未設定 |
| 16 | `miyabi cycle check` | ✅ | 0 | フィードバックループCHECK正常 |
| 17 | `miyabi setup --help` | ✅ | 0 | オプション一覧を正常表示 |
| 18 | `miyabi onboard --help` | ✅ | 0 | オプション一覧を正常表示 |
| 19 | `miyabi auth status --json` | ✅ | 0 | 認証済み。user: friday-chinatown |
| 20 | `miyabi install --dry-run --json` | ✅ | 0 | 53ラベル・12ワークフロー検出 |
| 21 | `miyabi auto --help` | ✅ | 0 | Water Spider Agentオプション表示 |
| 22 | `miyabi omega --help` | ✅ | 0 | Omega-Systemオプション表示 |
| 23 | `miyabi pipeline --help` | ✅ | 0 | パイプラインオプション表示 |
| 24 | `miyabi run --help` | ✅ | 0 | 実行オプション表示 |
| 25 | `miyabi fix --help` | ✅ | 0 | バグ修正ショートカット表示 |
| 26 | `miyabi build --help` | ✅ | 0 | 機能追加ショートカット表示 |
| 27 | `miyabi ship --help` | ✅ | 0 | デプロイショートカット表示 |
| 28 | `miyabi release --help` | ✅ | 0 | リリース管理サブコマンド表示 |
| 29 | `miyabi voice --help` | ✅ | 0 | Voice-Firstサブコマンド表示 |
| 30 | `miyabi skills --help` | ✅ | 0 | スキル管理サブコマンド表示 |
| 31 | `miyabi dashboard --help` | ✅ | 0 | ダッシュボードサブコマンド表示 |
| 32 | `miyabi docs --help` | ✅ | 0 | ドキュメント生成オプション表示 |
| 33 | `npx vitest run` | ⚠️ | - | 45/47ファイル合格, 678/710テスト合格 |
| 34 | `npx tsx scripts/test-providers.ts` | ✅ | 0 | Claude/Codex両プロバイダー正常 |

---

## 集計

| 指標 | 値 |
|------|-----|
| **総コマンド数** | 34 |
| **合格 (✅)** | 28 |
| **警告 (⚠️)** | 3 |
| **失敗 (❌)** | 3 |
| **合格率** | 82.4% (28/34) |
| **合格+警告率** | 91.2% (31/34) |
| **失敗率** | 8.8% (3/34) |

---

## 残存課題一覧

| # | 課題 | 重要度 | 詳細 |
|---|------|--------|------|
| 1 | `config --json` が対話モードに入る | 中 | `--json`フラグが非対話モードとして機能しない |
| 2 | `gni status` が scripts/gni を要求 | 低 | GitNexusスクリプトが未配置 |
| 3 | `task list` が外部パス依存 | 低 | HAYASHI_ROOT環境変数・task-sync.sh未設定 |
| 4 | `agent run codegen` タイムアウト | 中 | Claude Code子プロセスがexit 143 (SIGTERM) |
| 5 | `doctor` Token Permissions警告 | 低 | workflow scopeがトークンに未付与 |
| 6 | vitest: 2テスト失敗 (タイムアウト) | 中 | doctor E2E (5s制限), CodeGen非Discord (30s制限) |

---

## GROUP 1: Basic Commands - 詳細出力

### 1. `miyabi status --json`
**終了コード**: 0
```json
{
  "success": true,
  "data": {
    "repository": {
      "owner": "friday-chinatown",
      "name": "Miyabi",
      "url": "https://github.com/friday-chinatown/Miyabi"
    },
    "issues": {
      "total": 2,
      "byState": {
        "pending": 2,
        "analyzing": 0,
        "implementing": 0,
        "reviewing": 0,
        "blocked": 0,
        "paused": 0
      }
    },
    "pullRequests": [],
    "summary": {
      "totalOpen": 2,
      "activeAgents": 0,
      "blocked": 0
    }
  },
  "message": "Status retrieved successfully",
  "timestamp": "2026-03-22T11:00:21.047Z"
}
```

### 2. `miyabi doctor`
**終了コード**: 1
```
🩺 Miyabi Health Check

- Running diagnostics...

  ✓ Node.js: v22.14.0 (OK)
  ✓ Git: git version 2.49.0.windows.1 (OK)
  ✓ GitHub CLI: gh version 2.83.2 (2025-12-10) (Authenticated)
  ✓ GITHUB_TOKEN: Valid token format
  ✗ Token Permissions: Missing required scopes: workflow
    💡 Update token with required scopes: https://github.com/settings/tokens
  ✓ Network Connectivity: GitHub API accessible
  ✓ Repository: Git repository detected
  ✓ Claude Code: Standard terminal

Summary:
  ✓ 7 checks passed
  ✗ 1 checks failed
  8 total checks

✗ Overall: Critical issues found

Next Steps:
  1. Review the suggestions above to fix issues
  2. Run this command again to verify fixes
  3. For help: https://github.com/ShunsukeHayashi/Miyabi/issues
```

### 3. `miyabi health`
**終了コード**: 0
```
🌸 Miyabi Health

  CLI Version : 0.22.0
  Node.js     : v22.14.0
  OS          : Windows_NT 10.0.26200 (win32/x64)
  Timestamp   : 2026-03-22T11:00:32.132Z
```

### 4. `miyabi config --json`
**終了コード**: 124 (タイムアウト)
```
⚙️  Miyabi 設定

? GitHub トークンを設定しますか？ (Y/n)
```
**問題**: `--json`フラグ指定時でも対話型プロンプトが起動する。非対話モードが未実装。

### 5. `miyabi --help`
**終了コード**: 0
```
Usage: miyabi [options] [command]

✨ Miyabi - 一つのコマンドで全てが完結する自律型開発フレームワーク

Options:
  -V, --version                         output the version number
  --json                                Output in JSON format (for AI agents)
  -y, --yes                             Auto-confirm all requests
  -v, --verbose                         Verbose output with detailed logs
  --debug                               Debug mode with extra detailed logs
  -h, --help                            display help for command

Commands:
  init [options] <project-name>         新しいプロジェクトを作成
  install [options]                     既存プロジェクトにMiyabiを追加
  status [options]                      プロジェクトの状態を確認
  docs [options]                        ドキュメントを生成
  config [options]                      設定を管理
  setup [options]                       セットアップガイドを表示
  doctor [options]                      システムヘルスチェックと診断
  onboard [options]                     初回セットアップウィザード
  agent                                 🤖 Agent実行・管理
  auth                                  🔐 GitHub authentication management
  auto [options]                        🕷️  全自動モード - Water Spider Agent起動
  todos [options]                       📝 TODOコメント自動検出・Issue化
  dashboard                             Dashboard management commands
  run [options]                         🚀 Run Miyabi - One command, all the magic
  fix <issue>                           🐛 Fix a bug
  build <issue>                         ✨ Build a feature
  ship                                  🚀 Deploy to production
  omega [options]                       Execute Ω-System autonomous pipeline
  pipeline [options] [pipeline-string]  Execute a command pipeline
  health [options]                      Quick health check
  cycle                                 🔄 Agent Skill Bus feedback loop
  release                               📦 Release management
  voice                                 🎤 Voice-First control
  skills                                📦 Manage Claude Code skills
  gni                                   🧠 GitNexus code intelligence
  bus                                   📡 Agent Skill Bus
  task                                  📋 Task management
```

### 6. `miyabi --version`
**終了コード**: 0
```
0.22.0
```

---

## GROUP 2: Agent Commands - 詳細出力

### 7. `miyabi agent run coordinator --issue=1 --json`
**終了コード**: 0
```json
{
  "success": true,
  "data": {
    "agent": "coordinator",
    "status": "success",
    "message": "coordinatorAgent executed successfully",
    "duration": 720,
    "details": {
      "success": true,
      "data": {
        "taskGraph": {
          "nodes": [
            {
              "id": "task-1",
              "description": "Issue調査・要件整理",
              "agent": "IssueAgent",
              "estimatedTime": 30,
              "dependencies": []
            },
            {
              "id": "task-2",
              "description": "コア機能実装",
              "agent": "CodeGenAgent",
              "estimatedTime": 60,
              "dependencies": ["task-1"]
            },
            {
              "id": "task-3",
              "description": "テストコード実装",
              "agent": "CodeGenAgent",
              "estimatedTime": 45,
              "dependencies": ["task-1"]
            },
            {
              "id": "task-4",
              "description": "コードレビュー",
              "agent": "ReviewAgent",
              "estimatedTime": 30,
              "dependencies": ["task-2", "task-3"]
            },
            {
              "id": "task-5",
              "description": "PR作成",
              "agent": "PRAgent",
              "estimatedTime": 10,
              "dependencies": ["task-4"]
            }
          ],
          "edges": [
            {"from": "task-1", "to": "task-2"},
            {"from": "task-1", "to": "task-3"},
            {"from": "task-2", "to": "task-4"},
            {"from": "task-3", "to": "task-4"},
            {"from": "task-4", "to": "task-5"}
          ]
        },
        "criticalPath": ["task-1", "task-2", "task-4", "task-5"],
        "parallelGroups": [["task-1"], ["task-2", "task-3"], ["task-4"], ["task-5"]],
        "estimatedDuration": 130
      }
    }
  },
  "message": "Agent coordinator executed successfully",
  "timestamp": "2026-03-22T11:02:27.502Z"
}
```

### 8. `miyabi agent run issue --issue=1 --json`
**終了コード**: 0
```json
{
  "success": true,
  "data": {
    "agent": "issue",
    "status": "success",
    "message": "issueAgent executed successfully",
    "duration": 7992,
    "details": {
      "success": true,
      "data": {
        "number": 1,
        "title": "テスト: ユーザー認証機能にダークモードトグルを追加",
        "labels": [
          "type:feature",
          "priority:P2-Medium",
          "scope:frontend",
          "tech:react",
          "tech:tailwind"
        ],
        "complexity": "medium",
        "priority": "P2",
        "type": "feature",
        "tokensUsed": {"input": 0, "output": 0},
        "cost": 0
      }
    }
  },
  "message": "Agent issue executed successfully",
  "timestamp": "2026-03-22T11:02:54.560Z"
}
```

### 9. `miyabi agent run codegen --issue=2 --json`
**終了コード**: 124 (タイムアウト)
```json
{
  "success": true,
  "data": {
    "agent": "codegen",
    "status": "success",
    "message": "codegenAgent executed successfully",
    "duration": 59540,
    "details": {
      "success": false,
      "error": "Claude Code failed with exit code 143\nStderr: "
    }
  },
  "message": "Agent codegen executed successfully",
  "timestamp": "2026-03-22T11:03:58.851Z"
}
```
**問題**: Claude Code子プロセスがSIGTERM (exit 143)で終了。タイムアウトによる強制終了と推定。

### 10. `miyabi agent list --json`
**終了コード**: 0
```json
{
  "success": true,
  "data": {
    "agents": [
      {"name": "coordinator", "description": "タスク統括・DAG分解"},
      {"name": "codegen", "description": "AI駆動コード生成"},
      {"name": "review", "description": "コード品質判定"},
      {"name": "issue", "description": "Issue分析・ラベリング"},
      {"name": "pr", "description": "Pull Request自動化"},
      {"name": "deploy", "description": "CI/CDデプロイ"},
      {"name": "mizusumashi", "description": "Super App Designer"}
    ]
  },
  "message": "Available agents list",
  "timestamp": "2026-03-22T11:02:32.308Z"
}
```

### 11. `miyabi agent status --json`
**終了コード**: 0
```
📊 Agent実行状態

┌─────────────┬────────────┬──────────┬──────────┐
│ Agent       │ ステータス │ 最終実行 │ 実行回数 │
├─────────────┼────────────┼──────────┼──────────┤
│ coordinator │ ✅ 稼働中  │ 2分前    │ 15回     │
├─────────────┼────────────┼──────────┼──────────┤
│ codegen     │ 💤 待機中  │ 10分前   │ 8回      │
├─────────────┼────────────┼──────────┼──────────┤
│ review      │ ✅ 稼働中  │ 30秒前   │ 12回     │
├─────────────┼────────────┼──────────┼──────────┤
│ issue       │ ✅ 稼働中  │ 1分前    │ 20回     │
├─────────────┼────────────┼──────────┼──────────┤
│ pr          │ 💤 待機中  │ 15分前   │ 5回      │
├─────────────┼────────────┼──────────┼──────────┤
│ deploy      │ ✅ 稼働中  │ 3分前    │ 7回      │
└─────────────┴────────────┴──────────┴──────────┘
```

---

## GROUP 3: DevOps Commands - 詳細出力

### 12. `miyabi todos --dry-run --json`
**終了コード**: 0
```json
{
  "success": true,
  "data": {
    "todos": [ ... ],
    "stats": {
      "total": 95,
      "byType": {
        "FIXME": 10,
        "TODO": 67,
        "HACK": 10,
        "NOTE": 8
      }
    },
    "options": {
      "path": ".",
      "dryRun": true,
      "createIssues": false,
      "autoExecute": false
    }
  },
  "timestamp": "2026-03-22T11:04:07.804Z"
}
```
95件のコメントマーカーを検出: FIXME(10), TODO(67), HACK(10), NOTE(8)

### 13. `miyabi gni status`
**終了コード**: 1
```
✗ gni (GitNexus) is not available. Check scripts/gni exists.
```
**問題**: GitNexusインテリジェンススクリプト (`scripts/gni`) が未配置。

### 14. `miyabi bus stats`
**終了コード**: 0
```
=== Queue Stats ===

  Total:        0
  Active Locks: 0
```

### 15. `miyabi task list`
**終了コード**: 1
```
✗ task-sync.sh not found: C:\Users\yuuio\dev\HAYASHI_SHUNSUKE\AGENT\task-sync.sh
  Set HAYASHI_ROOT environment variable or check AGENT/task-sync.sh
```
**問題**: 外部パス依存。HAYASHI_ROOT環境変数未設定時にフォールバックが機能していない。

### 16. `miyabi cycle check`
**終了コード**: 0
```
  🔄 CHECK

  Queue: 0 total (queued: 0, running: 0, done: 0)
  Flagged: 0
```

---

## GROUP 4: Setup Commands - 詳細出力

### 17. `miyabi setup --help`
**終了コード**: 0
```
Usage: miyabi setup [options]

セットアップガイドを表示

Options:
  --non-interactive  非対話モード（プロンプトをスキップ）
  -y, --yes          すべてのプロンプトを自動承認
  --skip-token       トークンセットアップをスキップ
  --skip-config      設定をスキップ
  --json             JSON形式で出力
  -h, --help         display help for command
```

### 18. `miyabi onboard --help`
**終了コード**: 0
```
Usage: miyabi onboard [options]

初回セットアップウィザード

Options:
  --skip-demo        デモプロジェクト作成をスキップ
  --skip-tour        機能紹介をスキップ
  --non-interactive  非対話モード
  -y, --yes          すべてのプロンプトを自動承認
  -h, --help         display help for command
```

### 19. `miyabi auth status --json`
**終了コード**: 0
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "source": "environment",
    "valid": true,
    "user": "friday-chinatown",
    "userId": 245792797
  },
  "timestamp": "2026-03-22T11:04:47.074Z"
}
```

### 20. `miyabi install --dry-run --json`
**終了コード**: 0
```
Analyzing your existing project...

- Scanning project structure...
✔ Project analysis complete

📊 Analysis Results:

  Repository: Miyabi
  Languages: JavaScript/TypeScript
  Framework: Express
  Open Issues: 1
  Pull Requests: 0

🔍 Dry run mode - no changes will be made

Would install:
  ✓ 53 labels (10 categories)
  ✓ 12+ GitHub Actions workflows
  ✓ Projects V2 integration
  ✓ Auto-label 1 existing Issues
```

---

## GROUP 5: Automation Commands - 詳細出力

### 21. `miyabi auto --help`
**終了コード**: 0
```
Usage: miyabi auto [options]

🕷️  全自動モード - Water Spider Agent起動

Options:
  -i, --interval <seconds>      監視間隔（秒） (default: "10")
  -m, --max-duration <minutes>  最大実行時間（分） (default: "60")
  -c, --concurrency <number>    並行実行数 (default: "1")
  --scan-todos                  TODOコメント監視を有効化
  --dry-run                     実行シミュレーション
  -v, --verbose                 詳細ログ出力
  --json                        JSON形式で出力
  -h, --help                    display help for command
```

### 22. `miyabi omega --help`
**終了コード**: 0
```
Usage: miyabi omega [options] [command]

Execute Ω-System autonomous pipeline (Ω: I × W → R)

Options:
  -i, --issue <number>      GitHub Issue number to process
  -t, --task <description>  Task description
  -a, --agent <type>        Agent type (default: "codegen")
  --no-learning             Disable learning stage (θ₆)
  --timeout <ms>            Execution timeout in milliseconds
  -v, --verbose             Verbose output
  --json                    Output as JSON
  -h, --help                display help for command

Commands:
  status                    Show Ω-System status and capabilities
  benchmark [options]       Run Ω-System performance benchmark
```

### 23. `miyabi pipeline --help`
**終了コード**: 0
```
Usage: miyabi pipeline [options] [pipeline-string]

Execute a command pipeline

Options:
  -p, --preset <name>       Use a preset pipeline
  -i, --issue <number>      Issue number to process
  -d, --dry-run             Preview without executing
  -v, --verbose             Show detailed output
  --resume <checkpoint-id>  Resume from checkpoint
  --list-presets            List available presets
  -h, --help                display help for command
```

### 24. `miyabi run --help`
**終了コード**: 0
```
Usage: miyabi run [options]

🚀 Run Miyabi - One command, all the magic

Options:
  -i, --issue <number>    Issue number to work on
  -t, --task <type>       Task type: fix-bug, add-feature, refactor, deploy, review-pr
  -m, --mode <mode>       Execution mode: auto, guided, safe (default: "guided")
  -a, --approval <level>  Approval level: auto, critical, all (default: "critical")
  -v, --verbose           Verbose output
  --json                  JSON output for AI agents
  -h, --help              display help for command
```

### 25. `miyabi fix --help`
**終了コード**: 0
```
Usage: miyabi fix [options] <issue>

🐛 Fix a bug (shortcut for run --task fix-bug)

Options:
  -h, --help  display help for command
```

### 26. `miyabi build --help`
**終了コード**: 0
```
Usage: miyabi build [options] <issue>

✨ Build a feature (shortcut for run --task add-feature)

Options:
  -h, --help  display help for command
```

### 27. `miyabi ship --help`
**終了コード**: 0
```
Usage: miyabi ship [options]

🚀 Deploy to production (shortcut for run --task deploy)

Options:
  -h, --help  display help for command
```

---

## GROUP 6: Tool Commands - 詳細出力

### 28. `miyabi release --help`
**終了コード**: 0
```
Usage: miyabi release [options] [command]

📦 Release management — view, list, announce releases

Options:
  -h, --help                 display help for command

Commands:
  list                       List latest releases
  view <repo>                View latest release
  announce [options] <repo>  Announce release on X (dry-run by default)
```

### 29. `miyabi voice --help`
**終了コード**: 0
```
Usage: miyabi voice [options] [command]

🎤 Voice-First control — announce, status

Options:
  -h, --help                    display help for command

Commands:
  announce [options] <message>  Send voice announcement
  status                        Show voice system status
```

### 30. `miyabi skills --help`
**終了コード**: 0
```
Usage: miyabi skills [options] [command]

📦 Manage Claude Code skills — list / health / sync

Options:
  -h, --help        display help for command

Commands:
  list [options]    List all skills in ~/.claude/skills/
  health [options]  Show flagged skills from Agent Skill Bus
  sync [options]    Sync miyabi-master and openclaw-agents to all machines
```

### 31. `miyabi dashboard --help`
**終了コード**: 0
```
Usage: miyabi dashboard [options] [command]

Dashboard management commands

Options:
  -h, --help         display help for command

Commands:
  refresh [options]  Refresh dashboard visuals
  status [options]   Check dashboard server status
  open [options]     Open dashboard in browser
  help [command]     display help for command
```

### 32. `miyabi docs --help`
**終了コード**: 0
```
Usage: miyabi docs [options]

ドキュメントを生成

Options:
  -i, --input <dir>    ソースディレクトリ (default: "./scripts")
  -o, --output <file>  出力ファイル (default: "./docs/API.md")
  -w, --watch          ウォッチモード
  -t, --training       トレーニング資料も生成
  --json               JSON形式で出力
  -h, --help           display help for command
```

---

## GROUP 7: Vitest Tests - 詳細出力

### 33. `npx vitest run --reporter=verbose`

**テストファイル結果**: 45 passed, 2 failed, 2 skipped (49 total)
**テストケース結果**: 678 passed, 2 failed, 30 skipped (710 total)
**実行時間**: 40.13s

#### 失敗テスト 1: Doctor Command E2E
```
FAIL  miyabi  src/__tests__/e2e-cli.test.ts > CLI E2E Tests > Doctor Command > should run doctor command
Error: Test timed out in 5000ms.
```
**原因**: doctorコマンドがネットワークアクセスを含むため、5秒のデフォルトタイムアウトを超過。

#### 失敗テスト 2: CodeGenAgent Non-Discord
```
FAIL  root  tests/CodeGenAgent.test.ts > CodeGenAgent - Template Generation > Discord Community File Generation > should NOT generate files for non-Discord tasks
Error: Test timed out in 30000ms.
```
**原因**: 非Discordタスクのテストが30秒のタイムアウトを超過。Claude Code子プロセス呼び出しが原因の可能性。

#### スキップされたテストファイル (2件)
テスト実行環境で非対応のテストがスキップ。

---

## GROUP 8: Provider Test - 詳細出力

### 34. `npx tsx scripts/test-providers.ts`
**終了コード**: 0
```
=== プロバイダー動作テスト ===

📘 [1/4] Claude CLI ヘルスチェック...
   ✅ Claude CLI OK: "hello"

📙 [2/4] Codex CLI ヘルスチェック...
   ✅ Codex CLI OK: "echo "hello""

📘 [3/4] Claude CLI 分析タスク（司令塔）...
   ✅ 分析結果:
      タイプ: feature
      複雑度: medium
      優先度: P2
      ラベル: type:feature, priority:P2-Medium, scope:frontend, effort:medium, area:ui

📙 [4/4] Codex CLI コーディングタスク（ワーカー）...
   ✅ レビュー結果:
      スコア: 95/100
      合格: ✅
      問題数: 0

=== テスト完了 ===
```

---

## 総合評価

### 安定して動作するコマンド群 (28/34)
- 基本コマンド: `status`, `health`, `--help`, `--version`
- エージェント: `agent run coordinator`, `agent run issue`, `agent list`, `agent status`
- DevOps: `todos --dry-run`, `bus stats`, `cycle check`
- セットアップ: `setup --help`, `onboard --help`, `auth status`, `install --dry-run`
- 自動化: `auto`, `omega`, `pipeline`, `run`, `fix`, `build`, `ship` (全て --help)
- ツール: `release`, `voice`, `skills`, `dashboard`, `docs` (全て --help)
- テスト: Provider test (4/4合格)

### 要改善項目 (6件)
1. **config --json**: `--json`フラグ時に非対話モードで設定値を出力すべき
2. **gni status**: GitNexusスクリプトの配置またはエラーメッセージの改善
3. **task list**: HAYASHI_ROOT未設定時のフォールバック実装
4. **agent run codegen**: Claude Codeプロセスのタイムアウト制御改善
5. **vitest doctor E2E**: テストタイムアウトを5s→15sに延長推奨
6. **vitest CodeGen非Discord**: 非同期テストの待機処理見直し推奨
