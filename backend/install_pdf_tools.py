#!/usr/bin/env python3
"""
Script to install PDF processing libraries and tools.
"""

import subprocess
import sys
import platform
import os

def print_step(msg):
    """Print a step message with formatting"""
    print(f"\n{'='*80}\n{msg}\n{'='*80}\n")

def check_installation(name):
    """Check if a Python package is installed"""
    try:
        __import__(name)
        print(f"✓ {name} is already installed")
        return True
    except ImportError:
        print(f"✗ {name} is not installed")
        return False

def install_package(package):
    """Install a Python package using pip"""
    print(f"Installing {package}...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"✓ Successfully installed {package}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to install {package}: {e}")
        return False

def main():
    """Main installation function"""
    print_step("Checking and installing PDF processing libraries")
    
    # List of Python packages to install
    packages = [
        "PyMuPDF",       # Primary PDF processor
        "pdfminer.six",  # Alternative PDF text extractor
        "PyPDF2",        # Another PDF processor
    ]
    
    # Install each package
    for package in packages:
        name = package.split('[')[0]  # Handle packages with extras like 'package[extra]'
        if not check_installation(name.replace('-', '_').replace('.', '_')):
            install_package(package)
    
    # Check for pdftotext command line tool
    print_step("Checking for pdftotext command line tool")
    try:
        subprocess.run(["pdftotext", "-v"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print("✓ pdftotext is installed")
    except FileNotFoundError:
        print("✗ pdftotext is not installed")
        
        system = platform.system()
        if system == "Linux":
            print("Installing pdftotext (poppler-utils) for Linux...")
            try:
                # Try apt-get first (Debian/Ubuntu)
                subprocess.check_call(["apt-get", "update"])
                subprocess.check_call(["apt-get", "install", "-y", "poppler-utils"])
            except:
                try:
                    # Try yum (CentOS/RHEL)
                    subprocess.check_call(["yum", "install", "-y", "poppler-utils"])
                except:
                    print("Could not install pdftotext automatically. Please install poppler-utils manually.")
        elif system == "Darwin":  # macOS
            print("To install pdftotext on macOS, run: brew install poppler")
        elif system == "Windows":
            print("On Windows, pdftotext is typically included with MuPDF or Xpdf.")
            print("Please download and install from: https://www.xpdfreader.com/download.html")
    
    print_step("Installation complete")
    print("You should now be able to process PDF files.")
    print("If you still encounter issues, try restarting your application server.")

if __name__ == "__main__":
    main()
