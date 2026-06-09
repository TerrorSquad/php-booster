# --- Manifest & Configuration Functions ---

function load_manifest() {
    local manifest_file="${BOOSTER_INTERNAL_PATH}/manifest.json"

    if [ ! -f "$manifest_file" ]; then
        error "Manifest file not found at '$manifest_file'. Booster installation is incomplete or corrupted."
    fi

    log "Loading file manifest from booster..."

    # Validate manifest exists and contains required fields
    if ! command -v jq >/dev/null 2>&1; then
        error "jq is required to process the manifest file but is not installed. Please install jq and try again."
    fi

    # Validate manifest structure
    if ! jq -e '.version' "$manifest_file" >/dev/null 2>&1; then
        error "Invalid manifest file at '$manifest_file' (missing version field)."
    fi

    # Validate manifest can be parsed
    if ! jq empty "$manifest_file" >/dev/null 2>&1; then
        error "Manifest file at '$manifest_file' is not valid JSON."
    fi

    log "  Manifest loaded successfully (version: $(jq -r '.version' "$manifest_file"))"
    return 0
}

function get_manifest_items() {
    local key="${1:?Manifest key required}"
    local manifest_file="${BOOSTER_INTERNAL_PATH}/manifest.json"

    if [ ! -f "$manifest_file" ]; then
        error "Manifest file not found at '$manifest_file'."
    fi

    if ! command -v jq >/dev/null 2>&1; then
        error "jq is required but not installed."
    fi

    # Extract items from manifest and output as space-separated
    jq -r ".files.$key.items[]? // .directories.items[]?" "$manifest_file" 2>/dev/null | tr '\n' ' '
}

function validate_manifest() {
    local manifest_file="${BOOSTER_INTERNAL_PATH}/manifest.json"

    if [ ! -f "$manifest_file" ]; then
        warn "Manifest file not found at '$manifest_file'"
        return 1
    fi

    if [ "$VERBOSE" = true ]; then
        log "Validating manifest files..."
        local missing_count=0

        # Check all files mentioned in manifest
        if command -v jq >/dev/null 2>&1; then
            local all_files
            all_files=$(jq -r '.. | select(type == "array") | .[]? | select(type == "string")' "$manifest_file" 2>/dev/null | sort -u)

            for file in $all_files; do
                if [ ! -e "$BOOSTER_INTERNAL_PATH/$file" ]; then
                    warn "  Missing: $file"
                    ((missing_count++))
                fi
            done

            if [ $missing_count -gt 0 ]; then
                log "  Found $missing_count missing files in booster directory"
            fi
        fi
    fi

    return 0
}

# --- Core Logic Functions ---

function try_download_booster_zip() {
    local version="${1:-latest}"
    local zip_url
    local temp_zip

    # Construct GitHub release URL for booster.zip
    if [ "$version" = "latest" ]; then
        zip_url="${BOOSTER_REPO_URL}/releases/download/latest/booster.zip"
    else
        zip_url="${BOOSTER_REPO_URL}/releases/download/${version}/booster.zip"
    fi

    temp_zip=$(mktemp)

    log "Attempting to download booster package from releases..."
    if command -v curl >/dev/null 2>&1; then
        if curl -fsSL -o "$temp_zip" "$zip_url" 2>/dev/null; then
            log "  Downloaded booster.zip successfully"

            # Extract to target directory
            rm -rf "$BOOSTER_TARGET_DIR"
            mkdir -p "$BOOSTER_TARGET_DIR"

            if unzip -q "$temp_zip" -d "$BOOSTER_TARGET_DIR" 2>/dev/null; then
                rm -f "$temp_zip"

                if [ -d "$BOOSTER_INTERNAL_PATH" ]; then
                    success "php-booster extracted successfully from ZIP package."
                    return 0
                else
                    error "Expected directory structure not found in ZIP package."
                fi
            else
                error "Failed to extract booster.zip"
            fi
        fi
    fi

    rm -f "$temp_zip"
    return 1
}

