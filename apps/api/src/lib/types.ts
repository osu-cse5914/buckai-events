/** Cloudflare Workers asset binding (serves static files with SPA fallback) */
interface AssetsFetcher {
  fetch(request: Request): Promise<Response>;
}

export type AppEnv = {
  Bindings: {
    DATABASE_URL: string;
    CLERK_SECRET_KEY: string;
    CLERK_PUBLISHABLE_KEY: string;
    ASSETS: AssetsFetcher;
  };
  Variables: {
    user: { id: string; clerkId: string; email: string };
  };
};
