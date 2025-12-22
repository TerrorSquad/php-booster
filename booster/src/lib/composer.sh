# --- Updated merge_scripts Function ---
function merge_scripts() {
    local COMPOSER1="composer.json"                          # Project composer.json
    local COMPOSER2="${BOOSTER_INTERNAL_PATH}/composer.json" # Booster composer.json
    local OUTPUT="composer.json.merged.tmp"

    # Ensure jq is available
    command -v jq >/dev/null 2>&1 || error "jq is required but not installed."

    # Check if files exist
    [ ! -f "$COMPOSER1" ] && error "Project composer.json not found at '$COMPOSER1'"
    [ ! -f "$COMPOSER2" ] && error "Booster composer.json not found at '$COMPOSER2'"

    log "Merging scripts from '$COMPOSER2' into '$COMPOSER1'..."

    # Create a temporary copy to work on
    cp "$COMPOSER1" "$OUTPUT"

    # Get script keys from booster composer.json, handle null/missing scripts section
    # Use jq -e to check exit status if .scripts is null or not an object
    if ! jq -e '(.scripts // {}) | type == "object"' "$COMPOSER2" >/dev/null; then
        log "No valid 'scripts' object found in booster composer.json. Nothing to merge."
        rm "$OUTPUT" # Clean up temp file
        return 0
    fi
    local booster_keys
    booster_keys=$(jq -r '.scripts | keys_unsorted | .[]' "$COMPOSER2")

    # Iterate over each script key from the booster
    echo "$booster_keys" | while IFS= read -r key; do
        log "  Processing script key: $key"

        # Get values and types using jq
    local proj_script_json
    proj_script_json=$(jq --arg key "$key" '(.scripts // {})[$key]' "$OUTPUT")
    local booster_script_json
    booster_script_json=$(jq --arg key "$key" '.scripts[$key]' "$COMPOSER2") # Assumes .scripts exists from check above
    local proj_type
    proj_type=$(jq -r 'type' <<<"$proj_script_json")
    local booster_type
    booster_type=$(jq -r 'type' <<<"$booster_script_json")

        log "    Project type: $proj_type, Booster type: $booster_type"

        local merged_script_json

        if [ "$proj_type" == "null" ]; then
            # Script only exists in booster, add it
            log "    Adding script from booster."
            merged_script_json="$booster_script_json"
        else
            # Script exists in both project and booster, merge based on type
            # Define lifecycle events that should be merged (arrays)
            local lifecycle_events=" pre-install-cmd post-install-cmd pre-update-cmd post-update-cmd post-status-cmd pre-archive-cmd post-archive-cmd pre-autoload-dump post-autoload-dump post-root-package-install post-create-project-cmd "

            if [ "$proj_type" == "string" ] && [ "$booster_type" == "string" ]; then
                if [ "$proj_script_json" == "$booster_script_json" ]; then
                    log "    Scripts are identical strings, keeping project version."
                    merged_script_json="$proj_script_json"
                else
                    if [[ "$lifecycle_events" == *" $key "* ]]; then
                        log "    Lifecycle event '$key': merging different strings into unique array."
                        merged_script_json=$(jq -n --argjson p "$proj_script_json" --argjson b "$booster_script_json" '[$p, $b] | unique')
                    else
                        log "    Tool script '$key': overwriting with booster version."
                        merged_script_json="$booster_script_json"
                    fi
                fi
            elif [ "$proj_type" == "array" ] && [ "$booster_type" == "array" ]; then
                log "    Both scripts are arrays, merging uniquely."
                merged_script_json=$(jq -n --argjson p "$proj_script_json" --argjson b "$booster_script_json" '($p + $b) | unique')
            elif [ "$proj_type" == "string" ] && [ "$booster_type" == "array" ]; then
                log "    Project is string, booster is array. Merging uniquely."
                merged_script_json=$(jq -n --argjson p "$proj_script_json" --argjson b "$booster_script_json" '([$p] + $b) | unique')
            elif [ "$proj_type" == "array" ] && [ "$booster_type" == "string" ]; then
                if [[ "$lifecycle_events" == *" $key "* ]]; then
                    log "    Lifecycle event '$key': merging array and string uniquely."
                    merged_script_json=$(jq -n --argjson p "$proj_script_json" --argjson b "$booster_script_json" '($p + [$b]) | unique')
                else
                    log "    Tool script '$key': overwriting array with booster string."
                    merged_script_json="$booster_script_json"
                fi
            else
                # Handle other mismatches (e.g., object vs string) - prefer booster? Or keep project? Let's prefer booster.
                log "    Type mismatch ($proj_type vs $booster_type). Using booster version."
                merged_script_json="$booster_script_json"
            fi
        fi

        # Update the temporary composer file with the merged script
        # Ensure .scripts object exists before assigning
        local temp_next="$OUTPUT.next"
        jq --arg key "$key" --argjson value "$merged_script_json" \
            'if (.scripts | type) != "object" then .scripts = {} else . end | .scripts[$key] = $value' \
            "$OUTPUT" >"$temp_next" || {
            error "jq update failed for key '$key'"
            rm "$temp_next" "$OUTPUT"
            return 1
        } # Exit loop on jq error
        mv "$temp_next" "$OUTPUT"

    done || error "Failed during script merging loop." # Catch errors from the while loop subshell

    # Replace the original composer.json with the merged version
    mv "$OUTPUT" "$COMPOSER1"
    success "Scripts merged idempotently into $COMPOSER1."
}

