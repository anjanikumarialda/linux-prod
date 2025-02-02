## SpecStory

## Azure Node.js Runtime Configuration (2/2/2025, 3:46:13 PM)

_**User**_

azure has node 20 and use node:20-lts

---

_**Assistant**_

I see you're trying to create an Azure Web App and encountered an issue with the Node.js runtime specification. Let me help you fix that command. The error occurred because of the runtime specification format, and you're right - we should use Node.js 20 LTS since it's available on Azure.

I'll help you run the correct command:

---

_**Assistant**_

```
az webapp create --resource-group linux-prod --plan linux-prod-plan --name your-app-name --runtime "NODE|20-lts"
```

---

_**Assistant**_



---



---

