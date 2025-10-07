#!/bin/bash
cd /app/frontend
echo "Installing yarn dependencies..."
yarn install --frozen-lockfile

echo "Restarting Expo service..."
sudo supervisorctl restart expo

echo "Checking service status..."
sudo supervisorctl status expo

echo "Installation and restart complete!"