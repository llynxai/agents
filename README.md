# LLynx Agents

LLynx agent is currently in alpha. The purpose of this repo is for the team to share some of the agents we have been building that work on top of [LLynx api](https://docs.llynx.ai). The repo will grow with time and we hope the community can use this as a guide to build their own agents that can plug into LLynx.

</br>

# How to Run

Agents are meant to be run in a backend Node environment. You can create a script to test them out after properly setting up the required dependencies.

First install the agents package from npm.

```bash
yarn add @llynxai/agents
```

or

```bash
npm install @llynxai/agents
```

Agents are meant to be ran in a backend Node environment. you can create a simple script to test it out after properly setting up the dependencies.

```ts
import { DelegatorAgent } from "@llynxai/agents";
import axios from "axios";

// Call the llynx api to get an action plan
const res = await axios.post(
  "https://api.llynx.ai",
  { query: "Schedule a meeting with Ed tomorrow at noon." },
  {
    headers: {
      "x-api-key": "YOUR_API_KEY",
    },
  }
);

// Execute action plan Using the DelegatorAgent
const agent = new DelegatorAgent({
  actions: res.actions,
  tokens: {
    googleRefreshToken,
    microsoftRefreshToken,
    zoomRefreshToken,
  },
});

// Check the outputs after the run is complete
const { failedSteps, actions, finalResponse } = await agent.run();
```

# Agent Types

We took inspiration from Langchain on how to create agents and some of the classes will look familiar to anyone who used Langchain before.

## Base Agents

Base agents are the foundation that every agent is built from. There are 3 types:

- [ActionAgent](/agents/baseAgents/documentation/ActionAgent.md)
- [ApiAgent](/agents/baseAgents/documentation/ApiAgent.md)
- [DelegatorAgent](/agents/baseAgents/documentation/DelegatorAgent.md)

</br>

## Execution Agents

Execution agents are the agents that actually execute an action. They are built off of the `Base Agents` mainly `ActionAgent` or `ApiAgent` and executed by the `DelegatorAgent`. You can check the agents we have already built in the [executionAgent folder](/agents/executionAgents)

</br>

# Tool Database

In addition to the LLynx API we utilize a tool database to match an Action to a specific API and schema. This database contains an extensible number of tools and these tools can be mapped to individual users. Our database of choice is Pinecone, but there are several others to choose from including Weaviate, Chroma, and more.

</br>

# OAuth

For many APIs OAuth is required to authenticate users into their tools and for the application to be able to make requests on behalf of those users. You can check the OAuth documentation for [Google](https://developers.google.com/identity/protocols/oauth2), [Microsoft](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow), and [Zoom](https://developers.zoom.us/docs/integrations/oauth/) to setup your own up.

</br>

# Environment Variables

The following environment variables would need to be set if you plan to use these agents out of the box.

```js
GOOGLE_CLIENT_ID;
GOOGLE_CLIENT_SECRET;
PINECONE_API_KEY;
PINECONE_INDEX;
PINECONE_ENVIRONMENT;
ZOOM_CLIENT_SECRET;
ZOOM_CLIENT_ID;
MICROSOFT_CLIENT_ID;
MICROSOFT_CLIENT_SECRET;
OPENAI_API_KEY;
```

</br>

# Credits

- [LangChain JS](https://js.langchain.com/docs/getting-started/guide-llm)
- [OpenAi](https://github.com/openai/openai-node)
