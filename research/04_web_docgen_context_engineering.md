# Miyabi Web UI・ドキュメント生成・コンテキストエンジニアリング 詳細分析

## 1. MIYABI-WEB - ワークフローエディタ

**パッケージ**: `@miyabi/web` v1.0.0
**フレームワーク**: Next.js 15 + React 18 + @xyflow/react（React Flow）
**スタイリング**: Tailwind CSS（Ive-styleミニマルデザイン）

### 1.1 技術スタック

| 技術 | バージョン | 用途 |
|---|---|---|
| Next.js | ^15.5.14 | App Routerフレームワーク |
| React | ^18.3.1 | UIライブラリ |
| @xyflow/react | ^12.3.6 | フロー図/グラフエディタ |
| Tailwind CSS | ^3.4.15 | ユーティリティCSS |
| Vitest | ^3.2.4 | テスト |
| @testing-library/react | ^16.3.1 | コンポーネントテスト |

### 1.2 プロジェクト構造

```
src/
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # ルートレイアウト
│   ├── page.tsx                   # ホームページ → /dashboard
│   ├── api/workflows/             # REST API
│   │   ├── route.ts               # GET (一覧), POST (作成)
│   │   └── [id]/route.ts          # GET, PUT, DELETE
│   └── dashboard/workflows/
│       ├── page.tsx               # ワークフロー一覧
│       ├── create/page.tsx        # 新規作成
│       └── [id]/page.tsx          # 編集
├── components/workflow/
│   ├── AgentNode.tsx              # エージェントノード
│   ├── ConditionNode.tsx          # 条件分岐ノード
│   └── IssueNode.tsx              # GitHub Issueノード
├── hooks/
│   └── useWorkflow.ts             # ワークフロー状態管理
└── lib/
    ├── types.ts                   # TypeScript型定義
    ├── api-client.ts              # REST APIクライアント
    ├── dag-validator.ts           # DAG検証ロジック
    └── workflow-storage.ts        # インメモリストレージ
```

### 1.3 型システム

```typescript
type WorkflowNodeType = 'agent' | 'issue' | 'condition';
type AgentType = 'coordinator' | 'codegen' | 'review' | 'issue' | 'pr' | 'deployment' | 'test';

interface AgentNodeData {
  label: string;
  agentType: AgentType;
  issueNumber?: number;
  status?: 'pending' | 'running' | 'completed' | 'failed';
}

interface ConditionNodeData {
  label: string;
  condition: string;
  trueLabel?: string;
  falseLabel?: string;
}

interface IssueNodeData {
  label: string;
  issueNumber: number;
  title?: string;
  status?: 'open' | 'closed';
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  type: 'cycle' | 'disconnected' | 'invalid_edge' | 'missing_agent';
  message: string;
  nodeIds?: string[];
}
```

### 1.4 DAG検証エンジン

| アルゴリズム | 関数 | 用途 |
|---|---|---|
| DFSサイクル検出 | `detectCycles(graph)` | White→Gray→Black着色 |
| Kahn's トポロジカルソート | `topologicalSort(nodes, edges)` | 順序計算 |
| 切断ノード検出 | `findDisconnectedNodes(nodes, edges)` | 孤立ノード警告 |
| エッジ検証 | `validateEdges(nodes, edges)` | source/target存在確認 |
| 事前サイクルチェック | `wouldCreateCycle(nodes, edges, newEdge)` | 接続前テスト |

### 1.5 コンポーネント

**AgentNode** - エージェントタイプ別カラーマッピング:
| タイプ | カラー |
|---|---|
| coordinator | purple-100/purple-300 |
| codegen | blue-100/blue-300 |
| review | green-100/green-300 |
| issue | yellow-100/yellow-300 |
| pr | orange-100/orange-300 |
| deployment | red-100/red-300 |
| test | cyan-100/cyan-300 |

**ステータスアイコン**: ⏳ pending、🔄 running、✅ completed、❌ failed