function download_via_git_clone() {
    log "Cloning php-booster from $BOOSTER_REPO_URL..."

    # Clean up previous attempts first
    rm -rf "$BOOSTER_TARGET_DIR"

    # Clone only the main branch and only the latest commit for speed
    git clone --depth 1 --branch main "$BOOSTER_REPO_URL" "$BOOSTER_TARGET_DIR" || error "Failed to clone booster repository."

    if [ ! -d "$BOOSTER_TARGET_DIR" ]; then
        error "Target directory '$BOOSTER_TARGET_DIR' not found after clone."
    fi

    if [ ! -d "$BOOSTER_INTERNAL_PATH" ]; then
        warn "The expected internal structure '$BOOSTER_INTERNAL_PATH' was not found within the cloned repository."
        error "Booster content directory '$BOOSTER_INTERNAL_PATH' not found."
    fi

    success "php-booster cloned successfully into '$BOOSTER_TARGET_DIR'."
}

function download_php_booster() {
    if [ "$BOOSTER_LOCAL_DEV" = "1" ]; then
        log "Using local php-booster for development..."

        # Clean up previous attempts first
        rm -rf "$BOOSTER_TARGET_DIR"

        # Check if local booster path exists
        if [ ! -d "$BOOSTER_LOCAL_PATH" ]; then
            error "Local booster directory not found at '$BOOSTER_LOCAL_PATH'. Set BOOSTER_LOCAL_PATH or ensure the directory exists."
        fi

        # Copy the local booster instead of cloning
        mkdir -p "$BOOSTER_TARGET_DIR"
        cp -R "$BOOSTER_LOCAL_PATH" "$BOOSTER_INTERNAL_PATH" || error "Failed to copy local booster directory."

        if [ ! -d "$BOOSTER_INTERNAL_PATH" ]; then
            error "Target directory '$BOOSTER_INTERNAL_PATH' not found after copy."
        fi

        success "Local php-booster copied successfully from '$BOOSTER_LOCAL_PATH'."
    else
        # Try ZIP download first (faster, smaller), fall back to git clone
        if [ "${BOOSTER_USE_ZIP:-true}" != "false" ]; then
            try_download_booster_zip "latest" && return 0
            log "ZIP download not available or failed, falling back to git clone..."
        fi

        download_via_git_clone
    fi
}

function copy_files() {
    log "Copying common files (excluding internal test helpers)..."

    # Load manifest (will error if not found or invalid)
    load_manifest
    validate_manifest

    # Load directory items from manifest
    local top_level=()
    while IFS= read -r item; do
        top_level+=("$item")
    done < <(jq -r '.directories.items[]' "$BOOSTER_INTERNAL_PATH/manifest.json")

    # Load top-level file items from manifest
    local top_files=()
    while IFS= read -r item; do
        top_files+=("$item")
    done < <(jq -r '.files.topLevel.items[]' "$BOOSTER_INTERNAL_PATH/manifest.json")

    # Combine into single array
    top_level+=("${top_files[@]}")

    for item in "${top_level[@]}"; do
        local src_path="${BOOSTER_INTERNAL_PATH}/${item}"

        if [ -e "$src_path" ]; then
            if [ -d "$src_path" ]; then
                # It's a directory
                if [ ! -d "$item" ]; then
                    cp -R "$src_path" .
                    log "  Copied directory '$item'."
                else
                    log "  Directory '$item' exists. Merging contents safely..."
                    find "$src_path" -type d | while read -r dir; do
                        local rel_dir="${dir#$src_path/}"

                        if [ "$dir" = "$src_path" ]; then
                            continue
                        fi

                        mkdir -p "$item/$rel_dir"
                    done

                    # Iterate over files in src to copy missing ones
                    find "$src_path" -type f | while read -r file; do
                        local rel_path="${file#$src_path/}"
                        local dest_path="$item/$rel_path"
                        local dest_dir
                        dest_dir=$(dirname "$dest_path")

                        mkdir -p "$dest_dir"

                        if [ ! -f "$dest_path" ]; then
                            cp "$file" "$dest_path"
                            log "    Copied '$rel_path'."
                        else
                            log "    '$rel_path' already exists. Skipping."
                        fi
                    done
                fi
            else
                # It's a file
                if [ ! -f "$item" ]; then
                    cp "$src_path" .
                    log "  Copied file '$item'."
                else
                    log "  File '$item' already exists. Skipping."
                fi
            fi
        else
            log "  Missing optional item '$item', skipping."
        fi
    done

    # Copy renovate config (for automated dependency updates)
    local renovate_cfg="${BOOSTER_INTERNAL_PATH}/renovate.json"
    if [ -f "$renovate_cfg" ]; then
        cp "$renovate_cfg" . || warn "Failed to copy renovate.json"
        log "  Copied renovate.json for automated dependency management"
    else
        log "  renovate.json not found in booster. Skipping (optional)."
    fi

    # Copy mise config (for local tool version management)
    local mise_cfg="${BOOSTER_INTERNAL_PATH}/mise.toml"
    if [ -f "$mise_cfg" ]; then
        if [ ! -f "mise.toml" ]; then
            cp "$mise_cfg" . || warn "Failed to copy mise.toml"
            log "  Copied mise.toml for local tool version management"
        else
            log "  mise.toml already exists. Skipping."
        fi
    else
        log "  mise.toml not found in booster. Skipping."
    fi

    success "Common files copied (tools filtered to runtime essentials)."
}


