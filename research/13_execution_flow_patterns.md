# Miyabi 実行フローパターン 完全ドキュメント

## 概要

本ドキュメントはMiyabiシステムにおける全実行フローを体系的に記録する。Issue起票から本番デプロイまでのメインパイプライン、品質ゲート、ステートマシン、デプロイメント、サーキットブレーカー、Webhook、MCPツール、タスク分解、同期の9つのフローを網羅する。

---

## 1. メインパイプライン（Issue → Production）

### 1.1 完全なステップバイステップフロー

```
┌──────────────────────────────────────────────────────────────────────┐
│                    MAIN PIPELINE: Issue → Production                 │
│                        目標: 10-15分で完了                           │
└──────────────────────────────────────────────────────────────────────┘

  [Step 1] Issue 作成                          (~0分)
  │  開発者/PM が GitHub Issue を記述
  │  (feature/bug/refactor/docs/test/deployment/chore)
  │
  ▼
  [Step 2] IssueAgent（みつけるん）自動分析     (~15秒)
  │  ├─ Issue内容の自然言語解析
  │  ├─ 53ラベル × 10カテゴリ自動分類
  │  │   ├─ type: feature/bug/refactor/...
  │  │   ├─ priority: P0-P3
  │  │   ├─ severity: Sev.1-Sev.4
  │  │   ├─ agent: coordinator/codegen/...
  │  │   ├─ state: pending
  │  │   └─ effort/domain/quality/...
  │  ├─ 複雑度評価（ファイル数、クロスモジュール影響、テストカバレッジ）
  │  ├─ 重複Issue検出（精度 >70%）
  │  └─ セキュリティキーワード検証（eval, exec, sudo, シークレット）
  │
  ▼
  [Step 3] CoordinatorAgent（しきるん）         (~30秒)
  │  ├─ DAG（有向非巡回グラフ）によるタスク分解
  │  │   ├─ Kahn's Algorithm でトポロジカルソート
  │  │   ├─ DFS で循環依存検出
  │  │   └─ 1-3時間のアトミックタスクに分割
  │  ├─ 並列実行レベル計算（最大5並行）
  │  ├─ エージェント自動割り当て
  │  │   ├─ タスク要件分析 → 複雑度、必要能力
  │  │   ├─ AgentRegistry でアイドルエージェント検索
  │  │   └─ メタデータ付きタスク割り当て
  │  └─ 実行計画の確定
  │
  ▼
  [Step 4] 並列実行フェーズ                     (~3-4分)
  │  ├─ Level 1: CodeGenAgent（つくるん）× N
  │  │   ├─ Claude Sonnet 4 によるコード生成
  │  │   ├─ TypeScript コード + Vitest テスト自動生成
  │  │   ├─ JSDoc コメント・型定義追加
  │  │   └─ 目標: 品質スコア >80, カバレッジ >80%
  │  ├─ Level 2: TestAgent（たしかめるん）
  │  │   ├─ テストスイート実行
  │  │   ├─ カバレッジ収集（v8）
  │  │   └─ 閾値検証 → CodeGenAgent へフィードバック
  │  └─ (各レベルはDAG依存関係に従い順次/並列実行)
  │
  ▼
  [Step 5] 品質ゲート                           (~1分)
  │  ├─ ReviewAgent（めだまん）100点スコアリング
  │  │   ├─ type_safety × 0.3
  │  │   ├─ test_coverage × 0.3
  │  │   ├─ lint_compliance × 0.2
  │  │   └─ docs × 0.2
  │  ├─ ≥80点: PASS → Step 6 へ
  │  ├─ <80点: FAIL → Auto-Retry Loop（最大3回）
  │  │   └─ 3回失敗: 人間にエスカレーション
  │  └─ グレード: excellent(≥90), good(≥80), fair(≥60), poor(<60)
  │
  ▼
  [Step 6] PRAgent（まとめるん）PR作成           (~30秒)
  │  ├─ フィーチャーブランチ作成: agent/issue-{number}-{timestamp}
  │  ├─ Conventional Commits 形式コミット
  │  │   └─ feat/fix/refactor/docs/test
  │  ├─ ドラフトPR作成（実行レポート付き）
  │  └─ ラベル追加: agent-generated, automated, needs-review
  │
  ▼
  [Step 7] PR マージ
  │  ├─ 自動マージ: ReviewAgent ≥80 かつ全テスト合格
  │  └─ Guardian承認: Production デプロイ時は必須
  │
  ▼
  [Step 8] DeploymentAgent（はこぶん）           (~5分)
  │  ├─ Build   (60秒) → テスト合格確認
  │  ├─ Test    (120秒) → 統合テスト実行
  │  ├─ Deploy  (60秒) → 環境別デプロイ
  │  │   ├─ Staging: 自動デプロイ
  │  │   └─ Production: Guardian承認必須
  │  └─ Health Check (60秒)
  │      ├─ 成功: state:done → ナレッジ更新
  │      └─ 失敗: 自動ロールバック → エスカレーション
  │
  ▼
  [Step 9] 完了・ナレッジ更新
      ├─ Issue → state:done ラベル
      ├─ GitHub Projects V2 メトリクス更新
      ├─ LDD（Log-Driven Development）ログ記録
      └─ 成功パターン蓄積
```

### 1.2 各ステップで使用されるコンポーネント

| Step | エージェント | 主要コンポーネント | API/ツール |
|------|------------|-------------------|-----------|
| 1 | - | GitHub Issues | Octokit REST |
| 2 | IssueAgent | ai-label-issue.ts, label-state-machine.ts | Claude API, GitHub Labels API |
| 3 | CoordinatorAgent | LLMDecomposer, DAGManager | Claude API, Kahn's Algorithm |
| 4 | CodeGenAgent, TestAgent | coding-agents, Vitest | Claude Sonnet 4 (8K tokens) |
| 5 | ReviewAgent | feedback-loop.ts | Claude API, ESLint |
| 6 | PRAgent | github-client.ts | Octokit REST/GraphQL |
| 7 | - | CODEOWNERS, branch protection | GitHub API |
| 8 | DeploymentAgent | cicd-integration.ts | Firebase, Docker |
| 9 | - | github-project-api.ts | GitHub Projects V2 GraphQL |

### 1.3 所要時間見積もり

| フェーズ | 通常時間 | 最大時間 | 備考 |
|---------|---------|---------|------|
| Issue分析 | 15秒 | 30秒 | ラベル精度 >90% |
| DAG構築 | 30秒 | 60秒 | タスク分解精度 >95% |
| コード生成 | 3-4分 | 7分 | 並列実行で短縮可能 |
| 品質レビュー | 1分 | 4.5分 | リトライ含む最大 |
| PR作成 | 30秒 | 60秒 | マージ成功率 >95% |
| デプロイ | 5分 | 10分 | ヘルスチェック含む |
| **合計** | **10-15分** | **~23分** | リトライなしの場合 |

### 1.4 失敗時のフォールバック

