// https://github.com/nuxt-content/docus/blob/main/layer/nuxt.schema.ts
export default defineAppConfig({
  seo: {
    title: "PHP Booster",
    description: "Your PHP Booster for success",
    titleTemplate: "%s · PHP Booster",
  },

  header: {
    title: "PHP Booster",
    logo: {
      alt: "PHP Booster",
      light: "",
      dark: "",
    },
  },


  github: {
    owner: "terrorsquad",
    name: "php-booster",
    branch: "main",
    rootDir: "docs",
    url: "https://github.com/terrorsquad/php-booster",
  },

  socials: {
    linkedin: {
      label: "LinkedIn",
      icon: "i-simple-icons-linkedin",
      href: "https://www.linkedin.com/in/goran-ninkovic/",
    },
  },

  ui: {
    colors: {
      primary: "emerald",
      neutral: "gray",
    },
  },
});
