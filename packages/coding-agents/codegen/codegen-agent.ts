/**
 * CodeGenAgent - AI-Driven Code Generation Agent
 *
 * Responsibilities:
 * - Generate code from specifications
 * - Generate unit tests automatically
 * - Generate documentation
 * - Ensure TypeScript type safety
 * - Follow existing code patterns
 *
 * Uses Claude Code integration via Worktree execution
 */

import { BaseAgent } from '../base-agent';
import type {
  AgentResult,
  AgentConfig,
  Task,
  CodeSpec,
  GeneratedCode,
  AgentMetrics,
} from '../types/index';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

// Ω-System imports (optional - for enhanced execution)
import {
  OmegaAgentAdapter,
  type AgentExecutionRequest,
} from '../omega-system/adapters';

export class CodeGenAgent extends BaseAgent {
  private omegaAdapter?: OmegaAgentAdapter;

  constructor(config: AgentConfig) {
    super('CodeGenAgent', config);

    // Initialize Ω-System adapter if enabled
    if (config.useOmegaSystem) {
      this.omegaAdapter = new OmegaAgentAdapter({
        enableLearning: true,
        validateBetweenStages: true,
        maxExecutionTimeMs: config.timeoutMs || 600000,
      });
      this.log('Ω Ω-System adapter initialized for code generation');
    }
  }

  /**
   * Main execution: Generate code from task specification
   */
  async execute(task: Task): Promise<AgentResult> {
    this.log('🤖 CodeGenAgent starting code generation');

    try {
      // 1. Analyze task and create code specification
      const codeSpec = await this.createCodeSpec(task);

      // 2. Analyze existing codebase
      const context = await this.analyzeCodebase();

      // 3. Generate code using Claude
      const generatedCode = await this.generateCode(codeSpec, context);

      // 4. Generate tests
      const tests = this.generateTests(generatedCode, codeSpec);
      generatedCode.tests = tests;

      // 5. Generate documentation
      const documentation = this.generateDocumentation(generatedCode, codeSpec);
      generatedCode.documentation = documentation;

      // 6. Validate generated code
      this.validateCode(generatedCode);

      // 7. Write files (if not dry-run)
      if (!task.metadata?.dryRun) {
        await this.writeGeneratedFiles(generatedCode);
      }

      // 8. Calculate metrics
      const metrics = this.calculateMetrics(generatedCode);

      this.log(`✅ Code generation complete: ${generatedCode.files.length} files, ${generatedCode.tests.length} tests`);

      return {
        status: 'success',
        data: generatedCode,
        metrics: {
          ...metrics,
          taskId: task.id,
          agentType: this.agentType,
          durationMs: Date.now() - this.startTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.log(`❌ Code generation failed: ${(error as Error).message}`);

      // Check if escalation is needed
      if (this.isArchitectureIssue(error as Error)) {
        await this.escalate(
          `Architecture issue in code generation: ${(error as Error).message}`,
          'TechLead',
          'Sev.2-High',
          { task: task.id, error: (error as Error).stack }
        );
      }

      throw error;
    }
  }

  // ============================================================================
  // Code Specification
  // ============================================================================

  /**
   * Create code specification from task
   */
  private async createCodeSpec(task: Task): Promise<CodeSpec> {
    this.log('📋 Creating code specification');

    return {
      feature: task.title,
      requirements: this.extractRequirements(task),
      context: {
        existingFiles: await this.getExistingFiles(),
        architecture: await this.getArchitecturePatterns(),
        dependencies: await this.getDependencies(),
      },
      constraints: [
        'Must use TypeScript strict mode',
        'Must include comprehensive type definitions',
        'Must follow existing code style',
        'Must be testable',
        'Must include error handling',
      ],
    };
  }

  /**
   * Extract requirements from task description
   */
  private extractRequirements(task: Task): string[] {
    const requirements: string[] = [];

    // Extract from description
    if (task.description) {
      const lines = task.description.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
          requirements.push(line.trim().substring(1).trim());
        }
      }
    }

    // Add default requirement
    if (requirements.length === 0) {
      requirements.push(task.title);
    }

    return requirements;
  }

