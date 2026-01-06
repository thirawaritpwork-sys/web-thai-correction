#!/usr/bin/env python3
"""
Simple server to handle corpus file updates
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

CORPUS_FILE = 'main-corpus.json'

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/favicon.ico')
def favicon():
    return '', 204  # No Content response

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

@app.route('/api/corpus', methods=['GET'])
def get_corpus():
    """โหลดคลังข้อมูล"""
    try:
        if os.path.exists(CORPUS_FILE):
            with open(CORPUS_FILE, 'r', encoding='utf-8') as f:
                return jsonify(json.load(f))
        else:
            # สร้างไฟล์เริ่มต้น
            default_corpus = {
                "exportDate": "2025-01-06T11:00:00.000Z",
                "version": "1.0",
                "corrections": [
                    ["การจนบุรี", "กาญจนบุรี"],
                    ["กานจนบุรี", "กาญจนบุรี"],
                    ["การญจนบุรี", "กาญจนบุรี"]
                ]
            }
            with open(CORPUS_FILE, 'w', encoding='utf-8') as f:
                json.dump(default_corpus, f, ensure_ascii=False, indent=2)
            return jsonify(default_corpus)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/corpus', methods=['POST'])
def save_corpus():
    """บันทึกคลังข้อมูล"""
    try:
        data = request.get_json()
        
        # อัปเดตวันที่
        data['exportDate'] = __import__('datetime').datetime.now().isoformat()
        
        # เขียนไฟล์
        with open(CORPUS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Updated {CORPUS_FILE} with {len(data.get('corrections', []))} corrections")
        return jsonify({"success": True, "message": "Corpus updated successfully"})
        
    except Exception as e:
        print(f"❌ Error updating corpus: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting Thai Text Corrector Server...")
    print("📝 Access at: http://localhost:5000")
    print(f"📚 Corpus file: {CORPUS_FILE}")
    
    app.run(debug=True, host='0.0.0.0', port=5000)