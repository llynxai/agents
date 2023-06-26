/* eslint-disable no-console */
import { BaseLanguageModel } from "langchain/base_language";
import { LLMChain } from "langchain/chains";
import { OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";

import { AgentResponse } from "../../api/types";
import { AgentAction, AgentOptions } from "../../types";
import { defaultSystemPrompt } from "../../utils/defaultPrompts";

/**
 * Generic Action Agent class that goes through each step and calls the model
 * Extend this class to create more specific Action Agents for different tasks
 */
export class ActionAgent {
  action: AgentAction;
  model?: BaseLanguageModel;
  modelName?: "gpt-3.5-turbo" | "gpt-4";
  context: string;
  systemPrompt?: string;

  constructor({ action, context = "", modelName = "gpt-3.5-turbo", model }: AgentOptions) {
    this.action = action;
    this.model = model ?? new OpenAI({ modelName, temperature: 0 });
    this.context = context;
    this.systemPrompt = defaultSystemPrompt + this.context;
  }

  // Override this function for different agents that you are creating
  async run(): Promise<string | undefined | AgentResponse> {
    const chain = new LLMChain({
      llm: this.model,
      prompt: new PromptTemplate({
        inputVariables: ["action", "context", "service"],
        template: this.action.action,
      }),
    });

    await chain.call({
      action: this.action.action,
      context: this.context,
      service: this.action.finalTool,
    });

    return undefined;
  }
}
