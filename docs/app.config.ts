// https://github.com/nuxt-themes/docus/blob/main/nuxt.schema.ts
export default defineAppConfig({
  docus: {
    title: 'PHP Blueprint',
    description: 'Your PHP Blueprint for success',

    aside: {
      level: 0,
      collapsed: false,
      exclude: []
    },

    main: {
      padded: true,
      fluid: false
    },

    header: {
      logo: false,
      showLinkIcon: true,
      exclude: [],
      fluid: false
    },

    titleTemplate: '%s · PHP Blueprint',

    socials: {
      github: 'terrorsquad/php-blueprint',
    },

    layout: 'default',

    footer: {
      credits: {
        icon: '🚀',
        text: 'By Goran Ninkovic ' + new Date().getFullYear() ,
        href: 'https://goranninkovic.com'
      },
      fluid: false
    },
  }
})
