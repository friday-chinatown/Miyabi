# Fix Log: miyabi-agent-sdk Agent and Client Fixes

**Date**: 2026-03-22
**Scope**: `packages/miyabi-agent-sdk/src/`
**Build Result**: `npx tsc --noEmit` -- 0 errors (clean pass)

---

## Summary of Changes

Six files were modified across the miyabi-agent-sdk package:

1. Added CodexClient as the preferred provider for code generation and review
2. Fixed TypeScript compilation error in TaskRouter.ts (unused parameter)
3. Updated barrel exports to include CodexClient

---

## File-by-File Changes

### 1. `src/agents/CodeGenAgent.ts`

**What changed**: Added CodexClient as the preferred (first-tried) provider for code generation, with graceful fallback to ClaudeCodeClient, then AnthropicClient, then Mock.

**Changes**:

- **Import**: Added `import { CodexClient } from "../clients/CodexClient.js";`
- **CodeGenInput interface**: Added `codexClient?: CodexClient` field
- **CodeGenConfig interface**: Added `useCodex?: boolean` field
- **CodeGenAgent class**: Added `private codexClient?: CodexClient` member
- **Constructor**: Added `if (config.useCodex) { this.codexClient = new CodexClient(); }` block (before ClaudeCode/Anthropic init)
- **generate() method**: Added `codexClient` resolution from input or instance, included it in `useRealAPI` check, passed to `generateCode()`
- **generateCode() method**:
  - Moved `contextStr` computation before all provider branches to avoid duplication
  - Added Mode 0 (Codex) as the first provider attempted, wrapped in try/catch for graceful fallback
  - Updated parameter signature to accept `codexClient?: CodexClient`

**Before** (provider cascade in `generateCode`):
```typescript
private async generateCode(
    requirements, context, language,
    anthropicClient?, claudeCodeClient?, useRealAPI?
) {
    if (useRealAPI && claudeCodeClient) { /* Mode 1 */ }
    if (useRealAPI && anthropicClient)  { /* Mode 2 */ }
    // Mode 3: Mock
}
```

**After** (4-tier cascade):
```typescript
private async generateCode(
    requirements, context, language,
    anthropicClient?, claudeCodeClient?, codexClient?, useRealAPI?
) {
    // Mode 0: Codex CLI (preferred, try/catch fallback)
    if (useRealAPI && codexClient) { try { ... } catch { /* fall through */ } }
    // Mode 1: Claude Code CLI
    if (useRealAPI && claudeCodeClient) { ... }
    // Mode 2: Anthropic API
    if (useRealAPI && anthropicClient) { ... }
    // Mode 3: Mock
}
```

---

### 2. `src/agents/ReviewAgent.ts`

**What changed**: Added CodexClient as the preferred provider for code review with the same fallback pattern.

**Changes**:

- **Import**: Added `import { CodexClient } from "../clients/CodexClient.js";`
- **ReviewInput interface**: Added `codexClient?: CodexClient` field
- **ReviewAgentConfig interface**: Added `useCodex?: boolean` field
- **ReviewAgent class**: Added `private codexClient?: CodexClient` member
- **Constructor**: Added `if (config.useCodex) { this.codexClient = new CodexClient(); }` block
- **review() method**:
  - Added `codexClient` resolution, included in `useRealAPI` check
  - Added Mode 0 (Codex) block before ClaudeCode, with try/catch fallback
  - Maps Codex `reviewCode()` response to ReviewOutput format (same as ClaudeCode mapping)

**Before** (provider cascade in `review`):
```typescript
if (useRealAPI && claudeCodeClient) { /* ClaudeCode review */ }
if (useRealAPI && anthropicClient)  { /* Anthropic review */ }
// Mock: static analysis
```

**After** (4-tier cascade):
```typescript
// Mode 0: Codex (preferred, try/catch fallback)
if (useRealAPI && codexClient) { try { ... } catch { /* fall through */ } }
// Mode 1: ClaudeCode
if (useRealAPI && claudeCodeClient) { ... }
// Mode 2: Anthropic API
if (useRealAPI && anthropicClient)  { ... }
// Mode 3: Mock static analysis
```

---

