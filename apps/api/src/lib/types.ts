export type AppEnv = {
  Bindings: {
    DATABASE_URL: string;
    CLERK_SECRET_KEY: string;
    CLERK_PUBLISHABLE_KEY: string;
  };
  Variables: {
    user: { id: string; clerkId: string; email: string };
  };
};
