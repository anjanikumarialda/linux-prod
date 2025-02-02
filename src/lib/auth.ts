import { AuthOptions, Session } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { JWT } from "next-auth/jwt";

export interface ExtendedSession extends Session {
  accessToken?: string;
}

export interface ExtendedToken extends JWT {
  accessToken?: string;
}

export const authOptions: AuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: "openid profile email User.Read Calendars.Read",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }): Promise<ExtendedToken> {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }: { session: ExtendedSession; token: ExtendedToken }): Promise<ExtendedSession> {
      session.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
} as const; 