  /**
   * Get list of existing files in project
   */
  private async getExistingFiles(): Promise<string[]> {
    try {
      const files: string[] = [];
      const scanDir = async (dir: string) => {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scanDir(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            files.push(fullPath);
          }
        }
      };
      await scanDir(process.cwd());
      return files.slice(0, 50); // Limit to 50 files
    } catch (_error) {
      return [];
    }
  }

  /**
   * Detect architecture patterns from existing code
   */
  private async getArchitecturePatterns(): Promise<string> {
    // Check for common patterns
    const patterns: string[] = [];

    try {
      // Check if agents/ directory exists
      if (await this.fileExists('agents/')) {
        patterns.push('Agent-based architecture with BaseAgent pattern');
      }

      // Check if using TypeScript
      if (await this.fileExists('tsconfig.json')) {
        patterns.push('TypeScript with strict type checking');
      }

      // Check for common frameworks
      if (await this.fileExists('package.json')) {
        const pkg = JSON.parse(await fs.promises.readFile('package.json', 'utf-8'));
        if (pkg.dependencies?.['react']) {patterns.push('React framework');}
        if (pkg.dependencies?.['express']) {patterns.push('Express.js backend');}
        if (pkg.dependencies?.['@anthropic-ai/sdk']) {patterns.push('Anthropic AI integration');}
      }
    } catch (_error) {
      // Ignore errors
    }

    return patterns.length > 0 ? patterns.join(', ') : 'Generic TypeScript project';
  }

  /**
   * Get project dependencies
   */
  private async getDependencies(): Promise<string[]> {
    try {
      const pkg = JSON.parse(await fs.promises.readFile('package.json', 'utf-8'));
      return Object.keys({ ...(pkg.dependencies as Record<string, unknown>), ...(pkg.devDependencies as Record<string, unknown>) });
    } catch (_error) {
      return [];
    }
  }

  // ============================================================================
  // Codebase Analysis
  // ============================================================================

  /**
   * Analyze existing codebase for context
   */
  private async analyzeCodebase(): Promise<string> {
    this.log('🔍 Analyzing existing codebase');

    const context: string[] = [];

    // Get README content
    try {
      const readme = await fs.promises.readFile('README.md', 'utf-8');
      context.push(`# Project Overview\n${  this.safeTruncate(readme, 2000)}`);
    } catch (_error) {
      // No README
    }

    // Get sample code from agents/
    try {
      const baseAgent = await fs.promises.readFile('agents/base-agent.ts', 'utf-8');
      context.push(`# BaseAgent Pattern\n\`\`\`typescript\n${  this.safeTruncate(baseAgent, 1000)  }\n\`\`\``);
    } catch (_error) {
      // No base agent
    }

    return context.join('\n\n');
  }

  // ============================================================================
  // Code Generation (AI-Powered)
  // ============================================================================

  /**
   * Generate code using template-based generation (fast path) or LLM via Codex CLI.
   *
   * For known patterns (Discord, GitHub workflows, config), uses templates.
   * For all other tasks, falls back to Codex CLI (or Claude Code CLI) for
   * real AI-powered code generation.
   */
  private async generateCode(spec: CodeSpec, _context: string): Promise<GeneratedCode> {
    this.log('🧠 Code generation starting');

    // Identify generatable files from spec
    const generatableFiles = await this.identifyGeneratableFiles(spec);

    if (generatableFiles.length === 0) {
      this.log('🤖 No template match found — falling back to LLM code generation via Codex CLI');
      return await this.generateWithCodex(spec, _context);
    }

    const files: Array<{ path: string; content: string; type: 'new' | 'modified' }> = [];

    // Generate each identified file
    for (const fileSpec of generatableFiles) {
      try {
        const content = await this.generateFileContent(fileSpec, spec);
        const fileType: 'new' | 'modified' = fileSpec.type === 'readme-discord-badge' ? 'modified' : 'new';
        files.push({ path: fileSpec.path, content, type: fileType });
        this.log(`   ✅ Generated: ${fileSpec.path}`);
      } catch (error) {
        this.log(`   ⚠️  Failed to generate ${fileSpec.path}: ${(error as Error).message}`);
      }
    }

    return {
      files,
      tests: [],
      documentation: '',
      summary: `Generated ${files.length} files for: ${spec.feature}`,
    };
  }

  /**
   * Identify files that can be automatically generated from spec
   */
  private async identifyGeneratableFiles(spec: CodeSpec): Promise<Array<{ path: string; type: string }>> {
    const files: Array<{ path: string; type: string }> = [];
    const featureLower = spec.feature.toLowerCase();

    // Discord community files
    if (featureLower.includes('discord') && featureLower.includes('community')) {
      files.push(
        { path: 'docs/discord/welcome.md', type: 'discord-welcome' },
        { path: 'docs/discord/rules.md', type: 'discord-rules' },
        { path: 'docs/discord/faq.md', type: 'discord-faq' },
        { path: 'discord-config.json', type: 'discord-config' }
      );

      // Check if README exists and needs Discord badge
      if (await this.fileExists('README.md')) {
        files.push({ path: 'README.md', type: 'readme-discord-badge' });
      }
    }

    // GitHub Actions workflow files
    if (featureLower.includes('github') && (featureLower.includes('action') || featureLower.includes('workflow'))) {
      files.push({ path: '.github/workflows/generated.yml', type: 'github-workflow' });
    }

    // Configuration files
    if (featureLower.includes('config')) {
      files.push({ path: 'config/generated.json', type: 'config-json' });
    }

    return files;
  }

  /**
   * Generate content for a specific file based on its type
   */
  private async generateFileContent(
    fileSpec: { path: string; type: string },
    spec: CodeSpec
  ): Promise<string> {
    switch (fileSpec.type) {
      case 'discord-welcome':
        return this.generateDiscordWelcome(spec);

      case 'discord-rules':
        return this.generateDiscordRules(spec);

      case 'discord-faq':
        return this.generateDiscordFAQ(spec);

      case 'discord-config':
        return this.generateDiscordConfig(spec);

      case 'readme-discord-badge':
        return this.addDiscordBadgeToReadme(spec);

      case 'github-workflow':
        return this.generateGitHubWorkflow(spec);

      case 'config-json':
        return this.generateConfigJSON(spec);

      default:
        throw new Error(`Unknown file type: ${fileSpec.type}`);
    }
  }

  // ============================================================================
  // LLM-Powered Code Generation (Codex CLI / Claude Code CLI fallback)
  // ============================================================================

  /**
   * Generate code using Codex CLI (or Claude Code CLI as fallback).
   *
   * Builds a detailed prompt from the CodeSpec, invokes the CLI via stdin,
   * and parses the structured JSON response into GeneratedCode format.
   */
  private async generateWithCodex(spec: CodeSpec, context: string): Promise<GeneratedCode> {
    const prompt = this.buildCodeGenPrompt(spec, context);

    // Try Codex CLI first, fall back to Claude Code CLI
    let stdout: string;
    try {
      stdout = await this.invokeCodeCLI('codex', ['exec', '-'], prompt);
    } catch (codexError) {
      this.log(`⚠️  Codex CLI unavailable (${(codexError as Error).message}), trying Claude Code CLI`);
      try {
        stdout = await this.invokeCodeCLI('claude', ['-p', '--output-format', 'json'], prompt);

        // Claude Code wraps result in a JSON envelope
        try {
          const envelope = JSON.parse(stdout);
          if (envelope.result !== undefined) {
            stdout = typeof envelope.result === 'string' ? envelope.result : JSON.stringify(envelope.result);
          }
        } catch {
          // Not a JSON envelope, use raw output
        }
      } catch (claudeError) {
        this.log(`❌ Both Codex CLI and Claude Code CLI failed`);
        throw new Error(
          `LLM code generation failed. Codex: ${(codexError as Error).message}. Claude: ${(claudeError as Error).message}`
        );
      }
    }

    // Parse the LLM response into GeneratedCode
    return this.parseLLMCodeResponse(stdout, spec);
  }

  /**
   * Build a detailed prompt for LLM code generation from a CodeSpec.
   */
  private buildCodeGenPrompt(spec: CodeSpec, context: string): string {
    const requirementsList = spec.requirements.map((r, i) => `${i + 1}. ${r}`).join('\n');
    const constraintsList = spec.constraints.map((c) => `- ${c}`).join('\n');
    const depsList = spec.context.dependencies.slice(0, 20).join(', ') || 'none';
    const contextSnippet = context ? `\n\nExisting codebase context:\n${context.substring(0, 3000)}` : '';

    return `Generate production-ready TypeScript code for the following feature. Return ONLY a JSON object (no markdown code blocks, no extra text).

Feature: ${spec.feature}

Requirements:
${requirementsList}

Constraints:
${constraintsList}

Architecture: ${spec.context.architecture}
Available dependencies: ${depsList}
${contextSnippet}

Return this exact JSON structure:
{
  "files": [
    {
      "path": "src/example.ts",
      "content": "// full file content here",
      "action": "create"
    }
  ],
  "tests": [
    {
      "path": "src/__tests__/example.test.ts",
      "content": "// full test content here"
    }
  ],
  "summary": "Brief description of what was generated"
}

Rules:
- All code must be valid TypeScript with strict mode
- Include proper error handling
- Include type definitions
- Follow existing project patterns
- Files must have complete, working content (no placeholders or TODOs)`;
  }

  /**
   * Invoke a CLI tool (codex or claude) with a prompt via stdin.
   * Returns the stdout content on success.
   */
  private invokeCodeCLI(command: string, args: string[], prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd: process.cwd(),
        shell: process.platform === 'win32', // Windows needs shell for .cmd resolution
      });

      proc.stdin.write(prompt);
      proc.stdin.end();

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      const timeoutMs = 180000; // 3 minutes
      const timeoutId = setTimeout(() => {
        proc.kill();
        reject(new Error(`${command} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      proc.on('close', (code: number | null) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`${command} exited with code ${code}: ${stderr.substring(0, 500)}`));
        }
      });

      proc.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to spawn ${command}: ${error.message}`));
      });
    });
  }

  /**
   * Parse the raw LLM response into a GeneratedCode structure.
   * Handles multiple JSON formats (code-fenced, raw, etc.).
   */
  private parseLLMCodeResponse(rawOutput: string, spec: CodeSpec): GeneratedCode {
    let parsed: any;

    // Try multiple JSON extraction patterns
    const patterns = [
      /```json\s*([\s\S]*?)\s*```/,   // ```json ... ```
      /```\s*([\s\S]*?)\s*```/,        // ``` ... ```
      /(\{[\s\S]*\})/,                 // raw { ... }
    ];

    for (const pattern of patterns) {
      const match = rawOutput.match(pattern);
      if (match) {
        try {
          parsed = JSON.parse(match[1].trim());
          break;
        } catch {
          // Try next pattern
        }
      }
    }

    // Last resort: parse the entire output
    if (!parsed) {
      try {
        parsed = JSON.parse(rawOutput.trim());
      } catch {
        this.log('⚠️  Could not parse LLM response as JSON, returning raw output as single file');
        return {
          files: [{
            path: `src/${this.featureToFilename(spec.feature)}.ts`,
            content: rawOutput.trim(),
            type: 'new' as const,
          }],
          tests: [],
          documentation: '',
          summary: `LLM-generated code for: ${spec.feature} (raw output — JSON parse failed)`,
        };
      }
    }

    // Map parsed response to GeneratedCode format
    const files = (parsed.files || []).map((f: any) => ({
      path: f.path,
      content: f.content,
      type: (f.action === 'modify' ? 'modified' : 'new') as 'new' | 'modified',
    }));

    const tests = (parsed.tests || []).map((t: any) => ({
      path: t.path,
      content: t.content,
    }));

    this.log(`✅ LLM generated ${files.length} files and ${tests.length} tests`);

    return {
      files,
      tests,
      documentation: '',
      summary: parsed.summary || `LLM-generated code for: ${spec.feature}`,
    };
  }

  /**
   * Convert a feature name to a reasonable filename (kebab-case).
   */
  private featureToFilename(feature: string): string {
    return feature
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50) || 'generated';
  }

  // ============================================================================
  // Template Generators - Discord Community
  // ============================================================================

  /**
   * Generate Discord welcome message
   */
  private generateDiscordWelcome(spec: CodeSpec): string {
    const projectName = this.extractProjectName(spec);

    return `# Welcome to ${projectName} Community! 👋

Thank you for joining the ${projectName} Discord community!

## What is ${projectName}?

${spec.feature}

## Getting Started

1. **Read the Rules** - Check out <#rules> to understand community guidelines
2. **Introduce Yourself** - Head to <#introductions> and tell us about yourself
3. **Explore Channels** - Browse our channels and find topics that interest you
4. **Ask Questions** - Don't hesitate to ask in <#general> or <#help>

## Community Channels

- **#announcements** - Important updates and news
- **#general** - General discussion
- **#help** - Get help from the community
- **#showcase** - Share your projects
- **#feedback** - Provide feedback and suggestions

## Quick Links

- [GitHub Repository](https://github.com/${projectName})
- [Documentation](https://docs.${projectName}.dev)
- [Website](https://${projectName}.dev)

## Need Help?

If you have questions or need assistance, please:
1. Check the <#faq> channel
2. Ask in <#help>
3. Mention @Moderator for urgent issues

---

Enjoy your time here! 🎉
`;
  }

  /**
   * Generate Discord community rules
   */
  private generateDiscordRules(spec: CodeSpec): string {
    const projectName = this.extractProjectName(spec);

    return `# ${projectName} Community Rules 📜

Please read and follow these rules to maintain a positive community environment.

## 1. Be Respectful

- Treat all members with respect and courtesy
- No harassment, hate speech, or discriminatory language
- Respect different opinions and perspectives

## 2. Keep Content Appropriate

- No NSFW (Not Safe For Work) content
- No spam, excessive self-promotion, or advertising
- No pirated content or illegal activities

## 3. Stay On Topic

- Keep discussions relevant to the channel topic
- Use appropriate channels for different types of content
- Move lengthy discussions to threads when appropriate

## 4. No Toxicity

- No trolling, flaming, or intentionally inflammatory behavior
- Constructive criticism is welcome, but be kind
- Help maintain a positive and welcoming atmosphere

## 5. Respect Privacy

- Don't share personal information of others without consent
- Don't DM (Direct Message) without permission
- Report privacy violations to moderators

## 6. Follow Discord ToS

- All Discord Terms of Service and Community Guidelines apply
- Age requirement: You must be 13+ to use Discord

## 7. Listen to Moderators

- Follow moderator instructions promptly
- Questions about moderation decisions should be discussed via DM
- Moderators have final say on rule interpretations

## Consequences

Violations may result in:
- Warning
- Temporary mute
- Kick from server
- Permanent ban (for severe or repeated violations)

## Reporting

If you see rule violations:
1. Use the report feature
2. Mention @Moderator
3. DM a moderator

---

**Thank you for helping make ${projectName} a great community!** ❤️
`;
  }

  /**
   * Generate Discord FAQ
   */
  private generateDiscordFAQ(spec: CodeSpec): string {
    const projectName = this.extractProjectName(spec);

    return `# ${projectName} - Frequently Asked Questions (FAQ) 🤔

## General Questions

### What is ${projectName}?

${spec.feature}

### Is ${projectName} free to use?

Yes! ${projectName} is open source and free to use. Check our GitHub repository for the license details.

### How can I contribute to ${projectName}?

We welcome contributions! Here's how you can help:
1. Report bugs and issues on GitHub
2. Submit pull requests
3. Improve documentation
4. Help answer questions in the community
5. Share your use cases and feedback

## Getting Started

### How do I install ${projectName}?

\`\`\`bash
npm install ${projectName}
# or
yarn add ${projectName}
\`\`\`

Check our [documentation](https://docs.${projectName}.dev) for detailed installation instructions.

### Where can I find documentation?

- [Official Documentation](https://docs.${projectName}.dev)
- [GitHub Repository](https://github.com/${projectName})
- [API Reference](https://docs.${projectName}.dev/api)

### I'm getting an error. What should I do?

1. Check the [documentation](https://docs.${projectName}.dev)
2. Search existing GitHub issues
3. Ask in <#help> channel
4. Create a new GitHub issue with details

## Community

### How do I get help?

1. Check this FAQ first
2. Search the documentation
3. Ask in <#help> channel
4. Create a GitHub issue if it's a bug

### Can I share my project built with ${projectName}?

Absolutely! We'd love to see what you're building. Share in <#showcase>!

### How can I stay updated?

- Follow announcements in <#announcements>
- Watch the GitHub repository
- Check the [changelog](https://github.com/${projectName}/CHANGELOG.md)

## Technical Questions

### What are the system requirements?

- Node.js 18+
- TypeScript 5+
- Modern browser (for web projects)

### Does ${projectName} support [feature]?

Check our [roadmap](https://github.com/${projectName}/issues) or ask in <#general>.

### I found a bug! Where do I report it?

1. Search existing issues first
2. Create a new issue on [GitHub](https://github.com/${projectName}/issues)
3. Include: steps to reproduce, expected vs actual behavior, environment details

## Moderation

### How do I report a rule violation?

Use the report feature, mention @Moderator, or DM a moderator.

### How do I become a moderator?

Active and helpful community members may be invited to join the moderation team.

---

**Don't see your question here?** Ask in <#help> or <#general>!
`;
  }

  /**
   * Generate Discord server configuration JSON
   */
  private generateDiscordConfig(spec: CodeSpec): string {
    const projectName = this.extractProjectName(spec);

    const config = {
      server_name: `${projectName} Community`,
      description: spec.feature,
      channels: [
        {
          name: 'announcements',
          type: 'text',
          category: 'Information',
          description: 'Official announcements and updates',
          permissions: { send_messages: ['@Moderator', '@Admin'] }
        },
        {
          name: 'rules',
          type: 'text',
          category: 'Information',
          description: 'Server rules and guidelines',
          permissions: { send_messages: ['@Moderator', '@Admin'] }
        },
        {
          name: 'faq',
          type: 'text',
          category: 'Information',
          description: 'Frequently asked questions',
          permissions: { send_messages: ['@Moderator', '@Admin'] }
        },
        {
          name: 'general',
          type: 'text',
          category: 'Community',
          description: 'General discussion'
        },
        {
          name: 'introductions',
          type: 'text',
          category: 'Community',
          description: 'Introduce yourself to the community'
        },
        {
          name: 'help',
          type: 'text',
          category: 'Support',
          description: 'Get help from the community'
        },
        {
          name: 'showcase',
          type: 'text',
          category: 'Community',
          description: 'Share your projects and creations'
        },
        {
          name: 'feedback',
          type: 'text',
          category: 'Development',
          description: 'Provide feedback and suggestions'
        },
        {
          name: 'bug-reports',
          type: 'text',
          category: 'Development',
          description: 'Report bugs and issues'
        }
      ],
      roles: [
        { name: 'Admin', color: '#FF0000', permissions: ['administrator'] },
        { name: 'Moderator', color: '#00FF00', permissions: ['manage_messages', 'kick_members', 'ban_members'] },
        { name: 'Contributor', color: '#0000FF', permissions: [] },
        { name: 'Member', color: '#CCCCCC', permissions: [] }
      ],
      welcome_channel: 'introductions',
      rules_channel: 'rules',
      moderation: {
        auto_mod_enabled: true,
        spam_protection: true,
        word_filter_enabled: true,
        raid_protection: true
      }
    };

    return JSON.stringify(config, null, 2);
  }

  /**
   * Add Discord badge to existing README.md
   */
  private async addDiscordBadgeToReadme(spec: CodeSpec): Promise<string> {
    const projectName = this.extractProjectName(spec);
    const readmePath = path.join(process.cwd(), 'README.md');

    let readme = '';
    try {
      readme = await fs.promises.readFile(readmePath, 'utf-8');
    } catch {
      // README doesn't exist, create basic one
      readme = `# ${projectName}\n\n${spec.feature}\n`;
    }

    // Check if Discord badge already exists
    if (readme.includes('discord.com') || readme.includes('Discord')) {
      this.log('   ℹ️  Discord badge may already exist in README');
    }

    // Add badge after title
    const discordBadge = `[![Discord](https://img.shields.io/discord/YOUR_SERVER_ID?label=Discord&logo=discord&logoColor=white&color=7289DA)](https://discord.gg/${projectName.toLowerCase()})`;

    const lines = readme.split('\n');
    // Find first heading
    const titleIndex = lines.findIndex(line => line.startsWith('#'));

    if (titleIndex >= 0) {
      // Insert badge after title
      lines.splice(titleIndex + 1, 0, '', discordBadge, '');
      return lines.join('\n');
    }

    // No title found, prepend badge
    return `${discordBadge}\n\n${readme}`;
  }

  // ============================================================================
  // Template Generators - Other
  // ============================================================================

  /**
   * Generate GitHub Actions workflow
   */
  private generateGitHubWorkflow(spec: CodeSpec): string {
    const projectName = this.extractProjectName(spec);

    return `name: ${projectName} CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v4

    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build
      run: npm run build

    - name: Test
      run: npm test

    - name: Lint
      run: npm run lint
`;
  }

  /**
   * Generate configuration JSON
   */
  private generateConfigJSON(spec: CodeSpec): string {
    const projectName = this.extractProjectName(spec);

    const config = {
      name: projectName,
      version: '1.0.0',
      description: spec.feature,
      settings: {
        environment: 'production',
        logging: {
          level: 'info',
          format: 'json'
        },
        features: {
          enabled: []
        }
      },
      generated: new Date().toISOString()
    };

    return JSON.stringify(config, null, 2);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Extract project name from spec or current directory
   */
  private extractProjectName(_spec: CodeSpec): string {
    // Try to get from package.json
    try {
      const pkgPath = path.join(process.cwd(), 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) {return pkg.name;}
    } catch {
      // Ignore
    }

    // Use current directory name
    return path.basename(process.cwd());
  }

  // ============================================================================
  // Test Generation
  // ============================================================================

  /**
   * Generate unit tests (stub - requires Claude Code worktree execution)
   */
  private generateTests(generatedCode: GeneratedCode, _spec: CodeSpec): Array<{ path: string; content: string }> {
    this.log('🧪 Test generation prepared for worktree execution');

    // Log that tests need to be generated in worktree
    this.logToolInvocation(
      'test_generation_stub',
      'passed',
      `Prepared test generation for ${generatedCode.files.length} files`
    );

    return [];
  }

  // ============================================================================
  // Documentation Generation
  // ============================================================================

  /**
   * Generate documentation (stub - requires Claude Code worktree execution)
   */
  private generateDocumentation(_generatedCode: GeneratedCode, spec: CodeSpec): string {
    this.log('📚 Documentation generation prepared for worktree execution');

    // Log that documentation needs to be generated in worktree
    this.logToolInvocation(
      'doc_generation_stub',
      'passed',
      `Prepared documentation generation for: ${spec.feature}`
    );

    return `# ${spec.feature}\n\n(Documentation will be generated in Claude Code worktree)`;
  }

  // ============================================================================
  // Validation
  // ============================================================================

  /**
   * Validate generated code (syntax check, etc.)
   */
  private validateCode(generatedCode: GeneratedCode): void {
    this.log('✅ Validating generated code');

    for (const file of generatedCode.files) {
      // Basic syntax validation
      if (!file.content.trim()) {
        throw new Error(`Generated file ${file.path} is empty`);
      }

      // Check for common issues
      if (file.content.includes('// TODO') || file.content.includes('// FIXME')) {
        this.log(`⚠️  Warning: ${file.path} contains TODO/FIXME comments`);
      }

      // Check for TypeScript syntax (basic)
      if (!file.content.includes('export') && !file.content.includes('import')) {
        this.log(`⚠️  Warning: ${file.path} may be incomplete (no imports/exports)`);
      }
    }
  }

  // ============================================================================
  // File Writing
  // ============================================================================

  /**
   * Write generated files to disk
   */
  private async writeGeneratedFiles(generatedCode: GeneratedCode): Promise<void> {
    this.log('💾 Writing generated files to disk');

    for (const file of generatedCode.files) {
      const fullPath = path.join(process.cwd(), file.path);
      await this.ensureDirectory(path.dirname(fullPath));
      await fs.promises.writeFile(fullPath, file.content, 'utf-8');
      this.log(`   ✍️  Wrote: ${file.path}`);
    }

    for (const test of generatedCode.tests) {
      const fullPath = path.join(process.cwd(), test.path);
      await this.ensureDirectory(path.dirname(fullPath));
      await fs.promises.writeFile(fullPath, test.content, 'utf-8');
      this.log(`   ✍️  Wrote test: ${test.path}`);
    }

    // Write documentation
    if (generatedCode.documentation) {
      const docPath = path.join(process.cwd(), 'docs', 'GENERATED_CODE.md');
      await this.ensureDirectory(path.dirname(docPath));
      await fs.promises.writeFile(docPath, generatedCode.documentation, 'utf-8');
      this.log(`   ✍️  Wrote documentation: docs/GENERATED_CODE.md`);
    }
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  /**
   * Calculate code generation metrics
   */
  private calculateMetrics(generatedCode: GeneratedCode): Partial<AgentMetrics> {
    const totalLines = generatedCode.files.reduce((sum, file) => sum + file.content.split('\n').length, 0);

    return {
      linesChanged: totalLines,
      testsAdded: generatedCode.tests.length,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if error is architecture-related
   */
  private isArchitectureIssue(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('architecture') ||
           message.includes('pattern') ||
           message.includes('design');
  }

  // ============================================================================
  // Ω-System Integration
  // ============================================================================

  /**
   * Execute code generation using Ω-System pipeline
   *
   * Provides enhanced code generation with:
   * - Intent-based understanding
   * - World context awareness
   * - Quality assurance integration
   * - Learning from execution
   *
   * @param task - The code generation task
   * @returns AgentResult with Ω-System execution data
   */
  async executeWithOmega(task: Task): Promise<AgentResult> {
    if (!this.omegaAdapter) {
      throw new Error('Ω-System not enabled. Set useOmegaSystem: true in config.');
    }

    this.log('Ω Starting Ω-System code generation pipeline');

    const request: AgentExecutionRequest = {
      tasks: [task],
      agentType: 'CodeGenAgent',
      context: {
        projectRoot: process.cwd(),
        config: {
          language: 'typescript',
          framework: 'nodejs',
        },
        constraints: {
          maxConcurrency: 1,
        },
      },
      options: {
        enableLearning: true,
      },
    };

    const response = await this.omegaAdapter.execute(request);

    if (response.success) {
      this.log('Ω Ω-System code generation completed successfully');
      this.log(`Ω Quality score: ${response.report.quality?.score || 'N/A'}`);
      this.log(`Ω Artifacts generated: ${response.report.artifacts.length}`);

      return {
        status: 'success',
        data: {
          report: response.report,
          artifacts: response.report.artifacts,
          omegaResult: response.omegaResult,
        },
        metrics: {
          taskId: task.id,
          agentType: 'CodeGenAgent',
          durationMs: response.durationMs,
          qualityScore: response.report.quality?.score,
          timestamp: new Date().toISOString(),
        },
      };
    } else {
      this.log(`Ω Ω-System code generation failed: ${response.report.summary}`);

      return {
        status: 'failed',
        error: response.report.summary,
        data: response.report,
      };
    }
  }

  /**
   * Check if Ω-System is enabled
   */
  isOmegaEnabled(): boolean {
    return !!this.omegaAdapter;
  }

  /**
   * Get Ω-System adapter (for advanced usage)
   */
  getOmegaAdapter(): OmegaAgentAdapter | undefined {
    return this.omegaAdapter;
  }
}
