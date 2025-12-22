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

    # Cleanup handled by trap
    exit 1
}

function success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

function info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

function prompt() {
    echo -e "${YELLOW}[?]${NC} $1"
}
