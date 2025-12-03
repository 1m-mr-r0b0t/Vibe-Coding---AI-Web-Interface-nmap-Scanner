/**
 * MATRIX NMAP SCANNER - Frontend JavaScript
 * Handles UI interactions, Matrix rain effect, and API communication
 */

document.addEventListener('DOMContentLoaded', () => {
    initMatrixRain();
    initScanControls();
    initRawOutputToggle();
    updateCommandPreview();
});

// ============================================
// MATRIX RAIN EFFECT
// ============================================

function initMatrixRain() {
    const canvas = document.getElementById('matrix-rain');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Matrix characters (mix of katakana, numbers, and symbols)
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF<>{}[]|/*-+';
    const charArray = chars.split('');
    
    const fontSize = 14;
    let columns = Math.floor(canvas.width / fontSize);
    let drops = [];
    
    // Initialize drops
    function initDrops() {
        columns = Math.floor(canvas.width / fontSize);
        drops = [];
        for (let i = 0; i < columns; i++) {
            drops[i] = Math.random() * -100;
        }
    }
    initDrops();
    window.addEventListener('resize', initDrops);
    
    // Draw the rain
    function draw() {
        // Semi-transparent black to create fade effect
        ctx.fillStyle = 'rgba(13, 2, 8, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#00ff41';
        ctx.font = `${fontSize}px monospace`;
        
        for (let i = 0; i < drops.length; i++) {
            // Random character
            const char = charArray[Math.floor(Math.random() * charArray.length)];
            
            // Draw the character
            const x = i * fontSize;
            const y = drops[i] * fontSize;
            
            // Vary the brightness
            const brightness = Math.random();
            if (brightness > 0.95) {
                ctx.fillStyle = '#ffffff'; // Occasional white flash
            } else if (brightness > 0.8) {
                ctx.fillStyle = '#39ff14'; // Bright green
            } else {
                ctx.fillStyle = '#00ff41'; // Standard green
            }
            
            ctx.fillText(char, x, y);
            
            // Reset drop when it falls off screen
            if (y > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            
            drops[i]++;
        }
    }
    
    // Animation loop
    setInterval(draw, 50);
}

// ============================================
// SCAN CONTROLS
// ============================================

function initScanControls() {
    const scanBtn = document.getElementById('scan-btn');
    const checkboxes = document.querySelectorAll('input[name="scan-option"]');
    
    // Update command preview when options change
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateCommandPreview);
    });
    
    // Handle scan button click
    scanBtn.addEventListener('click', runScan);
}

function getSelectedOptions() {
    const checkboxes = document.querySelectorAll('input[name="scan-option"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function updateCommandPreview() {
    const preview = document.getElementById('command-preview');
    const target = document.getElementById('target-host').textContent;
    const selected = getSelectedOptions();
    
    // Build command string
    let cmd = 'nmap';
    
    const flagMap = {
        'top_ports': '--top-ports 100',
        'service_detection': '-sV',
        'os_detection': '-O',
        'skip_ping': '-Pn',
        'fast_scan': '-T4',
        'verbose': '-v',
        'script_default': '-sC'
    };
    
    selected.forEach(opt => {
        if (flagMap[opt]) {
            cmd += ` ${flagMap[opt]}`;
        }
    });
    
    // Default if no port option
    if (!selected.includes('top_ports')) {
        cmd += ' --top-ports 20';
    }
    
    cmd += ` ${target}`;
    preview.textContent = cmd;
}

async function runScan() {
    const scanBtn = document.getElementById('scan-btn');
    const resultsSection = document.getElementById('results-section');
    
    // Prevent multiple scans
    if (scanBtn.classList.contains('loading')) return;
    
    // Set loading state
    scanBtn.classList.add('loading');
    scanBtn.disabled = true;
    
    // Clear previous results
    clearResults();
    
    // Show results section
    resultsSection.classList.add('visible');
    resultsSection.classList.remove('scan-complete');
    
    try {
        const options = getSelectedOptions();
        
        const response = await fetch('/api/scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ options })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayResults(data.data);
            resultsSection.classList.add('scan-complete');
        } else {
            displayError(data.error);
        }
    } catch (error) {
        displayError('Failed to connect to the server. Please ensure the backend is running.');
        console.error('Scan error:', error);
    } finally {
        // Reset button state
        scanBtn.classList.remove('loading');
        scanBtn.disabled = false;
    }
}

// ============================================
// RESULTS DISPLAY
// ============================================

function clearResults() {
    document.getElementById('ports-found').textContent = '--';
    document.getElementById('services-found').textContent = '--';
    document.getElementById('os-detected').textContent = '--';
    document.getElementById('scan-time').textContent = '';
    document.getElementById('raw-content').textContent = 'Scanning...';
    
    const tbody = document.getElementById('ports-tbody');
    tbody.innerHTML = `
        <tr class="placeholder-row">
            <td colspan="4">
                <span class="scanning-indicator">◉ Scanning in progress...</span>
            </td>
        </tr>
    `;
}

function displayResults(data) {
    // Update summary cards
    const portCount = data.ports.length;
    const serviceCount = data.ports.filter(p => p.service && p.service !== 'unknown').length;
    
    document.getElementById('ports-found').textContent = portCount;
    document.getElementById('services-found').textContent = serviceCount;
    document.getElementById('os-detected').textContent = data.os_info || 'Not detected';
    
    if (data.scan_info) {
        document.getElementById('scan-time').textContent = `Completed in ${data.scan_info}`;
    }
    
    // Update ports table
    const tbody = document.getElementById('ports-tbody');
    
    if (data.ports.length === 0) {
        tbody.innerHTML = `
            <tr class="placeholder-row">
                <td colspan="4">No open ports detected</td>
            </tr>
        `;
    } else {
        tbody.innerHTML = data.ports.map((port, index) => `
            <tr style="animation-delay: ${index * 50}ms" class="port-row">
                <td><span class="port-number">${port.port}</span></td>
                <td><span class="state-${port.state}">${port.state.toUpperCase()}</span></td>
                <td>${port.protocol.toUpperCase()}</td>
                <td>${escapeHtml(port.service)}</td>
            </tr>
        `).join('');
        
        // Animate rows
        const rows = tbody.querySelectorAll('.port-row');
        rows.forEach((row, i) => {
            row.style.opacity = '0';
            row.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                row.style.transition = 'all 0.3s ease';
                row.style.opacity = '1';
                row.style.transform = 'translateX(0)';
            }, i * 50);
        });
    }
    
    // Update raw output
    let rawText = `Command: ${data.command}\n\n`;
    rawText += data.raw || 'No raw output available';
    document.getElementById('raw-content').textContent = rawText;
}

function displayError(message) {
    const tbody = document.getElementById('ports-tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="4">
                <div class="error-message">
                    ⚠ ERROR: ${escapeHtml(message)}
                </div>
            </td>
        </tr>
    `;
    
    document.getElementById('raw-content').textContent = `Error: ${message}`;
}

// ============================================
// RAW OUTPUT TOGGLE
// ============================================

function initRawOutputToggle() {
    const toggle = document.getElementById('raw-toggle');
    const output = document.getElementById('raw-output');
    
    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        output.classList.toggle('visible');
        
        const text = toggle.querySelector('.toggle-icon').nextSibling;
        if (output.classList.contains('visible')) {
            toggle.innerHTML = '<span class="toggle-icon">▼</span> HIDE RAW OUTPUT';
        } else {
            toggle.innerHTML = '<span class="toggle-icon">▼</span> SHOW RAW OUTPUT';
        }
    });
}

// ============================================
// UTILITIES
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add typing effect for status messages
function typeText(element, text, speed = 50) {
    element.textContent = '';
    let i = 0;
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Console easter egg
console.log(`
%c╔══════════════════════════════════════════╗
║                                          ║
║     MATRIX NMAP SCANNER                  ║
║     Wake up, Neo...                      ║
║     The Matrix has you.                  ║
║                                          ║
╚══════════════════════════════════════════╝
`, 'color: #00ff41; background: #000; font-family: monospace;');

