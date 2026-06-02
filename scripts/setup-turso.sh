#!/usr/bin/env bash
# ============================================
# Setup Turso Database for Vercel Deployment
# ============================================
# This script creates a Turso database and outputs
# the environment variables you need to set on Vercel.
#
# Prerequisites:
#   1. A Turso account (sign up at https://turso.tech)
#   2. Turso CLI installed
#
# Install Turso CLI:
#   macOS: brew install tursodatabase/tap/turso
#   Linux: curl -sSfL https://get.turso.io | bash
#   Windows: Use WSL, then follow Linux instructions
# ============================================

set -euo pipefail

echo "=== Turso Database Setup ==="
echo ""

# Check if turso CLI is installed
if ! command -v turso &> /dev/null; then
  echo "❌ Turso CLI not found. Please install it first:"
  echo "   macOS: brew install tursodatabase/tap/turso"
  echo "   Linux: curl -sSfL https://get.turso.io | bash"
  echo "   Windows: Use WSL, then the Linux command"
  exit 1
fi

# Check if logged in
if ! turso auth status &> /dev/null; then
  echo "🔑 Logging in to Turso..."
  turso auth login
fi

# Database name
DB_NAME="marketai-db-$(date +%s | tail -c 6)"
echo "📦 Creating database: $DB_NAME"

# Create the database
turso db create "$DB_NAME" || {
  echo "❌ Failed to create database. Check your Turso account."
  exit 1
}

echo "✅ Database created successfully!"

# Get the database URL
DB_URL=$(turso db show "$DB_NAME" --url)
echo "🔗 Database URL: $DB_URL"

# Create an auth token
echo "🔑 Generating auth token..."
DB_TOKEN=$(turso db create-token "$DB_NAME")
echo "🔑 Auth Token: $DB_TOKEN"

echo ""
echo "========================================"
echo "  ✅ Turso Database Ready!"
echo "========================================"
echo ""
echo "Add these environment variables to your Vercel project:"
echo ""
echo "  DATABASE_URL=$DB_URL"
echo "  DATABASE_AUTH_TOKEN=$DB_TOKEN"
echo ""
echo "Also add these required env vars to Vercel:"
echo "  ADMIN_PASSWORD=<choose a strong password>"
echo "  AUTH_SECRET=<run: openssl rand -base64 32>"
echo "  OPENAI_API_KEY=<your OpenAI key>"
echo ""
echo "Then redeploy your project from the Vercel dashboard."
