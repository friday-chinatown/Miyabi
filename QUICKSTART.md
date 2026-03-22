# Miyabi クイックスタートガイド

## 前提条件

| 必要なもの | 確認コマンド | 状態 |
|---|---|---|
| Node.js 18+ | `node --version` | インストール済み (v22.14.0) |
| Git | `git --version` | インストール済み |
| GitHub CLI (`gh`) | `gh --version` | インストール済み・認証済み |
| Claude Code CLI | `claude --version` | インストール済み (Max契約) |
| Codex CLI | `codex --version` | インストール済み (v0.116.0) |

---

## セッション開始手順（毎回やること）

### Step 1: ターミナルを開いてプロジェクトに移動

```bash
cd D:/updatedMiyabi/Miyabi
```

### Step 2: GitHub トークン設定

```bash
export GITHUB_TOKEN=$(gh auth token)
```

### Step 3: 動作確認（初回 or 不安なとき）

```bash
# ヘルスチェック
node packages/cli/dist/index.js health

# ステータス確認
node packages/cli/dist/index.js status --json
```

これで `"success": true` が出れば準備完了。

---

## 使い方

### パターン1: Issueを作ってエージェントに自動処理させる

```bash
# 1. Issueを作る
gh issue create --repo friday-chinatown/Miyabi \
  --title "やりたいことのタイトル" \
  --body "詳細な要件を書く"

# 2. CoordinatorAgent でタスク分解
node packages/cli/dist/index.js agent run coordinator --issue=番号 --json

# 3. IssueAgent で分析・ラベリング
node packages/cli/dist/index.js agent run issue --issue=番号 --json

# 4. CodeGenAgent でコード生成
node packages/cli/dist/index.js agent run codegen --issue=番号 --json
```

### パターン2: Claude Codeに自然言語で指示する

Claude Code（このチャット）に「Issue #3 をMiyabiで処理して」と言えば、上のコマンドを代わりに実行します。

### パターン3: プロバイダーテスト（Claude CLI + Codex CLIの確認）

```bash
npx tsx scripts/test-providers.ts
```

---

## よく使うコマンド一覧

```bash
# === エイリアス（長いので） ===
CLI="node packages/cli/dist/index.js"

# === 基本 ===
$CLI status --json          # プロジェクト状態
$CLI doctor                 # システム診断
$CLI health                 # ヘルスチェック
$CLI config --json          # 設定確認

# === エージェント実行 ===
$CLI agent run coordinator --issue=N --json   # タスク分解
$CLI agent run issue --issue=N --json         # Issue分析
$CLI agent run codegen --issue=N --json       # コード生成

# === ツール ===
$CLI todos --dry-run --json    # TODO検出
$CLI gni status                # GitNexusインデックス状態
```

---

## SDK変更後のリビルド手順

CodexClient.ts 等を変更した場合：

```bash
# 1. SDKビルド
cd D:/updatedMiyabi/Miyabi/packages/miyabi-agent-sdk
npx tsc

# 2. node_modulesに同期（パッケージ名不一致のため手動）
cp -r dist/* ../../node_modules/miyabi-agent-sdk/dist/

# 3. CLIリビルド
cd ../cli
npm run build

# 4. テスト
cd ../..
node packages/cli/dist/index.js health
```

---

## ファイル構成（把握しておくべきもの）

```
D:/updatedMiyabi/
├── Miyabi/                          ← プロジェクト本体
│   ├── packages/
│   │   ├── cli/                     ← Miyabi CLI（npx miyabi）
│   │   ├── miyabi-agent-sdk/        ← エージェントSDK
│   │   │   └── src/clients/
│   │   │       ├── ClaudeCodeClient.ts  ← Claude CLI 呼出し
│   │   │       ├── CodexClient.ts       ← Codex CLI 呼出し（NEW）
│   │   │       ├── LLMProvider.ts       ← 共通インターフェース（NEW）
│   │   │       └── TaskRouter.ts        ← タスク振分け（NEW）
│   │   ├── coding-agents/           ← 7体のコーディングエージェント
│   │   ├── core/                    ← コアライブラリ
│   │   └── miyabi-web/              ← Web UI
│   ├── scripts/
│   │   └── test-providers.ts        ← プロバイダーテスト（NEW）
│   ├── .claude/
│   │   ├── settings.json            ← フック設定（NEW）
│   │   └── hooks/                   ← LDDログ等のフック
│   ├── .ai/
│   │   └── logs/                    ← LDDログ出力先
│   └── gantt-app.html               ← ガントチャートアプリ
│
└── research/                        ← 全分析・テスト結果
    ├── 01-08: 基礎分析MD（8ファイル）
    ├── 09-19: 概念整理MD（11ファイル）
    ├── 20-21: API不要化・移行計画
    ├── 22-25: 修正ログ・テスト結果
    ├── miyabi_project_guide.html     ← プロジェクト概要HTML
    └── work_timeline.html            ← 作業フローHTML
```

---

## トラブルシューティング

### `GITHUB_TOKEN not found`
```bash
export GITHUB_TOKEN=$(gh auth token)
```

### `codex` が `claude` として動く
偽のラッパーが残っている。削除して再インストール：
```bash
rm /c/Users/yuuio/AppData/Roaming/npm/codex
npm install -g @openai/codex --force
```

### CodeGenAgent がタイムアウトする
大きなタスクは120秒で切れる。タイムアウト値は `ClaudeCodeClient.ts` の `executePrompt` で変更可能。

### ビルドエラーが出る
```bash
cd D:/updatedMiyabi/Miyabi/packages/cli
npm run build 2>&1
```
TypeScriptエラーが出たら該当ファイルを修正。

### `npx miyabi` が動かない
`miyabi-agent-sdk` の別バイナリと競合。直接実行を使う：
```bash
node packages/cli/dist/index.js <command>
```

---

## アーキテクチャ概要

```
あなた（指示を出す）
    ↓
Claude Code（このチャット = 司令塔）
    ↓
Miyabi CLI（コマンド実行）
    ├── CoordinatorAgent → タスク分解（Claude CLI使用）
    ├── IssueAgent → 分析・ラベリング（Claude CLI使用）
    ├── CodeGenAgent → コード生成（Codex CLI使用）
    ├── ReviewAgent → コードレビュー（Codex CLI使用）
    ├── PRAgent → PR作成（Claude CLI使用）
    └── DeploymentAgent → デプロイ（Claude CLI使用）
```

**ポイント**: APIキー不要。Claude Code Max + Codex のサブスクリプションのみで動作。