```
失敗ポイント別フォールバック戦略:

[IssueAgent 失敗]
├─ リトライ: 指数バックオフ（1s→2s→4s、最大3回）
├─ フォールバック: デフォルトラベル（pending, P2-Medium）適用
└─ エスカレーション: Guardian通知

[CoordinatorAgent 失敗]
├─ リトライ: タスク分解の再試行
├─ フォールバック: 単一タスクとして実行（DAGなし）
└─ エスカレーション: TechLead/PO通知

[CodeGenAgent 失敗]
├─ リトライ: プロンプト調整して再生成
├─ フォールバック: テンプレートベース生成
└─ エスカレーション: TechLead通知

[ReviewAgent 不合格 × 3回]
├─ ラベル: 🚨escalated, ❌agent-failed
├─ エスカレーション: Guardian Issue作成（Sev.2以上）
└─ 人間レビューへ移行

[DeploymentAgent 失敗]
├─ 自動ロールバック: 前回の安定版に復帰
├─ ロールバック期限: 1時間以内
└─ エスカレーション: Sev.1-Critical Issue作成
```

---

## 2. 品質ゲートフロー

### 2.1 CodeGen → Review → Auto-Retry ループ

```
┌──────────────────────────────────────────────────────────────────────┐
│                     QUALITY GATE FLOW                                │
│              Auto-Retry Loop（最大3回）                               │
└──────────────────────────────────────────────────────────────────────┘

  CodeGenAgent 出力
  │  ├─ TypeScript コード
  │  ├─ Vitest テストファイル
  │  ├─ JSDoc / 型定義
  │  └─ ドキュメント
  │
  ▼
  ┌─────────────────────────────┐
  │   ReviewAgent 品質評価       │◄──────────────────┐
  │   (100点満点スコアリング)     │                    │
  └─────────┬───────────────────┘                    │
            │                                        │
            ▼                                        │
  ┌─────────────────────┐                           │
  │  スコア計算           │                           │
  │                      │                           │
  │  type_safety    ×0.3 │                           │
  │  test_coverage  ×0.3 │                           │
  │  lint_compliance×0.2 │                           │
  │  docs           ×0.2 │                           │
  │  ─────────────────── │                           │
  │  合計: 0-100点       │                           │
  └─────────┬────────────┘                           │
            │                                        │
            ▼                                        │
     ┌──────┴──────┐                                │
     │ ≥80点?      │                                │
     └──┬──────┬───┘                                │
    Yes │      │ No                                  │
        │      │                                     │
        ▼      ▼                                     │
  [PR作成]  ┌──────────────┐                         │
            │ retry < 3?   │                         │
            └──┬───────┬───┘                         │
           Yes │       │ No                          │
               │       │                             │
               ▼       ▼                             │
        ┌────────┐  [エスカレーション]                │
        │Feedback│  ├─ 🚨escalated ラベル             │
        │生成    │  ├─ ❌agent-failed ラベル           │
        │        │  └─ Guardian Issue作成             │
        └───┬────┘                                   │
            │                                        │
            ▼                                        │
     CodeGenAgent                                    │
     フィードバック反映 ─────────────────────────────┘
     (プロンプト改善、指摘事項修正)
```

### 2.2 100点スコアリングの内訳

**ReviewAgent（めだまん）スコア公式**:

| 観点 | 重み | 評価基準 | 詳細 |
|------|------|---------|------|
| **type_safety** | 30% | TypeScript strict準拠 | 型定義、any禁止、null安全 |
| **test_coverage** | 30% | テストカバレッジ >80% | statements, branches, functions, lines |
| **lint_compliance** | 20% | ESLint 0エラー | 命名規則、複雑度≤15、ネスト≤4 |
| **docs** | 20% | JSDoc/TSDoc完備 | パラメータ、戻り値、使用例 |

**Quality Gate スキルの代替スコア公式**:

| 観点 | 重み | 評価基準 |
|------|------|---------|
| **Correctness** | 25% | ロジック正確性、エッジケース処理 |
| **Security** | 20% | 脆弱性なし、入力検証 |
| **Performance** | 15% | アルゴリズム効率、リソース使用 |
| **Readability** | 15% | コード可読性、命名規則 |
| **Maintainability** | 15% | SOLID原則、DRY |
| **Test Coverage** | 10% | テスト網羅性 |

### 2.3 合格/不合格の分岐

```
スコア別アクション:

  90-100点 [Excellent] ──→ PR作成（自動マージ候補）
                            ├─ quality:excellent ラベル
                            └─ 優先マージ推奨

  80-89点 [Good]       ──→ PR作成（通常レビュー）
                            ├─ quality:good ラベル
                            └─ Guardian承認で マージ

  60-79点 [Fair]       ──→ Auto-Retry（最大3回）
                            ├─ quality:needs-improvement ラベル
                            ├─ フィードバック付き再生成
                            └─ 3回失敗 → エスカレーション

  40-59点 [Poor]       ──→ エスカレーション
                            ├─ quality:poor ラベル
                            └─ TechLead レビュー必須

  0-39点  [Block]      ──→ 即時ブロック
                            ├─ state:blocked ラベル
                            └─ Guardian + TechLead 介入必須
```

### 2.4 エスカレーションパス

```
エスカレーション階層:

  [Level 1: Auto-Retry]
  │  CodeGenAgent が ReviewAgent フィードバックを反映
  │  最大3回の自動リトライ
  │
  ├─ 解決 → PR作成フローへ
  │
  ▼ (未解決)
  [Level 2: TechLead エスカレーション]
  │  複雑なアーキテクチャ、セキュリティ問題
  │  TECH_LEAD_GITHUB 変数で指定された担当者
  │  対応時間: <15分（Tier 2 SLA）
  │
  ├─ 解決 → 修正後 ReviewAgent 再評価
  │
  ▼ (未解決)
  [Level 3: Guardian エスカレーション]
  │  @ShunsukeHayashi
  │  Sev.1-Critical: 24時間以内対応
  │  Constitutional（憲法的）判断が必要な場合
  │
  ├─ 解決 → 修正 or Issue クローズ
  │
  ▼ (未解決)
  [Level 4: PO エスカレーション]
      要件不明確、ビジネス判断必要
      Issue 再定義 → パイプライン再開
```

---

## 3. ステートマシンフロー

### 3.1 53ラベルによる状態遷移

```
┌──────────────────────────────────────────────────────────────────────┐
│                    STATE MACHINE FLOW                                │
│              53ラベル × 10カテゴリ による状態管理                      │
└──────────────────────────────────────────────────────────────────────┘

  10カテゴリ構成:

  ┌──────────┬──────────┬──────────┬──────────┬──────────┐
  │  State   │  Agent   │ Priority │   Type   │ Severity │
  │  (8)     │  (6)     │  (4)     │  (7)     │  (4)     │
  ├──────────┼──────────┼──────────┼──────────┼──────────┤
  │  Phase   │ Special  │ Trigger  │ Quality  │Community │
  │  (5)     │  (7)     │  (4)     │  (4)     │  (4)     │
  └──────────┴──────────┴──────────┴──────────┴──────────┘
```

### 3.2 メイン状態遷移図（10状態 × 28遷移ルール）

