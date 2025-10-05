#!/usr/bin/env bash

# Generic runner script - handles DDEV container detection and command execution

# Check if we're inside a DDEV container
is_inside_container() {
    [[ -n "$DDEV_HOSTNAME" || -n "$DDEV_PROJECT" || -n "$DDEV_SITENAME" ]]
}

# Main execution
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <command> [arguments...]" >&2
    exit 1
fi

if is_inside_container; then
    exec "$@"
elif command -v ddev >/dev/null 2>&1; then
    # Try to use docker exec -t for better color support
    # Get project name from .ddev/config.yaml to construct container name
    if [ -f ".ddev/config.yaml" ]; then
        project_name=$(grep "^name:" .ddev/config.yaml | sed 's/name: *//' | tr -d '"')
        container_name="ddev-${project_name}-web"

        if [ -n "$project_name" ] && command -v docker >/dev/null 2>&1; then
            # Use docker exec -t for TTY support and colors
            # Forward a conservative whitelist of environment variables from the host
            # into the container so ZX hooks and wrappers can honour skip flags and
            # verbosity settings without exposing unrelated host environment values.
            # Whitelist derived from hook/utility usage: SKIP_PRECOMMIT, SKIP_COMMITMSG,
            # SKIP_RECTOR, SKIP_ECS, SKIP_PHPSTAN, SKIP_PSALM, SKIP_DEPTRAC,
            # PRECOMMIT_VERBOSE, COMMITMSG_VERBOSE, FORCE_COLOR, LC_ALL, LANG,
            whitelist=(
                "SKIP_PRECOMMIT"
                "SKIP_COMMITMSG"
                "SKIP_RECTOR"
                "SKIP_ECS"
                "SKIP_PHPSTAN"
                "SKIP_PSALM"
                "SKIP_DEPTRAC"
                "PRECOMMIT_VERBOSE"
                "COMMITMSG_VERBOSE"
            )

            env_flags=()
            for var in "${whitelist[@]}"; do
                # Only forward if variable is set in the host environment
                if [ -n "${!var+x}" ]; then
                    env_flags+=("-e" "${var}=${!var}")
                fi
            done

            if [ ${#env_flags[@]} -gt 0 ]; then
                exec docker exec -t "${env_flags[@]}" "$container_name" "$@"
            else
                exec docker exec -t "$container_name" "$@"
            fi
        fi
    fi
else
    exec "$@"
fi
