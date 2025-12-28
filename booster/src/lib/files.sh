# --- Core Logic Functions ---


function download_php_booster() {
    if [ "$BOOSTER_LOCAL_DEV" = "1" ]; then
        log "Using local php-booster for development..."

        # Clean up previous attempts first
        rm -rf "$BOOSTER_TARGET_DIR" # Remove target dir if it exists

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
        log "Cloning php-booster from $BOOSTER_REPO_URL..."
        # Clean up previous attempts first
        rm -rf "$BOOSTER_TARGET_DIR" # Remove target dir if it exists

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
    fi
}

function copy_files() {
    log "Copying common files (excluding internal test helpers)..."

    # Copy simple top-level directories/files safely
    local top_level=(".github" ".vscode" ".phpstorm" ".editorconfig" "bin")
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
                    # Iterate over files in src to copy missing ones
                    find "$src_path" -type f | while read -r file; do
                        local rel_path="${file#$src_path/}"
                        local dest_path="$item/$rel_path"
                        local dest_dir=$(dirname "$dest_path")

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

    # Copy .husky directory
    local husky_src="${BOOSTER_INTERNAL_PATH}/.husky"
    if [ -d "$husky_src" ]; then
        log "  Copying .husky directory"
        mkdir -p .husky

        # Copy everything except the 'tests' directory
        for item in "$husky_src"/*; do
            local item_name=$(basename "$item")
            if [ "$item_name" != "tests" ]; then
                cp -R "$item" .husky/
            fi
        done

        # Set execute permissions for scripts and hooks
        find ".husky" -type f \( -name "*.sh" -o -name "*.bash" -o -name "*.mjs" -o -name "pre-commit" -o -name "commit-msg" -o -name "pre-push" \) -exec chmod +x {} \;
    else
        warn "  Expected directory missing: .husky"
    fi

    # Copy validate-branch-name config (needed by hooks & scripts)
    local branch_cfg="${BOOSTER_INTERNAL_PATH}/validate-branch-name.config.cjs"
    if [ -f "$branch_cfg" ]; then
        cp "$branch_cfg" . || warn "Failed to copy validate-branch-name.config.cjs"
    else
        warn "validate-branch-name.config.cjs missing in booster."
    fi

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

function update_package_json() {
    log "Updating package.json..."
    local project_pkg="package.json"
    local booster_pkg="${BOOSTER_INTERNAL_PATH}/package.json"
    local booster_commitlint="${BOOSTER_INTERNAL_PATH}/commitlint.config.ts"
    local tmp_pkg="package.json.tmp"

    if [ ! -f "$booster_pkg" ]; then
        warn "Booster package.json '$booster_pkg' not found. Skipping update."
        return
    fi

    if [ ! -f "$project_pkg" ]; then
        log "'$project_pkg' not found. Copying from booster..."
        cp "$booster_pkg" "$project_pkg" || error "Failed to copy booster package.json."
        success "package.json copied from booster."
    else
        log "'$project_pkg' already exists. Merging scripts, devDependencies, and sections..."
        # Merge using jq: project + booster (booster overwrites simple keys, merges objects)
        # This merges top-level objects like scripts, devDependencies
        jq -s '
            .[0] as $proj | .[1] as $booster |
            $proj * {
                scripts: (($proj.scripts // {}) + ($booster.scripts // {})),
                devDependencies: (($proj.devDependencies // {}) + ($booster.devDependencies // {}))
            }
            ' "$project_pkg" "$booster_pkg" >"$tmp_pkg" || error "Failed to merge package.json using jq."

        mv "$tmp_pkg" "$project_pkg"
        success "package.json updated with merged scripts and devDependencies."
    fi

    # Copy commitlint config regardless
    if [ -f "$booster_commitlint" ]; then
        cp "$booster_commitlint" . || warn "Failed to copy commitlint config."
        success "commitlint.config.ts copied."
    else
        warn "Booster 'commitlint.config.ts' not found. Skipping copy."
    fi

    # Copy pnpm-workspace.yaml if it exists
    local booster_pnpm_workspace="${BOOSTER_INTERNAL_PATH}/pnpm-workspace.yaml"
    if [ -f "$booster_pnpm_workspace" ]; then
        cp "$booster_pnpm_workspace" . || warn "Failed to copy pnpm-workspace.yaml."
        success "pnpm-workspace.yaml copied."
    else
        warn "Booster 'pnpm-workspace.yaml' not found. Skipping copy."
    fi

    # Copy pnpm-lock.yaml if it exists (to ensure deterministic installs)
    local booster_pnpm_lock="${BOOSTER_INTERNAL_PATH}/pnpm-lock.yaml"
    if [ -f "$booster_pnpm_lock" ]; then
        if [ ! -f "pnpm-lock.yaml" ]; then
            cp "$booster_pnpm_lock" . || warn "Failed to copy pnpm-lock.yaml."
            success "pnpm-lock.yaml copied."
        else
            log "pnpm-lock.yaml already exists. Skipping copy."
        fi
    fi
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
    local booster_doc_path="${BOOSTER_INTERNAL_PATH}/documentation"
    if [ -d "$booster_doc_path" ]; then
        if [ ! -d "documentation" ]; then
            log "  Copying '$booster_doc_path' to 'documentation'..."
            cp -R "$booster_doc_path" "documentation" || warn "Failed to copy documentation directory."
        else
            log "  'documentation' directory exists. Copying missing files..."
            for doc_file in "$booster_doc_path"/*; do
                local filename=$(basename "$doc_file")
                if [ ! -e "documentation/$filename" ]; then
                    cp -R "$doc_file" "documentation/"
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
    local cq_files=("rector.php" "phpstan.neon.dist" "ecs.php" "psalm.xml" "deptrac.yaml")
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
