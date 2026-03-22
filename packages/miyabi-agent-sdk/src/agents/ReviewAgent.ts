/**
 * ReviewAgent - コード品質判定 Agent
 *
 * 3モード実行:
 * 1. ClaudeCodeClient (claude -p) — $0 ローカル実行
 * 2. AnthropicClient (API直接)  — 有料
 * 3. Mock (静的解析)             — フォールバック
 */
import { AnthropicClient } from "../clients/AnthropicClient.js";
import { ClaudeCodeClient } from "../clients/ClaudeCodeClient.js";
import { CodexClient } from "../clients/CodexClient.js";

export interface ReviewInput {
  files: Array<{
    path: string;
    content: string;
    action: string;
  }>;
  standards: {
    minQualityScore: number;
    requireTests: boolean;
    securityScan: boolean;
  };
  useRealAPI?: boolean;
  anthropicClient?: AnthropicClient;
  claudeCodeClient?: ClaudeCodeClient;
  codexClient?: CodexClient;
}

export interface ReviewOutput {
  success: boolean;
  data?: {
    qualityScore: number;
    passed: boolean;
    issues: Array<{
      severity: string;
      file: string;
      line?: number;
      message: string;
    }>;
    coverage: number;
    suggestions: string[];
    tokensUsed?: { input: number; output: number };
    cost?: number;
  };
  error?: string;
}

interface ReviewAgentConfig {
  anthropicApiKey?: string;
  useClaudeCode?: boolean;
  useCodex?: boolean;
}

export class ReviewAgent {
  private anthropicClient?: AnthropicClient;
  private claudeCodeClient?: ClaudeCodeClient;
  private codexClient?: CodexClient;

  constructor(config?: ReviewAgentConfig) {
    if (config) {
      if (config.useCodex) {
        this.codexClient = new CodexClient();
      }
      if (config.useClaudeCode) {
        this.claudeCodeClient = new ClaudeCodeClient();
      } else if (config.anthropicApiKey) {
        this.anthropicClient = new AnthropicClient(config.anthropicApiKey);
      }
    }
  }

