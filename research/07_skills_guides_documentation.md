# Miyabi スキル・ガイド・ドキュメント 詳細分析

## 概要

- **23 実行可能スキル**（7エージェント + 3プラットフォーム + 5開発 + 2外部 + 6 GitNexus）
- **13 ナレッジガイド**
- **10 CLIスラッシュコマンド**
- **6 ドキュメントファイル**

---

## 1. コーディングエージェントスキル（7スキル）

### 1.1 Coordinator Agent
- **トリガー**: "decompose this issue", "run full pipeline", "coordinate agents"
- **ワークフロー**: Issue分析 → 複雑度評価 → DAG構築 → エージェント割当 → 並列実行追跡
- **品質ゲート**: ReviewAgent 80点以上必須（自動リトライ最大3回）
- **CLI**: `miyabi agent run coordinator --issue=123 --json`

### 1.2 Issue Agent
- **トリガー**: "analyze this issue", "label issues", "triage new issues"
- **53ラベル分類**: 10カテゴリ（priority, type, status, scope, size, agent, quality, risk, automation, release）
- **複雑度評価**: ファイル数、クロスモジュール影響、テストカバレッジ、外部依存、セキュリティ影響の重み付きスコア
- **セキュリティ**: eval, exec, sudo, 外部パス、シークレット含有を検証

### 1.3 Code Reviewer
- **トリガー**: "review this code", "check this PR", "find bugs"
- **100点スコアリング**: Correctness(30%) + Security(25%) + Performance(20%) + Maintainability(15%) + Testing(10%)
- **合格閾値**: 80点以上

### 1.4 PR Agent
- **トリガー**: "create PR", "merge this PR"
- **ブランチ命名**: `{type}/{issue_number}-{description}`
- **Conventional Commits**: feat, fix, docs, style, refactor, perf, test, chore, ci
- **マージポリシー**: PR作成は自動だがマージはGuardian承認必須

### 1.5 Deploy Agent
- **トリガー**: "deploy to production", "rollback deployment"
- **デプロイチェック**: テスト→型チェック→lint→レビュー≥80→セキュリティ→env検証
- **環境**: Staging（自動デプロイ）、Production（Guardian承認必須）
- **ロールバック**: 1時間以内可能

### 1.6 Test Generator
- **トリガー**: "write tests", "improve coverage", "test first"
- **テストスタック**: Vitest（unit/integration）、Playwright（E2E）、Testing Library（components）
- **AAAパターン**: Arrange → Act → Assert
- **カバレッジ要件**: 80%（statements, branches, functions, lines）

### 1.7 Autonomous Coding Agent
- **トリガー**: "autonomous coding", "coding agent"
- **Claude Code CLI**: `claude -p "prompt"`, `claude --resume`, `claude --output-format json`
- **セキュリティ**: 入力サニタイズ、ワーキングディレクトリ検証

---

## 2. プラットフォームスキル（3スキル）

### 2.1 Miyabi Pipeline
- **トリガー**: "run pipeline", "full cycle", "preset pipeline"
- **演算子**: `|` (pipe), `&&` (AND), `||` (OR), `&` (parallel)
- **プリセット**:
  - `full-cycle`: `/agent-run | /review | /test | /security-scan | /deploy | /verify`
  - `quick-deploy`: `/verify && /deploy`
  - `quality-gate`: `/review && /test && /security-scan`
- **チェックポイント**: 失敗ステップからの再開可能

### 2.2 Miyabi Quality Gate
- **100点スコアリング**: Correctness(25%) + Security(20%) + Performance(15%) + Readability(15%) + Maintainability(15%) + Test Coverage(10%)
- **閾値**: 90-100 Excellent、80-89 Good、60-79 リトライ、40-59 エスカレーション、0-39 ブロック
- **Auto-Retry Loop**: CodeGen → Review → Feedback → 繰返し（最大3回）

### 2.3 Miyabi GitHub OS
- **GitHub OS アーキテクチャ**:
  - Issues = タスクキュー
  - Labels = ステートマシン（53ラベル）
  - Projects V2 = データ層
  - Actions = 実行エンジン（24ワークフロー）
  - Webhooks = イベントバス
  - Pages = ダッシュボード
  - Discussions = メッセージキュー
- **Issue-Driven Development (IDD)**: Issue → Label → Decompose → Implement → Review → PR → Deploy → Close

---

## 3. 開発スキル（5スキル）

### 3.1 Commit Helper
- **Conventional Commits**: `<type>(<scope>): <subject>`
- **ルール**: 命令形、50文字以内、末尾ピリオドなし

### 3.2 Refactor Helper
- **原則**: 小さな変更のみ（1コミット1変更）、テストは前後で合格、振る舞い不変
- **コードスメル検出**: 長い関数、重複コード、複雑な条件、God class

### 3.3 Doc Generator
- **ドキュメントタイプ**: JSDoc/TSDoc、インターフェース、README、CHANGELOG
- **CHANGELOGフォーマット**: Keep a Changelog（Added, Changed, Fixed, Deprecated, Removed, Security）

