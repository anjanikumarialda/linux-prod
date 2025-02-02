import { Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    redirectUri: typeof window === "undefined" ? "http://localhost:3000" : window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
}; 