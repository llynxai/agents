# ActionAgent

The ActionAgent class is the ancestor for Agent classes.

```ts
const agent = new ActionAgent({
  action,
  context,
  model,
  modelName,
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

- `model`: The llm model to be used when executing an action. Defaults to Openai model.
- `modelName`: Name of the model to use (`"gpt-3.5-turbo" | "gpt-4"`). Used only for Openai models.
- `context`: Any context you want to pass to the agent.

## Methods

- `run`: Executes an action.

```ts
async run(): Promise<string | undefined | AgentResponse> {
    const chain = new LLMChain({
      llm: this.model,
      prompt: new PromptTemplate({
        inputVariables: ["action", "context", "service"],
        template: this.action.description,
      }),
    });

    await chain.call({
      action: this.action.description,
      context: this.context,
      service: this.action.finalTool,
    });

    return undefined;
}
```
