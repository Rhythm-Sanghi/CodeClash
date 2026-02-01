#!/bin/bash
set -e

echo "🔍 Current directory: $(pwd)"
echo "🔍 Frontend directory exists: $(test -d frontend && echo 'YES' || echo 'NO')"
echo "🔍 index.html exists in current dir: $(test -f index.html && echo 'YES' || echo 'NO')"
echo "🔍 index.html exists in frontend dir: $(test -f frontend/index.html && echo 'YES' || echo 'NO')"

if [ -f "frontend/index.html" ]; then
  echo "✅ Found index.html in frontend directory"
  cd frontend
  npm ci
  npm run build
else
  echo "✅ Assuming we're already in frontend directory"
  npm ci
  npm run build
fi

echo "✅ Build complete!"
