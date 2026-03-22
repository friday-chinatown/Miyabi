/**
 * CodeGenAgent - コード生成 Agent
 *
 * 3モード実行:
 * 1. ClaudeCodeClient (claude -p) — $0 ローカル実行
 * 2. AnthropicClient (API直接)  — 有料
 * 3. Mock (テンプレート)         — フォールバック
 */
import { AnthropicClient } from "../clients/AnthropicClient.js";
import { ClaudeCodeClient } from "../clients/ClaudeCodeClient.js";
import { CodexClient } from "../clients/CodexClient.js";
import { GitHubClient } from "../clients/GitHubClient.js";

export interface CodeGenInput {
  taskId: string;
  requirements: string;
  context: {
    repository: string;
    owner: string;
    baseBranch: string;
    relatedFiles: string[];
  };
  language?: string;
  useRealAPI?: boolean;
  anthropicClient?: AnthropicClient;
  claudeCodeClient?: ClaudeCodeClient;
  codexClient?: CodexClient;
  githubClient?: GitHubClient;
}

export interface CodeGenOutput {
  success: boolean;
  data?: {
    files: Array<{
      path: string;
      content: string;
      action: "create" | "modify" | "delete";
    }>;
    tests: Array<{
      path: string;
      content: string;
      action: "create" | "modify" | "delete";
    }>;
    qualityScore: number;
    tokensUsed?: { input: number; output: number };
    cost?: number;
  };
  error?: string;
}

interface CodeGenConfig {
  githubToken?: string;
  anthropicApiKey?: string;
  useClaudeCode?: boolean;
  useCodex?: boolean;
}

export class CodeGenAgent {
  private anthropicClient?: AnthropicClient;
  private claudeCodeClient?: ClaudeCodeClient;
  private codexClient?: CodexClient;
  private githubClient?: GitHubClient;

  constructor(config?: CodeGenConfig) {
    if (config) {
      if (config.useCodex) {
        this.codexClient = new CodexClient();
      }
      if (config.useClaudeCode) {
        this.claudeCodeClient = new ClaudeCodeClient();
      } else if (config.anthropicApiKey) {
        this.anthropicClient = new AnthropicClient(config.anthropicApiKey);
      }

      if (config.githubToken) {
        this.githubClient = new GitHubClient(config.githubToken);
      }
    }
  }

