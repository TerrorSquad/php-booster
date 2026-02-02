function update_ignore_files() {
    log "Updating ignore files to exclude .husky..."

    # 1. Update tsconfig.json if it exists
    if [ -f "tsconfig.json" ]; then
        log "Updating tsconfig.json to exclude .husky..."
        if command -v node >/dev/null 2>&1; then
            node -e "
            const fs = require('fs');
            try {
                const config = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
                if (!config.exclude) config.exclude = [];
                if (!config.exclude.includes('.husky')) {
                    config.exclude.push('.husky');
                    fs.writeFileSync('tsconfig.json', JSON.stringify(config, null, 2));
                    console.log('Added .husky to tsconfig.json exclude list');
                }
            } catch (e) {
                console.error('Failed to update tsconfig.json:', e);
            }
            "
        else
            warn "Node.js not found. Skipping tsconfig.json update."
        fi
    fi

    # 2. Update .prettierignore
    if [ -f ".prettierignore" ]; then
        if ! grep -q ".husky" ".prettierignore"; then
            echo -e "\n.husky" >> ".prettierignore"
            log "Added .husky to .prettierignore"
        fi
    fi

    # 3. Update .eslintignore
    if [ -f ".eslintignore" ]; then
        if ! grep -q ".husky" ".eslintignore"; then
            echo -e "\n.husky" >> ".eslintignore"
            log "Added .husky to .eslintignore"
        fi
    fi
}

function install_node_dependencies() {
    log "Installing Node.js dependencies..."

    # Update ignore files (tsconfig, eslint, prettier) to ignore .husky
    update_ignore_files

    # Check if pnpm is available
    if ! command -v pnpm >/dev/null 2>&1; then
        warn "pnpm not found. Skipping Node.js dependency installation."
        warn "Please install pnpm and run 'pnpm install' manually to enable git hooks."
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
