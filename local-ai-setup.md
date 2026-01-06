# 🤖 Local AI Setup Guide

## 🚀 Supported Local AI Options:

### 1. **Ollama (Recommended)**
Easy to install and use local LLMs

#### Installation:
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

#### Setup:
```bash
# Start Ollama server
ollama serve

# Pull Thai-friendly models
ollama pull llama2
ollama pull mistral
ollama pull gemma

# For Thai language specifically
ollama pull thai-llama  # if available
```

#### Configuration in App:
- **Server URL**: `http://localhost:11434`
- **Model**: Choose from dropdown (llama2, mistral, gemma, etc.)

---

### 2. **OpenAI-Compatible APIs**
Works with various local servers

#### Popular Options:

**A. Text Generation WebUI (oobabooga)**
```bash
git clone https://github.com/oobabooga/text-generation-webui
cd text-generation-webui
pip install -r requirements.txt

# Run with OpenAI API extension
python server.py --extensions openai --api
```
- **API URL**: `http://localhost:5000/v1`

**B. LocalAI**
```bash
# Docker
docker run -p 8080:8080 --name local-ai -ti localai/localai:latest

# Or binary installation
curl -Lo local-ai "https://github.com/mudler/LocalAI/releases/download/{{< version >}}/local-ai-$(uname -s)-$(uname -m)" && chmod +x local-ai && sudo mv local-ai /usr/local/bin/
```
- **API URL**: `http://localhost:8080/v1`

**C. LM Studio**
- Download from: https://lmstudio.ai/
- Enable "Local Server" in settings
- **API URL**: `http://localhost:1234/v1`

**D. Kobold.cpp**
```bash
git clone https://github.com/LostRuins/koboldcpp
cd koboldcpp
make
./koboldcpp --model your-model.gguf --port 5001 --usecublas
```
- **API URL**: `http://localhost:5001/v1`

---

### 3. **Thai Language Models**

#### Recommended Models for Thai:
1. **WangchanBERTa** - Thai BERT model
2. **Thai-Llama** - Thai-tuned Llama
3. **SeaLLM** - Southeast Asian languages
4. **Typhoon** - Thai language model

#### Download Thai Models:
```bash
# For Ollama
ollama pull seallm
ollama pull typhoon  # if available

# For Hugging Face models (use with text-generation-webui)
# Download from: https://huggingface.co/models?language=th
```

---

## 🔧 **Configuration Examples:**

### Ollama Setup:
```
Server URL: http://localhost:11434
Model: llama2 (or mistral, gemma)
```

### Text Generation WebUI:
```
API Base URL: http://localhost:5000/v1
Model Name: your-loaded-model
API Key: (leave empty)
```

### LM Studio:
```
API Base URL: http://localhost:1234/v1
Model Name: your-loaded-model
API Key: (leave empty)
```

---

## 🧪 **Testing Your Setup:**

1. **Start your local AI server**
2. **Open Thai Text Corrector**
3. **Select your AI option** from dropdown
4. **Configure the settings**
5. **Test with sample text**: "การจนบุรี"
6. **Check if it corrects to**: "กาญจนบุรี"

---

## 🐛 **Troubleshooting:**

### Common Issues:
1. **Connection Error**: Check if server is running
2. **CORS Error**: Add CORS headers to your local server
3. **Model Not Found**: Verify model name is correct
4. **Slow Response**: Try smaller models or adjust parameters

### CORS Fix for Local Servers:
Add these headers to your local API server:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## 💡 **Tips:**

- **Start with Ollama** - easiest to set up
- **Use smaller models** for faster responses (7B instead of 13B)
- **Thai-specific models** work better for Thai text correction
- **Adjust temperature** (0.1-0.3) for more consistent corrections
- **Test different prompts** for better results

---

## 🔗 **Useful Links:**

- [Ollama](https://ollama.ai/)
- [Text Generation WebUI](https://github.com/oobabooga/text-generation-webui)
- [LocalAI](https://github.com/mudler/LocalAI)
- [LM Studio](https://lmstudio.ai/)
- [Thai Language Models](https://huggingface.co/models?language=th)