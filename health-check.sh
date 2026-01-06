#!/bin/bash

# Health check script for Thai Text Corrector
echo "🏥 Thai Text Corrector Health Check"
echo "=================================="

# Check if container is running
if ! docker-compose ps | grep -q "thai-text-corrector.*Up"; then
    echo "❌ Container is not running"
    exit 1
fi

# Check Corpus Server
echo -n "📚 Corpus Server (port 5000): "
if curl -f -s http://localhost:5000/api/corpus > /dev/null; then
    echo "✅ OK"
else
    echo "❌ FAIL"
    exit 1
fi

# Check Tokenizer Server
echo -n "🔤 Tokenizer Server (port 5001): "
if curl -f -s http://localhost:5001/api/health > /dev/null; then
    echo "✅ OK"
else
    echo "❌ FAIL"
    exit 1
fi

# Check main web interface
echo -n "🌐 Web Interface: "
if curl -f -s http://localhost:5000 > /dev/null; then
    echo "✅ OK"
else
    echo "❌ FAIL"
    exit 1
fi

echo ""
echo "🎉 All services are healthy!"
echo "🌐 Access the application at: http://localhost:5000"