```
                    ┌──────────┐
                    │  draft   │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
           ┌────── │ pending  │ ◄────────────────────────┐
           │       └────┬─────┘                          │
           │            │                                │
           │       ┌────▼──────┐                         │
           │       │ analyzing │                         │
           │       └────┬──────┘                         │
           │            │                                │
           │       ┌────▼───────────┐        ┌───────┐  │
           │       │ implementing   │───────►│blocked│──┘
           │       └────┬───────────┘        └───┬───┘
           │            │                        │
           │       ┌────▼──────┐                 │
           │       │ reviewing │ ◄───────────────┘
           │       └────┬──────┘
           │            │
           │       ┌────▼──────┐
           │       │ deploying │
           │       └────┬──────┘
           │            │
           │       ┌────▼──────┐
           │       │   done    │
           │       └───────────┘
           │
           │       ┌──────────┐        ┌───────────┐
           └──────►│  failed  │───────►│ cancelled │
                   └──────────┘        └───────────┘

  凡例:
  ──► 正常遷移（自動）
  ───► 異常遷移（エラー時）
  ◄── 復帰遷移（リトライ/リオープン）
```

### 3.3 状態遷移ルール詳細

| From | To | トリガー | 自動/手動 |
|------|-----|---------|----------|
| draft | pending | Issue確定 | 手動 |
| draft | cancelled | Issue取消 | 手動 |
| pending | analyzing | agent:coordinator ラベル追加 | 自動（state-machine.yml） |
| pending | implementing | 直接実装開始 | 自動 |
| pending | blocked | ブロッカー検出 | 自動/手動 |
| pending | cancelled | Issue取消 | 手動 |
| analyzing | implementing | agent:codegen ラベル追加 | 自動 |
| analyzing | pending | 分析やり直し | 自動 |
| analyzing | blocked | 依存関係ブロック | 自動 |
| analyzing | failed | 分析エラー | 自動 |
| implementing | reviewing | PR opened | 自動（state-machine.yml） |
| implementing | blocked | ブロッカー検出 | 自動/手動 |
| implementing | failed | 実装エラー | 自動 |
| reviewing | implementing | レビュー不合格 → 修正 | 自動 |
| reviewing | deploying | レビュー合格 + PR merge | 自動 |
| reviewing | done | デプロイ不要の場合 | 自動 |
| reviewing | failed | レビューエラー | 自動 |
| deploying | done | ヘルスチェック合格 | 自動 |
| deploying | failed | デプロイ/ヘルスチェック失敗 | 自動 |
| blocked | pending | ブロッカー解消 | 手動 |
| failed | pending | リトライ | 自動/手動 |
| done | pending | リオープン | 手動 |
| cancelled | draft | 再開 | 手動 |

### 3.4 blocked/failed の処理

```
[blocked 処理フロー]

  状態が blocked に遷移
  │
  ├─ state-machine.yml: blocked-escalation ジョブ発動
  │   ├─ 🚨escalated ラベル追加
  │   ├─ Guardian通知（@ShunsukeHayashi）
  │   └─ エスカレーション Issue 作成（重大度に応じて）
  │
  ├─ ブロッカー種別:
  │   ├─ 依存関係ブロック → 依存タスク完了待ち
  │   ├─ 外部API/サービス障害 → リトライ or 代替策
  │   ├─ 権限不足 → Guardian承認待ち
  │   └─ 不明確な要件 → PO確認待ち
  │
  └─ 解消後: blocked → pending → 通常フローに復帰


[failed 処理フロー]

  状態が failed に遷移
  │
  ├─ retryCount チェック
  │   ├─ retryCount < maxRetries(3):
  │   │   ├─ failed → pending（自動リトライ）
  │   │   ├─ retryCount++
  │   │   └─ 指数バックオフ待機
  │   │
  │   └─ retryCount >= maxRetries:
  │       ├─ ❌agent-failed ラベル
  │       ├─ Sev.1/Sev.2 エスカレーション
  │       └─ 人間介入必須
  │
  └─ 失敗原因の LDD ログ記録
      └─ .ai/logs/YYYY-MM-DD.md
```

### 3.5 GitHub Actions による自動遷移（state-machine.yml）

```
  state-machine.yml ジョブ構成:

  ┌─────────────────────────────────────────────────────┐
  │ initial-triage                                       │
  │ トリガー: Issue opened                               │
  │ アクション: pending ラベル付与、優先度自動検出          │
  └─────────────────────┬───────────────────────────────┘
                        │
  ┌─────────────────────▼───────────────────────────────┐
  │ coordinator-assignment                               │
  │ トリガー: agent:coordinator ラベル追加                │
  │ アクション: pending → analyzing 遷移                  │
  └─────────────────────┬───────────────────────────────┘
                        │
  ┌─────────────────────▼───────────────────────────────┐
  │ specialist-assignment                                │
  │ トリガー: agent:codegen 等のラベル追加                │
  │ アクション: analyzing → implementing 遷移            │
  └─────────────────────┬───────────────────────────────┘
                        │
  ┌─────────────────────▼───────────────────────────────┐
  │ pr-created                                           │
  │ トリガー: PR opened                                  │
  │ アクション: implementing → reviewing 遷移            │
  └─────────────────────┬───────────────────────────────┘
                        │
  ┌─────────────────────▼───────────────────────────────┐
  │ pr-merged                                            │
  │ トリガー: PR merged                                  │
  │ アクション: reviewing → done 遷移                    │
  └─────────────────────┬───────────────────────────────┘
                        │
  ┌─────────────────────▼───────────────────────────────┐
  │ blocked-escalation                                   │
  │ トリガー: state:blocked ラベル追加                    │
  │ アクション: Guardian通知、エスカレーションIssue作成    │
  └─────────────────────────────────────────────────────┘
```

---

## 4. デプロイメントフロー

### 4.1 Build → Test → Deploy → Health Check

```
┌──────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT FLOW                                    │
│              DeploymentAgent（はこぶん）4段階パイプライン              │
│              SLA: 可用性99.9%, 応答<10秒(P95), 成功率>99%            │
└──────────────────────────────────────────────────────────────────────┘

  デプロイ前提条件チェック:
  ┌────────────────────────────────────┐
  │ □ テスト全合格                      │
  │ □ TypeScript型チェック合格          │
  │ □ ESLint 0エラー                   │
  │ □ ReviewAgent ≥80点               │
  │ □ セキュリティスキャン合格          │
  │ □ 環境変数検証完了                  │
  └────────────┬───────────────────────┘
               │ 全項目 PASS
               ▼
  ┌────────────────────────┐
  │ Stage 1: BUILD (60秒)  │
  │ ├─ TypeScript コンパイル │
  │ ├─ バンドル生成          │
  │ └─ アーティファクト保存   │
  └────────────┬───────────┘
               │ 成功
               ▼
  ┌────────────────────────┐
  │ Stage 2: TEST (120秒)  │
  │ ├─ ユニットテスト       │
  │ ├─ 統合テスト           │
  │ ├─ E2Eテスト            │
  │ └─ カバレッジ閾値検証    │
  └────────────┬───────────┘
               │ 全合格
               ▼
  ┌────────────────────────────────────────┐
  │ Stage 3: DEPLOY (60秒)                 │
  │                                        │
  │  ┌─────────────┐    ┌───────────────┐ │
  │  │  Staging     │    │  Production   │ │
  │  │  自動デプロイ │    │  Guardian承認 │ │
  │  │             │    │  必須         │ │
  │  └──────┬──────┘    └───────┬───────┘ │
  │         │                   │          │
  │         ▼                   ▼          │
  │   Firebase Staging    Firebase Prod    │
  └────────────────────────┬───────────────┘
                           │
                           ▼
  ┌────────────────────────────────────────┐
  │ Stage 4: HEALTH CHECK (60秒)           │
  │ ├─ エンドポイント応答確認              │
  │ ├─ レスポンスタイム検証 (<10秒 P95)    │
  │ ├─ エラーレート確認 (<1%)              │
  │ └─ 依存サービス接続確認               │
  └────────────┬──────────┬────────────────┘
               │          │
          成功  │          │ 失敗
               ▼          ▼
         [DONE]     [AUTO ROLLBACK]
         Issue close  前回安定版に復帰
         PR merge     エスカレーション
```

