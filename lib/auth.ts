import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "./db/mongodb";
import { User } from "./db/models";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "your-secret-key";

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(MongoClient.connect(process.env.MONGODB_URI!)),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email });
        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    secret: JWT_SECRET,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.phone = user.phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.phone = token.phone as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
  },
};

// Helper function to create guest user
export async function createGuestUser(name: string, email: string, phone: string) {
  await connectDB();

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return existingUser;
  }

  const guestUser = await User.create({
    name,
    email,
    password: await bcrypt.hash(Math.random().toString(), 12), // Random password for guest
    phone,
    role: "user",
    isGuest: true,
  });

  return guestUser;
}

// Helper function to verify JWT token
export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Role-based access control helpers
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  EVENT_MANAGER: "event_manager",
  USER: "user",
  SCANNER: "scanner",
} as const;

export function hasRole(userRole: string, requiredRole: string) {
  const roleHierarchy = {
    [ROLES.SUPER_ADMIN]: 4,
    [ROLES.EVENT_MANAGER]: 3,
    [ROLES.USER]: 2,
    [ROLES.SCANNER]: 1,
  };

  return roleHierarchy[userRole as keyof typeof roleHierarchy] >=
         roleHierarchy[requiredRole as keyof typeof roleHierarchy];
}

export function requireRole(requiredRole: string) {
  return (user: any) => {
    if (!user || !hasRole(user.role, requiredRole)) {
      throw new Error("Insufficient permissions");
    }
    return true;
  };
}
