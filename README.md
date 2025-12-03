# Matrix Nmap Scanner

A Matrix-themed web interface for running nmap scans on **authorized lab targets only**.

![Python](https://img.shields.io/badge/python-3.8+-blue)
![Flask](https://img.shields.io/badge/flask-3.0-green)

## Screenshots

![Matrix Nmap Scanner](Screenshot%201.png)

![Scan Results](Screenshot%202.png)

## Features

- Matrix digital rain theme
- Toggle scan options (service detection, OS detection, timing, etc.)
- Real-time results with parsed port/service table
- Hard-coded target for safety

## How to Run

### Prerequisites
- Python 3.8+
- [Nmap](https://nmap.org/download.html) installed and in PATH

### Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Set your lab target in app.py (line 15)
# LAB_TARGET = "your-lab-target-here"

# Run the server
python app.py
```

Open **http://127.0.0.1:5000** in your browser.

## ⚠️ Lab Targets Only

This tool is designed for **authorized testing only**. Only scan targets you have explicit permission to test.

The default target `scanme.nmap.org` is nmap's official test server.

## License

Educational use only.