### 4.2 Staging vs Production

```
環境別デプロイポリシー:

  ┌───────────────────────────────────────────────────────┐
  │                    Staging                             │
  │ ├─ トリガー: PR merge to develop/staging ブランチ      │
  │ ├─ 承認: 不要（自動デプロイ）                          │
  │ ├─ 環境変数: FIREBASE_STAGING_PROJECT                 │
  │ ├─ ロールバック: 即時可能                              │
  │ └─ 目的: 統合テスト、QA検証                           │
  └───────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────┐
  │                   Production                          │
  │ ├─ トリガー: PR merge to main + deploy-production    │
  │ │            ラベル or manual workflow_dispatch        │
  │ ├─ 承認: Guardian (@ShunsukeHayashi) 必須             │
  │ ├─ 環境変数: FIREBASE_PROD_PROJECT                   │
  │ ├─ ロールバック: 1時間以内可能                        │
  │ ├─ ヘルスチェック: 必須                               │
  │ └─ 目的: 本番リリース                                 │
  └───────────────────────────────────────────────────────┘
```

### 4.3 自動ロールバック

```
  ヘルスチェック失敗検出
  │
  ├─ [即時アクション]
  │   ├─ 前回の安定デプロイバージョンを特定
  │   ├─ 自動ロールバック実行
  │   ├─ ロールバック後ヘルスチェック再実行
  │   └─ state:failed ラベル追加
  │
  ├─ [通知]
  │   ├─ Sev.1-Critical エスカレーション Issue 作成
  │   ├─ Guardian (@ShunsukeHayashi) 通知
  │   └─ Discord通知（discord_notify_github_event）
  │
  └─ [事後対応]
      ├─ 根本原因分析（RCA）
      ├─ LDD ログに障害記録
      └─ 修正 Issue 作成 → パイプライン再開
```

### 4.4 Zero-downtime パターン

```
  Zero-downtime デプロイ戦略:

  [現在のバージョン v1] ──── トラフィック 100%
         │
         │ 新バージョンデプロイ開始
         ▼
  [v1] ──── 100% ─────────────────────────────
  [v2] ──── 0%   ─── ヘルスチェック実行中 ────
         │
         │ ヘルスチェック合格
         ▼
  [v1] ──── 0%   ─── 停止 ────────────────────
  [v2] ──── 100% ─── 本番トラフィック ─────────
         │
         │ ヘルスチェック失敗時
         ▼
  [v1] ──── 100% ─── ロールバック（即時復帰）──
  [v2] ──── 0%   ─── 破棄 ────────────────────

  実装:
  ├─ Firebase Hosting: アトミックデプロイ
  ├─ Docker: コンテナスワップ
  └─ 切り替え時間: <5秒
```

---

## 5. サーキットブレーカーフロー

### 5.1 予算監視 → 警告 → 緊急

```
┌──────────────────────────────────────────────────────────────────────┐
│                   CIRCUIT BREAKER FLOW                               │
│                 経済ガバナンスによる自動保護                           │
└──────────────────────────────────────────────────────────────────────┘

  月間予算: $500 USD
  ├─ Anthropic API:    $400 (10M tokens/month)
  ├─ GitHub Actions:   $0   (無料枠)
  └─ Firebase:         $100

  ┌─────────────────────────────────────────────────────────────┐
  │                                                             │
  │   $0 ════════ $400(80%) ════════ $500 ═══════ $750(150%)   │
  │   │           │                  │             │            │
  │   │  🟢 正常  │   🟡 警告       │  🔴 超過    │ 🚨 緊急   │
  │   │           │                  │             │            │
  └─────────────────────────────────────────────────────────────┘

  [🟢 正常ゾーン: 0-79%]
  │  全ワークフロー通常稼働
  │  メトリクス収集のみ
  │
  ▼ 80%到達
  [🟡 警告ゾーン: 80-99%]
  │  ├─ アラート送信（Guardian通知）
  │  ├─ cost-watch ラベル追加
  │  ├─ 低優先度タスク実行制限
  │  └─ 週次レポートに警告表示
  │
  ▼ 100%到達
  [🔴 超過ゾーン: 100-149%]
  │  ├─ 新規エージェント実行の制限
  │  ├─ P3-Low 優先度タスク一時停止
  │  └─ Guardian 即時通知
  │
  ▼ 150%到達
  [🚨 緊急ゾーン: 150%+]
      ├─ サーキットブレーカー発動！
      │
      ├─ [自動アクション]
      │   ├─ agent-runner ワークフロー → 自動無効化
      │   ├─ continuous-improvement ワークフロー → 自動無効化
      │   ├─ agent-onboarding ワークフロー → 自動無効化
      │   └─ 全エージェント実行 → 即時停止
      │
      ├─ [エスカレーション]
      │   ├─ Sev.1-Critical エスカレーション Issue 作成
      │   ├─ Guardian (@ShunsukeHayashi) 即時通知
      │   └─ Discord 緊急通知
      │
      └─ [復旧プロセス]（後述）
```

### 5.2 ワークフロー自動無効化

```
  サーキットブレーカー発動時の無効化対象:

  ┌─────────────────────┬──────────┬─────────────────────┐
  │ ワークフロー          │ 状態     │ 理由                │
  ├─────────────────────┼──────────┼─────────────────────┤
  │ agent-runner         │ 🔴 停止  │ API消費最大          │
  │ continuous-improvement│ 🔴 停止  │ 自律的API消費        │
  │ agent-onboarding     │ 🔴 停止  │ 新規エージェント抑制 │
  │ autonomous-agent     │ 🟡 制限  │ 手動トリガーのみ許可 │
  │ ai-auto-label        │ 🟡 制限  │ 簡易ルールに切替     │
  ├─────────────────────┼──────────┼─────────────────────┤
  │ state-machine        │ 🟢 稼働  │ 状態管理は維持       │
  │ security-audit       │ 🟢 稼働  │ セキュリティは維持   │
  │ integrated-system-ci │ 🟢 稼働  │ CI は維持            │
  └─────────────────────┴──────────┴─────────────────────┘
```

### 5.3 Guardian承認 → 復旧

```
  復旧プロセス（3段階）:

  [Stage 1: 根本原因分析（RCA）]
  │  ├─ コスト急増の原因特定
  │  │   ├─ 無限ループ？
  │  │   ├─ 大量Issue同時処理？
  │  │   ├─ プロンプト非効率？
  │  │   └─ 外部要因？
  │  ├─ 影響範囲の確認
  │  └─ 再発防止策の策定
  │
  ▼
  [Stage 2: Guardian承認]
  │  ├─ RCA レポート確認
  │  ├─ 再発防止策の承認
  │  ├─ 残予算の確認
  │  └─ 復旧 Issue のクローズ
  │
  ▼
  [Stage 3: リソースクリーンアップ + 復旧]
      ├─ 不要なワークフロー実行のキャンセル
      ├─ キャッシュ/一時データの削除
      ├─ ワークフロー再有効化（段階的）
      │   ├─ Phase 1: ai-auto-label のみ
      │   ├─ Phase 2: autonomous-agent 追加
      │   └─ Phase 3: 全ワークフロー復旧
      └─ 監視強化（24時間）
```

