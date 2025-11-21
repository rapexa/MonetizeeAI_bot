#!/bin/bash

echo "🚀 Starting local landing page server..."
echo ""
echo "Landing page will be available at:"
echo "  👉 http://localhost:8000/landing-sale.html"
echo ""
echo "Press Ctrl+C to stop"
echo ""

python3 -m http.server 8000