  async review(input: ReviewInput): Promise<ReviewOutput> {
    try {
      const anthropicClient = input.anthropicClient || this.anthropicClient;
      const claudeCodeClient = input.claudeCodeClient || this.claudeCodeClient;
      const codexClient = input.codexClient || this.codexClient;
      const useRealAPI =
        input.useRealAPI !== false && !!(anthropicClient || claudeCodeClient || codexClient);

      // Mode 0: Codex CLI (preferred for code review — coding-specialized)
      if (useRealAPI && codexClient) {
        try {
          const result = await codexClient.reviewCode(
            input.files.map((f) => ({ path: f.path, content: f.content }))
          );
          const coverage = input.standards.requireTests
            ? await this.checkCoverage(input.files)
            : { percentage: 0 };

          return {
            success: true,
            data: {
              qualityScore: result.qualityScore,
              passed: result.passed,
              issues: result.issues.map((issue) => ({
                severity: issue.severity,
                file: issue.file || "",
                line: issue.line,
                message: issue.message,
              })),
              coverage: coverage.percentage,
              suggestions: result.suggestions,
              tokensUsed: { input: 0, output: 0 },
              cost: 0,
            },
          };
        } catch {
          // Codex failed, fall through to Claude Code
        }
      }

      if (useRealAPI && claudeCodeClient) {
        const result = await claudeCodeClient.reviewCode(
          input.files.map((f) => ({ path: f.path, content: f.content }))
        );
        const coverage = input.standards.requireTests
          ? await this.checkCoverage(input.files)
          : { percentage: 0 };

        return {
          success: true,
          data: {
            qualityScore: result.qualityScore,
            passed: result.passed,
            issues: result.issues.map((issue) => ({
              severity: issue.severity,
              file: issue.file || "",
              line: issue.line,
              message: issue.message,
            })),
            coverage: coverage.percentage,
            suggestions: result.suggestions,
            tokensUsed: { input: 0, output: 0 },
            cost: 0,
          },
        };
      }

      if (useRealAPI && anthropicClient) {
        const result = await anthropicClient.reviewCode(
          input.files.map((f) => ({ path: f.path, content: f.content })),
          input.standards
        );
        const cost = anthropicClient.calculateCost(result.tokensUsed);
        const coverage = input.standards.requireTests
          ? await this.checkCoverage(input.files)
          : { percentage: 0 };

        return {
          success: true,
          data: {
            qualityScore: result.qualityScore,
            passed: result.passed,
            issues: result.issues,
            coverage: coverage.percentage,
            suggestions: result.suggestions,
            tokensUsed: result.tokensUsed,
            cost,
          },
        };
      }

      // Mock: 静的解析ベース
      const [staticAnalysis, securityScan, coverage] = await Promise.all([
        this.runStaticAnalysis(input.files),
        input.standards.securityScan
          ? this.runSecurityScan(input.files)
          : Promise.resolve({
              passed: true,
              issues: [] as Array<{
                severity: string;
                file: string;
                message: string;
              }>,
            }),
        input.standards.requireTests
          ? this.checkCoverage(input.files)
          : Promise.resolve({ percentage: 0 }),
      ]);

      const qualityScore = this.calculateQualityScore({
        staticAnalysis,
        securityScan,
        coverage,
      });
      const passed = qualityScore >= input.standards.minQualityScore;
      const suggestions = this.generateSuggestions({
        staticAnalysis,
        securityScan,
        coverage,
        qualityScore,
        minQualityScore: input.standards.minQualityScore,
      });

      return {
        success: true,
        data: {
          qualityScore,
          passed,
          issues: [...staticAnalysis.issues, ...securityScan.issues],
          coverage: coverage.percentage,
          suggestions,
          tokensUsed: undefined,
          cost: undefined,
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

  private async runStaticAnalysis(
    files: Array<{ path: string; content: string; action: string }>
  ): Promise<{
    errorCount: number;
    warningCount: number;
    issues: Array<{
      severity: string;
      file: string;
      line?: number;
      message: string;
    }>;
  }> {
    const issues: Array<{
      severity: string;
      file: string;
      line?: number;
      message: string;
    }> = [];

    for (const file of files) {
      if (file.path.includes("bad")) {
        issues.push({
          severity: "error",
          file: file.path,
          line: 1,
          message: "Bad pattern detected in filename",
        });
      }
      if (file.content.length > 1000) {
        issues.push({
          severity: "warning",
          file: file.path,
          message: "File is too large, consider splitting",
        });
      }
    }

    return {
      errorCount: issues.filter((i) => i.severity === "error").length,
      warningCount: issues.filter((i) => i.severity === "warning").length,
      issues,
    };
  }

  private async runSecurityScan(
    files: Array<{ path: string; content: string; action: string }>
  ): Promise<{
    passed: boolean;
    issues: Array<{ severity: string; file: string; message: string }>;
  }> {
    const issues: Array<{ severity: string; file: string; message: string }> =
      [];
    const dangerousPatterns = [
      "password",
      "api_key",
      "secret",
      "token",
      "private_key",
    ];

    for (const file of files) {
      for (const pattern of dangerousPatterns) {
        if (file.content.toLowerCase().includes(pattern)) {
          issues.push({
            severity: "error",
            file: file.path,
            message: `Potential secret detected: ${pattern}`,
          });
        }
      }
    }

    return { passed: issues.length === 0, issues };
  }

  private async checkCoverage(
    files: Array<{ path: string; content: string }>
  ): Promise<{ percentage: number }> {
    const testFiles = files.filter((f) => f.path.includes(".test."));
    const sourceFiles = files.filter((f) => !f.path.includes(".test."));
    const percentage =
      sourceFiles.length > 0
        ? Math.min(100, (testFiles.length / sourceFiles.length) * 100)
        : 0;
    return { percentage };
  }

  private calculateQualityScore(metrics: {
    staticAnalysis: { errorCount: number; warningCount: number };
    securityScan: { passed: boolean };
    coverage: { percentage: number };
  }): number {
    const staticScore = Math.max(
      0,
      40 -
        metrics.staticAnalysis.errorCount * 10 -
        metrics.staticAnalysis.warningCount * 2
    );
    const securityScore = metrics.securityScan.passed ? 30 : 0;
    const coverageScore = Math.min(
      30,
      (metrics.coverage.percentage / 80) * 30
    );
    return Math.round(Math.max(0, Math.min(100, staticScore + securityScore + coverageScore)));
  }

  private generateSuggestions(params: {
    staticAnalysis: { errorCount: number; warningCount: number };
    securityScan: { passed: boolean };
    coverage: { percentage: number };
    qualityScore: number;
    minQualityScore: number;
  }): string[] {
    const suggestions: string[] = [];
    if (params.staticAnalysis.errorCount > 0) {
      suggestions.push(
        `Fix ${params.staticAnalysis.errorCount} static analysis error(s)`
      );
    }
    if (params.staticAnalysis.warningCount > 5) {
      suggestions.push(
        `Address ${params.staticAnalysis.warningCount} linter warnings`
      );
    }
    if (!params.securityScan.passed) {
      suggestions.push(
        "Security scan failed - remove secrets and fix vulnerabilities"
      );
    }
    if (params.coverage.percentage < 80) {
      suggestions.push(
        `Increase test coverage from ${params.coverage.percentage.toFixed(1)}% to at least 80%`
      );
    }
    if (params.qualityScore < params.minQualityScore) {
      const gap = params.minQualityScore - params.qualityScore;
      suggestions.push(
        `Quality score is ${gap} points below threshold (${params.qualityScore}/${params.minQualityScore})`
      );
    }
    if (suggestions.length === 0) {
      suggestions.push("Code quality meets all standards - ready for PR");
    }
    return suggestions;
  }
}
