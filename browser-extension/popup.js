"use strict";

/**
 * Popup script for the Dark Mode Toggle extension.
 *
 * Manages the toggle switch and color scheme selection UI, persisting
 * choices to browser.storage.local which the content script reacts to.
 */

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("darkModeToggle");
  const statusLabel = document.getElementById("statusLabel");
  const schemeButtons = document.querySelectorAll(".scheme-btn");

  function updateUI(enabled, scheme) {
    toggle.checked = enabled;
    statusLabel.textContent = enabled ? "On" : "Off";

    schemeButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.scheme === scheme);
    });
  }

  // Load current state
  browser.storage.local.get(["enabled", "scheme"]).then((result) => {
    const enabled = result.enabled ?? false;
    const scheme = result.scheme ?? "default-dark";
    updateUI(enabled, scheme);
  });

  // Toggle dark mode on/off
  toggle.addEventListener("change", () => {
    const enabled = toggle.checked;
    browser.storage.local.set({ enabled });
    statusLabel.textContent = enabled ? "On" : "Off";
  });

  // Select color scheme
  schemeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const scheme = btn.dataset.scheme;
      browser.storage.local.set({ scheme });

      schemeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
});