---

## 6. Webhook イベントフロー

### 6.1 GitHubイベント → webhook-handler → エージェントルーティング

```
┌──────────────────────────────────────────────────────────────────────┐
│                    WEBHOOK EVENT FLOW                                │
│              GitHub → webhook-handler.yml → エージェント              │
└──────────────────────────────────────────────────────────────────────┘

  GitHub イベント発生
  │
  ├─ issues.opened          ──┐
  ├─ issues.labeled         ──┤
  ├─ issues.commented       ──┤
  ├─ pull_request.opened    ──┤
  ├─ pull_request.merged    ──┤
  ├─ push                   ──┤
  ├─ workflow_dispatch       ──┤
  └─ その他                  ──┤
                              │
                              ▼
  ┌───────────────────────────────────────────────────────┐
  │              webhook-handler.yml                       │
  │              中央イベントルーター                       │
  │                                                       │
  │  ┌────────────────────────────────────┐               │
  │  │ Event Classification               │               │
  │  │ ├─ event_type の判定              │               │
  │  │ ├─ payload の解析                  │               │
  │  │ └─ routing_target の決定          │               │
  │  └────────────────┬───────────────────┘               │
  └───────────────────┼───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────────────┐
        ▼             ▼                     ▼
  ┌──────────┐  ┌──────────┐         ┌──────────┐
  │ Issue     │  │ PR       │         │ Deploy   │
  │ Pipeline  │  │ Pipeline │         │ Pipeline │
  └─────┬────┘  └─────┬────┘         └─────┬────┘
        │              │                     │
        ▼              ▼                     ▼
  ┌──────────┐  ┌──────────┐         ┌──────────┐
  │IssueAgent│  │ReviewAgent│        │DeployAgent│
  │          │  │PRAgent    │        │           │
  └──────────┘  └──────────┘         └──────────┘
```

### 6.2 /agent コマンド解析

```
  GitHub Issue/PR コメント: /agent <command> [options]
  │
  ▼
  ┌─────────────────────────────────────────────────┐
  │ autonomous-agent.yml: check-trigger ジョブ       │
  │                                                  │
  │ トリガー条件チェック:                             │
  │ ├─ issues.labeled: 🤖agent-execute ラベル?      │
  │ ├─ issue_comment: /agent コマンド?               │
  │ └─ workflow_dispatch: 手動起動?                  │
  │                                                  │
  │ → should_execute = true/false                    │
  └──────────────────┬──────────────────────────────┘
                     │ should_execute = true
                     ▼
  ┌─────────────────────────────────────────────────┐
  │ コマンド解析                                     │
  │                                                  │
  │ /agent run <type>      → エージェント個別実行    │
  │ /agent fix <issue>     → バグ修正ショートカット  │
  │ /agent build <issue>   → 機能構築ショートカット  │
  │ /agent deploy <env>    → デプロイ実行            │
  │ /agent status          → 状態確認                │
  │ /agent review          → コードレビュー          │
  └──────────────────┬──────────────────────────────┘
                     │
                     ▼
  ┌─────────────────────────────────────────────────┐
  │ 実行フロー                                       │
  │ 1. Node.js 20 + pnpm セットアップ               │
  │ 2. 依存関係インストール                          │
  │ 3. TypeScript 型チェック                         │
  │ 4. .env 作成（GITHUB_TOKEN, REPOSITORY等）       │
  │ 5. npm run agents:parallel:exec                  │
  │    --issues={issue_number}                       │
  │    --concurrency=3                               │
  │ 6. コード変更検出                                │
  │ 7. フィーチャーブランチ作成                      │
  │ 8. ドラフトPR作成                                │
  └─────────────────────────────────────────────────┘
```

### 6.3 イベントタイプ別処理

```
  ┌──────────────────┬────────────────────────────────────────┐
  │ イベント          │ 処理フロー                              │
  ├──────────────────┼────────────────────────────────────────┤
  │ issues.opened    │ → ai-auto-label.yml                   │
  │                  │   → IssueAgent 53ラベル分類            │
  │                  │   → state-machine.yml initial-triage   │
  │                  │   → pending ラベル付与                  │
  ├──────────────────┼────────────────────────────────────────┤
  │ issues.labeled   │ → state-machine.yml                   │
  │ (agent-execute)  │   → 状態遷移処理                      │
  │                  │ → autonomous-agent.yml                 │
  │                  │   → エージェント実行                    │
  ├──────────────────┼────────────────────────────────────────┤
  │ issue_comment    │ → /agent コマンドチェック               │
  │ (/agent)         │   → autonomous-agent.yml 起動          │
  ├──────────────────┼────────────────────────────────────────┤
  │ pull_request     │ → state-machine.yml pr-created        │
  │ .opened          │   → implementing → reviewing 遷移     │
  ├──────────────────┼────────────────────────────────────────┤
  │ pull_request     │ → state-machine.yml pr-merged         │
  │ .closed(merged)  │   → reviewing → done 遷移             │
  │                  │ → auto-release.yml（タグ付き時）       │
  ├──────────────────┼────────────────────────────────────────┤
  │ push             │ → integrated-system-ci.yml            │
  │                  │   → lint → typecheck → test → build   │
  │                  │ → security-audit.yml                   │
  │                  │ → gitleaks.yml                         │
  ├──────────────────┼────────────────────────────────────────┤
  │ push (with       │ → commit-to-issue.yml                 │
  │ #auto tag)       │   → Issue 自動作成                     │
  ├──────────────────┼────────────────────────────────────────┤
  │ schedule         │ → security-audit.yml（毎日）           │
  │ (cron)           │ → codeql.yml（毎週月曜）              │
  │                  │ → mcp-health-check.yml（毎日）        │
  └──────────────────┴────────────────────────────────────────┘
```

---

## 7. MCP ツール実行フロー

### 7.1 Claude Code → MCP Server → ツール実行 → 結果返却

```
┌──────────────────────────────────────────────────────────────────────┐
│                    MCP TOOL EXECUTION FLOW                           │
│              Claude Code/Desktop → MCP Server → 結果                 │
└──────────────────────────────────────────────────────────────────────┘

  Claude Code / Claude Desktop
  │
  │  ツールコール要求
  │  (JSON-RPC over stdio)
  │
  ▼
  ┌────────────────────────────────────────┐
  │ MCP Server Router                      │
  │ ├─ リクエスト受信                      │
  │ ├─ ツール名 → サーバー解決            │
  │ ├─ パラメータ バリデーション           │
  │ └─ セキュリティチェック                │
  │     ├─ コマンドインジェクション防止    │
  │     ├─ パストラバーサル保護            │
  │     ├─ 入力長制限（query:1000等）     │
  │     └─ PID範囲検証                    │
  └──────────────┬─────────────────────────┘
                 │
    ┌────────────┼────────────────────────────────┐
    ▼            ▼                                ▼
  ┌──────┐  ┌──────────┐                   ┌──────────┐
  │Bundle│  │ Custom   │                   │ External │
  │Server│  │ Servers  │                   │ Servers  │
  │172T  │  │ (5+)     │                   │          │
  └──┬───┘  └────┬─────┘                   └────┬─────┘
     │           │                               │
     ▼           ▼                               ▼
  ツール実行   ツール実行                     ツール実行
     │           │                               │
     ▼           ▼                               ▼
  ┌────────────────────────────────────────────────┐
  │ 結果返却                                        │
  │ ├─ 成功: { content: [...], isError: false }    │
  │ ├─ 失敗: { content: [...], isError: true }     │
  │ └─ キャッシュ: SimpleCache (TTL: 5秒)          │
  └────────────────────────────────────────────────┘
     │
     ▼
  Claude Code / Claude Desktop
  (結果をコンテキストに反映)
```