**ConditionNode** - 2つの出力ハンドル: 🟢 true (25%)、🔴 false (75%)

### 1.6 デザインシステム

```css
--background: #fafafa  /* オフホワイト */
--foreground: #171717  /* ニアブラック */
--muted: #737373       /* グレー */
--border: #e5e5e5      /* ライトグレー */
--accent: #3b82f6      /* ブルー */
```

---

## 2. DOC-GENERATOR - TypeScript ドキュメント生成

**パッケージ**: `@agentic-os/doc-generator` v1.0.0
**CLI**: `doc-gen` コマンド
**ASTパーサー**: ts-morph
**テンプレートエンジン**: Handlebars

### 2.1 CodeAnalyzer（コード分析エンジン）

```typescript
interface FunctionInfo {
  name: string; description: string;
  parameters: Array<{ name, type, optional, description }>;
  returnType: string; isAsync: boolean; isExported: boolean;
  decorators: string[]; sourceCode: string; filePath: string; line: number;
}

interface ClassInfo {
  name: string; description: string;
  extends: string | null; implements: string[];
  properties: Array<{ name, type, visibility, isStatic, isReadonly, description }>;
  methods: Array<{ name, description, parameters, returnType, visibility, isStatic, isAsync }>;
  isAbstract: boolean; isExported: boolean;
}

interface InterfaceInfo {
  name: string; description: string; extends: string[];
  properties: Array<{ name, type, optional, description }>;
  methods: Array<{ name, description, parameters, returnType }>;
}

interface AnalysisResult {
  functions: FunctionInfo[]; classes: ClassInfo[]; interfaces: InterfaceInfo[];
  totalFiles: number; analysisDate: string; projectPath: string;
}
```

### 2.2 TemplateEngine（Markdown生成）

**カスタムHandlebarsヘルパー**:
- `isNotEmpty(array)` - 空配列チェック
- `codeBlock(code, lang)` - コードブロック
- `formatParams(parameters)` - パラメータフォーマット
- `visibilityIcon(visibility)` - 🟢 public / 🔴 private / 🟡 protected
- `modifierBadges(options)` - `static` `async` バッジ
- `formatDate(isoString)` - 日付フォーマット

### 2.3 CLIコマンド

```bash
doc-gen analyze <source> [options]
  --output, -o <dir>      # 出力先（デフォルト: ./docs）
  --tsconfig, -t <path>   # tsconfig.jsonパス
  --template <dir>        # カスタムテンプレート
  --include-private       # プライベートメンバー含む
  --include-source        # ソースコード含む
  --json                  # JSON出力

doc-gen init [options]
  --output, -o <dir>      # テンプレート出力先
```

### 2.4 出力構造

```
docs/
├── README.md        # インデックス（概要）
├── functions.md     # 全エクスポート関数
├── classes.md       # 全エクスポートクラス
└── interfaces.md    # 全エクスポートインターフェース
```

---

## 3. CONTEXT-ENGINEERING - AIプロンプト最適化SDK

**パッケージ**: `@miyabi/context-engineering` v0.1.0
**アーキテクチャ**: TypeScript SDK + FastAPI(Python)バックエンド + Google Gemini AI

### 3.1 システム概要

```
┌─────────────────────────────────────┐
│  TypeScript SDK                      │
│  - ContextEngineering (高レベルAPI)   │
│  - ContextEngineeringClient (HTTP)   │
└──────────────┬──────────────────────┘
               ↓ (HTTP)
┌─────────────────────────────────────┐
│  Context Engineering API (Port 9001) │
│  FastAPI/Python                      │
│  - セッション管理                     │
│  - コンテキストウィンドウ              │
│  - 品質分析・最適化                    │
│  - テンプレート管理                    │
│  - Gemini統合                         │
└─────────────────────────────────────┘
```

### 3.2 核心概念

