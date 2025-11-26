#!/bin/bash
# ZenBeasts Automated Installation Script for Linux/macOS
# Version: 1.0.0
# Description: Automated installation and setup for the entire ZenBeasts ecosystem

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Output functions
print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_info() {
    echo -e "${CYAN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

print_error() {
    echo -e "${RED}$1${NC}"
}

print_magenta() {
    echo -e "${MAGENTA}$1${NC}"
}

# Banner
show_banner() {
    echo ""
    print_magenta "╔═══════════════════════════════════════════════════════════╗"
    print_magenta "║                                                           ║"
    print_magenta "║     ███████╗███████╗███╗   ██╗██████╗ ███████╗ █████╗    ║"
    print_magenta "║     ╚══███╔╝██╔════╝████╗  ██║██╔══██╗██╔════╝██╔══██╗   ║"
    print_magenta "║       ███╔╝ █████╗  ██╔██╗ ██║██████╔╝█████╗  ███████║   ║"
    print_magenta "║      ███╔╝  ██╔══╝  ██║╚██╗██║██╔══██╗██╔══╝  ██╔══██║   ║"
    print_magenta "║     ███████╗███████╗██║ ╚████║██████╔╝███████╗██║  ██║   ║"
    print_magenta "║     ╚══════╝╚══════╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═╝   ║"
    print_magenta "║                                                           ║"
    print_magenta "║              Automated Installation Wizard               ║"
    print_magenta "║                      Version 1.0.0                       ║"
    print_magenta "║                                                           ║"
    print_magenta "╚═══════════════════════════════════════════════════════════╝"
    echo ""
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        if [ -f /etc/debian_version ]; then
            DISTRO="debian"
        elif [ -f /etc/redhat-release ]; then
            DISTRO="redhat"
        elif [ -f /etc/arch-release ]; then
            DISTRO="arch"
        else
            DISTRO="unknown"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        DISTRO="macos"
    else
        OS="unknown"
        DISTRO="unknown"
    fi
}

# Check if running with sudo (for Linux)
check_sudo() {
    if [[ "$OS" == "linux" ]]; then
        if [ "$EUID" -ne 0 ]; then
            print_warning "⚠ This script may need sudo privileges for some installations."
            print_info "Some components may require sudo. We'll ask when needed."
            echo ""
        fi
    fi
}

# Logging
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/setup/install.log"
mkdir -p "$SCRIPT_DIR/setup"

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Test prerequisite
test_prerequisite() {
    local name=$1
    local cmd=$2

    print_info "Checking for $name..."

    if command_exists "$cmd"; then
        local version=$($cmd --version 2>&1 | head -n1)
        print_success "✓ $name found: $version"
        return 0
    else
        print_warning "✗ $name not found"
        return 1
    fi
}

# Install package manager for macOS
install_homebrew() {
    if [[ "$OS" != "macos" ]]; then
        return 0
    fi

    print_info "Checking for Homebrew..."

    if command_exists brew; then
        print_success "✓ Homebrew already installed"
        return 0
    fi

    print_info "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    if [ $? -eq 0 ]; then
        print_success "✓ Homebrew installed successfully"
        log "SUCCESS" "Homebrew installed"

        # Add Homebrew to PATH
        if [[ -f "/opt/homebrew/bin/brew" ]]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
        return 0
    else
        print_error "✗ Failed to install Homebrew"
        log "ERROR" "Homebrew installation failed"
        return 1
    fi
}

# Install Git
install_git() {
    print_info "Installing Git..."

    if test_prerequisite "Git" "git"; then
        return 0
    fi

    if [[ "$OS" == "macos" ]]; then
        brew install git
    elif [[ "$DISTRO" == "debian" ]]; then
        sudo apt-get update
        sudo apt-get install -y git
    elif [[ "$DISTRO" == "redhat" ]]; then
        sudo yum install -y git
    elif [[ "$DISTRO" == "arch" ]]; then
        sudo pacman -S --noconfirm git
    fi

    if [ $? -eq 0 ]; then
        print_success "✓ Git installed successfully"
        log "SUCCESS" "Git installed"
        return 0
    else
        print_error "✗ Failed to install Git"
        log "ERROR" "Git installation failed"
        return 1
    fi
}

# Install Node.js
install_nodejs() {
    print_info "Installing Node.js..."

    if test_prerequisite "Node.js" "node"; then
        return 0
    fi

    if [[ "$OS" == "macos" ]]; then
        brew install node@18
    elif [[ "$DISTRO" == "debian" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$DISTRO" == "redhat" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    elif [[ "$DISTRO" == "arch" ]]; then
        sudo pacman -S --noconfirm nodejs npm
    fi

    if [ $? -eq 0 ]; then
        print_success "✓ Node.js installed successfully"
        log "SUCCESS" "Node.js installed"
        return 0
    else
        print_error "✗ Failed to install Node.js"
        log "ERROR" "Node.js installation failed"
        return 1
    fi
}

# Install Python
install_python() {
    print_info "Installing Python..."

    if test_prerequisite "Python" "python3"; then
        return 0
    fi

    if [[ "$OS" == "macos" ]]; then
        brew install python@3.10
    elif [[ "$DISTRO" == "debian" ]]; then
        sudo apt-get update
        sudo apt-get install -y python3.10 python3-pip python3-venv
    elif [[ "$DISTRO" == "redhat" ]]; then
        sudo yum install -y python3 python3-pip
    elif [[ "$DISTRO" == "arch" ]]; then
        sudo pacman -S --noconfirm python python-pip
    fi

    if [ $? -eq 0 ]; then
        print_success "✓ Python installed successfully"
        log "SUCCESS" "Python installed"
        return 0
    else
        print_error "✗ Failed to install Python"
        log "ERROR" "Python installation failed"
        return 1
    fi
}

# Install Rust
install_rust() {
    print_info "Installing Rust..."

    if test_prerequisite "Rust" "rustc"; then
        return 0
    fi

    print_info "Downloading rustup installer..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

    # Source cargo environment
    source "$HOME/.cargo/env"

    if [ $? -eq 0 ]; then
        print_success "✓ Rust installed successfully"
        log "SUCCESS" "Rust installed"
        return 0
    else
        print_error "✗ Failed to install Rust"
        log "ERROR" "Rust installation failed"
        return 1
    fi
}

# Install Solana CLI
install_solana() {
    print_info "Installing Solana CLI..."

    if test_prerequisite "Solana" "solana"; then
        return 0
    fi

    print_info "Downloading Solana installer..."
    sh -c "$(curl -sSfL https://release.solana.com/v1.17.16/install)"

    # Add Solana to PATH
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

    if [ $? -eq 0 ]; then
        print_success "✓ Solana CLI installed successfully"
        log "SUCCESS" "Solana CLI installed"
        return 0
    else
        print_error "✗ Failed to install Solana CLI"
        log "ERROR" "Solana CLI installation failed"
        return 1
    fi
}

# Install Anchor
install_anchor() {
    print_info "Installing Anchor Framework..."

    if test_prerequisite "Anchor" "anchor"; then
        return 0
    fi

    print_info "Installing Anchor via Cargo..."
    cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked --force

    if [ $? -eq 0 ]; then
        print_success "✓ Anchor installed successfully"
        log "SUCCESS" "Anchor installed"
        return 0
    else
        print_error "✗ Failed to install Anchor"
        log "ERROR" "Anchor installation failed"
        return 1
    fi
}

# Install Docker
install_docker() {
    local optional=$1

    if [[ "$optional" == "true" ]]; then
        read -p "Do you want to install Docker? (y/N): " response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            print_info "Skipping Docker installation"
            return 0
        fi
    fi

    print_info "Installing Docker..."

    if command_exists docker; then
        print_success "✓ Docker already installed"
        return 0
    fi

    if [[ "$OS" == "macos" ]]; then
        print_warning "Please install Docker Desktop manually from: https://www.docker.com/products/docker-desktop"
        return 0
    elif [[ "$DISTRO" == "debian" ]]; then
        sudo apt-get update
        sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    elif [[ "$DISTRO" == "redhat" ]]; then
        sudo yum install -y yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        sudo systemctl start docker
        sudo systemctl enable docker
    elif [[ "$DISTRO" == "arch" ]]; then
        sudo pacman -S --noconfirm docker docker-compose
        sudo systemctl start docker
        sudo systemctl enable docker
    fi

    if [ $? -eq 0 ]; then
        print_success "✓ Docker installed successfully"
        log "SUCCESS" "Docker installed"

        # Add current user to docker group
        if [[ "$OS" == "linux" ]]; then
            sudo usermod -aG docker $USER
            print_warning "⚠ Please log out and back in for Docker group changes to take effect"
        fi
        return 0
    else
        print_warning "✗ Failed to install Docker"
        log "WARNING" "Docker installation failed"
        return 1
    fi
}

# Setup environment files
setup_environment() {
    print_info "Setting up environment files..."

    # Main .env file
    if [ ! -f ".env" ] && [ -f ".env.template" ]; then
        cp ".env.template" ".env"
        print_success "✓ Created .env file"
    fi

    # Bot Hub .env
    if [ -d "bot-hub" ] && [ ! -f "bot-hub/.env" ] && [ -f "bot-hub/.env.template" ]; then
        cp "bot-hub/.env.template" "bot-hub/.env"
        print_success "✓ Created bot-hub/.env file"
    fi

    # Frontend .env
    if [ -d "frontend" ] && [ ! -f "frontend/.env.local" ] && [ -f "frontend/.env.template" ]; then
        cp "frontend/.env.template" "frontend/.env.local"
        print_success "✓ Created frontend/.env.local file"
    fi

    log "SUCCESS" "Environment files created"
    return 0
}

# Installation menu
show_installation_menu() {
    echo ""
    print_info "=== Installation Options ==="
    echo "1. Full Stack Installation (Recommended)"
    echo "2. Solana Development Only"
    echo "3. Bot Hub Only"
    echo "4. Frontend Only"
    echo "5. Custom Installation"
    echo "6. Exit"
    echo ""
    read -p "Select an option (1-6): " choice
    echo "$choice"
}

# Verify installation
verify_installation() {
    print_info ""
    print_info "=== Verifying Installation ==="
    print_info ""

    local all_good=true

    # Check Git
    if test_prerequisite "Git" "git"; then
        git --version
    else
        all_good=false
    fi

    # Check Node.js
    if test_prerequisite "Node.js" "node"; then
        node --version
        npm --version
    else
        all_good=false
    fi

    # Check Python
    if test_prerequisite "Python" "python3"; then
        python3 --version
    else
        all_good=false
    fi

    # Check Rust
    if test_prerequisite "Rust" "rustc"; then
        rustc --version
        cargo --version
    else
        all_good=false
    fi

    # Check Solana
    if test_prerequisite "Solana" "solana"; then
        solana --version
    else
        all_good=false
    fi

    # Check Anchor
    if test_prerequisite "Anchor" "anchor"; then
        anchor --version
    else
        all_good=false
    fi

    echo ""
    if [ "$all_good" = true ]; then
        print_success "✓ All components installed successfully!"
        log "SUCCESS" "Installation verification passed"
    else
        print_warning "⚠ Some components are missing. Please review the output above."
        log "WARNING" "Installation verification incomplete"
    fi

    return 0
}

# Configuration wizard
run_configuration_wizard() {
    print_info ""
    print_info "=== Configuration Wizard ==="
    print_info ""

    read -p "Would you like to run the configuration wizard now? (y/N): " response

    if [[ "$response" =~ ^[Yy]$ ]]; then
        if [ -f "$SCRIPT_DIR/setup/config-wizard.sh" ]; then
            bash "$SCRIPT_DIR/setup/config-wizard.sh"
        else
            print_warning "Configuration wizard not found. Please run it manually later."
        fi
    else
        print_info "You can run the configuration wizard later with: ./setup/config-wizard.sh"
    fi
}

# Main installation function
main_installation() {
    local mode=$1

    show_banner
    detect_os
    check_sudo

    log "INFO" "Installation started on $OS ($DISTRO)"
    print_info "Installation logs will be saved to: $LOG_FILE"
    echo ""

    # System check
    print_info "=== System Check ==="
    echo ""
    print_info "Operating System: $OS"
    print_info "Distribution: $DISTRO"
    print_info "User: $USER"
    print_info "Home: $HOME"
    echo ""

    # Get installation choice
    if [ -z "$mode" ]; then
        mode=$(show_installation_menu)
    fi

    case $mode in
        1)
            print_info ""
            print_info "=== Full Stack Installation ==="
            print_info ""

            # Install base tools
            if [[ "$OS" == "macos" ]]; then
                install_homebrew
            fi
            install_git
            install_nodejs
            install_python
            install_rust
            install_solana
            install_anchor
            install_docker true

            # Setup environment
            setup_environment

            # Install component dependencies
            print_info ""
            print_info "Installing component dependencies..."
            print_info ""

            if [ -f "$SCRIPT_DIR/setup/install-solana.sh" ]; then
                bash "$SCRIPT_DIR/setup/install-solana.sh"
            fi
            if [ -f "$SCRIPT_DIR/setup/install-bot-hub.sh" ]; then
                bash "$SCRIPT_DIR/setup/install-bot-hub.sh"
            fi
            if [ -f "$SCRIPT_DIR/setup/install-frontend.sh" ]; then
                bash "$SCRIPT_DIR/setup/install-frontend.sh"
            fi
            ;;
        2)
            print_info ""
            print_info "=== Solana Development Installation ==="
            print_info ""
            if [[ "$OS" == "macos" ]]; then
                install_homebrew
            fi
            install_git
            install_rust
            install_solana
            install_anchor
            setup_environment
            if [ -f "$SCRIPT_DIR/setup/install-solana.sh" ]; then
                bash "$SCRIPT_DIR/setup/install-solana.sh"
            fi
            ;;
        3)
            print_info ""
            print_info "=== Bot Hub Installation ==="
            print_info ""
            if [[ "$OS" == "macos" ]]; then
                install_homebrew
            fi
            install_git
            install_python
            setup_environment
            if [ -f "$SCRIPT_DIR/setup/install-bot-hub.sh" ]; then
                bash "$SCRIPT_DIR/setup/install-bot-hub.sh"
            fi
            ;;
        4)
            print_info ""
            print_info "=== Frontend Installation ==="
            print_info ""
            if [[ "$OS" == "macos" ]]; then
                install_homebrew
            fi
            install_git
            install_nodejs
            setup_environment
            if [ -f "$SCRIPT_DIR/setup/install-frontend.sh" ]; then
                bash "$SCRIPT_DIR/setup/install-frontend.sh"
            fi
            ;;
        5)
            print_info ""
            print_info "=== Custom Installation ==="
            print_info ""
            echo "Select components to install (y/N):"

            read -p "Install Git? " install_git_choice
            read -p "Install Node.js? " install_node_choice
            read -p "Install Python? " install_python_choice
            read -p "Install Rust? " install_rust_choice
            read -p "Install Solana CLI? " install_solana_choice
            read -p "Install Anchor? " install_anchor_choice
            read -p "Install Docker? " install_docker_choice

            if [[ "$OS" == "macos" ]]; then
                install_homebrew
            fi
            [[ "$install_git_choice" =~ ^[Yy]$ ]] && install_git
            [[ "$install_node_choice" =~ ^[Yy]$ ]] && install_nodejs
            [[ "$install_python_choice" =~ ^[Yy]$ ]] && install_python
            [[ "$install_rust_choice" =~ ^[Yy]$ ]] && install_rust
            [[ "$install_solana_choice" =~ ^[Yy]$ ]] && install_solana
            [[ "$install_anchor_choice" =~ ^[Yy]$ ]] && install_anchor
            [[ "$install_docker_choice" =~ ^[Yy]$ ]] && install_docker false

            setup_environment
            ;;
        6)
            print_info "Exiting installer."
            exit 0
            ;;
        *)
            print_error "Invalid option selected."
            exit 1
            ;;
    esac

    # Verify installation
    verify_installation

    # Run configuration wizard
    run_configuration_wizard

    # Print next steps
    echo ""
    print_success "=== Installation Complete! ==="
    echo ""
    print_info "Next steps:"
    print_info "1. Configure your environment: ./setup/config-wizard.sh"
    print_info "2. Build smart contracts: cd programs && anchor build"
    print_info "3. Start Bot Hub: cd bot-hub && python3 orchestrator.py"
    print_info "4. Launch frontend: cd frontend && npm run dev"
    echo ""
    print_info "Documentation: ./INSTALLATION_GUIDE.md"
    print_info "Logs: $LOG_FILE"
    echo ""

    # Add tools to PATH reminder
    echo ""
    print_warning "⚠ IMPORTANT: Add the following to your shell profile (~/.bashrc or ~/.zshrc):"
    echo ""
    echo 'export PATH="$HOME/.cargo/bin:$PATH"'
    echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"'
    echo ""
    print_info "Then run: source ~/.bashrc  (or source ~/.zshrc)"
    echo ""

    log "SUCCESS" "Installation completed"
}

# Handle script parameters
MODE=""
UPDATE=false
VERIFY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --update)
            UPDATE=true
            shift
            ;;
        --verify)
            VERIFY=true
            shift
            ;;
        --full|--solana|--bot-hub|--frontend|--custom)
            MODE="${1#--}"
            case $MODE in
                full) MODE="1" ;;
                solana) MODE="2" ;;
                bot-hub) MODE="3" ;;
                frontend) MODE="4" ;;
                custom) MODE="5" ;;
            esac
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Main execution
if [ "$UPDATE" = true ]; then
    print_info "Updating ZenBeasts..."
    git pull
    print_success "✓ Update complete"
    exit 0
fi

if [ "$VERIFY" = true ]; then
    show_banner
    verify_installation
    exit 0
fi

# Run main installation
main_installation "$MODE"
