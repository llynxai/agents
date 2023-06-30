# LLynx Agents

LLynx is currently in alpha. The purpose of this repo is for the team to share an example framework for building agents that work within [LLynx](https://docs.llynx.ai). This repo will grow over time and we hope the community can use this as a guide to build other agents that can plug into LLynx. 

LLynx utilizes our proprietary LLynx model for planning orchestration, OpenAI embeddings and 3.5-turbo for schema completion in order to make API calls successful. In the future, we plan to train a version of LLynx to fulfill schema completion and remove reliance on 3.5-turbo. 

## Quick start Requirements:
In order to showcase LLynx working end-to-end as an application, we provide this prepackaged code to run LLynx on Google Calendar. To get set up, follow these step by step instructions.

- Node 18 or later
- OpenAI API key
- Google OAuth authentication

To avoid the complexity of setting up Google OAuth yourself, we are offering a hosted solution via our application that you can authenticate into. Given this is an early alpha, the app isn't verified with Google so you will see a warning page when you try and sign in. Please ignore this for now, and proceed to authenticate your Google account. 

Install from npm:

```bash
yarn install @llynxai/agents
```

or

```bash
npm install @llynxai/agents
```

</br>

### OpenAI API key

You will also need to generate an OpenAI API key.

1. Go to OpenAI's Platform website at platform.openai.com and sign in with an OpenAI account.
2. Click your profile icon at the top-right corner of the page and select "View API Keys."
3. Click "Create New Secret Key" to generate a new API key.

</br>
</br>

# Quick Start Guide

Note: Clone this repo <a href="https://github.com/llynxai/quickstart" target="_blank">Quickstart Repo</a>
and follow the instructions there to avoid a lot of copy and pasting. Alternatively, follow the instructions below.

</br>

1. Run the following commands in the terminal to get started.

   ```bash
   mkdir quickstart
   cd quickstart
   touch package.json
   ```

</br>

2. Go to the quickstart folder, open the package.json file, add this snippet to it, and save.

   ```json
   {
     "name": "llynx-quickstart",
     "version": "0.0.0",
     "type": "module",
     "private": true,
     "scripts": {},
     "devDependencies": {
       "@types/node": "^20.3.2"
     },
     "dependencies": {
       "@llynxai/agents": "^0.1.14",
       "axios": "1.4.0",
       "prompt-sync": "^4.2.0"
     }
   }
   ```

</br>

3. Run the following command in the quickstart folder to install the packages.

   ```bash
   yarn install
   ```

   or

   ```bash
   npm install
   ```

</br>

4. In the terminal run the following command.

   ```bash
     touch agent-script.js
   ```

</br>

5. Open `agent-script.js`, paste the snippet below into it, and save the file.

   ```js
   import { DelegatorAgent } from "@llynxai/agents";
   import axios from "axios";
   import fs from "fs/promises";
   import PromptSync from "prompt-sync";

   const prompt = PromptSync({ sigint: true });
   const api_key = "YOUR_LLYNX_API_KEY"

   const main = async () => {
     const query = prompt("What would you like for me to schedule for you? ");

     console.log("I will be happy to do that for you!\n");

     // Call the llynx api to get an action plan
     console.log("Getting action plan...");
     const res = await axios.post(
       "https://api.llynx.ai/actions/quickstart",
       { query },
       {
         headers: {
           "x-api-key": api_key,
         },
       }
     );

     console.log("Getting agent permissions...");
     const tokenRes = await axios.get("https://api.llynx.ai/tokens", {
       headers: {
         "x-api-key": api_key,
       },
     });

     const googleRefreshToken = tokenRes.data.tokens.googleRefreshToken;

     // Execute action plan using the DelegatorAgent
     const agent = new DelegatorAgent({
       actions: res.data.actions,
       tokens: {
         googleRefreshToken,
       },
       apiKey: api_key,
     });

     // Check the outputs after the run is complete
     const { failedSteps, actions, finalResponse } = await agent.run();
     await fs.writeFile("./output.json", JSON.stringify({ failedSteps, actions, finalResponse }));
   };

   // run main function
   main();
   ```

</br>

7. Replace `YOUR_LLYNX_API_KEY` in `agents-script.js`, with your LLynx API key. If you don't have one, please submit a request <a href="https://docs.llynx.ai/docs/get-api-key" target="_blank">here</a>

</br>

8. Before running the script make sure you have OpenAI environment variable set.
   You can set it by running this command in the terminal. Make sure you replace "YOUR_OPENAI_API_KEY" with the key you receive from OpenAI.

   ```bash
   export OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
   ```

</br>

9. Run the script in terminal, enter in your command, and check the results in your authenticated calendar.

   ```bash
   node agent-script.js
   ```

   </br>
   </br>

# Agent Types

We hope the community will utilize this framework to build agents of all types. You can map any agent type to a <a href="https://docs.llynx.ai/docs/tool-categories" target="_blank">tool category</a> output from LLynx and store endpoints for those tools in a vector database of your choosing (e.g., Pinecone, Weaviate, ChromaDB) (see below for more information).  
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

If you wish to use LLynx in your own environment and applications, you will need to set up OAuth for each tool you wish to connect to LLynx. For many APIs OAuth is required to authenticate users into their tools and for the application to be able to make requests on behalf of those users. You can check the OAuth documentation for [Google](https://developers.google.com/identity/protocols/oauth2), [Microsoft](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow), and [Zoom](https://developers.zoom.us/docs/integrations/oauth/) to setup your own up.

</br>

# Environment Variables

The following environment variables would need to be set if you plan to use these pre-built agents (Google Calendar, Gmail, Microsoft Outlook, and Zoom) out of the box.

```js
GOOGLE_CLIENT_ID;
GOOGLE_CLIENT_SECRET;
ZOOM_CLIENT_SECRET;
ZOOM_CLIENT_ID;
MICROSOFT_CLIENT_ID;
MICROSOFT_CLIENT_SECRET;
OPENAI_API_KEY;
```

</br>

# Credits

- [LangChain JS](https://js.langchain.com/docs/getting-started/guide-llm)
- [OpenAI](https://github.com/openai/openai-node)
