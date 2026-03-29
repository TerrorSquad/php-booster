"use strict";

/**
 * Background service worker for the Dark Mode Toggle extension.
 *
 * Manages default state initialization and handles messages from popup/content scripts.
 */

const DEFAULT_STATE = {
  enabled: false,
  scheme: "default-dark",
};

browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.get(["enabled", "scheme"]).then((result) => {
    const updates = {};
    if (result.enabled === undefined) {
      updates.enabled = DEFAULT_STATE.enabled;
    }
    if (result.scheme === undefined) {
      updates.scheme = DEFAULT_STATE.scheme;
    }
    if (Object.keys(updates).length > 0) {
      browser.storage.local.set(updates);
    }
  });
});
