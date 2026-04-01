/**
 * プロバイダーテストスクリプト
 *
 * Claude CLI と Codex CLI の動作確認を行う。
 *
 * 使い方:
 *   npx tsx scripts/test-providers.ts
 */
import { ClaudeCodeClient } from "../packages/miyabi-agent-sdk/src/clients/ClaudeCodeClient.js";
import { CodexClient } from "../packages/miyabi-agent-sdk/src/clients/CodexClient.js";

async function main() {
  console.log("=== プロバイダー動作テスト ===\n");

  // --- 1. Claude CLI テスト ---
  console.log("📘 [1/4] Claude CLI ヘルスチェック...");
  try {
    const claude = new ClaudeCodeClient();
    const claudeResult = await claude.executePrompt(
      'echo "hello" と返してください。それだけ返してください。',
      { timeout: 30000 }
    );
    console.log(`   ✅ Claude CLI OK: "${claudeResult.content.slice(0, 50)}"`);
  } catch (e: any) {
    console.log(`   ❌ Claude CLI 失敗: ${e.message}`);
  }

  // --- 2. Codex CLI テスト ---
  console.log("\n📙 [2/4] Codex CLI ヘルスチェック...");
  try {
    const codex = new CodexClient();
    const codexResult = await codex.executePrompt(
      'echo "hello" と返してください。それだけ返してください。',
      { timeout: 30000 }
    );
    console.log(`   ✅ Codex CLI OK: "${codexResult.content.slice(0, 50)}"`);
  } catch (e: any) {
    console.log(`   ❌ Codex CLI 失敗: ${e.message}`);
  }

  // --- 3. Claude CLI で分析タスク（司令塔） ---
  console.log("\n📘 [3/4] Claude CLI 分析タスク（司令塔）...");
  try {
    const claude = new ClaudeCodeClient();
    const analysis = await claude.analyzeIssue({
      title: "ログイン画面にダークモードを追加",
      body: "ユーザーからダークモード対応の要望が来ています。設定画面にトグルを追加してください。",
      number: 999,
    });
    console.log(`   ✅ 分析結果:`);
    console.log(`      タイプ: ${analysis.type}`);
    console.log(`      複雑度: ${analysis.complexity}`);
    console.log(`      優先度: ${analysis.priority}`);
    console.log(`      ラベル: ${analysis.labels?.join(", ")}`);
  } catch (e: any) {
    console.log(`   ❌ 分析失敗: ${e.message}`);
  }

  // --- 4. Codex CLI でコーディングタスク（ワーカー） ---
  console.log("\n📙 [4/4] Codex CLI コーディングタスク（ワーカー）...");
  try {
    const codex = new CodexClient();
    const review = await codex.reviewCode([
      {
        path: "src/example.ts",
        content: `
function add(a: number, b: number): number {
  return a + b;
}

export { add };
`,
      },
    ]);
    console.log(`   ✅ レビュー結果:`);
    console.log(`      スコア: ${review.qualityScore}/100`);
    console.log(`      合格: ${review.passed ? "✅" : "❌"}`);
    console.log(`      問題数: ${review.issues?.length || 0}`);
  } catch (e: any) {
    console.log(`   ❌ レビュー失敗: ${e.message}`);
  }

  console.log("\n=== テスト完了 ===");
}

main().catch(console.error);
