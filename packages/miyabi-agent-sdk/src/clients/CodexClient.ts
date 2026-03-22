/**
 * Codex Client
 *
 * OpenAI Codex CLI (v0.116.0) を使用したローカル実行クライアント。
 * サブスクリプションベースなので $0 で動作する。
 * Codex はファイル操作とコーディングタスクに特化している。
 *
 * ClaudeCodeClient.ts と同じパターンで実装。
 */
import { spawn } from "child_process";

export interface CodexResponse {
  content: string;
  tokensUsed?: {
    input: number;
    output: number;
  };
  cost?: number;
}

export class CodexClient {
  private codexCommand: string;
  private model?: string;

  constructor(codexCommand = "codex", model?: string) {
    this.codexCommand = codexCommand;
    this.model = model;
  }

  /**
   * Codex CLI でプロンプトを実行
   *
   * `codex exec -` で stdin からプロンプトを渡して非対話的に実行する。
   * stdin 経由なのでシェルエスケープ問題を回避できる。
   */
  async executePrompt(
    prompt: string,
    options?: { timeout?: number; workingDir?: string }
  ): Promise<CodexResponse> {
    return new Promise((resolve, reject) => {
      // codex exec - で stdin からプロンプトを渡す
      const args: string[] = ["exec"];

      // --model フラグでモデルを指定
      if (this.model) {
        args.push("--model", this.model);
      }

      args.push("-"); // stdin からプロンプトを読み取る

      const proc = spawn(this.codexCommand, args, {
        cwd: options?.workingDir || process.cwd(),
        shell: process.platform === "win32", // Windows では .cmd 解決に shell が必要
      });

      // stdin でプロンプトを送信
      proc.stdin.write(prompt);
      proc.stdin.end();

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      const timeoutId = options?.timeout
        ? setTimeout(() => {
            proc.kill();
            reject(
              new Error(
                `Codex execution timed out after ${options.timeout}ms`
              )
            );
          }, options.timeout)
        : null;

      proc.on("close", (code: number | null) => {
        if (timeoutId) clearTimeout(timeoutId);

        if (code === 0) {
          resolve({
            content: stdout.trim(),
            tokensUsed: {
              input: Math.floor(prompt.length / 4),
              output: Math.floor(stdout.length / 4),
            },
            cost: 0, // サブスクリプションベースなので無料
          });
        } else {
          reject(
            new Error(
              `Codex failed with exit code ${code}\nStderr: ${stderr}`
            )
          );
        }
      });

      proc.on("error", (error: Error) => {
        if (timeoutId) clearTimeout(timeoutId);
        reject(new Error(`Failed to spawn Codex: ${error.message}`));
      });
    });
  }

  /**
   * コードを生成
   *
   * Codex のファイル操作・コーディング特化能力を活用する。
   */
  async generateCode(requirements: {
    taskId: string;
    requirements: string;
    context: string;
    language: string;
  }): Promise<{
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
  }> {
    const prompt = `Generate code for this task. Return ONLY a JSON object (no markdown code blocks):

Task: ${requirements.requirements}

Context: ${requirements.context}

Language: ${requirements.language}

Return JSON format:
{
  "files": [
    {
      "path": "src/example.ts",
      "content": "...",
      "action": "create"
    }
  ],
  "tests": [
    {
      "path": "src/example.test.ts",
      "content": "...",
      "action": "create"
    }
  ],
  "qualityScore": 95
}`;

    const response = await this.executePrompt(prompt, { timeout: 120000 });
    return this.parseJSON(response.content);
  }

  /**
   * コードをレビュー
   *
   * Codex でコード品質を分析し、問題点と改善提案を返す。
   */
  async reviewCode(
    files: Array<{ path: string; content: string }>
  ): Promise<{
    qualityScore: number;
    passed: boolean;
    issues: Array<{
      severity: string;
      message: string;
      file?: string;
      line?: number;
    }>;
    suggestions: string[];
  }> {
    const filesStr = files
      .map((f) => `File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join("\n\n");

    const prompt = `Review this code and return ONLY a JSON object (no markdown code blocks):

${filesStr}

Return JSON format:
{
  "qualityScore": 85,
  "passed": true,
  "issues": [
    {
      "severity": "warning",
      "message": "Consider adding error handling",
      "file": "src/example.ts",
      "line": 42
    }
  ],
  "suggestions": ["Add more test cases", "Improve documentation"]
}`;

    const response = await this.executePrompt(prompt, { timeout: 90000 });
    return this.parseJSON(response.content);
  }

  /**
   * テストを実行
   *
   * Codex 経由でテストコマンドを実行し、結果を構造化して返す。
   */
  async runTests(testCommand: string): Promise<{
    passed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    output: string;
    failures: Array<{
      testName: string;
      message: string;
      file?: string;
    }>;
  }> {
    const prompt = `Run the following test command and return ONLY a JSON object with the results (no markdown code blocks):

Command: ${testCommand}

Return JSON format:
{
  "passed": true,
  "totalTests": 10,
  "passedTests": 10,
  "failedTests": 0,
  "output": "...",
  "failures": []
}

If tests fail, include failure details:
{
  "passed": false,
  "totalTests": 10,
  "passedTests": 8,
  "failedTests": 2,
  "output": "...",
  "failures": [
    {
      "testName": "should handle edge case",
      "message": "Expected true but got false",
      "file": "src/example.test.ts"
    }
  ]
}`;

    const response = await this.executePrompt(prompt, { timeout: 180000 });
    return this.parseJSON(response.content);
  }

  /**
   * コードをリファクタリング
   *
   * Codex のコーディング特化能力でリファクタリングを実行する。
   */
  async refactorCode(
    files: Array<{ path: string; content: string }>,
    instructions: string
  ): Promise<{
    files: Array<{
      path: string;
      content: string;
      action: "create" | "modify" | "delete";
    }>;
    changes: Array<{
      file: string;
      description: string;
    }>;
    qualityScore: number;
  }> {
    const filesStr = files
      .map((f) => `File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join("\n\n");

    const prompt = `Refactor the following code according to the instructions. Return ONLY a JSON object (no markdown code blocks):

Instructions: ${instructions}

${filesStr}

Return JSON format:
{
  "files": [
    {
      "path": "src/example.ts",
      "content": "... refactored code ...",
      "action": "modify"
    }
  ],
  "changes": [
    {
      "file": "src/example.ts",
      "description": "Extracted helper function for readability"
    }
  ],
  "qualityScore": 90
}`;

    const response = await this.executePrompt(prompt, { timeout: 120000 });
    return this.parseJSON(response.content);
  }

  /**
   * JSON パース（複数パターン対応）
   */
  private parseJSON(text: string): any {
    // Pattern 1: ```json ... ```
    let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // next
      }
    }

    // Pattern 2: ``` ... ```
    jsonMatch = text.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // next
      }
    }

    // Pattern 3: { ... }
    jsonMatch = text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // next
      }
    }

    // Pattern 4: raw text
    try {
      return JSON.parse(text.trim());
    } catch (error) {
      throw new Error(
        `Failed to parse Codex response as JSON: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
