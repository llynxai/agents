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
    finalTool?: "Google Calendar" | "Zoom" | "Gmail";
    type: Classifications;
    schemaDescription?: string;
    schemaEndpoint?: string;
    schemaMethod?: RequestMethod;
    schemaSubtool?: string;
    schemaSchema?: string;
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
    if (this.action.finalTool) {
      const matches = await queryPineCone({
        namespace: this.action.finalTool,
        queryString: this.action.description,
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
        action: this.action.description,
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
      })

      this.agentContext = {
        context: "",
        finalRequestBody: JSON.stringify({ ...requestBody, ...resp.data }),
        pineConeMatch: match,
      } satisfies PreviousStepContext;
    } else {
      const response = await this.askModel(this.action.description);
      this.context += response;
    }

    return { response: this.agentContext };
  }
```

- `askModel`: Some actions do not require an api request and the agent will instead ask the llm model execute the action.
-
