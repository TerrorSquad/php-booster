#!/usr/bin/env bash

# This script is used to integrate the php-blueprint into your project (potentially DDEV)

# --- Configuration ---
BLUEPRINT_REPO_URL="https://github.com/TerrorSquad/php-blueprint.git" # Changed to Git URL
BLUEPRINT_TARGET_DIR="php-blueprint"                                  # Directory to clone into
BLUEPRINT_INTERNAL_PATH="${BLUEPRINT_TARGET_DIR}/blueprint"           # Actual content is inside 'blueprint' subdir

# --- ANSI color codes ---
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VERBOSE=true
NO_CLEANUP=false
IS_DDEV_PROJECT=0

# Set the memory limit for Composer to unlimited (can help with large dependency trees)
export COMPOSER_MEMORY_LIMIT=-1

# --- Helper Functions ---

function log() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${NC}[LOG] $1${NC}"
    fi
}

function warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

function error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
    # Clean up before exiting on error
    cleanup_silent
    exit 1
}

function success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

# --- Dependency Checks ---

function check_dependencies() {
    log "Checking dependencies..."
    local missing_deps=()
    command -v jq >/dev/null 2>&1 || missing_deps+=("jq")
    command -v yq >/dev/null 2>&1 || missing_deps+=("yq") # Still needed for ddev config
    command -v curl >/dev/null 2>&1 || missing_deps+=("curl")
    command -v unzip >/dev/null 2>&1 || missing_deps+=("unzip")

    if [ $IS_DDEV_PROJECT -eq 1 ]; then
        command -v ddev >/dev/null 2>&1 || missing_deps+=("ddev")
    else
        command -v composer >/dev/null 2>&1 || missing_deps+=("composer")
        command -v volta >/dev/null 2>&1 || missing_deps+=("volta")
        command -v pnpm >/dev/null 2>&1 || missing_deps+=("pnpm")
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing dependencies: ${missing_deps[*]}. Please install them."
    fi
    success "All dependencies are satisfied."
}

# --- Project Type Detection ---

function is_ddev_project() {
    if [ -d ".ddev" ]; then
        echo 1
    else
        echo 0
    fi
}

# --- Core Logic Functions ---

function download_php_blueprint() {
    log "Cloning php-blueprint from $BLUEPRINT_REPO_URL..."
    # Clean up previous attempts first
    rm -rf "$BLUEPRINT_TARGET_DIR" # Remove target dir if it exists

    # Clone only the main branch and only the latest commit for speed
    git clone --depth 1 --branch main "$BLUEPRINT_REPO_URL" "$BLUEPRINT_TARGET_DIR" || error "Failed to clone blueprint repository."

    if [ ! -d "$BLUEPRINT_TARGET_DIR" ]; then
        error "Target directory '$BLUEPRINT_TARGET_DIR' not found after clone."
    fi

    if [ ! -d "$BLUEPRINT_INTERNAL_PATH" ]; then
        warn "The expected internal structure '$BLUEPRINT_INTERNAL_PATH' was not found within the cloned repository."
        # Decide if this is fatal
        # error "Blueprint content directory '$BLUEPRINT_INTERNAL_PATH' not found."
    fi
    success "php-blueprint cloned successfully into '$BLUEPRINT_TARGET_DIR'."
}

function update_ddev_files() {
    log "Updating ddev files..."
    local blueprint_ddev_path="${BLUEPRINT_INTERNAL_PATH}/.ddev"
    local project_ddev_path=".ddev"

    if [ ! -d "$blueprint_ddev_path" ]; then
        warn "Blueprint DDEV directory '$blueprint_ddev_path' not found. Skipping DDEV file update."
        return
    fi

    # Define source -> destination mappings relative to .ddev dirs
    local ddev_subdirs=("commands" "php" "web-build")
    for subdir in "${ddev_subdirs[@]}"; do
        local src_path="${blueprint_ddev_path}/${subdir}"
        local dest_path="${project_ddev_path}/${subdir}"
        if [ -d "$src_path" ]; then
            log "  Copying '$src_path' to '$dest_path'..."
            # Use standard recursive copy -R, ensure destination parent exists
            mkdir -p "$dest_path"
            # Copy the source directory *into* the destination directory
            cp -R $src_path/. "$dest_path" || warn "Failed to copy '$src_path'. Check permissions."
        else
            log "  Blueprint DDEV subdirectory '$subdir' not found at '$src_path'. Skipping."
        fi
    done
    success "ddev files updated (if found in blueprint)."
}

