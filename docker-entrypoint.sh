#!/bin/bash

# Start both servers in background
echo "🚀 Starting Thai Text Corrector Docker Container..."

# Start Corpus Server (port 5000)
echo "📚 Starting Corpus Server on port 5000..."
python3 corpus-server.py &
CORPUS_PID=$!

# Wait a moment for corpus server to start
sleep 2

# Start Tokenizer Server (port 5001)
echo "🔤 Starting Tokenizer Server on port 5001..."
python3 tokenizer-server.py &
TOKENIZER_PID=$!

# Function to handle shutdown
shutdown() {
    echo "🛑 Shutting down servers..."
    kill $CORPUS_PID $TOKENIZER_PID
    wait $CORPUS_PID $TOKENIZER_PID
    echo "✅ Servers stopped"
    exit 0
}

# Trap SIGTERM and SIGINT
trap shutdown SIGTERM SIGINT

echo "✅ Both servers are running!"
echo "📝 Corpus Server: http://localhost:5000"
echo "🔤 Tokenizer Server: http://localhost:5001"
echo "🌐 Access the application at: http://localhost:5000"

# Wait for both processes
wait $CORPUS_PID $TOKENIZER_PID