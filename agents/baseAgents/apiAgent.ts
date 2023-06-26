/* eslint-disable no-console */
import axios from "axios";
import { LLMChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  AIMessagePromptTemplate,
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";

import { AgentResponse, PreviousStepContext } from "../../api/types";
import { AgentOptions } from "../../types";
import { queryPineCone } from "../../utils/queryPineCone";
import { ActionAgent } from "./actionAgent";

/**
 * Agent Class that calls supported third party apis when the model is not able to execute the action.
 */
export class ApiAgent extends ActionAgent {
  chatPrompt: ChatPromptTemplate;
  agentContext?: PreviousStepContext;

  constructor({
    action,
    context = "",
    modelName = "gpt-3.5-turbo",
    tokens,
    agentContext,
  }: AgentOptions) {
    super({ action, context, modelName, tokens });
    this.agentContext = agentContext;
    this.model = new ChatOpenAI({ maxTokens: -1, modelName, temperature: 0 });
    this.chatPrompt = ChatPromptTemplate.fromPromptMessages([
      SystemMessagePromptTemplate.fromTemplate(this.systemPrompt),
      HumanMessagePromptTemplate.fromTemplate(`
        REQUEST BODY: {requestBodySchema}
        ACTION: {action}
        CONTEXT: {context}`),
      AIMessagePromptTemplate.fromTemplate(`{requestBodySchema}`),
      HumanMessagePromptTemplate.fromTemplate(`
        You receive additional information from the user to help you update the REQUEST BODY properties.
  
        ACTION: {action}
        CONTEXT: {context}
  
        You must return the REQUEST BODY as a JSON string only and not include any other information in your response.`),
    ]);
  }

  async askModel(action: string) {
    const chatPrompt = ChatPromptTemplate.fromPromptMessages([
      SystemMessagePromptTemplate.fromTemplate(`
        You are a source for responding to a TASK. A TASK is represented by a string of text you recieve as an ACTION.

        You receive the following information:
        ACTION. This is a string that represents the action the user wants to perform. You use this information to respond with an accurate result. 
        CONTEXT. This is additional information you receive to help you give the most accurate response. This could include today's date and time or other contextual information that you might not receive as part of the ACTION.

        You always must return the response. Do not included any extra text. Only respond with the important information requested by the TASK.
      `),
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

  replaceIdWithValue(url: string, value: string, searchValues = ["{id}"]) {
    let outputUrl = url;

    for (const searchValue of searchValues) {
      outputUrl = outputUrl.replaceAll(searchValue, value);
    }

    return outputUrl;
  }

  async run(): Promise<AgentResponse | undefined> {
    let requestBody: Record<string, any>;

    const chain = new LLMChain({ llm: this.model, prompt: this.chatPrompt });
    if (this.action.finalTool) {
      const matches = await queryPineCone({
        namespace: this.action.finalTool,
        queryString: this.action.action,
        topK: 15,
      });

      const match = matches.reduce((acc, curr) => {
        if (acc && curr.score > acc.score) {
          return curr;
        }
        return acc;
      });

      let requestBodySchema = match.metadata["schema"];
      if (
        this.agentContext?.pineConeMatch.metadata["tool"] === this.action.finalTool &&
        (match.metadata["request_method"] === "PUT" ||
          match.metadata["request_method"] === "DELETE")
      ) {
        requestBodySchema = this.agentContext.finalRequestBody;
      }

      const res = await chain.call({
        action: this.action.action,
        context: this.context,
        requestBodySchema,
        service: this.action.finalTool,
      });

      requestBody = JSON.parse(res.text);

      const resp: Record<string, any> = await axios(match.metadata["endpoint"], {
        data:
          match.metadata["request_method"] === "PUT" || match.metadata["request_method"] === "POST"
            ? requestBody
            : undefined,
        method: match.metadata["method"],
        params: match.metadata["request_method"] === "GET" ? requestBody : undefined,
      });

      this.agentContext = {
        context: "",
        finalRequestBody: JSON.stringify({ ...requestBody, ...resp.data }),
        pineConeMatch: match,
      } satisfies PreviousStepContext;
    } else {
      const response = await this.askModel(this.action.action);
      this.context += response;
    }

    return { response: this.agentContext };
  }
}