### 3. `src/agents/IssueAgent.ts`

**What changed**: No modifications needed. IssueAgent is analysis-focused (not code generation/review), so Codex does not provide a meaningful advantage over Claude for issue triage. The existing ClaudeCode -> Anthropic -> Mock cascade is correct.

---

### 4. `src/clients/ClaudeCodeClient.ts`

**What changed**: No modifications needed. The `--output-format json` envelope handling was already correctly implemented:

- `executePrompt()` (lines 83-89) already parses the JSON envelope and extracts `envelope.result` before returning it as `content`
- The `parseJSON()` method then receives the already-extracted inner content (not the envelope), so it works correctly
- Flow: `claude -p --output-format json` -> stdout JSON envelope -> `executePrompt` extracts `.result` -> `parseJSON` parses the inner content

---

### 5. `src/clients/CodexClient.ts`

**What changed**: No modifications needed. The client already has `generateCode()` and `reviewCode()` methods with the correct signatures matching what CodeGenAgent and ReviewAgent expect.

---

### 6. `src/clients/TaskRouter.ts`

**What changed**: Fixed TypeScript compilation error `TS6133: 'options' is declared but its value is never read.`

**Before**:
```typescript
async executePrompt(
    prompt: string,
    options?: ExecutePromptOptions
): Promise<LLMProviderResponse> {
```

**After**:
```typescript
async executePrompt(
    prompt: string,
    _options?: ExecutePromptOptions
): Promise<LLMProviderResponse> {
```

This was in the `AnthropicAPIProvider` class (line 438). The `options` parameter is part of the `LLMProvider` interface but unused in this implementation because `AnthropicClient.generateCode()` does not accept options. Prefixing with `_` suppresses `noUnusedParameters`.

---

### 7. `src/clients/index.ts`

**What changed**: Added CodexClient exports.

**Before**:
```typescript
export { ClaudeCodeClient } from "./ClaudeCodeClient.js";
export type { ClaudeCodeResponse } from "./ClaudeCodeClient.js";
export { AnthropicClient } from "./AnthropicClient.js";
```

**After**:
```typescript
export { ClaudeCodeClient } from "./ClaudeCodeClient.js";
export type { ClaudeCodeResponse } from "./ClaudeCodeClient.js";
export { CodexClient } from "./CodexClient.js";
export type { CodexResponse } from "./CodexClient.js";
export { AnthropicClient } from "./AnthropicClient.js";
```

---

### 8. `src/index.ts`

**What changed**: Added CodexClient and CodexResponse to the top-level SDK exports.

**Before**:
```typescript
export {
  ClaudeCodeClient,
  AnthropicClient,
  GitHubClient,
} from './clients/index.js';
export type {
  ClaudeCodeResponse,
  GitHubIssueData, GitHubFile, PullRequestInfo,
} from './clients/index.js';
```

**After**:
```typescript
export {
  ClaudeCodeClient,
  CodexClient,
  AnthropicClient,
  GitHubClient,
} from './clients/index.js';
export type {
  ClaudeCodeResponse,
  CodexResponse,
  GitHubIssueData, GitHubFile, PullRequestInfo,
} from './clients/index.js';
```

---

## Provider Priority (Final Architecture)

Both CodeGenAgent and ReviewAgent now use this 4-tier provider cascade:

| Priority | Provider | Cost | Specialty | Failure Handling |
|----------|----------|------|-----------|-----------------|
| 0 (preferred) | CodexClient | $0 (subscription) | Coding-specialized | try/catch, falls through |
| 1 | ClaudeCodeClient | $0 (subscription) | General-purpose CLI | throws on failure |
| 2 | AnthropicClient | Paid API | CI/CD environments | throws on failure |
| 3 | Mock | $0 | Template/static analysis | always succeeds |

Codex is tried first because it is specifically optimized for code generation and review tasks. If Codex CLI is not installed or fails, the system gracefully falls back to Claude Code CLI.

---

## Build Verification

```
$ cd packages/miyabi-agent-sdk && npx tsc --noEmit
(no output - 0 errors)
```

Before fixes: 1 error (`TS6133` in TaskRouter.ts)
After fixes: 0 errors
