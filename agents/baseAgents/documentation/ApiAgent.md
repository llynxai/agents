# ApiAgent

The ApiAgent class extends ActionAgent. It recieves context and an action just like the action agent. The difference is that this agent uses LLM to fill out the requestBody based on the details of the action it needs to execute. Once the request body is filled out the agent is able to make the api request.

```ts
const agent = new ApiAgent({
  action,
  tokens,
  agentContext,
});

await agent.run();
```

</br>

## Properties

- `action`: The action that the agent will execute

  ```ts
  type AgentAction = {
    index: string;
    action: string;
    final_tool?: "Google Calendar" | "Zoom" | "Gmail";
    type: Classifications;
    schemaDescription?: string;
    schema_endpoint?: string;
    schema_method?: RequestMethod;
    schema_subtool?: string;
    schema?: string;
  };
  ```

- `agentContext`: If the agent is in the middle of a multistep action plan this context is used to give the agent context on what happened in the previous step.

  ```ts
  type PreviousStepContext = {
    finalRequestBody: string;
    pineConeMatch?: ScoredVector;
    context: string;
  };
  ```

- `tokens`: Oauth refresh tokens to pass to the api agent for authentication to make a request.
  ```ts
  type Tokens = {
    googleRefreshToken?: string;
    zoomRefreshToken?: string;
    microsoftRefreshToken?: string;
  };
  ```
- `context`: Any context you want to pass to the agent.

## Methods

- `run`: Executes an action.

```ts
  async run(): Promise<AgentResponse | undefined> {
    let requestBody: Record<string, any>;

    const chain = new LLMChain({ llm: this.model, prompt: this.chatPrompt });
    if (this.action.final_tool) {
      const res = await chain.call({
        action: this.action.action,
        context: this.context,
        requestBodySchema: this.action.schema,
        service: this.action.final_tool,
      });

      requestBody = JSON.parse(res.text);

      const resp: Record<string, any> = await axios(this.action.schema_endpoint, {
        data:
          this.action.schema_method === "PUT" || this.action.schema_method === "POST"
            ? requestBody
            : undefined,
        method: this.action.schema_method,
        params: this.action.schema_method === "GET" ? requestBody : undefined,
      });

      this.agentContext = {
        context: "",
        finalRequestBody: JSON.stringify({ ...requestBody, ...resp.data }),
      } satisfies PreviousStepContext;
    } else {
      const response = await this.askModel(this.action.action);
      this.context += response;
    }

    return { response: this.agentContext };
  }
```

- `askModel`: Some actions do not require an api request and the agent will instead ask the llm model to execute the action.
