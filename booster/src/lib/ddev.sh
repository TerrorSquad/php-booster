function update_ddev_files() {
    log "Updating ddev files..."
    local booster_ddev_path="${BOOSTER_INTERNAL_PATH}/.ddev"
    local project_ddev_path=".ddev"

    if [ ! -d "$booster_ddev_path" ]; then
        warn "Booster DDEV directory '$booster_ddev_path' not found. Skipping DDEV file update."
        return
    fi

    # Define source -> destination mappings relative to .ddev dirs
    local ddev_subdirs=("commands" "php" "web-build" "scripts")
    for subdir in "${ddev_subdirs[@]}"; do
        local src_path="${booster_ddev_path}/${subdir}"
        local dest_path="${project_ddev_path}/${subdir}"
        if [ -d "$src_path" ]; then
            log "  Copying '$src_path' to '$dest_path'..."
            # Use standard recursive copy -R, ensure destination parent exists
            mkdir -p "$dest_path"
            # Copy the source directory *into* the destination directory
            cp -R $src_path/. "$dest_path" || warn "Failed to copy '$src_path'. Check permissions."
        else
            log "  Booster DDEV subdirectory '$subdir' not found at '$src_path'. Skipping."
        fi
    done
    success "ddev files updated."
}

function update_ddev_config() {
    log "Updating ddev config using yq..."
    local project_config=".ddev/config.yaml"
    local booster_config="${BOOSTER_INTERNAL_PATH}/.ddev/config.yaml"
    local hooks_tmp="hooks.yaml.tmp"
    local merged_tmp=".ddev/config.yaml.tmp"

    if [ ! -f "$project_config" ]; then
        warn "Project DDEV config '$project_config' not found. Skipping update."
        return
    fi
    if [ ! -f "$booster_config" ]; then
        warn "Booster DDEV config '$booster_config' not found. Skipping update."
        return
    fi

    # 1. Extract hooks from booster config (handle potential errors)
    log "  Extracting hooks from booster config..."
    if ! yq '.hooks' "$booster_config" >"$hooks_tmp"; then
        warn "Failed to extract hooks using yq from '$booster_config'. Skipping hook merge."
        rm -f "$hooks_tmp"
    else
        # 2. Merge hooks into project config
        log "  Merging hooks into project config..."
        if ! yq eval-all 'select(fileIndex == 0) * {"hooks": select(fileIndex == 1)}' "$project_config" "$hooks_tmp" >"$merged_tmp"; then
            warn "Failed to merge hooks using yq. Original config preserved."
            rm -f "$hooks_tmp" "$merged_tmp"
            return # Stop ddev config update here if merge fails
        else
            # Replace project config with merged one if successful
            mv "$merged_tmp" "$project_config"
            log "  Hooks merged successfully."
        fi
        rm -f "$hooks_tmp"
    fi

    # 3. Ensure xdebug_enabled is true (operate on the potentially updated project_config)
    log "  Ensuring 'xdebug_enabled = true' using yq..."
    if ! yq eval '.xdebug_enabled = true' -i "$project_config"; then
        warn "Failed to set 'xdebug_enabled = true' using yq. Check '$project_config'."
    fi

    success "ddev config updated. Ensure the paths in the config are correct."
}

function update_nginx_config() {
    log "Updating nginx configuration..."
    local nginx_config=".ddev/nginx_full/nginx-site.conf"

    if [ ! -f "$nginx_config" ]; then
        log "Nginx config file '$nginx_config' not found. Skipping nginx update."
        return
    fi

    log "Found nginx config file, updating..."

    # Remove the DDEV-generated comment to track the file
    if grep -q "# ddev generated" "$nginx_config"; then
        log "  Removing DDEV generated comment to track the file..."
        sed -i.bak '/# ddev generated/d' "$nginx_config" || warn "Failed to remove DDEV generated comment."
    fi

    # Check if XDEBUG_TRIGGER is already configured
    if grep -q "fastcgi_param XDEBUG_TRIGGER" "$nginx_config"; then
        log "  XDEBUG_TRIGGER already configured in nginx config."
        return
    fi

    # Add XDEBUG_TRIGGER to the location ~ \.php$ block
    log "  Adding XDEBUG_TRIGGER environment variable to php location block..."

    # Create temporary content to insert
    local temp_insert_file="nginx_insert.tmp"
    cat >"$temp_insert_file" <<'EOF'
        # Always trigger Xdebug for web requests (CLI remains unaffected due to start_with_request=trigger)
        fastcgi_param XDEBUG_TRIGGER 1;
EOF

    # Use sed to add the content after the location ~ \.php$ line (cross-platform compatible)
    sed -i.bak '/location ~ \\\.php\$ {/r '"$temp_insert_file" "$nginx_config" || warn "Failed to add XDEBUG_TRIGGER to nginx config."

    # Remove #ddev generated comment if it exists
    sed -i.bak '/# ddev generated/d' "$nginx_config" || warn "Failed to remove DDEV generated comment."

    # Clean up temp file
    rm -f "$temp_insert_file"

    # Clean up backup file
    rm -f "$nginx_config.bak"

    success "Nginx configuration updated with XDEBUG_TRIGGER."
}
