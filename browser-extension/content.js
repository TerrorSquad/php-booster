"use strict";

/**
 * Content script for Dark Mode Toggle.
 *
 * Injects a <style> element into the page and applies the selected dark mode
 * color scheme. Listens for storage changes to update in real time.
 */

const COLOR_SCHEMES = {
  "default-dark": {
    background: "#1a1a2e",
    text: "#e0e0e0",
    link: "#7ec8e3",
    linkVisited: "#b48ead",
    border: "#333355",
  },
  "solarized-dark": {
    background: "#002b36",
    text: "#839496",
    link: "#268bd2",
    linkVisited: "#6c71c4",
    border: "#073642",
  },
  nord: {
    background: "#2e3440",
    text: "#d8dee9",
    link: "#88c0d0",
    linkVisited: "#b48ead",
    border: "#3b4252",
  },
  dracula: {
    background: "#282a36",
    text: "#f8f8f2",
    link: "#8be9fd",
    linkVisited: "#bd93f9",
    border: "#44475a",
  },
  "midnight-blue": {
    background: "#0d1b2a",
    text: "#e0e1dd",
    link: "#48cae4",
    linkVisited: "#c77dff",
    border: "#1b263b",
  },
  sepia: {
    background: "#2b2118",
    text: "#d4c5a9",
    link: "#c49a6c",
    linkVisited: "#a67c52",
    border: "#3d3024",
  },
};

const STYLE_ID = "dark-mode-toggle-ext-styles";

function buildCSS(scheme) {
  const colors = COLOR_SCHEMES[scheme];
  if (!colors) {
    return "";
  }

  return `
    html, body {
      background-color: ${colors.background} !important;
      color: ${colors.text} !important;
    }
    * {
      border-color: ${colors.border} !important;
      scrollbar-color: ${colors.border} ${colors.background};
    }
    a, a * {
      color: ${colors.link} !important;
    }
    a:visited, a:visited * {
      color: ${colors.linkVisited} !important;
    }
    img, video, picture, canvas, svg:not(:root) {
      /* Preserve media elements */
    }
    input, textarea, select, button {
      background-color: ${colors.border} !important;
      color: ${colors.text} !important;
      border-color: ${colors.text}33 !important;
    }
    table, th, td {
      border-color: ${colors.border} !important;
    }
    div, section, article, aside, header, footer, main, nav,
    p, span, li, ul, ol, dl, dt, dd,
    h1, h2, h3, h4, h5, h6,
    blockquote, pre, code, figure, figcaption, details, summary {
      background-color: transparent !important;
      color: inherit !important;
    }
    pre, code {
      background-color: ${colors.border} !important;
    }
  `;
}

function applyDarkMode(enabled, scheme) {
  let styleEl = document.getElementById(STYLE_ID);

  if (!enabled) {
    if (styleEl) {
      styleEl.remove();
    }
    return;
  }

  const css = buildCSS(scheme);
  if (!css) {
    return;
  }

  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(styleEl);
  }

  styleEl.textContent = css;
}

// Initialize from stored state
browser.storage.local.get(["enabled", "scheme"]).then((result) => {
  const enabled = result.enabled ?? false;
  const scheme = result.scheme ?? "default-dark";
  applyDarkMode(enabled, scheme);
});

// React to changes in real time
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") {
    return;
  }

  browser.storage.local.get(["enabled", "scheme"]).then((result) => {
    const enabled = result.enabled ?? false;
    const scheme = result.scheme ?? "default-dark";
    applyDarkMode(enabled, scheme);
  });
});
