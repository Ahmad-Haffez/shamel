#!/bin/bash
# Script to build React app, create nginx Docker image, and import to k3s

set -e

echo "Building React application..."
cd ~/POCchart/frontend

# Build React app
echo "Running npm build..."
npm --prefix ./search-app run build

if [ ! -d "./search-app/build" ]; then
    echo "❌ React build failed - build directory not found"
    exit 1
fi

echo "✅ React build successful"

# Copy build files to frontend directory
echo "Copying build files to wifi-stats-frontend..."

rm -rf ./build
cp -r search-app/build ./build

# Get version from user or use default
VERSION=${1:-1.0}

echo "Building Docker image version $VERSION..."
 
sudo nerdctl --namespace k8s.io build --no-cache -t wifi-stats-frontend:$VERSION .

echo "Saving and importing to k3s..."
sudo nerdctl --namespace k8s.io save wifi-stats-frontend:$VERSION | sudo k3s ctr images import -

echo "Tagging as latest..."
sudo ctr -n k8s.io images tag docker.io/library/wifi-stats-frontend:$VERSION docker.io/library/wifi-stats-frontend:latest

echo ""
echo "✅ Image wifi-stats-frontend:$VERSION built and imported successfully!"
echo ""
echo "To deploy, run on your local machine:"
echo "  kubectl apply -f ~/POCchart/frontend/wifi-stats-frontend-k8s.yaml"
