# Project 8: L'Oréal Chatbot

L’Oréal is exploring the power of AI, and your job is to showcase what's possible. Your task is to build a chatbot that helps users discover and understand L’Oréal’s extensive range of products—makeup, skincare, haircare, and fragrances—as well as provide personalized routines and recommendations.

## 🚀 Launch via GitHub Codespaces

1. In the GitHub repo, click the **Code** button and select **Open with Codespaces → New codespace**.
2. Once your codespace is ready, open the `index.html` file via the live preview.

## ☁️ Cloudflare Note

When deploying through Cloudflare, make sure your API request body (in `script.js`) includes a `messages` array and handle the response by extracting `data.choices[0].message.content`.

## Local API key (temporary, don't commit)

1. Get your OpenAI API key from the OpenAI dashboard.
2. Create a file at `secrets.js` in the project root and paste your key into the `OPENAI_API_KEY` constant (see example below).
3. Make sure `secrets.js` is listed in `.gitignore` so you don't accidentally commit it.
4. Include the file in your `index.html` before any script that uses the key:
   - <script src="secrets.js"></script>
   - <script src="script.js"></script>

Example `secrets.js` content (do not commit the actual key):

```javascript
// filepath: /workspaces/08-prj-loreal-chatbot/secrets.js
// const OPENAI_API_KEY = 'sk-...'; // Replace with your key
```

Enjoy building your L’Oréal beauty assistant! 💄
