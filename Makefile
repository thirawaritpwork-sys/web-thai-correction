# Thai Text Corrector - Docker Management

.PHONY: help build run stop clean logs shell test backup restore

# Default target
help:
	@echo "🇹🇭 Thai Text Corrector - Docker Commands"
	@echo ""
	@echo "📦 Build & Run:"
	@echo "  make build     - Build Docker image"
	@echo "  make run       - Run with docker-compose"
	@echo "  make dev       - Run in development mode"
	@echo "  make stop      - Stop all containers"
	@echo ""
	@echo "🔧 Management:"
	@echo "  make logs      - View container logs"
	@echo "  make shell     - Access container shell"
	@echo "  make clean     - Clean up containers and images"
	@echo "  make restart   - Restart the application"
	@echo ""
	@echo "🧪 Testing:"
	@echo "  make test      - Run health checks"
	@echo "  make status    - Check container status"
	@echo ""
	@echo "💾 Data:"
	@echo "  make backup    - Backup corpus data"
	@echo "  make restore   - Restore corpus data"
	@echo ""

# Build the Docker image
build:
	@echo "🔨 Building Thai Text Corrector Docker image..."
	docker-compose build

# Run the application
run:
	@echo "🚀 Starting Thai Text Corrector..."
	docker-compose up -d
	@echo "✅ Application started!"
	@echo "🌐 Access at: http://localhost:5000"
	@echo "🔤 Tokenizer API: http://localhost:5001"

# Development mode with live reload
dev:
	@echo "🛠️ Starting in development mode..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Stop the application
stop:
	@echo "🛑 Stopping Thai Text Corrector..."
	docker-compose down

# Restart the application
restart: stop run

# View logs
logs:
	@echo "📋 Viewing container logs..."
	docker-compose logs -f

# Access container shell
shell:
	@echo "🐚 Accessing container shell..."
	docker-compose exec thai-text-corrector bash

# Clean up
clean:
	@echo "🧹 Cleaning up containers and images..."
	docker-compose down -v
	docker system prune -f
	@echo "✅ Cleanup complete!"

# Health check
test:
	@echo "🏥 Running health checks..."
	@curl -f http://localhost:5000/api/corpus > /dev/null 2>&1 && echo "✅ Corpus Server: OK" || echo "❌ Corpus Server: FAIL"
	@curl -f http://localhost:5001/api/health > /dev/null 2>&1 && echo "✅ Tokenizer Server: OK" || echo "❌ Tokenizer Server: FAIL"

# Check status
status:
	@echo "📊 Container status:"
	docker-compose ps

# Backup corpus data
backup:
	@echo "💾 Backing up corpus data..."
	@mkdir -p backups
	docker cp thai-text-corrector:/app/main-corpus.json ./backups/corpus-backup-$(shell date +%Y%m%d-%H%M%S).json
	@echo "✅ Backup saved to backups/"

# Restore corpus data (requires BACKUP_FILE variable)
restore:
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "❌ Please specify BACKUP_FILE: make restore BACKUP_FILE=backups/corpus-backup-xxx.json"; \
	else \
		echo "🔄 Restoring corpus from $(BACKUP_FILE)..."; \
		docker cp $(BACKUP_FILE) thai-text-corrector:/app/main-corpus.json; \
		echo "✅ Corpus restored!"; \
	fi

# Quick setup for new users
setup: build run
	@echo ""
	@echo "🎉 Thai Text Corrector is ready!"
	@echo "🌐 Open your browser and go to: http://localhost:5000"
	@echo ""
	@echo "📚 Quick start:"
	@echo "  1. Upload a TSV file with 'text' column"
	@echo "  2. Start processing and correcting text"
	@echo "  3. Use 'word|correction' format for manual corrections"
	@echo ""

# Production deployment
prod:
	@echo "🚀 Deploying for production..."
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "✅ Production deployment complete!"