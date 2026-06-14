#!/bin/bash
# Start the Legendary Pokédex application

echo "Starting backend on port 3001..."
cd "$(dirname "$0")/backend" && node server.js &
BACKEND_PID=$!

echo "Starting frontend on port 5173..."
cd "$(dirname "$0")/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Legendary Pokédex is running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
