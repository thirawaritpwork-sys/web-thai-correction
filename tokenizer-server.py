#!/usr/bin/env python3
"""
Thai Tokenizer API Server using PyThaiNLP
สำหรับตัดคำและเก็บคำผิดใน corpus
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime

try:
    from pythainlp import word_tokenize
    print("✅ PyThaiNLP imports successful")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please install: pip3 install pythainlp")
    exit(1)

app = Flask(__name__)
CORS(app)

CORPUS_FILE = 'main-corpus.json'

def load_corpus():
    """โหลดคลังข้อมูลการแก้ไข"""
    try:
        if os.path.exists(CORPUS_FILE):
            with open(CORPUS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"corrections": []}
    except:
        return {"corrections": []}

def save_corpus(corpus_data):
    """บันทึกคลังข้อมูล"""
    try:
        corpus_data['exportDate'] = datetime.now().isoformat()
        with open(CORPUS_FILE, 'w', encoding='utf-8') as f:
            json.dump(corpus_data, f, ensure_ascii=False, indent=2)
        return True
    except:
        return False

@app.route('/')
def home():
    return jsonify({
        'service': 'Thai Tokenizer API',
        'status': 'running',
        'endpoints': [
            '/api/tokenize - POST: tokenize Thai text',
            '/api/corpus - GET: view current corpus'
        ]
    })

@app.route('/favicon.ico')
def favicon():
    return '', 204

@app.route('/api/tokenize', methods=['POST'])
def tokenize_text():
    """ตัดคำภาษาไทย"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        # ตัดคำด้วย PyThaiNLP
        tokens = word_tokenize(text, engine='newmm')
        
        return jsonify({
            "original": text,
            "tokens": tokens,
            "token_count": len(tokens)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/corpus', methods=['GET'])
def get_corpus():
    """ดูคลังข้อมูลปัจจุบัน"""
    corpus = load_corpus()
    return jsonify(corpus)

@app.route('/api/health')
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'Thai Tokenizer API',
        'pythainlp': 'available'
    })

if __name__ == '__main__':
    print("🔤 Starting Thai Tokenizer API Server...")
    print("📝 Access at: http://localhost:5001")
    print(f"📚 Corpus file: {CORPUS_FILE}")
    print("🔧 Endpoints:")
    print("   POST /api/tokenize - ตัดคำ")
    print("   GET /api/corpus - ดูคลังข้อมูล")
    
    app.run(debug=True, host='0.0.0.0', port=5001)