### 7.2 172ツールのカテゴリ別フロー

```
  7つの MCP サーバー構成:

  ┌─────────────────────────────────────────────────────────────────┐
  │ Server 1: miyabi-mcp-bundle (172ツール、21カテゴリ)             │
  │                                                                │
  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
  │  │Git Inspector│ │Tmux Monitor│ │Log Aggregat│ │Resource Mon│  │
  │  │  19 tools   │ │  10 tools  │ │  7 tools   │ │  10 tools  │  │
  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
  │  │Network Insp│ │Process Insp│ │File Watcher│ │Claude Code │  │
  │  │  15 tools  │ │  14 tools  │ │  10 tools  │ │  8 tools   │  │
  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
  │  │GitHub Integ│ │Linux syst. │ │Win EventLog│ │Docker      │  │
  │  │  21 tools  │ │  3 tools   │ │  2 tools   │ │  10 tools  │  │
  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
  │  │Docker Comp.│ │Kubernetes  │ │Spec-Kit    │ │MCP Discover│  │
  │  │  4 tools   │ │  6 tools   │ │  9 tools   │ │  3 tools   │  │
  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
  │  │Database    │ │Time Tools  │ │Calculator  │ │Seq.Thinking│  │
  │  │  6 tools   │ │  4 tools   │ │  3 tools   │ │  3 tools   │  │
  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
  │  ┌────────────┐                                                │
  │  │Generator   │                                                │
  │  │  4 tools   │                                                │
  │  └────────────┘                                                │
  └─────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────┐
  │ Server 2-7: カスタム MCP サーバー                               │
  │                                                                │
  │  ┌──────────────────┐  ┌──────────────────┐                    │
  │  │ miyabi (12 tools) │  │ github-enhanced  │                    │
  │  │ init, status,     │  │ (5 tools)        │                    │
  │  │ agent_run, auto,  │  │ create_issue,    │                    │
  │  │ deploy, test...   │  │ get_tasks,       │                    │
  │  └──────────────────┘  │ update_progress,  │                    │
  │                        │ create_pr, review │                    │
  │  ┌──────────────────┐  └──────────────────┘                    │
  │  │ project-context  │  ┌──────────────────┐                    │
  │  │ (5 tools)        │  │ ide-integration  │                    │
  │  │ structure, deps, │  │ (3 tools)        │                    │
  │  │ config, analyze, │  │ diagnostics,     │                    │
  │  │ recent_changes   │  │ execute, format  │                    │
  │  └──────────────────┘  └──────────────────┘                    │
  │  ┌──────────────────┐  ┌──────────────────┐                    │
  │  │ context-engineer │  │ gemini-image-gen │                    │
  │  │ (6 tools)        │  │ (5 tools)        │                    │
  │  │ list/search/     │  │ image, batch,    │                    │
  │  │ analyze guides   │  │ speech, check    │                    │
  │  └──────────────────┘  └──────────────────┘                    │
  └─────────────────────────────────────────────────────────────────┘
```

### 7.3 ツール実行のライフサイクル

```
  リクエスト受信
  │
  ├─ [1. バリデーション]
  │   ├─ パラメータ型チェック
  │   ├─ 必須パラメータ存在確認
  │   ├─ 入力サニタイズ
  │   └─ セキュリティチェック
  │
  ├─ [2. キャッシュ確認]
  │   ├─ SimpleCache.get(key)
  │   ├─ TTL: 5秒 (デフォルト)
  │   └─ ヒット → キャッシュ結果返却
  │
  ├─ [3. 実行]
  │   ├─ シェルコマンド実行 (execSync/execPromise)
  │   ├─ API呼出し (Octokit, Anthropic SDK)
  │   ├─ ファイルシステム操作
  │   └─ タイムアウト: 120秒
  │
  ├─ [4. 結果処理]
  │   ├─ 出力パース
  │   ├─ エラーハンドリング
  │   └─ キャッシュ保存
  │
  └─ [5. 返却]
      └─ JSON-RPC レスポンス
```

---

## 8. タスク分解フロー

### 8.1 LLM Decomposer → DAG構築 → トポロジカルソート → 並列実行

```
┌──────────────────────────────────────────────────────────────────────┐
│                   TASK DECOMPOSITION FLOW                            │
│              LLM → DAG → Topological Sort → Parallel Execution      │
└──────────────────────────────────────────────────────────────────────┘

  Issue / タスク記述
  │
  ▼
  ┌─────────────────────────────────────────────┐
  │ LLMDecomposer                                │
  │ ├─ Provider: Anthropic (Claude Sonnet 4)     │
  │ ├─ Max Tokens: 8192                          │
  │ ├─ Temperature: 設定可能                     │
  │ └─ 入力: DecompositionRequest                │
  │     ├─ prompt: タスク記述                    │
  │     ├─ context: プロジェクト情報             │
  │     └─ constraints: 制約条件                 │
  └──────────────┬──────────────────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────────────────┐
  │ タスク生成                                    │
  │ ├─ 1-3時間のアトミックタスクに分割            │
  │ ├─ 各タスクに型付与:                         │
  │ │   feature/bug/refactor/docs/test/          │
  │ │   deployment/chore                         │
  │ ├─ 依存関係の定義                            │
  │ └─ エージェント割り当て推奨                   │
  └──────────────┬──────────────────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────────────────┐
  │ DAG構築                                      │
  │                                              │
  │  [Task A] ──→ [Task C] ──→ [Task E]         │
  │                  ↑                           │
  │  [Task B] ──────┘                            │
  │                                              │
  │  [Task D] ──→ [Task F]  (独立チェーン)       │
  │                                              │
  │ ├─ ノード: ManagedTask[]                     │
  │ ├─ エッジ: DAGEdge[]                         │
  │ └─ バリデーション:                           │
  │     ├─ 循環依存チェック（DFS）               │
  │     ├─ 欠落依存チェック                      │
  │     ├─ 重複タスクIDチェック                  │
  │     └─ タスク数上限チェック                  │
  └──────────────┬──────────────────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────────────────┐
  │ Kahn's Algorithm トポロジカルソート          │
  │                                              │
  │ Level 0: [Task A, Task B, Task D]  (入次数0) │
  │ Level 1: [Task C, Task F]          (依存解決)│
  │ Level 2: [Task E]                  (依存解決)│
  │                                              │
  │ ├─ levels: string[][] (ソート済みレベル)     │
  │ ├─ criticalPath: string[] (最長パス)         │
  │ └─ estimatedDurationMinutes: number          │
  └──────────────┬──────────────────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────────────────┐
  │ 並列実行 (TaskExecutor)                      │
  │                                              │
  │ concurrency = min(                           │
  │   independentTaskCount,  // DAGレベルサイズ   │
  │   cpuCoreCount,          // システム容量      │
  │   5                      // ハード制限        │
  │ )                                            │
  │                                              │
  │ Level 0:                                     │
  │  ┌────────┐ ┌────────┐ ┌────────┐           │
  │  │Task A  │ │Task B  │ │Task D  │  並列実行 │
  │  │CodeGen │ │CodeGen │ │CodeGen │           │
  │  └───┬────┘ └───┬────┘ └───┬────┘           │
  │      │          │          │                 │
  │      ▼          ▼          ▼                 │
  │ Level 1:                                     │
  │  ┌────────┐              ┌────────┐          │
  │  │Task C  │              │Task F  │  並列   │
  │  │Review  │              │Test    │          │
  │  └───┬────┘              └────────┘          │
  │      │                                       │
  │      ▼                                       │
  │ Level 2:                                     │
  │  ┌────────┐                                  │
  │  │Task E  │  順次                            │
  │  │Deploy  │                                  │
  │  └────────┘                                  │
  └─────────────────────────────────────────────┘
```

