az login
az group create --name linux-prod --location eastus2
az appservice plan create --name linux-prod-plan --resource-group linux-prod --sku B1 --is-linux
az webapp create --resource-group linux-prod --plan linux-prod-plan --name linux-prod --runtime "NODE:20-LTS"
az webapp config appsettings set --resource-group linux-prod --name linux-prod --settings `
    AZURE_AD_CLIENT_ID="9ec41cd0-ae8c-4dd5-bc84-a3aeea4bda54" `
    AZURE_AD_TENANT_ID="a5ae9ae1-3c47-4b70-b92c-ac3a0efffc6a" `
    AZURE_OPENAI_ENDPOINT="https://rajes-m5gtblwr-eastus2.cognitiveservices.azure.com/openai/deployments/gpt-4/chat/completions" `
    AZURE_OPENAI_API_KEY="83PqYf4qPmL4fjRxZ1uX1HJLRUXrBgmBqIkaicLoVab86xHO5vw6JQQJ99BAACHYHv6XJ3w3AAAAACOG2nWQ" `
    AZURE_OPENAI_DEPLOYMENT="gpt-4" `
    NEXTAUTH_URL="https://linux-prod.azurewebsites.net" `
    NEXTAUTH_SECRET="K2zBDkzfPNXYqpxGFCYbxN9cYGWJVvKs8Qh3mR5tUjM="

    # Remove existing deploy.zip if it exists
Remove-Item -Path deploy.zip -ErrorAction SilentlyContinue

# Create new zip file
Compress-Archive -Path * -DestinationPath deploy.zip -Force

az webapp deployment source config-zip --resource-group linux-prod --name linux-prod --src deploy.zip

az webapp log tail --resource-group linux-prod --name linux-prod

az webapp browse --resource-group linux-prod --name linux-prod