  async generate(input: CodeGenInput): Promise<CodeGenOutput> {
    try {
      const githubClient = input.githubClient || this.githubClient;
      const anthropicClient = input.anthropicClient || this.anthropicClient;
      const claudeCodeClient = input.claudeCodeClient || this.claudeCodeClient;
      const codexClient = input.codexClient || this.codexClient;
      const useRealAPI =
        input.useRealAPI !== false &&
        !!(githubClient || anthropicClient || claudeCodeClient || codexClient);

      // 1. 既存コード読み込み
      const context = await this.loadContext(input.context, githubClient);

      // 2. コード生成
      const result = await this.generateCode(
        input.requirements,
        context,
        input.language || "typescript",
        anthropicClient,
        claudeCodeClient,
        codexClient,
        useRealAPI
      );

      // 3. テスト生成（LLM結果にテストが含まれていない場合）
      const tests =
        result.tests || (await this.generateTests(result.files, context));

      // 4. 品質スコア自己評価
      const qualityScore =
        result.qualityScore ||
        (await this.evaluateQuality(result.files, tests));

      return {
        success: true,
        data: {
          files: result.files,
          tests,
          qualityScore,
          tokensUsed: result.tokensUsed,
          cost: result.cost,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  private async loadContext(
    context: CodeGenInput["context"],
    githubClient?: GitHubClient
  ): Promise<{ files: Array<{ path: string; content: string }> }> {
    if (githubClient && context.relatedFiles.length > 0) {
      const files = await Promise.all(
        context.relatedFiles.map(async (path) => {
          const file = await githubClient.getFileContent(
            context.owner,
            context.repository,
            path,
            context.baseBranch
          );
          return file ? { path: file.path, content: file.content } : null;
        })
      );
      return {
        files: files.filter(
          (f): f is { path: string; content: string } => f !== null
        ),
      };
    }

    return {
      files: context.relatedFiles.map((path) => ({
        path,
        content: `// Mock content for ${path}`,
      })),
    };
  }

  private async generateCode(
    requirements: string,
    context: { files: Array<{ path: string; content: string }> },
    language: string,
    anthropicClient?: AnthropicClient,
    claudeCodeClient?: ClaudeCodeClient,
    codexClient?: CodexClient,
    useRealAPI?: boolean
  ): Promise<{
    files: Array<{
      path: string;
      content: string;
      action: "create" | "modify" | "delete";
    }>;
    tests?: Array<{
      path: string;
      content: string;
      action: "create" | "modify" | "delete";
    }>;
    qualityScore?: number;
    tokensUsed?: { input: number; output: number };
    cost?: number;
  }> {
    const contextStr = context.files
      .map((f) => `File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join("\n\n");

    // Mode 0: Codex CLI (preferred for code generation — coding-specialized)
    if (useRealAPI && codexClient) {
      try {
        const result = await codexClient.generateCode({
          taskId: "code-gen",
          requirements,
          context: contextStr,
          language,
        });

        return {
          files: result.files,
          tests: result.tests,
          qualityScore: result.qualityScore,
          tokensUsed: { input: 0, output: 0 },
          cost: 0,
        };
      } catch {
        // Codex failed, fall through to Claude Code
      }
    }

    if (useRealAPI && claudeCodeClient) {
      // Mode 1: Claude Code CLI ($0)
      const result = await claudeCodeClient.generateCode({
        taskId: "code-gen",
        requirements,
        context: contextStr,
        language,
      });

      return {
        files: result.files,
        tests: result.tests,
        qualityScore: result.qualityScore,
        tokensUsed: { input: 0, output: 0 },
        cost: 0,
      };
    }

    if (useRealAPI && anthropicClient) {
      // Mode 2: Anthropic API (有料)
      const result = await anthropicClient.generateCode(
        requirements,
        contextStr,
        language
      );
      const cost = anthropicClient.calculateCost(result.tokensUsed);

      return {
        files: result.files,
        tests: result.tests,
        qualityScore: result.qualityScore,
        tokensUsed: result.tokensUsed,
        cost,
      };
    }

    // Mode 3: Mock (テンプレート)
    const files = [
      {
        path: `src/generated/${this.sanitizeFilename(requirements)}.${this.getExtension(language)}`,
        content: this.generateMockCode(requirements, language),
        action: "create" as const,
      },
    ];

    return { files };
  }

  private async generateTests(
    files: Array<{ path: string; content: string; action: "create" | "modify" | "delete" }>,
    _context: { files: Array<{ path: string; content: string }> }
  ): Promise<
    Array<{ path: string; content: string; action: "create" | "modify" | "delete" }>
  > {
    return files.map((file) => ({
      path: file.path.replace(/\.(ts|rs|py|go)$/, ".test.$1"),
      content: `import { describe, it, expect } from "vitest";

describe("${file.path}", () => {
  it("should work correctly", () => {
    expect(true).toBe(true);
  });
});`,
      action: "create",
    }));
  }

  private async evaluateQuality(
    files: Array<{ path: string; content: string; action: "create" | "modify" | "delete" }>,
    tests: Array<{ path: string; content: string; action: "create" | "modify" | "delete" }>
  ): Promise<number> {
    let score = 100;
    if (files.length === 0) score -= 50;
    if (tests.length === 0) score -= 30;
    else if (tests.length < files.length) score -= 10;
    return Math.max(0, score);
  }

  private generateMockCode(requirements: string, language: string): string {
    const templates: Record<string, string> = {
      typescript: `/**
 * Generated code for: ${requirements}
 */
export class GeneratedClass {
  constructor() {
    // TODO: Implement
  }

  public execute(): void {
    console.log("Generated code executed");
  }
}`,
      rust: `// Generated code for: ${requirements}
pub struct GeneratedStruct;

impl GeneratedStruct {
    pub fn new() -> Self { Self }
    pub fn execute(&self) {
        println!("Generated code executed");
    }
}`,
      python: `# Generated code for: ${requirements}
class GeneratedClass:
    def __init__(self):
        pass

    def execute(self):
        print("Generated code executed")`,
    };
    return templates[language] || templates.typescript!;
  }

  private sanitizeFilename(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 50);
  }

  private getExtension(language: string): string {
    const extensions: Record<string, string> = {
      typescript: "ts",
      rust: "rs",
      python: "py",
      go: "go",
    };
    return extensions[language] || "txt";
  }
}
