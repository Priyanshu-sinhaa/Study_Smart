import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'placeholder',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder',
    }),
    CredentialsProvider({
      name: 'Developer Bypass',
      credentials: {
        username: { label: "Username", type: "text" }
      },
      async authorize(credentials) {
        // Developer bypass credentials authorization
        return {
          id: "mock-dev-user-id",
          name: "Developer Tutor",
          email: "developer@conceptcanvas.internal",
          image: null
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token || "mock-developer-token";
        token.idToken = account.id_token || "mock-developer-token";
      }
      return token;
    },
    async session({ session, token }) {
      // @ts-ignore
      session.accessToken = token.accessToken || "mock-developer-token";
      // @ts-ignore
      session.idToken = token.idToken || "mock-developer-token";
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'super-secret-nextauth-token-key-canvas-99',
  pages: {
    signIn: '/',
  },
});

export { handler as GET, handler as POST };
