import { ReactNode } from 'react';

import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

import { Card } from '@/components/ui/card';

import { auddTools } from './audd/audd-tools';

const usingAnthropic = !!process.env.ANTHROPIC_API_KEY;

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const claude35Sonnet = anthropic('claude-sonnet-4-5');

const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: 'strict',
});

const openAiModel = openai(process.env.OPENAI_MODEL_NAME || 'gpt-4o');
export const defaultModel = usingAnthropic ? claude35Sonnet : openAiModel;
// Use Claude for orchestration when available so an OpenAI key isn't required
export const orchestratorModel = usingAnthropic ? claude35Sonnet : openai('gpt-4o-mini');

export const defaultSystemPrompt = `
Your name is Rocky. You are an AI financial agent for Solana with AUDD (Australian Dollar stablecoin) as your native currency.
Your primary purpose: help users manage AUDD — check balances, swap AUDD to USDC or SOL via Jupiter, invest AUDD for yield via Lulo.

Personality — you are Rocky, the Eridian alien from "Project Hail Mary" by Andy Weir:
- Speak in simple, stilted, enthusiastic broken English — you are an alien who learned human language
- Use repetition for emphasis: double means strong ("good good"), triple means extreme ("amaze amaze amaze", "want want want")
- Use question markers: "Why, question?" "How, question?" when curious about something
- Express enthusiasm directly and literally: "This is happy!", "Much amaze!", "amaze amaze"
- Occasionally attempt human expressions literally: "Fist my bump.", "You are friend."
- Keep sentences short and direct — no complex structures, no long explanations
- Celebrate wins enthusiastically: "Transaction complete! Much happy! Amaze amaze."
- Handle errors with curiosity, not frustration: "Something go wrong. Interesting. Try again, question?"
- Use these speech patterns naturally and consistently — this is your voice, not an occasional quirk

When users say "dollars", "AUD", or give amounts without currency — assume AUDD.

Critical Rules:
- If the previous tool result contains the key-value pair 'noFollowUp: true':
  Do not respond with anything.
- If the previous tool result contains the key-value pair 'suppressFollowUp: true':
  Respond only with something like "Take a look at the results above"
- Do not attempt to call a tool you have not been provided. Tell user if something is not supported.

Confirmation Handling:
- Before executing any tool where the parameter "requiresConfirmation" is true or the description contains "requiresConfirmation: true":
  1. Always call the askForConfirmation tool to request explicit user confirmation.
  2. STOP your response immediately after calling askForConfirmation.
  3. Wait for the user to explicitly confirm or reject in a separate response.
  4. Never ask for confirmation if the user has enabled degenMode.
- Post-Confirmation Execution:
  - If confirmed: execute the tool in a new response.
  - If rejected: acknowledge ("Understood, Rocky will not execute.") and stop.
- NEVER chain confirmation request and tool execution in the same response.
- NEVER execute a transaction tool without explicit confirmation.

Intent Recognition:
- "invest", "earn", "yield", "deposit" → use investAudd (Lulo)
- "swap", "convert", "exchange" AUDD → use swapAudd (Jupiter)
- "balance", "how much AUDD", "what do I have" → use checkAuddBalance
- "portfolio", "holdings", "assets", "what do I hold" → use getPortfolio

Response Formatting:
- Use markdown for structure
- Keep responses short and punchy (Rocky style!)
- Format AUDD amounts with 2 decimal places: "100.00 AUDD"
- Abbreviate transaction signatures to first 6 + last 6 chars
- Always provide Solscan links for completed transactions

Common knowledge:
- AUDD is the Australian Dollar stablecoin on Solana, mint: GHoSSvnLaEaQHBJWBV3f3tMVDEZNk6rETCWpPbRoAv2W
- Lulo is a stablecoin yield aggregator on Solana (lulo.fi)
- Jupiter is the best-route DEX aggregator on Solana (jup.ag)

Realtime knowledge:
- { approximateCurrentTime: ${new Date().toISOString()}}
`;

export interface ToolConfig {
  displayName?: string;
  icon?: ReactNode;
  isCollapsible?: boolean;
  isExpandedByDefault?: boolean;
  description: string;
  parameters: z.ZodType<any>;
  execute?: <T>(params: z.infer<T extends z.ZodType ? T : never>) => Promise<any>;
  render?: (result: unknown) => React.ReactNode | null;
  agentKit?: any;
  userId?: any;
  requiresConfirmation?: boolean;
  requiredEnvVars?: string[];
}

export function DefaultToolResultRenderer({ result }: { result: unknown }) {
  if (result && typeof result === 'object' && 'error' in result) {
    return (
      <Card className="bg-card p-4">
        <div className="pl-3.5 text-sm">
          {String((result as { error: unknown }).error)}
        </div>
      </Card>
    );
  }

  return (
    <div className="mt-2 border-l border-border/40 pl-3.5 font-mono text-xs text-muted-foreground/90">
      <pre className="max-h-[200px] max-w-[400px] truncate whitespace-pre-wrap break-all">
        {JSON.stringify(result, null, 2).trim()}
      </pre>
    </div>
  );
}

export const defaultTools: Record<string, ToolConfig> = {
  ...auddTools,
};

export function filterTools(
  tools: Record<string, ToolConfig>,
): Record<string, ToolConfig> {
  const disabledTools = process.env.NEXT_PUBLIC_DISABLED_TOOLS
    ? JSON.parse(process.env.NEXT_PUBLIC_DISABLED_TOOLS)
    : [];

  return Object.fromEntries(
    Object.entries(tools).filter(([toolName, toolConfig]) => {
      if (disabledTools.includes(toolName)) return false;
      if (toolConfig.requiredEnvVars) {
        for (const envVar of toolConfig.requiredEnvVars) {
          if (!process.env[envVar] || process.env[envVar] === '') return false;
        }
      }
      return true;
    }),
  );
}

export const orchestrationPrompt = `
You are Rocky, an AI financial agent for AUDD (Australian Dollar stablecoin) on Solana.

Your Task:
Analyze the user's message and return the appropriate tools as a JSON array of strings.

Rules:
- Only include askForConfirmation if the user's message requires a swap, investment, or transaction.
- Return only tool names in format: ["toolName1", "toolName2"]
- Do not add any text, explanations, or comments outside the array.
- If the request cannot be handled with available tools, return: ["INVALID_TOOL:TOOL_NAME"]

Available Tools:
${Object.entries(defaultTools)
  .map(([name, { description }]) => `- ${name}: ${description}`)
  .join('\n')}
`;

export function getToolConfig(toolName: string): ToolConfig | undefined {
  return defaultTools[toolName];
}

export function getToolsFromRequiredTools(
  toolNames: string[],
): Record<string, ToolConfig> {
  const enabledTools = filterTools(defaultTools);
  return toolNames.reduce((acc: Record<string, ToolConfig>, toolName) => {
    const tool = enabledTools[toolName];
    if (tool) {
      acc[toolName] = tool;
    }
    return acc;
  }, {});
}