function update_ddev_config() {
    log "Updating ddev config using yq..."
    local project_config=".ddev/config.yaml"
    local blueprint_config="${BLUEPRINT_INTERNAL_PATH}/.ddev/config.yaml"
    local hooks_tmp="hooks.yaml.tmp"
    local merged_tmp=".ddev/config.yaml.tmp"

    if [ ! -f "$project_config" ]; then
        warn "Project DDEV config '$project_config' not found. Skipping update."
        return
    fi
    if [ ! -f "$blueprint_config" ]; then
        warn "Blueprint DDEV config '$blueprint_config' not found. Skipping update."
        return
    fi

    # 1. Extract hooks from blueprint config (handle potential errors)
    log "  Extracting hooks from blueprint config..."
    if ! yq '.hooks' "$blueprint_config" >"$hooks_tmp"; then
        warn "Failed to extract hooks using yq from '$blueprint_config'. Skipping hook merge."
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

function copy_files() {
    log "Copying common files..."
    local common_files=(".github" ".vscode" "tools" ".phpstorm" ".editorconfig") # Add other files/dirs if needed

    for item in "${common_files[@]}"; do
        local src_path="${BLUEPRINT_INTERNAL_PATH}/${item}"
        # Destination is the current directory, the item will be created inside it
        local dest_path="."

        if [ -e "$src_path" ]; then
            log "  Copying '$src_path' to '${dest_path}/${item}'..."
            # Use standard recursive copy -R. This copies the source item into the dest dir.
            cp -R "$src_path" "${dest_path}" || warn "Failed to copy '$src_path'. Check permissions."
        else
            log "  Blueprint item '$item' not found at '$src_path'. Skipping."
        fi
    done
    success "Common files copied (if found in blueprint). Verify the copied files and their paths."
}

function update_package_json() {
    log "Updating package.json..."
    local project_pkg="package.json"
    local blueprint_pkg="${BLUEPRINT_INTERNAL_PATH}/package.json"
    local blueprint_commitlint="${BLUEPRINT_INTERNAL_PATH}/commitlint.config.js"
    local tmp_pkg="package.json.tmp"

    if [ ! -f "$blueprint_pkg" ]; then
        warn "Blueprint package.json '$blueprint_pkg' not found. Skipping update."
        return
    fi

    if [ ! -f "$project_pkg" ]; then
        log "'$project_pkg' not found. Copying from blueprint..."
        cp "$blueprint_pkg" "$project_pkg" || error "Failed to copy blueprint package.json."
        success "package.json copied from blueprint."
    else
        log "'$project_pkg' already exists. Merging scripts, devDependencies, and volta sections..."
        # Merge using jq: project + blueprint (blueprint overwrites simple keys, merges objects)
        # This merges top-level objects like scripts, devDependencies, volta
        jq -s '
            .[0] as $proj | .[1] as $blue |
            $proj * {
                scripts: (($proj.scripts // {}) + ($blue.scripts // {})),
                devDependencies: (($proj.devDependencies // {}) + ($blue.devDependencies // {})),
                volta: (($proj.volta // {}) + ($blue.volta // {}))
            }
            ' "$project_pkg" "$blueprint_pkg" >"$tmp_pkg" || error "Failed to merge package.json using jq."

        mv "$tmp_pkg" "$project_pkg"
        success "package.json updated with merged scripts, devDependencies, and volta info."
    fi

    # Copy commitlint config regardless
    if [ -f "$blueprint_commitlint" ]; then
        cp "$blueprint_commitlint" . || warn "Failed to copy commitlint config."
        success "commitlint.config.js copied (if found in blueprint)."
    else
        warn "Blueprint 'commitlint.config.js' not found. Skipping copy."
    fi
}

# --- Updated merge_scripts Function ---
function merge_scripts() {
    local COMPOSER1="composer.json"                            # Project composer.json
    local COMPOSER2="${BLUEPRINT_INTERNAL_PATH}/composer.json" # Blueprint composer.json
    local OUTPUT="composer.json.merged.tmp"

    # Ensure jq is available
    command -v jq >/dev/null 2>&1 || error "jq is required but not installed."

    # Check if files exist
    [ ! -f "$COMPOSER1" ] && error "Project composer.json not found at '$COMPOSER1'"
    [ ! -f "$COMPOSER2" ] && error "Blueprint composer.json not found at '$COMPOSER2'"

    log "Merging scripts from '$COMPOSER2' into '$COMPOSER1'..."

    # Create a temporary copy to work on
    cp "$COMPOSER1" "$OUTPUT"

    # Get script keys from blueprint composer.json, handle null/missing scripts section
    # Use jq -e to check exit status if .scripts is null or not an object
    if ! jq -e '(.scripts // {}) | type == "object"' "$COMPOSER2" >/dev/null; then
        log "No valid 'scripts' object found in blueprint composer.json. Nothing to merge."
        rm "$OUTPUT" # Clean up temp file
        return 0
    fi
    local blue_keys=$(jq -r '.scripts | keys_unsorted | .[]' "$COMPOSER2")

    # Iterate over each script key from the blueprint
    echo "$blue_keys" | while IFS= read -r key; do
        log "  Processing script key: $key"

        # Get values and types using jq
        local proj_script_json=$(jq --arg key "$key" '(.scripts // {})[$key]' "$OUTPUT")
        local blue_script_json=$(jq --arg key "$key" '.scripts[$key]' "$COMPOSER2") # Assumes .scripts exists from check above
        local proj_type=$(jq -r 'type' <<<"$proj_script_json")
        local blue_type=$(jq -r 'type' <<<"$blue_script_json")

        log "    Project type: $proj_type, Blueprint type: $blue_type"

        local merged_script_json

        if [ "$proj_type" == "null" ]; then
            # Script only exists in blueprint, add it
            log "    Adding script from blueprint."
            merged_script_json="$blue_script_json"
        else
            # Script exists in both project and blueprint, merge based on type
            if [ "$proj_type" == "string" ] && [ "$blue_type" == "string" ]; then
                if [ "$proj_script_json" == "$blue_script_json" ]; then
                    log "    Scripts are identical strings, keeping project version."
                    merged_script_json="$proj_script_json"
                else
                    log "    Scripts are different strings, merging into unique array."
                    # Ensure output is valid JSON array
                    merged_script_json=$(jq -n --argjson p "$proj_script_json" --argjson b "$blue_script_json" '[$p, $b] | unique')
                fi
            elif [ "$proj_type" == "array" ] && [ "$blue_type" == "array" ]; then
                log "    Both scripts are arrays, merging uniquely."
                merged_script_json=$(jq -n --argjson p "$proj_script_json" --argjson b "$blue_script_json" '($p + $b) | unique')
            elif [ "$proj_type" == "string" ] && [ "$blue_type" == "array" ]; then
                log "    Project is string, blueprint is array. Merging uniquely."
                merged_script_json=$(jq -n --argjson p "$proj_script_json" --argjson b "$blue_script_json" '([$p] + $b) | unique')
            elif [ "$proj_type" == "array" ] && [ "$blue_type" == "string" ]; then
                log "    Project is array, blueprint is string. Merging uniquely."
                merged_script_json=$(jq -n --argjson p "$proj_script_json" --argjson b "$blue_script_json" '($p + [$b]) | unique')
            else
                # Handle other mismatches (e.g., object vs string) - prefer blueprint? Or keep project? Let's prefer blueprint.
                log "    Type mismatch ($proj_type vs $blue_type). Using blueprint version."
                merged_script_json="$blue_script_json"
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
# --- Function to Update Tool Paths Dynamically ---
function update_tool_paths() {

    # --- Copy Config Files ---
    local cq_files=("rector.php" "phpstan.neon.dist" "ecs.php" "psalm.xml")
    for file in "${cq_files[@]}"; do
        local src_path="${BLUEPRINT_INTERNAL_PATH}/${file}"
        if [ -f "$src_path" ]; then
            cp "$src_path" . || warn "Failed to copy '$src_path'."
        else
            log "  Blueprint config '$file' not found. Skipping."
        fi
    done

    log "Dynamically updating paths in tool configuration files using temp files and sed..."
    local php_dirs_file="php_dirs.txt"
    local return_code=0 # Track overall success/failure

    # 1. Find directories containing .php files and save to php_dirs.txt
    log "  Searching for directories containing PHP files (excluding vendor, .git, node_modules, etc.)..."
    find . -type f \
        -name "*.php" \
        -not -path "./vendor/*" \
        -not -path "./node_modules/*" \
        -not -path "./php-blueprint/*" \
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
            return 0 # Not an error if the config file isn't there
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
            return 1 # Signal failure
        }

        # Pass 2: Delete the placeholder line from the temp file, overwrite original
        sed -i.bak -e "$placeholder_regex d" "$tmp_config_file" || {
            warn "sed 'd' command failed for '$tmp_config_file'."
            rm -f "$tmp_config_file"
            # Restore original from backup if it exists
            [ -f "${config_file}.bak" ] && mv "${config_file}.bak" "$config_file"
            return 1 # Signal failure
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
            printf "        __DIR__ . '/%s',\n" "$dir" >>"$rector_dirs_file"
        done <"$php_dirs_file"
        # Remove trailing newline potentially added by loop/printf
        # sed -i '' -e '$a\' is complex; let's assume tools tolerate trailing comma/newline ok
    fi
    # Replace placeholder
    replace_placeholder "$rector_file" "$rector_placeholder_regex" "$rector_dirs_file" || return_code=1
    rm -f "$rector_dirs_file" # Clean up

    # --- Process ECS PHP file ---
    local ecs_file="ecs.php"
    local ecs_dirs_file="ecs_dirs.txt"
    local ecs_placeholder_regex="/^[[:space:]]*__DIR__ \. '\/DIRECTORY',[[:space:]]*$/"
    # Create formatted dirs file
    rm -f "$ecs_dirs_file" && touch "$ecs_dirs_file"
    if [ -s "$php_dirs_file" ]; then
        while IFS= read -r dir; do
            printf "        __DIR__ . '/%s',\n" "$dir" >>"$ecs_dirs_file"
        done <"$php_dirs_file"
    fi
    # Replace placeholder
    replace_placeholder "$ecs_file" "$ecs_placeholder_regex" "$ecs_dirs_file" || return_code=1
    rm -f "$ecs_dirs_file" # Clean up

    # --- Process Psalm XML file ---
    local psalm_file="psalm.xml"
    local psalm_dirs_file="psalm_dirs.txt"
    local psalm_placeholder_regex='/^[[:space:]]*<directory name="DIRECTORY" \/>[[:space:]]*$/'
    # Create formatted dirs file
    rm -f "$psalm_dirs_file" && touch "$psalm_dirs_file"
    if [ -s "$php_dirs_file" ]; then
        while IFS= read -r dir; do
            # Basic XML escaping for dir name (only & and < are strictly needed here, but > and " are good practice)
            local escaped_dir=$(echo "$dir" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/"/\&quot;/g')
            printf '        <directory name="%s" />\n' "$escaped_dir" >>"$psalm_dirs_file"
        done <"$php_dirs_file"
    fi
    # Replace placeholder
    replace_placeholder "$psalm_file" "$psalm_placeholder_regex" "$psalm_dirs_file" || return_code=1
    rm -f "$psalm_dirs_file" # Clean up

    # --- Process PHPStan NEON file ---
    local phpstan_file="phpstan.neon.dist"
    local phpstan_dirs_file="phpstan_dirs.txt"
    local phpstan_placeholder_regex='/^[[:space:]]*-[[:space:]]*DIRECTORY[[:space:]]*$/'
    # Create formatted dirs file
    rm -f "$phpstan_dirs_file" && touch "$phpstan_dirs_file"
    if [ -s "$php_dirs_file" ]; then
        while IFS= read -r dir; do
            printf '    - %s\n' "$dir" >>"$phpstan_dirs_file"
        done <"$php_dirs_file"
    fi
    # Replace placeholder
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

function add_code_quality_tools() {
    log "Adding code quality tools..."
    local project_composer="composer.json"
    local blueprint_composer="${BLUEPRINT_INTERNAL_PATH}/composer.json"

    # --- Copy Documentation Directory ---
    local blueprint_doc_path="${BLUEPRINT_INTERNAL_PATH}/documentation"
    if [ -d "$blueprint_doc_path" ]; then
        log "  Copying '$blueprint_doc_path' to 'documentation'..."
        # Use standard recursive copy -R
        cp -R "$blueprint_doc_path/." "documentation" || warn "Failed to copy documentation directory."
    else
        log "  Blueprint documentation directory not found. Skipping."
    fi
    success "Code quality tool configs and documentation copied (if found)."

    # --- Update composer.json ---
    log "Updating composer.json..."
    if [ ! -f "$project_composer" ]; then
        warn "'$project_composer' not found. Cannot merge scripts or add dependencies. Consider copying blueprint composer.json first."
        return
    fi
    if [ ! -f "$blueprint_composer" ]; then
        warn "Blueprint composer.json '$blueprint_composer' not found. Skipping composer update."
        return
    fi

    # Merge scripts using the updated function
    merge_scripts # This now handles the merging idempotently

    # --- Install Composer Dependencies ---
    local composer_cmd
    if [ $IS_DDEV_PROJECT -eq 1 ]; then
        composer_cmd=(ddev composer)
    else
        composer_cmd=(composer)
    fi

    # Install production dependencies (if any in blueprint)
    # Check if require section exists and is an object
    if jq -e '.require | type == "object"' "$blueprint_composer" >/dev/null; then
        local prod_deps=$(jq -r '.require | keys_unsorted | .[]' "$blueprint_composer")
        if [ -n "$prod_deps" ]; then
            log "Adding composer 'require' dependencies from blueprint..."
            # Pass dependencies line by line to xargs
            # Use --no-scripts during require to prevent hooks from running prematurely
            echo "$prod_deps" | xargs "${composer_cmd[@]}" require --no-scripts || warn "Failed to add some production dependencies (require step)."
            # Run update afterwards to ensure scripts run if needed, though maybe not desired here?
            # "${composer_cmd[@]}" update --lock # Or just rely on the dev require below
        else
            log "No production dependencies found in blueprint composer.json 'require' section."
        fi
    else
        log "No 'require' object found in blueprint composer.json."
    fi

    # Install dev dependencies
    # Check if require-dev section exists and is an object
    if jq -e '.["require-dev"] | type == "object"' "$blueprint_composer" >/dev/null; then
        local dev_deps=$(jq -r '.["require-dev"] | keys_unsorted | .[]' "$blueprint_composer")
        if [ -n "$dev_deps" ]; then
            log "Adding composer 'require-dev' dependencies from blueprint..."
            # Pass dependencies line by line to xargs
            # Run composer require --dev normally, allowing its scripts to run *after* install/update
            echo "$dev_deps" | xargs "${composer_cmd[@]}" require --dev || warn "Failed to install/update some dev dependencies. Check composer output."
        else
            log "No development dependencies found in blueprint composer.json 'require-dev' section."
        fi
    else
        log "No 'require-dev' object found in blueprint composer.json."
    fi

    success "composer.json updated with merged scripts and new dependencies (if any)."
}

function update_readme() {
    log "Updating README.md..."
    local project_readme="README.md"
    local blueprint_snippet="${BLUEPRINT_INTERNAL_PATH}/README_SNIPPET.md"

    if [ -f "$project_readme" ]; then
        log "'$project_readme' already exists. Skipping creation."
        # Future enhancement: Append snippet if a placeholder exists?
    else
        if [ -f "$blueprint_snippet" ]; then
            warn "'$project_readme' not found. Creating new README.md from blueprint snippet..."
            cp "$blueprint_snippet" "$project_readme" || error "Failed to copy README snippet."
            success "New README.md created with content from '$blueprint_snippet'."
        else
            warn "'$project_readme' not found, and blueprint snippet '$blueprint_snippet' also not found. Skipping."
        fi
    fi
}

function update_gitignore() {
    log "Updating .gitignore..."
    local project_gitignore=".gitignore"
    local blueprint_gitignore="${BLUEPRINT_INTERNAL_PATH}/.gitignore"

    if [ ! -f "$blueprint_gitignore" ]; then
        warn "Blueprint .gitignore '$blueprint_gitignore' not found. Skipping update."
        return
    fi

    # Create .gitignore if it doesn't exist
    touch "$project_gitignore"

    local added_count=0
    # Read blueprint gitignore line by line
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Trim whitespace (optional, depends on desired behavior)
        line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        # Skip empty lines and comments
        if [ -z "$line" ]; then
            continue
        fi
        # Escape line for grep pattern matching (basic)
        # local escaped_line=$(sed 's/[^^]/[&]/g; s/\^/\\^/g' <<< "$line")
        # Using fixed string grep (-F) avoids need for complex escaping
        # Check if the exact line (or commented out) already exists
        if ! grep -q -x -F "$line" "$project_gitignore" && ! grep -q -x -F "# $line" "$project_gitignore" && ! grep -q -x -F "#$line" "$project_gitignore"; then
            # Check if line starting with / exists if original doesn't start with /
            if [[ "$line" != /* ]] && grep -q -x -F "/$line" "$project_gitignore"; then
                continue
            fi
            # Check if line without / exists if original starts with /
            if [[ "$line" == /* ]] && grep -q -x -F "${line#/}" "$project_gitignore"; then
                continue
            fi

            log "  Adding '$line' to .gitignore"
            # Add a header if this is the first addition in this run
            if [ $added_count -eq 0 ]; then
                # Add newline before header if file is not empty
                [ -s "$project_gitignore" ] && echo >>"$project_gitignore"
                # Add spacing newline and header
                echo "" >>"$project_gitignore" # Ensure separation
                echo "# --- Added by php-blueprint integration ---" >>"$project_gitignore"
                log "  Added header to .gitignore"
            fi
            echo "$line" >>"$project_gitignore"
            log "  Added '$line' to .gitignore"
            ((added_count++))
            log "  Incremented added_count to $added_count"
            log "  Total added: $added_count"
        fi
    done <"$blueprint_gitignore"

    if [ $added_count -gt 0 ]; then
        success ".gitignore updated with $added_count new entries."
    else
        log "No new entries needed for .gitignore."
    fi
}

function cleanup_silent() {
    # Used for cleanup during error exit, without verbose logging
    # Need to declare vars used in merge_scripts locally or pass them if needed,
    # but rm -f is safe even if vars are empty/undefined in this context.
    rm -rf "$BLUEPRINT_TARGET_DIR"
    rm -f composer.json.merged.tmp composer.json.merged.tmp.next hooks.yaml.tmp .ddev/config.yaml.tmp package.json.tmp # Clean up temp files
}

function cleanup() {
    log "Cleaning up temporary files..."
    rm -rf "$BLUEPRINT_TARGET_DIR"
    # Remove potential temp files just in case they weren't cleaned up
    rm -f composer.json.merged.tmp composer.json.merged.tmp.next hooks.yaml.tmp .ddev/config.yaml.tmp package.json.tmp
    success "Temporary files cleaned up."
}

# --- Main Execution ---

function main() {
    # Parse arguments (verbose, cleanup)
    while getopts ":vc" opt; do
        case $opt in
        v) VERBOSE=true ;;
        c) NO_CLEANUP=true ;;
        \?) error "Invalid option: -$OPTARG" ;;
        :) error "Option -$OPTARG requires an argument." ;;
        esac
    done
    shift $((OPTIND - 1))

    log "Starting php-blueprint integration..."
    IS_DDEV_PROJECT=$(is_ddev_project)

    if [ $IS_DDEV_PROJECT -eq 1 ]; then
        log "DDEV project detected."
        warn "For DDEV projects, ensure this script is run *inside* the web container (e.g., using 'ddev ssh') for 'ddev composer' commands to work correctly."
    else
        log "Standard PHP project detected (no .ddev directory found)."
    fi

    # Basic check if running from project root
    if [ ! -f "composer.json" ] && [ ! -d ".git" ]; then
        warn "Script might not be running from the project root (composer.json or .git not found). Results may be unexpected."
    fi

    check_dependencies
    download_php_blueprint

    copy_files
    update_package_json # Merges package.json sections
    update_readme
    update_gitignore
    update_tool_paths

    if [ $IS_DDEV_PROJECT -eq 1 ]; then
        log "Updating DDEV files..."
        # ddev start might fail, ensure it's running by repeating the command max 3 times
        local attempts=0
        local max_attempts=3
        while [ $attempts -lt $max_attempts ]; do
            if ddev start; then
                break
            else
                warn "ddev start failed. Retrying... ($((attempts + 1))/$max_attempts)"
                ((attempts++))
                sleep 5 # Wait before retrying
            fi
        done
        update_ddev_files
        update_ddev_config
        ddev restart # Restart DDEV to apply changes
    fi

    add_code_quality_tools # Merges composer scripts & installs deps
    success "Integration process completed."
    log "Ensure you are using Volta for Node.js version management and PNPM as the package manager inside the DDEV container."

    if [ $IS_DDEV_PROJECT -eq 1 ]; then
        success "Please run 'ddev restart' to apply the DDEV configuration changes."
    fi

    # Final cleanup
    if [ "$NO_CLEANUP" = true ]; then
        log "Skipping cleanup as per user request."
    else
        cleanup
    fi
}

# --- Script Entry Point ---
# Ensure script exits immediately if a command fails (safer execution)
set -e
# Ensure pipe failures are caught
set -o pipefail

# Run main function, passing all arguments
main "$@"

# Explicitly exit with success code
exit 0
