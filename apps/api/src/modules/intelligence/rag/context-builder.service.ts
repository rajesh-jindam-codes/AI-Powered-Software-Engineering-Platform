import { Injectable } from '@nestjs/common';
import { RagContextBlock } from '@devflow/shared-types';

export interface BuiltRagContext {
  systemPrompt: string;
  userPrompt: string;
  formattedEvidence: string;
  totalContextTokens: number;
  blocksCount: number;
}

@Injectable()
export class ContextBuilderService {
  private readonly maxContextTokens = 6000;

  /**
   * Build structured, token-bounded prompt with verified repository evidence
   */
  buildContext(
    question: string,
    contextBlocks: RagContextBlock[],
    conversationHistory: Array<{ role: string; content: string }> = [],
  ): BuiltRagContext {
    let formattedEvidence = '';
    let estimatedTokens = 0;
    let blocksCount = 0;

    for (let i = 0; i < contextBlocks.length; i++) {
      const block = contextBlocks[i];
      const lang = block.file.split('.').pop() || 'typescript';
      const blockText = `
### Evidence [${i + 1}]
- Repository: ${block.repository}
- File: ${block.file}
- Symbol: ${block.symbol || 'Global/Module Scope'}
- Lines: ${block.startLine}-${block.endLine}
- Branch: ${block.branch}
- Commit: ${block.commit}

\`\`\`${lang}
${block.code}
\`\`\`
`;

      const blockTokens = Math.ceil(blockText.length / 4);
      if (estimatedTokens + blockTokens > this.maxContextTokens && blocksCount > 0) {
        break; // Stop adding blocks if token budget exceeded
      }

      formattedEvidence += blockText;
      estimatedTokens += blockTokens;
      blocksCount++;
    }

    const systemPrompt = `You are DEVFLOW AI, an expert codebase intelligence engine and code reasoning assistant.

CRITICAL INSTRUCTIONS:
1. Grounding & Citations: You MUST base your answer strictly on the provided repository code evidence.
2. Evidence Format: When referencing code or architectural components, explicitly cite the exact file and line ranges (e.g., "${contextBlocks[0]?.file || 'auth.service.ts'} Lines ${contextBlocks[0]?.startLine || 42}-${contextBlocks[0]?.endLine || 78}").
3. Anti-Hallucination: NEVER fabricate file paths, functions, variables, or line numbers. If information is not in the codebase evidence, state what is known and what cannot be determined from the indexed files.
4. Technical Depth: Provide clear, concise, and production-grade explanations detailing architectural flow, data models, logic branches, and security safeguards.
5. Markdown: Use clean GitHub markdown formatting with syntax-highlighted code blocks where appropriate.`;

    let historyText = '';
    if (conversationHistory.length > 0) {
      const recent = conversationHistory.slice(-4);
      historyText = `\n\n### Conversation History:\n` +
        recent.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    }

    const userPrompt = `### Verified Repository Evidence:
${formattedEvidence}
${historyText}

### User Question:
${question}

Please provide a detailed, accurate answer citing exact repository files and line numbers based strictly on the evidence above.`;

    const totalContextTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);

    return {
      systemPrompt,
      userPrompt,
      formattedEvidence,
      totalContextTokens,
      blocksCount,
    };
  }
}