### 3.4 Skill Creator
- **構造**: `.claude/skills/[skill-name]/SKILL.md`
- **命名**: kebab-case、小文字、説明的
- **禁止名**: claude, anthropic, mcp

### 3.5 Agent Skill Use
- **3層アーキテクチャ**: MCP（高コンテキスト） → Skills（低コンテキスト） → Subagents（独立ウィンドウ）
- **Progressive Disclosure**:
  - Layer 1: インデックスのみ（~500トークン、常時ロード）
  - Layer 2: スキルメタデータ（~1,000トークン、オンデマンド）
  - Layer 3: フルコンテンツ（~5,000トークン、アクティベーション時）
- **コンテキスト最適化目標**: トークン削減>30%、スキルロード<500ms

---

## 4. 外部統合スキル（2スキル）

### 4.1 CCG - AI Course Content Generator
- **機能**: Gemini APIによるオンラインコース完全生成
- **パイプライン**: コース構造 → レッスンスクリプト → TTS → スライド → ビデオレンダリング
- **Geminiモデル**: gemini-3-flash-preview（Thinking付き）、gemini-2.5-flash（フォールバック）

### 4.2 Teachable Course Creator
- **機能**: CCGコンテンツをTeachableに自動アップロード
- **ブラウザ自動化**: Chrome MCP使用

---

## 5. GitNexus スキル（6スキル）

### 5.1 GitNexus CLI
- `npx gitnexus analyze` - インデックス構築
- `npx gitnexus status` - インデックス鮮度チェック
- `npx gitnexus clean` - インデックス削除
- `npx gitnexus wiki` - グラフからドキュメント生成
- PostToolUseフック: git commit/merge後に自動analyze

### 5.2 GitNexus Guide
- **ツール**: query, context, impact, detect_changes, rename, cypher, list_repos
- **リソース**: `gitnexus://repo/{name}/context`, clusters, processes, schema
- **グラフスキーマ**: Nodes（File, Function, Class, Interface, Method, Community, Process）、Edges（CALLS, IMPORTS, EXTENDS, IMPLEMENTS, DEFINES）

### 5.3 GitNexus Exploring
- **用途**: "How does authentication work?", "What's the project structure?"
- **ワークフロー**: repos → context → query → context(deep) → process trace

### 5.4 GitNexus Impact Analysis
- **用途**: "Is it safe to change X?", "What will break?"
- **距離**: d=1（確実に壊れる）、d=2（影響あり）、d=3（テスト要）
- **リスク**: LOW(<5)、MEDIUM(5-15)、HIGH(>15)、CRITICAL（auth/payments）

### 5.5 GitNexus Debugging
- **用途**: "Why is X failing?", "Where does this error come from?"
- **パターン**: エラーメッセージ検索 → context → プロセストレース → Cypher

### 5.6 GitNexus Refactoring
- **リネーム**: dry_run:true → レビュー → dry_run:false → detect_changes
- **ルール**: gitnexus_renameを使用（find-and-replace禁止）

---

## 6. ナレッジガイド（13ガイド）

| ガイド | 内容 |
|---|---|
| typescript-development.md | TypeScriptベストプラクティス |
| mcp-server-development.md | MCPサーバー構築 |
| tdd-workflow.md | テスト駆動開発 |
| debugging.md | デバッグ戦略 |
| issue-driven-development.md | IDD |
| git-workflow.md | Gitワークフロー |
| code-review.md | コードレビュー基準 |
| documentation.md | ドキュメンテーション |
| security-audit.md | セキュリティ監査 |
| performance.md | パフォーマンス最適化 |
| ci-cd.md | CI/CDパイプライン |
| product-planning.md | プロダクト計画 |
| market-research.md | 市場調査 |

---

## 7. CLIスラッシュコマンド（10コマンド）

| コマンド | 用途 |
|---|---|
| `/agent-run` | エージェント実行 |
| `/create-issue` | GitHub Issue作成 |
| `/deploy` | 本番デプロイ |
| `/generate-docs` | ドキュメント生成 |
| `/miyabi-auto` | 自律モード開始 |
| `/miyabi-todos` | TODO検出→Issue作成 |
| `/review` | コードレビュー |
| `/security-scan` | セキュリティスキャン |
| `/test` | テスト実行 |
| `/verify` | システムヘルスチェック |

---

## 8. 重要ルール（CLAUDE.md）

### GitNexus ルール
- **必須**: シンボル編集前にimpact analysis実行
- **必須**: コミット前にdetect_changes実行
- **必須**: HIGH/CRITICALリスク時にユーザー警告
- **禁止**: impact実行なしの編集
- **禁止**: find-and-replaceによるリネーム（gitnexus_rename使用）

### 品質基準
- ReviewAgent スコア ≥80 必須
- TypeScript strictモード
- ESLint: 0エラー
- 全テスト合格
- コードにシークレットなし
