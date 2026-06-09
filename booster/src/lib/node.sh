function install_node_dependencies() {
    log "Installing Node.js dependencies..."

    if [ ! -f "package.json" ]; then
        log "No package.json found. Skipping Node.js dependency installation."
        return
    fi

    # Check if pnpm is available
    if ! command -v pnpm >/dev/null 2>&1; then
        warn "pnpm not found. Skipping Node.js dependency installation."
        warn "Please install pnpm and run 'pnpm install' manually."
        return
    fi

    # Install dependencies
    log "Running 'pnpm install'..."
    if pnpm install; then
        success "Node.js dependencies installed."
    else
        warn "Failed to install Node.js dependencies. Please run 'pnpm install' manually."
    fi
}
