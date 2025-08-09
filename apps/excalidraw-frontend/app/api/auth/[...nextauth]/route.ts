import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { AuthOptions } from 'next-auth';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const res = await fetch(`${API_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: user.name,
              email: user.email,
              image: user.image,
            }),
          });

          if (!res.ok) {
            console.error("Backend sign-in failed");
            return false; 
          }
          
          const backendData = await res.json();
          user.backendToken = backendData.token;
          user.userInfo = backendData.user;
          user.roomSlug = backendData.roomSlug;

          return true; 

        } catch (error) {
          console.error("Error during backend sign-in:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.backendToken = user.backendToken;
        token.userInfo = user.userInfo;
        token.roomSlug = user.roomSlug;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.backendToken = token.backendToken as string;
        session.user = { ...session.user, ...token.userInfo as object };
        session.roomSlug = token.roomSlug as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

declare module 'next-auth' {
  interface Session {
    backendToken?: string;
    roomSlug?: string;
  }
  interface User {
    backendToken?: string;
    userInfo?: object;
    roomSlug?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    backendToken?: string;
    userInfo?: object;
    roomSlug?: string;
  }
}