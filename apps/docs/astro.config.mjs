import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightOpenAPI, { openAPISidebarGroups } from "starlight-openapi";

export default defineConfig({
  integrations: [
    starlight({
      plugins: [
        starlightOpenAPI([
          {
            base: "api-reference",
            label: "API Reference",
            schema: "../../specs/api/openapi.yaml",
          },
        ]),
      ],
      title: "Social OSU",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/osu-cse5914/social-osu-app",
        },
      ],
      sidebar: [
        { label: "Home", link: "/" },
        {
          label: "System",
          items: [
            { label: "Architecture", link: "/specs/system/architecture/" },
            { label: "Data Model", link: "/specs/system/data-model/" },
          ],
        },
        {
          label: "Auth",
          items: [
            { label: "Authentication", link: "/specs/auth/authentication/" },
            { label: "Authorization", link: "/specs/auth/authorization/" },
          ],
        },
        {
          label: "Users",
          items: [
            { label: "Profile", link: "/specs/users/profile/" },
            { label: "Public Profile", link: "/specs/users/public-profile/" },
          ],
        },
        {
          label: "Social",
          items: [
            { label: "Follows", link: "/specs/social/follows/" },
            { label: "Social Feed", link: "/specs/social/feed/" },
          ],
        },
        {
          label: "Events",
          items: [
            { label: "Event Lifecycle", link: "/specs/events/lifecycle/" },
            {
              label: "Gig Applications",
              link: "/specs/events/gig-applications/",
            },
            {
              label: "External Ingestion",
              link: "/specs/events/external-ingestion/",
            },
          ],
        },
        {
          label: "Collections",
          items: [
            { label: "Management", link: "/specs/collections/management/" },
          ],
        },
        {
          label: "Interactions",
          items: [
            { label: "Tracking", link: "/specs/interactions/tracking/" },
          ],
        },
        {
          label: "AI",
          items: [
            { label: "Model Router", link: "/specs/ai/model-router/" },
            {
              label: "Embeddings & Vector Search",
              link: "/specs/ai/embeddings/",
            },
          ],
        },
        {
          label: "Recommendations",
          items: [
            { label: "Model", link: "/specs/recommendations/model/" },
            { label: "Feed", link: "/specs/recommendations/feed/" },
          ],
        },
        {
          label: "Chat",
          items: [
            { label: "Chatbot", link: "/specs/chat/chatbot/" },
            { label: "Conversations", link: "/specs/chat/conversations/" },
          ],
        },
        {
          label: "Notifications",
          items: [
            { label: "In-App", link: "/specs/notifications/in-app/" },
          ],
        },
        {
          label: "API",
          items: [
            { label: "Endpoints", link: "/specs/api/endpoints/" },
          ],
        },
        ...openAPISidebarGroups,
      ],
      customCss: [],
    }),
  ],
  vite: {
    resolve: {
      preserveSymlinks: true,
    },
  },
});
