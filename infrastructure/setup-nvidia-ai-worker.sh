#!/bin/bash
# Setup NVIDIA drivers and Container Toolkit on ai-worker node
# Run this script ON the ai-worker node (192.168.100.181)

set -e

echo "=== Installing NVIDIA drivers and Container Toolkit on ai-worker ==="

# Detect Ubuntu version
. /etc/os-release
echo "Detected OS: $NAME $VERSION_ID"

# 1. Install NVIDIA drivers
echo ""
echo "Step 1: Installing NVIDIA drivers..."
sudo apt-get update
sudo apt-get install -y ubuntu-drivers-common

# Install a stable driver version
echo "Installing NVIDIA driver 550 (stable)..."
sudo apt-get install -y nvidia-driver-550

# Alternative driver versions if 550 doesn't work:
# sudo apt-get install -y nvidia-driver-535
# sudo apt-get install -y nvidia-driver-545

# 2. Install NVIDIA Container Toolkit
echo ""
echo "Step 2: Installing NVIDIA Container Toolkit..."
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# 3. Configure containerd to use NVIDIA runtime
echo ""
echo "Step 3: Configuring containerd for NVIDIA runtime..."
sudo nvidia-ctk runtime configure --runtime=containerd

# Restart containerd
echo ""
echo "Step 4: Restarting containerd..."
sudo systemctl restart containerd

# 4. Verify installation
echo ""
echo "=== Verification ==="
echo ""
echo "NVIDIA Driver:"
nvidia-smi

echo ""
echo "NVIDIA Container Runtime:"
sudo nvidia-ctk runtime list

echo ""
echo "=== Installation complete! ==="
echo "Please reboot the node for driver changes to take full effect:"
echo "  sudo reboot"