function add_code_quality_tools() {
    log "Adding code quality tools..."
    local project_composer="composer.json"
    local booster_composer="${BOOSTER_INTERNAL_PATH}/composer.json"

    # --- Update composer.json ---
    log "Updating composer.json..."
    if [ ! -f "$project_composer" ]; then
        warn "'$project_composer' not found. Cannot merge scripts or add dependencies. Consider copying booster composer.json first."
        return
    fi
    if [ ! -f "$booster_composer" ]; then
        warn "Booster composer.json '$booster_composer' not found. Skipping composer update."
        return
    fi

    merge_scripts

    # --- Install Composer Dependencies ---
    local composer_cmd
    if [ $IS_DDEV_PROJECT -eq 1 ]; then
        composer_cmd=(ddev composer)
    else
        composer_cmd=(composer)
    fi

    # Helper function to check if a package is already declared in composer.json
    function is_package_present() {
        local package="$1"
        local section="$2"  # "require" or "require-dev"

        log "    Checking if package '$package' is present in section '$section'..."

        # Check if package is declared in the appropriate section of composer.json
        if [ "$section" = "require" ]; then
            if jq -e --arg pkg "$package" '.require[$pkg] != null' "$project_composer" >/dev/null 2>&1; then
                log "    Package '$package' found in require section."
                return 0
            else
                log "    Package '$package' NOT found in require section."
                return 1
            fi
        elif [ "$section" = "require-dev" ]; then
            if jq -e --arg pkg "$package" '.["require-dev"][$pkg] != null' "$project_composer" >/dev/null 2>&1; then
                log "    Package '$package' found in require-dev section."
                return 0
            else
                log "    Package '$package' NOT found in require-dev section."
                return 1
            fi
        else
            # If no section specified, check both require and require-dev
            if jq -e --arg pkg "$package" '(.require[$pkg] != null) or (.["require-dev"][$pkg] != null)' "$project_composer" >/dev/null 2>&1; then
                log "    Package '$package' found in either require or require-dev section."
                return 0
            else
                log "    Package '$package' NOT found in either section."
                return 1
            fi
        fi
    }

    # Process production dependencies
    if jq -e '.require | type == "object"' "$booster_composer" >/dev/null; then
    local prod_deps
    prod_deps=$(jq -r '.require | keys_unsorted | .[]' "$booster_composer")
        local missing_prod_deps=()

        if [ -n "$prod_deps" ]; then
            log "Checking production dependencies..."
            while IFS= read -r dep; do
                if ! is_package_present "$dep" "require"; then
                    log "  Missing production dependency: $dep"
                    missing_prod_deps+=("$dep")
                else
                    log "  Production dependency already present: $dep"
                fi
            done <<<"$prod_deps"

            if [ ${#missing_prod_deps[@]} -gt 0 ]; then
                log "Adding missing composer 'require' dependencies from booster..."

                # Install packages individually for better error handling
                local failed_prod_packages=()

                for dep in "${missing_prod_deps[@]}"; do
                    log "Installing production dependency: $dep"
                    if "${composer_cmd[@]}" require --no-scripts --no-interaction "$dep"; then
                        success "Successfully installed: $dep"
                    else
                        error "Failed to install critical production dependency: $dep"
                        failed_prod_packages+=("$dep")
                    fi
                done

                if [ ${#failed_prod_packages[@]} -gt 0 ]; then
                    error "Critical production dependencies failed to install: ${failed_prod_packages[*]}"
                    return 1
                fi
            else
                log "All production dependencies are already present."
            fi
        else
            log "No production dependencies found in booster composer.json 'require' section."
        fi
    else
        log "No 'require' object found in booster composer.json."
    fi

    # Process development dependencies
    if jq -e '.["require-dev"] | type == "object"' "$booster_composer" >/dev/null; then
    local dev_deps
    dev_deps=$(jq -r '.["require-dev"] | keys_unsorted | .[]' "$booster_composer")
        local missing_dev_deps=()

        log "Booster require-dev packages found: $(echo "$dev_deps" | tr '\n' ' ')"

        if [ -n "$dev_deps" ]; then
            log "Checking development dependencies..."
            while IFS= read -r dep; do
                if ! is_package_present "$dep" "require-dev"; then
                    log "  Missing dev dependency: $dep"
                    missing_dev_deps+=("$dep")
                else
                    log "  Dev dependency already present: $dep"
                fi
            done <<<"$dev_deps"

            log "Missing dev dependencies to install: ${missing_dev_deps[*]}"

            if [ ${#missing_dev_deps[@]} -gt 0 ]; then
                log "Adding missing composer 'require-dev' dependencies from booster..."

                # Install packages individually for better error handling
                local failed_packages=()
                local critical_packages=("rector/rector" "phpstan/phpstan" "symplify/easy-coding-standard" "deptrac/deptrac")

                for dep in "${missing_dev_deps[@]}"; do
                    log "Installing dev dependency: $dep"
                    if "${composer_cmd[@]}" require --dev --no-interaction "$dep"; then
                        success "Successfully installed: $dep"
                    else
                        warn "Failed to install: $dep"
                        failed_packages+=("$dep")

                        # Check if this is a critical package
                        if [[ " ${critical_packages[*]} " =~ " ${dep} " ]]; then
                            error "Critical package '$dep' failed to install. Integration cannot continue."
                            return 1
                        fi
                    fi
                done

                if [ ${#failed_packages[@]} -gt 0 ]; then
                    warn "Some non-critical packages failed to install: ${failed_packages[*]}"
                    warn "Integration will continue, but some tools may not be available."
                else
                    success "All development dependencies installed successfully."
                fi
            else
                log "All development dependencies are already present."
            fi
        else
            log "No development dependencies found in booster composer.json 'require-dev' section."
        fi
    else
        log "No 'require-dev' object found in booster composer.json."
    fi

    success "composer.json updated with merged scripts and new dependencies."
}

function init_deptrac() {
    log "Checking Deptrac configuration..."
    local deptrac_config="deptrac.yaml"

    if [ -f "$deptrac_config" ]; then
        log "  '$deptrac_config' already exists. Skipping initialization."
        return
    fi

    log "  Initializing Deptrac..."

    local cmd_prefix=()
    if [ $IS_DDEV_PROJECT -eq 1 ]; then
        cmd_prefix=(ddev)
    fi

    # Run initialization
    if "${cmd_prefix[@]}" composer deptrac -- init --no-interaction; then
        success "Deptrac initialized successfully."
    else
        warn "Failed to initialize Deptrac. You may need to run 'composer deptrac -- init' manually."
    fi
}
