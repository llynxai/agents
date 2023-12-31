/* eslint-disable no-console */
import { LLMChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { BaseLanguageModel } from "langchain/dist/base_language";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { DateTime } from "luxon";

import { FailedContext, PreviousStepContext } from "../../api/types";
import { AgentAction, Tokens } from "../../types";
import { isValidJson, isValidJsonString } from "../../utils/helper";
import { AgentNetWork } from "../executionAgents/network";

export type DelegatorAgentOptions = {
  actions: AgentAction[];
  model?: BaseLanguageModel;
  modelName?: "gpt-3.5-turbo" | "gpt-4";
  context?: string;
  tokens?: Tokens;
  apiKey: string;
  timeZone?: string;
};

/**
 * DelegatorAgent class manages the context of the action plan.
 * Decides which agent to use to execute an action.
 */
export class DelegatorAgent {
  actions: AgentAction[];
  model?: BaseLanguageModel;
  modelName?: "gpt-3.5-turbo" | "gpt-4";
  context?: string;
  tokens?: Tokens;
  apiKey: string;
  agentContexts: Record<string, PreviousStepContext>;
  timeZone?: string;

  constructor({
    actions,
    context = "",
    modelName = "gpt-3.5-turbo",
    model,
    tokens,
    apiKey,
    timeZone = "American/Los_Angeles",
  }: DelegatorAgentOptions) {
    this.actions = actions;
    this.apiKey = apiKey;
    this.model = model ?? new ChatOpenAI({ modelName, temperature: 0 });
    this.timeZone = timeZone;
    this.context = `
    ${context}
    TODAY is ${DateTime.now().toLocaleString(DateTime.DATE_FULL)}.
    The TIME is 00:00.
    Timezone is ${this.timeZone}.
    All timezones should map to IANA Time Zone id for timezone values. If an end time is not specified then the default end time should be be at least 30 minutes later than start time.
    Calculate dates using TODAY as a reference.
    Make sure the date is on the day of the week described in ACTION.
    `;
    this.tokens = tokens;
    this.agentContexts = {};
  }

  async askModel(action: string) {
    const chatPrompt = ChatPromptTemplate.fromPromptMessages([
      SystemMessagePromptTemplate.fromTemplate(`
        You are a source for responding to a TASK. A TASK is represented by a string of text you recieve as an ACTION.

        You receive the following information:
        ACTION. This is a string that represents the action the user wants to perform. You use this information to respond with an accurate result. 
        CONTEXT. This is additional information you receive to help you give the most accurate response. This could include today's date and time or other contextual information that you might not receive as part of the ACTION.

        You always must return the response. Do not included any extra text. Only respond with the important information requested by the TASK.
        I know you are unable to draft emails so if TASK ask you to draft an email then generate an example based on what the TASK is telling you to do.
      `),
      HumanMessagePromptTemplate.fromTemplate(this.context),
      HumanMessagePromptTemplate.fromTemplate(`
      You receive additional information from the user to help you update the REQUEST BODY properties.

      ACTION: {action}
      CONTEXT: {context}

      You must return the RESPONSE only and not include any other information in your response.`),
    ]);

    const chain = new LLMChain({ llm: this.model, prompt: chatPrompt });
    const res = await chain.call({
      action,
      context: this.context,
    });

    return res.text;
  }

  // Override this function for different agents that you are creating
  async run(): Promise<{
    failedSteps: FailedContext[];
    actions: AgentAction[];
    finalResponse: Record<string, string | number | boolean>;
    contexts: Record<string, PreviousStepContext>;
  }> {
    const failedSteps = [];
    const successFulSteps = {};
    let counter = 1;
    for (const action of this.actions) {
      const isSupported = AgentNetWork[action.final_tool] !== undefined;
      console.log(`Step ${counter}: ${action.action}`);
      if (action.type === "INFORMATION ANALYSIS") {
        console.log(" - Analyzing with LLM");
        const response = await this.askModel(action.action);
        this.context += `AI_RESPONSE is ${response}`;
      } else if (action.final_tool && isSupported) {
        console.log(`Sending ${action.schema_method} to ${action.schema_endpoint}\n`);
        const agent = new AgentNetWork[action.final_tool]({
          action,
          agentContext: this.agentContexts[action.final_tool],
          apiKey: this.apiKey,
          context: this.context,
          model: this.model,
          modelName: this.modelName,
          tokens: this.tokens,
        });

        const { response, failure } = await agent.run();
        console.log("api response", response);
        if (response) {
          this.agentContexts[action.final_tool] = response;
          successFulSteps[action.action] = isValidJsonString(response.finalRequestBody)
            ? JSON.parse(response.finalRequestBody)
            : response.finalRequestBody;
          this.context += response.context;
        } else if (failure) {
          failedSteps.push(failure);
        }
      } else {
        if (action.type === "USER INPUT") {
          console.log("Skipping step: User input has not been implemented for agents yet.\n");
        } else if (action.operation !== "NONE" && action.final_tool) {
          console.log(
            `An agent has not been created to support ${
              action.final_tool ?? action.tool_category
            }\n`
          );
        }
      }
      counter++;
    }

    const finalResponse = isValidJson(successFulSteps[this.actions.at(-1).action])
      ? JSON.stringify(successFulSteps[this.actions.at(-1).action])
      : successFulSteps[this.actions.at(-1).action];
    return { actions: this.actions, contexts: this.agentContexts, failedSteps, finalResponse };
  }
}