### 8.2 Worktree による分離実行

```
  並列タスク実行時の分離戦略:

  メインリポジトリ
  │
  ├─ git worktree add ./worktrees/task-A agent/issue-270-task-a
  ├─ git worktree add ./worktrees/task-B agent/issue-270-task-b
  └─ git worktree add ./worktrees/task-D agent/issue-270-task-d

  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
  │ Worktree A     │  │ Worktree B     │  │ Worktree D     │
  │ ├─ 独立ブランチ │  │ ├─ 独立ブランチ │  │ ├─ 独立ブランチ │
  │ ├─ 独立ファイル │  │ ├─ 独立ファイル │  │ ├─ 独立ファイル │
  │ └─ CodeGenAgent│  │ └─ CodeGenAgent│  │ └─ CodeGenAgent│
  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘
          │                   │                   │
          └───────────┬───────┘                   │
                      │                           │
                      ▼                           │
              git merge / PR                      │
                      ◄───────────────────────────┘

  WorktreeCoordinator:
  ├─ initialize() → worktree ディレクトリ準備
  ├─ executeInWorktree(task) → 分離環境で実行
  ├─ executeParallel(tasks, concurrency) → 並列実行管理
  └─ クリーンアップ → worktree 削除
```

### 8.3 警告コード

| コード | 意味 | 対処 |
|--------|------|------|
| CIRCULAR_DEPENDENCY | 循環依存検出 | DAG再構築、依存関係の見直し |
| MISSING_DEPENDENCY | 依存先タスクが不在 | 欠落タスクの追加 |
| DUPLICATE_TASK_ID | タスクID重複 | ID再生成 |
| INVALID_TASK_TYPE | 不正なタスクタイプ | 7タイプから選択 |
| TOO_MANY_TASKS | タスク数超過 | 粒度の見直し |
| NO_TASKS_GENERATED | タスク生成失敗 | プロンプト改善、リトライ |
| LOW_CONFIDENCE | 分解精度が低い | 人間レビュー推奨 |
| PARSE_ERROR | LLM出力パース失敗 | フォーマット指定強化 |

---

## 9. 同期フロー

### 9.1 ローカルタスク ↔ GitHub Issue/Labels/Projects V2

```
┌──────────────────────────────────────────────────────────────────────┐
│                   SYNCHRONIZATION FLOW                               │
│              Local Task Manager ↔ GitHub (双方向同期)                 │
└──────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────┐          ┌──────────────────────┐
  │  Local Task Manager  │          │  GitHub               │
  │                      │          │                      │
  │  ┌────────────────┐  │   sync   │  ┌────────────────┐  │
  │  │ ManagedTask    │◄─┼─────────┼──│ Issues          │  │
  │  │ ├─ currentState│  │         │  │ ├─ state        │  │
  │  │ ├─ priority    │──┼─────────┼─►│ ├─ labels       │  │
  │  │ ├─ assignee    │  │         │  │ ├─ assignees    │  │
  │  │ └─ metadata    │  │         │  │ └─ body         │  │
  │  └────────────────┘  │         │  └────────────────┘  │
  │                      │         │                      │
  │  ┌────────────────┐  │   sync   │  ┌────────────────┐  │
  │  │ TaskState      │◄─┼─────────┼──│ Labels          │  │
  │  │ (10状態)       │──┼─────────┼─►│ (53ラベル)      │  │
  │  └────────────────┘  │         │  └────────────────┘  │
  │                      │         │                      │
  │  ┌────────────────┐  │   sync   │  ┌────────────────┐  │
  │  │ Metrics        │◄─┼─────────┼──│ Projects V2     │  │
  │  │ ├─ duration    │──┼─────────┼─►│ ├─ Agent        │  │
  │  │ ├─ cost        │  │         │  │ ├─ Duration     │  │
  │  │ ├─ quality     │  │         │  │ ├─ Cost         │  │
  │  │ └─ coverage    │  │         │  │ ├─ Quality Score│  │
  │  └────────────────┘  │         │  │ └─ Sprint       │  │
  │                      │         │  └────────────────┘  │
  └──────────────────────┘          └──────────────────────┘
```

### 9.2 同期コンポーネント構成

```
  BidirectionalSync
  │
  ├─ GitHubLabelSync
  │   ├─ タスク状態 → GitHub Issue ラベル
  │   │   ├─ currentState → state:{state} ラベル
  │   │   ├─ priority → priority:{level} ラベル
  │   │   ├─ agentType → agent:{type} ラベル
  │   │   └─ quality → quality:{grade} ラベル
  │   │
  │   └─ GitHub Issue ラベル → タスク状態
  │       ├─ state:* ラベル変更 → currentState 更新
  │       ├─ priority:* ラベル変更 → priority 更新
  │       └─ agent:* ラベル変更 → assignedAgent 更新
  │
  └─ ProjectsV2Sync
      ├─ タスクメトリクス → Projects V2 カスタムフィールド
      │   ├─ agentType → Agent フィールド
      │   ├─ durationMs → Duration フィールド
      │   ├─ costUsd → Cost フィールド
      │   └─ qualityScore → Quality Score フィールド
      │
      └─ Projects V2 → タスクメトリクス
          └─ カスタムフィールド変更 → ローカル反映
```

### 9.3 双方向同期と競合解決

```
  競合解決戦略:

  ┌─────────────────────────────────────────────────────────┐
  │ BidirectionalSyncOptions                                 │
  │                                                         │
  │ conflictStrategy:                                       │
  │ ├─ 'local-wins'  → ローカル変更を優先                  │
  │ ├─ 'github-wins' → GitHub変更を優先                    │
  │ ├─ 'newest-wins' → タイムスタンプで最新を採用          │
  │ └─ 'ask'         → 人間に確認                          │
  │                                                         │
  │ syncLabels: boolean     → ラベル同期有効/無効           │
  │ syncProjects: boolean   → Projects V2同期有効/無効      │
  │ batchSize: number       → バッチ処理サイズ              │
  │ validateTransitions: boolean → 状態遷移ルール検証       │
  └─────────────────────────────────────────────────────────┘


  競合検出・解決フロー:

  同期実行
  │
  ├─ [1. 変更検出]
  │   ├─ ローカル: pendingSyncChanges チェック
  │   ├─ リモート: GitHub API でラベル/フィールド取得
  │   └─ syncVersion 比較
  │
  ├─ [2. 競合判定]
  │   ├─ 同一フィールドに双方で変更あり?
  │   │   ├─ Yes → 競合あり
  │   │   └─ No  → マージ可能
  │   │
  │   └─ 状態遷移ルール違反?
  │       ├─ Yes → 無効な遷移として拒否
  │       └─ No  → 遷移許可
  │
  ├─ [3. 競合解決]
  │   ├─ conflictStrategy に従い解決
  │   ├─ 解決結果のログ記録
  │   └─ syncVersion インクリメント
  │
  └─ [4. 同期実行]
      ├─ ローカル → GitHub (push)
      │   ├─ Octokit REST: ラベル更新
      │   └─ Octokit GraphQL: Projects V2 更新
      │
      ├─ GitHub → ローカル (pull)
      │   ├─ ラベル変更 → タスク状態更新
      │   └─ フィールド変更 → メトリクス更新
      │
      └─ pendingSyncChanges クリア
```