| 概念 | 説明 |
|---|---|
| **Session** | 関連作業のグルーピングコンテナ |
| **Context Window** | トークンバジェット管理（4K, 8K等） |
| **Context Element** | 個別コンテンツ（system/user/data） |
| **Analysis** | 品質スコアリング（clarity, relevance, token efficiency） |
| **Optimization** | トークン52%削減＋品質向上 |
| **Template** | 変数付き再利用可能プロンプトテンプレート |

### 3.3 型定義

```typescript
interface AnalysisResult {
  window_id: string;
  quality_score: number;        // 0-100
  token_count: number;
  semantic_coherence: number;   // 0-100
  information_density: number;  // 0-100
  clarity_score: number;        // 0-100
  relevance_score: number;      // 0-100
  issues: string[];
  recommendations: string[];
}

interface OptimizationResult {
  original_content: string;
  optimized_content?: string;
  quality_score?: number;
  original_token_count: number;
  optimized_token_count?: number;
  token_reduction_percent?: number;  // 例: 52%
  improvements: string[];
}

interface PromptTemplate {
  template_id: string;
  name: string;
  template: string;
  category: string;
  tags: string[];
  variables: string[];  // 例: ["{language}", "{requirements}"]
  usage_count: number;
}
```

### 3.4 高レベルAPI

```typescript
class ContextEngineering {
  // 分析・最適化
  async analyze(content: string): Promise<AnalysisResult>
  async optimize(request: OptimizationRequest): Promise<OptimizationResult>
  async autoOptimize(content: string): Promise<OptimizationResult>
  async analyzeAndOptimize(content: string, threshold?: number): Promise<{
    analysis: AnalysisResult;
    optimized?: OptimizationResult;
    shouldUseOptimized: boolean;
  }>

  // セッション管理
  async createSession(request): Promise<ContextSession>
  async listSessions(): Promise<ContextSession[]>

  // コンテキストウィンドウ
  async createWindow(request): Promise<ContextWindow>
  async addElement(request): Promise<ContextElement>
  async analyzeWindow(windowId): Promise<AnalysisResult>

  // テンプレート
  async createTemplate(template): Promise<PromptTemplate>
  async generateTemplate(request): Promise<PromptTemplate>
  async renderTemplate(request): Promise<string>

  // システム
  async getStats(): Promise<SystemStats>
  async healthCheck(): Promise<boolean>
}
```

### 3.5 パフォーマンス効果

| メトリクス | 改善 |
|---|---|
| トークン使用量 | **-52%** |
| 品質スコア | **+42%** |
| 応答時間 | **-44%** |
| APIコスト | **-52%** |

### 3.6 エージェント統合パターン

```typescript
class CodeGenAgent {
  private ce = new ContextEngineering();

  async generateCode(requirements: string) {
    // テンプレート取得
    const templates = await this.ce.listTemplates('code-generation', ['typescript']);
    // レンダリング
    const prompt = await this.ce.renderTemplate({ template_id: ..., variables: { requirements } });
    // 分析・最適化
    const result = await this.ce.analyzeAndOptimize(prompt, 80);
    if (result.shouldUseOptimized) {
      return this.generateWithPrompt(result.optimized!.optimized_content);
    }
    return this.generateWithPrompt(prompt);
  }
}
```

### 3.7 MCP サーバー統合

```javascript
// Claude Code向けツール:
list_ai_guides           // AIガイド一覧
search_ai_guides         // ガイド検索
search_guides_with_gemini // セマンティック検索
analyze_guide            // ガイド内容分析
analyze_guide_url        // URL内容分析
compare_guides           // 複数ガイド比較
```

### 3.8 バックエンドAPIエンドポイント

```
Session: POST/GET/DELETE /api/sessions
Context: POST/GET /api/contexts, /api/contexts/{id}/elements
Analysis: POST /api/analyze, /api/optimize, /api/auto-optimize
Templates: POST/GET/PUT/DELETE /api/templates, /api/templates/generate, /api/templates/{id}/render
System: GET /api/stats, /api/health
WebSocket: /ws (リアルタイム更新)
```
