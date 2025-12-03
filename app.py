"""
Matrix-Themed Nmap Scanner Web Interface
A safe, lab-only network scanning tool with a Matrix aesthetic.
"""

from flask import Flask, render_template, jsonify, request
import subprocess
import re
import shutil

app = Flask(__name__)

# ============================================
# CONFIGURATION - MODIFY FOR YOUR LAB
# ============================================
# Set your approved lab target here
LAB_TARGET = "scanme.nmap.org"  # Official nmap test target - CHANGE to your lab IP/hostname
# ============================================

# Available scan options (safe flags only)
SCAN_OPTIONS = {
    "top_ports": {
        "flag": "--top-ports 100",
        "label": "Top 100 Ports",
        "description": "Scan the 100 most common ports",
        "default": True
    },
    "service_detection": {
        "flag": "-sV",
        "label": "Service Detection",
        "description": "Detect service versions on open ports",
        "default": True
    },
    "os_detection": {
        "flag": "-O",
        "label": "OS Detection",
        "description": "Attempt to identify the operating system",
        "default": False
    },
    "skip_ping": {
        "flag": "-Pn",
        "label": "Skip Host Discovery",
        "description": "Treat host as online (skip ping)",
        "default": False
    },
    "fast_scan": {
        "flag": "-T4",
        "label": "Fast Timing",
        "description": "Faster scan timing (T4)",
        "default": True
    },
    "verbose": {
        "flag": "-v",
        "label": "Verbose Output",
        "description": "Show more detailed output",
        "default": False
    },
    "script_default": {
        "flag": "-sC",
        "label": "Default Scripts",
        "description": "Run default NSE scripts",
        "default": False
    }
}


def check_nmap_installed():
    """Check if nmap is available on the system."""
    return shutil.which("nmap") is not None


def parse_nmap_output(output):
    """Parse nmap output to extract structured data."""
    results = {
        "raw": output,
        "host": LAB_TARGET,
        "ports": [],
        "os_info": None,
        "scan_info": None
    }
    
    # Extract port information
    port_pattern = r'(\d+)/(tcp|udp)\s+(\w+)\s+(.+)'
    for match in re.finditer(port_pattern, output):
        port_info = {
            "port": match.group(1),
            "protocol": match.group(2),
            "state": match.group(3),
            "service": match.group(4).strip()
        }
        results["ports"].append(port_info)
    
    # Extract OS information if available
    os_pattern = r'OS details?:\s*(.+)'
    os_match = re.search(os_pattern, output)
    if os_match:
        results["os_info"] = os_match.group(1).strip()
    
    # Extract aggressive OS guess if no exact match
    if not results["os_info"]:
        os_guess_pattern = r'Aggressive OS guesses?:\s*(.+)'
        os_guess = re.search(os_guess_pattern, output)
        if os_guess:
            results["os_info"] = os_guess.group(1).strip()
    
    # Extract scan timing info
    timing_pattern = r'Nmap done:.+in (.+)'
    timing_match = re.search(timing_pattern, output)
    if timing_match:
        results["scan_info"] = timing_match.group(1).strip()
    
    return results


@app.route('/')
def index():
    """Serve the main web interface."""
    return render_template('index.html', 
                         target=LAB_TARGET, 
                         options=SCAN_OPTIONS,
                         nmap_available=check_nmap_installed())


@app.route('/api/scan', methods=['POST'])
def run_scan():
    """Execute an nmap scan with the selected options."""
    if not check_nmap_installed():
        return jsonify({
            "success": False,
            "error": "Nmap is not installed on this system. Please install nmap first."
        }), 500
    
    data = request.json or {}
    selected_options = data.get('options', [])
    
    # Build the nmap command with safe defaults
    cmd = ["nmap"]
    
    # Add selected options
    for opt_key in selected_options:
        if opt_key in SCAN_OPTIONS:
            flags = SCAN_OPTIONS[opt_key]["flag"].split()
            cmd.extend(flags)
    
    # If no port options selected, use top ports as default
    if "top_ports" not in selected_options:
        cmd.extend(["--top-ports", "20"])
    
    # Add the target (ONLY the approved lab target)
    cmd.append(LAB_TARGET)
    
    try:
        # Run nmap with timeout for safety
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        output = result.stdout
        if result.stderr:
            output += "\n" + result.stderr
        
        parsed = parse_nmap_output(output)
        parsed["command"] = " ".join(cmd)
        
        return jsonify({
            "success": True,
            "data": parsed
        })
        
    except subprocess.TimeoutExpired:
        return jsonify({
            "success": False,
            "error": "Scan timed out after 5 minutes"
        }), 408
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/options')
def get_options():
    """Return available scan options."""
    return jsonify(SCAN_OPTIONS)


@app.route('/api/target')
def get_target():
    """Return the configured lab target."""
    return jsonify({"target": LAB_TARGET})


if __name__ == '__main__':
    print("\n" + "="*50)
    print("  MATRIX NMAP SCANNER")
    print("="*50)
    print(f"  Target: {LAB_TARGET}")
    print(f"  Nmap Available: {check_nmap_installed()}")
    print("="*50 + "\n")
    
    app.run(debug=True, host='127.0.0.1', port=5000)

