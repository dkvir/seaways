// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  modules: ["nuxt-icons", "@pinia/nuxt"],

  app: {
    head: {
      meta: [
        { charset: "utf-8" },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
        },
        { name: "pinterest", content: "nopin" },
        { name: "google", content: "notranslate" },
        // ...favicon.meta,
      ],
      // link: [...favicon.links],
    },
  },

  css: ["@/assets/sass/style.scss"],

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true,
          api: "modern-compiler",
          silenceDeprecations: [
            "legacy-js-api",
            "mixed-decls",
            "color-functions",
            "global-builtin",
            "import",
          ],
          additionalData: '@import "@/assets/sass/app.scss";',
        },
      },
    },
  },

  compatibilityDate: "2025-04-26",
});