### 9.4 同期タイミング

```
  同期トリガー:

  [イベント駆動]
  ├─ タスク状態変更 → 即時ラベル同期
  ├─ GitHub Label 変更（Webhook） → ローカル反映
  ├─ PR merge → 状態遷移 + メトリクス同期
  └─ エージェント実行完了 → Projects V2 メトリクス更新

  [定期同期]
  ├─ バッチ同期: 設定間隔（デフォルト未指定）
  └─ 整合性チェック: state:check コマンド

  [手動同期]
  ├─ miyabi task sync → 全タスク双方向同期
  └─ state:check → ラベルステートマシン整合性検証
```

---

## 付録A: Omega System（Ω-System）6段階パイプライン

```
  Ω-System: miyabi omega コマンド

  ┌─────────┐   ┌─────────┐   ┌─────────┐
  │ Stage 1 │──►│ Stage 2 │──►│ Stage 3 │
  │ Analyze │   │Decompose│   │ Execute │
  └─────────┘   └─────────┘   └─────────┘
                                    │
  ┌─────────┐   ┌─────────┐        │
  │ Stage 6 │◄──│ Stage 5 │◄───────┘
  │ Report  │   │ Deploy  │   ┌─────────┐
  └─────────┘   └─────────┘◄──│ Stage 4 │
                               │ Review  │
                               └─────────┘

  Stage 1: Issue分析 → 53ラベル分類
  Stage 2: DAGタスク分解 → 並列計画
  Stage 3: CodeGen + Test 並列実行
  Stage 4: ReviewAgent 品質ゲート（≥80点）
  Stage 5: DeploymentAgent デプロイ
  Stage 6: メトリクス収集 + レポート生成
```

## 付録B: Water Spider 完全自動化フロー

```
  Water Spider (miyabi auto):

  ┌─────────────────────────────────────────┐
  │ 起動: miyabi auto --maxIssues=10        │
  │        --interval=300 (5分間隔)         │
  └──────────────┬──────────────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────────────┐
  │ Issue 優先度アルゴリズム                 │
  │ 1. 緊急度-高/即時 → 最優先              │
  │ 2. security/vulnerability → セキュリティ│
  │ 3. status:blocked → ブロック解消        │
  │ 4. 規模-小 → クイックウィン             │
  │ 5. FIFO by creation → 公平ローテーション│
  └──────────────┬──────────────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────────────┐
  │ 自律ループ                               │
  │                                          │
  │  while (issues remaining && budget OK) { │
  │    1. 次のIssue取得（優先度順）           │
  │    2. IssueAgent 分析                    │
  │    3. CoordinatorAgent 分解              │
  │    4. 並列実行（CodeGen + Test）          │
  │    5. ReviewAgent 品質チェック            │
  │    6. PRAgent PR作成                     │
  │    7. 結果記録                           │
  │    8. interval 待機                      │
  │  }                                       │
  │                                          │
  │  サーキットブレーカー監視: 常時           │
  └─────────────────────────────────────────┘
```

## 付録C: Pipeline コマンド合成フロー

```
  miyabi pipeline による柔軟な実行合成:

  演算子:
  │ (pipe)     → 順次実行、コンテキスト伝播
  && (AND)     → 前が成功時のみ次を実行
  || (OR)      → 前が失敗時のみ次を実行
  & (parallel) → 同時実行

  プリセットパイプライン:

  [full-cycle]
  /agent-run | /review | /test | /security-scan | /deploy | /verify
      │          │        │          │              │         │
      ▼          ▼        ▼          ▼              ▼         ▼
   コード生成  レビュー  テスト  セキュリティ    デプロイ   検証

  [quick-deploy]
  /verify && /deploy
      │          │
      ▼          ▼
   検証合格時  デプロイ

  [quality-gate]
  /review && /test && /security-scan
      │          │          │
      ▼          ▼          ▼
   レビュー  テスト    セキュリティ
  (全て合格必須)

  チェックポイント:
  ├─ 各ステップ完了時にチェックポイント保存
  ├─ 失敗時: 失敗ステップから再開可能
  └─ コンテキスト: issueNumber, prNumber, qualityScore,
                   testsPassed, errors, checkpoints
```

## 付録D: 分散クラスター実行フロー

```
  最大5台による分散実行:

  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ MacBook  │  │ Windows  │  │ Mac mini │
  │ (Primary)│  │          │  │ ×3       │
  └────┬─────┘  └────┬─────┘  └────┬─────┘
       │              │              │
       └──────┬───────┴──────┬───────┘
              │              │
              ▼              ▼
       SSH / Tailscale ネットワーク
              │
              ▼
  ┌───────────────────────────────────────┐
  │ GitHub Issue 状態による協調            │
  │ ├─ Issue ラベルで実行状態管理          │
  │ ├─ DEVICE_IDENTIFIER で担当マシン識別 │
  │ ├─ 重複実行防止（ラベルロック）        │
  │ └─ 結果集約: GitHub Projects V2       │
  └───────────────────────────────────────┘
```

---

## 付録E: フロー間の相互関係マップ

```
  ┌─────────────┐
  │ 6.Webhook   │─────────────────────┐
  │   Event     │                     │
  └──────┬──────┘                     │
         │ トリガー                   │ イベント通知
         ▼                           ▼
  ┌─────────────┐             ┌─────────────┐
  │ 1.Main      │◄───────────│ 5.Circuit   │
  │  Pipeline   │  予算チェック │  Breaker    │
  └──┬──────────┘             └─────────────┘
     │                               ▲
     │ タスク生成                     │ コスト報告
     ▼                               │
  ┌─────────────┐             ┌──────┴──────┐
  │ 8.Task      │             │ 7.MCP Tool  │
  │  Decompose  │─────────────│  Execution  │
  └──┬──────────┘  ツール実行  └─────────────┘
     │
     │ 品質評価                状態管理
     ▼                           │
  ┌─────────────┐             ┌──┴──────────┐
  │ 2.Quality   │─────────────│ 3.State     │
  │   Gate      │  状態更新    │  Machine    │
  └──┬──────────┘             └──┬──────────┘
     │                           │
     │ PR merge                  │ ラベル同期
     ▼                           ▼
  ┌─────────────┐             ┌─────────────┐
  │ 4.Deploy    │             │ 9.Sync      │
  │             │─────────────│             │
  └─────────────┘  メトリクス  └─────────────┘
                   同期
```
