#!/bin/bash
# Exit script if any command fails
set -e

echo "Caching configurations and routes..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "Running migrations..."
php artisan migrate --force

echo "Starting Apache servers..."
exec apache2-foreground
