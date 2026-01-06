# Thai Text Corrector - Docker Setup

Complete Docker containerization for the Thai Text Corrector application with both Corpus Server and Tokenizer Server.

## 🚀 Quick Start

### Option 1: Using Docker Compose (Recommended)

```bash
# Build and start the application
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### Option 2: Using Docker directly

```bash
# Build the image
docker build -t thai-text-corrector .

# Run the container
docker run -p 5000:5000 -p 5001:5001 \
  -v $(pwd)/main-corpus.json:/app/main-corpus.json \
  -v $(pwd)/audio:/app/audio \
  thai-text-corrector
```

## 🌐 Access the Application

Once the container is running:

- **Main Application**: http://localhost:5000
- **Corpus API**: http://localhost:5000/api/corpus
- **Tokenizer API**: http://localhost:5001/api/tokenize
- **Health Check**: http://localhost:5001/api/health

## 📁 Container Structure

```
/app/
├── corpus-server.py          # Main server (port 5000)
├── tokenizer-server.py       # Tokenizer server (port 5001)
├── index.html               # Web interface
├── script.js                # Frontend logic
├── main-corpus.json         # Corpus data (mounted)
├── audio/                   # Audio files (mounted)
└── sample-data.tsv          # Sample data
```

## 🔧 Configuration

### Environment Variables

You can customize the application using environment variables:

```bash
docker run -p 5000:5000 -p 5001:5001 \
  -e CORPUS_PORT=5000 \
  -e TOKENIZER_PORT=5001 \
  thai-text-corrector
```

### Volume Mounts

- `./main-corpus.json:/app/main-corpus.json` - Corpus data persistence
- `./audio:/app/audio` - Audio files directory
- `./sample-data.tsv:/app/sample-data.tsv` - Sample TSV data

## 🛠️ Development

### Building for Development

```bash
# Build development image
docker build -t thai-text-corrector:dev .

# Run with live reload (mount source code)
docker run -p 5000:5000 -p 5001:5001 \
  -v $(pwd):/app \
  thai-text-corrector:dev
```

### Debugging

```bash
# View logs
docker-compose logs -f

# Access container shell
docker-compose exec thai-text-corrector bash

# Check running processes
docker-compose exec thai-text-corrector ps aux
```

## 📊 Health Monitoring

The container includes health checks:

```bash
# Check container health
docker-compose ps

# Manual health check
curl http://localhost:5000/api/corpus
curl http://localhost:5001/api/health
```

## 🔄 Updates and Maintenance

### Updating the Application

```bash
# Pull latest changes and rebuild
git pull
docker-compose down
docker-compose up --build -d
```

### Backup Corpus Data

```bash
# Backup corpus
docker cp thai-text-corrector:/app/main-corpus.json ./backup-corpus.json

# Restore corpus
docker cp ./backup-corpus.json thai-text-corrector:/app/main-corpus.json
```

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   # Check what's using the ports
   lsof -i :5000
   lsof -i :5001
   
   # Use different ports
   docker-compose up -p 5002:5000 -p 5003:5001
   ```

2. **Permission issues**:
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   ```

3. **Container won't start**:
   ```bash
   # Check logs
   docker-compose logs thai-text-corrector
   
   # Rebuild from scratch
   docker-compose down
   docker system prune -f
   docker-compose up --build
   ```

### Performance Tuning

```bash
# Allocate more memory
docker run --memory=2g -p 5000:5000 -p 5001:5001 thai-text-corrector

# Use specific CPU cores
docker run --cpus="2.0" -p 5000:5000 -p 5001:5001 thai-text-corrector
```

## 📋 Requirements

- Docker 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum
- 1GB disk space

## 🔒 Security Notes

- The application runs on HTTP (not HTTPS) - use a reverse proxy for production
- Corpus data is stored in mounted volumes
- No authentication is implemented - add authentication for production use

## 📝 Features Included

- ✅ Thai text correction with AI integration
- ✅ PyThaiNLP tokenization
- ✅ Corpus management with pipe delimiter support
- ✅ Audio file support
- ✅ TSV file processing
- ✅ Real-time corrections
- ✅ Health monitoring
- ✅ Graceful shutdown

## 🚀 Production Deployment

For production deployment, consider:

1. **Use HTTPS**: Add nginx reverse proxy
2. **Add authentication**: Implement user authentication
3. **Database**: Replace file-based storage with database
4. **Monitoring**: Add logging and monitoring
5. **Scaling**: Use multiple container instances

Example production docker-compose:

```yaml
version: '3.8'
services:
  thai-text-corrector:
    image: thai-text-corrector:latest
    restart: always
    environment:
      - NODE_ENV=production
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.thai-corrector.rule=Host(`your-domain.com`)"
```