function update_readme() {
    log "Updating README.md..."
    local project_readme="README.md"
    local booster_snippet="${BOOSTER_INTERNAL_PATH}/README_SNIPPET.md"

    if [ -f "$project_readme" ]; then
        log "'$project_readme' already exists. Skipping creation."
    else
        if [ -f "$booster_snippet" ]; then
            warn "'$project_readme' not found. Creating new README.md from booster snippet..."
            cp "$booster_snippet" "$project_readme" || error "Failed to copy README snippet."
            success "New README.md created with content from '$booster_snippet'."
        else
            warn "'$project_readme' not found, and booster snippet '$booster_snippet' also not found. Skipping."
        fi
    fi
}

function update_gitignore() {
    log "Updating .gitignore..."
    local project_gitignore=".gitignore"
    local booster_gitignore="${BOOSTER_INTERNAL_PATH}/.gitignore"

    if [ ! -f "$booster_gitignore" ]; then
        warn "Booster .gitignore '$booster_gitignore' not found. Skipping update."
        return
    fi

    touch "$project_gitignore"

    # Remove .vscode entries from project gitignore since booster provides IDE settings
    log "Removing .vscode entries from project .gitignore..."
    local temp_gitignore="${project_gitignore}.tmp"

    # Remove lines that ignore .vscode (with or without leading slash, with or without trailing slash)
    grep -v -E '^[[:space:]]*/?\.vscode/?[[:space:]]*$' "$project_gitignore" > "$temp_gitignore" || true
    # Also remove commented .vscode entries
    grep -v -E '^[[:space:]]*#[[:space:]]*/?\.vscode/?[[:space:]]*$' "$temp_gitignore" > "${temp_gitignore}.2" || true
    mv "${temp_gitignore}.2" "$project_gitignore"
    rm -f "$temp_gitignore"

    local added_count=0

    while IFS= read -r line || [[ -n "$line" ]]; do

        line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

        if [ -z "$line" ]; then
            continue
        fi

        if ! grep -q -x -F "$line" "$project_gitignore" && ! grep -q -x -F "# $line" "$project_gitignore" && ! grep -q -x -F "#$line" "$project_gitignore"; then

            if [[ "$line" != /* ]] && grep -q -x -F "/$line" "$project_gitignore"; then
                continue
            fi

            if [[ "$line" == /* ]] && grep -q -x -F "${line#/}" "$project_gitignore"; then
                continue
            fi

            log "  Adding '$line' to .gitignore"

            if [ $added_count -eq 0 ]; then

                [ -s "$project_gitignore" ] && echo >>"$project_gitignore"

                echo "" >>"$project_gitignore" # Ensure separation
                echo "# --- Added by php-booster integration ---" >>"$project_gitignore"
                log "  Added header to .gitignore"
            fi
            echo "$line" >>"$project_gitignore"
            added_count=$((added_count + 1))
        fi
    done <"$booster_gitignore"

    if [ $added_count -gt 0 ]; then
        success ".gitignore updated with $added_count new entries."
    else
        log "No new entries needed for .gitignore."
    fi

    success ".vscode entries removed from project .gitignore (booster provides IDE settings)."
}

# --- Function to Update Tool Paths Dynamically ---
function update_tool_paths() {
    # --- Copy Documentation Directory ---
    local booster_doc_path="${BOOSTER_INTERNAL_PATH}/openapi"
    if [ -d "$booster_doc_path" ]; then
        if [ ! -d "openapi" ]; then
            log "  Copying '$booster_doc_path' to 'openapi'..."
            cp -R "$booster_doc_path" "openapi" || warn "Failed to copy openapi directory."
        else
            log "  'openapi' directory exists. Copying missing files..."
            find "$booster_doc_path" -type d | while read -r dir; do
                local rel_dir="${dir#$booster_doc_path/}"

                if [ "$dir" = "$booster_doc_path" ]; then
                    continue
                fi

                mkdir -p "openapi/$rel_dir"
            done

            for doc_file in "$booster_doc_path"/*; do
                local filename
                filename=$(basename "$doc_file")
                if [ ! -e "openapi/$filename" ]; then
                    cp -R "$doc_file" "openapi/"
                    log "    Copied '$filename'."
                else
                    log "    '$filename' already exists. Skipping to preserve customizations."
                fi
            done
        fi
    else
        log "  Booster documentation directory not found. Skipping."
    fi

    # --- Copy Config Files ---
    # Load config files from manifest
    local config_items=()
    local php_items=()
    while IFS= read -r item; do
        config_items+=("$item")
    done < <(jq -r '.files.config.items[]' "$BOOSTER_INTERNAL_PATH/manifest.json")

    while IFS= read -r item; do
        php_items+=("$item")
    done < <(jq -r '.files.php.items[]? // empty' "$BOOSTER_INTERNAL_PATH/manifest.json")

    local cq_files=("${config_items[@]}" "${php_items[@]}")

    for file in "${cq_files[@]}"; do
        local src_path="${BOOSTER_INTERNAL_PATH}/${file}"
        if [ -f "$src_path" ]; then
            if [ ! -f "$file" ]; then
                cp "$src_path" . || warn "Failed to copy '$src_path'."
                log "  Copied '$file'."
            else
                log "  '$file' already exists. Skipping copy to preserve customizations."
            fi
        else
            log "  Booster config '$file' not found. Skipping."
        fi
    done

    success "Code quality tool configs and documentation processed."

    log "Dynamically updating paths in tool configuration files using temp files and sed..."
    local php_dirs_file="php_dirs.txt"
    local return_code=0 # Track overall success/failure

    # 1. Find directories containing .php files and save to php_dirs.txt
    log "  Searching for directories containing PHP files (excluding vendor, .git, node_modules, etc.)..."
    find . -type f \
        -name "*.php" \
        -not -path "./vendor/*" \
        -not -path "./node_modules/*" \
        -not -path "./${BOOSTER_TARGET_DIR}/*" \
        -not -path "./.ddev/*" \
        -exec dirname {} \; | sort -u | grep -v ^.$ | cut -d '/' -f2 | sort -u >"$php_dirs_file" || {
        warn "find command failed or produced unexpected output while searching for PHP directories."
        # Create empty file if find failed, to avoid errors later
        touch "$php_dirs_file"
    }

    if [ ! -s "$php_dirs_file" ]; then
        warn "No subdirectories containing PHP files found (excluding vendor, hidden dirs, etc.). Placeholders will be removed from tool configurations."
    else
        log "  Found PHP directories listed in '$php_dirs_file'."
    fi

    # --- Define helper for sed replacement ---
    # Usage: replace_placeholder "config_file" "placeholder_regex" "formatted_dirs_file"
    function replace_placeholder() {
        local config_file="$1"
        local placeholder_regex="$2"
        local formatted_dirs_file="$3"
        local tmp_config_file="${config_file}.tmp"

        if [ ! -f "$config_file" ]; then
            log "    File '$config_file' not found. Skipping."
            return 0
        fi

        log "    Processing '$config_file'..."
        # Use process substitution <(...) if available and preferred, otherwise use temp file
        # Using temp file for broader compatibility

        # Create the new file by reading the formatted dirs where the placeholder is found
        # Use -n to suppress default output, p to print non-matching lines, r to read on match
        # This requires two passes or complex scripting. Let's use the requested r/d approach.

        # Pass 1: Read the formatted dirs file after the placeholder line
        sed -e "$placeholder_regex r $formatted_dirs_file" "$config_file" >"$tmp_config_file" || {
            warn "sed 'r' command failed for '$config_file'."
            rm -f "$tmp_config_file"
            return 1
        }

        # Pass 2: Delete the placeholder line from the temp file, overwrite original
        sed -i.bak -e "$placeholder_regex d" "$tmp_config_file" || {
            warn "sed 'd' command failed for '$tmp_config_file'."
            rm -f "$tmp_config_file"
            # Restore original from backup if it exists
            [ -f "${config_file}.bak" ] && mv "${config_file}.bak" "$config_file"
            return 1
        }

        mv "$tmp_config_file" "$config_file"
        rm -f $config_file.tmp.bak

        return 0
    }

    # --- Process Rector PHP file ---
    local rector_file="rector.php"
    local rector_dirs_file="rector_dirs.txt"
    local rector_placeholder_regex="/^[[:space:]]*__DIR__ \. '\/DIRECTORY',[[:space:]]*$/"
    # Create formatted dirs file
    rm -f "$rector_dirs_file" && touch "$rector_dirs_file"
    if [ -s "$php_dirs_file" ]; then # Only loop if dirs were found
        while IFS= read -r dir; do
            # Escape backslashes and single quotes for PHP string safety
            safe_dir="${dir//\\/\\\\}"
            safe_dir="${safe_dir//\'/\\\'}"
            printf "        __DIR__ . '/%s',\n" "$safe_dir" >>"$rector_dirs_file"
        done <"$php_dirs_file"
    fi

    replace_placeholder "$rector_file" "$rector_placeholder_regex" "$rector_dirs_file" || return_code=1
    rm -f "$rector_dirs_file" # Clean up

    # --- Process ECS PHP file ---
    local ecs_file="ecs.php"
    local ecs_dirs_file="ecs_dirs.txt"
    local ecs_placeholder_regex="/^[[:space:]]*__DIR__ \. '\/DIRECTORY',[[:space:]]*$/"

    rm -f "$ecs_dirs_file" && touch "$ecs_dirs_file"
    if [ -s "$php_dirs_file" ]; then
        while IFS= read -r dir; do
            # Escape backslashes and single quotes for PHP string safety
            safe_dir="${dir//\\/\\\\}"
            safe_dir="${safe_dir//\'/\\\'}"
            printf "        __DIR__ . '/%s',\n" "$safe_dir" >>"$ecs_dirs_file"
        done <"$php_dirs_file"
    fi

    replace_placeholder "$ecs_file" "$ecs_placeholder_regex" "$ecs_dirs_file" || return_code=1
    rm -f "$ecs_dirs_file" # Clean up

    # --- Process Psalm XML file ---
    local psalm_file="psalm.xml"
    local psalm_dirs_file="psalm_dirs.txt"
    local psalm_placeholder_regex='/^[[:space:]]*<directory name="DIRECTORY" \/>[[:space:]]*$/'

    rm -f "$psalm_dirs_file" && touch "$psalm_dirs_file"
    if [ -s "$php_dirs_file" ]; then
        while IFS= read -r dir; do
            # Basic XML escaping for dir name (only & and < are strictly needed here, but > and " are good practice)
            local escaped_dir
            escaped_dir=$(echo "$dir" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/"/\&quot;/g')
            printf '        <directory name="%s" />\n' "$escaped_dir" >>"$psalm_dirs_file"
        done <"$php_dirs_file"
    fi

    replace_placeholder "$psalm_file" "$psalm_placeholder_regex" "$psalm_dirs_file" || return_code=1
    rm -f "$psalm_dirs_file" # Clean up

    # --- Process PHPStan NEON file ---
    local phpstan_file="phpstan.neon.dist"
    local phpstan_dirs_file="phpstan_dirs.txt"
    local phpstan_placeholder_regex='/^[[:space:]]*-[[:space:]]*DIRECTORY[[:space:]]*$/'

    rm -f "$phpstan_dirs_file" && touch "$phpstan_dirs_file"
    if [ -s "$php_dirs_file" ]; then
        while IFS= read -r dir; do
            printf '    - %s\n' "$dir" >>"$phpstan_dirs_file"
        done <"$php_dirs_file"
    fi

    replace_placeholder "$phpstan_file" "$phpstan_placeholder_regex" "$phpstan_dirs_file" || return_code=1
    rm -f "$phpstan_dirs_file" # Clean up

    # --- Final Cleanup and Status ---
    rm -f "$php_dirs_file"

    if [ $return_code -eq 0 ]; then
        success "Tool configuration paths updated dynamically based on found PHP directories."
        return 0
    else
        warn "Errors occurred while updating tool configuration paths. Check logs."
        return 1
    fi
}
