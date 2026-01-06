class ThaiTextCorrector {
    constructor() {
        this.tsvData = [];
        this.corrections = [];
        this.currentIndex = 0;
        this.correctionCorpus = new Map(); // Store incorrect -> correct mappings
        this.tokenizerEnabled = false; // Flag for tokenizer features
        this.init();
        this.loadCorpus(); // เปลี่ยนเป็น async call
        this.checkTokenizerServer(); // Check if tokenizer server is available
    }

    init() {
        document.getElementById('loadBtn').addEventListener('click', () => this.loadTSV());
        document.getElementById('aiModel').addEventListener('change', () => this.toggleApiKey());
        document.getElementById('startProcessBtn').addEventListener('click', () => this.startProcessing());
        document.getElementById('aiCorrectBtn').addEventListener('click', () => this.aiCorrect());
        document.getElementById('acceptBtn').addEventListener('click', () => this.acceptCorrection());
        document.getElementById('skipBtn').addEventListener('click', () => this.skipItem());
        document.getElementById('saveResultsBtn').addEventListener('click', () => this.saveResults());
        document.getElementById('downloadTsvBtn').addEventListener('click', () => this.downloadTSV());
        document.getElementById('viewCorpusBtn').addEventListener('click', () => this.showCorpus());
        document.getElementById('addToCorpusBtn').addEventListener('click', () => this.addToCorpus());
        document.getElementById('clearCorpusBtn').addEventListener('click', () => this.clearCorpus());
        
        // Tokenizer features (will be enabled if server is available)
        document.getElementById('tokenizeBtn')?.addEventListener('click', () => this.tokenizeCurrentText());
        
        // Audio controls
        document.getElementById('audioUpload').addEventListener('change', (e) => this.handleAudioUpload(e));
        document.getElementById('playBtn').addEventListener('click', () => this.playAudio());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseAudio());
        document.getElementById('slowBtn').addEventListener('click', () => this.setPlaybackSpeed(0.75));
        document.getElementById('normalBtn').addEventListener('click', () => this.setPlaybackSpeed(1.0));
        document.getElementById('fastBtn').addEventListener('click', () => this.setPlaybackSpeed(1.25));
        
        this.toggleApiKey();
    }

    async checkTokenizerServer() {
        try {
            const response = await fetch('http://localhost:5001/api/health');
            if (response.ok) {
                this.tokenizerEnabled = true;
                this.showTokenizerFeatures();
                console.log('✅ Tokenizer server available - Smart learning enabled');
            }
        } catch (error) {
            console.log('ℹ️ Tokenizer server not available - Using basic corpus learning');
        }
    }

    showTokenizerFeatures() {
        // Show tokenizer buttons if they exist in HTML
        const tokenizerSection = document.getElementById('tokenizerSection');
        if (tokenizerSection) {
            tokenizerSection.style.display = 'block';
        }
        
        // Add tokenizer info to corpus section
        const corpusSection = document.querySelector('.corpus-controls');
        if (corpusSection && !document.getElementById('tokenizerInfo')) {
            const tokenizerInfo = document.createElement('div');
            tokenizerInfo.id = 'tokenizerInfo';
            tokenizerInfo.className = 'alert alert-info mt-2';
            tokenizerInfo.innerHTML = `
                <small>🔤 <strong>Tokenizer:</strong> Thai word tokenization available</small>
            `;
            corpusSection.appendChild(tokenizerInfo);
        }
    }

    async loadCorpus() {
        // โหลดจาก localStorage ก่อน
        const saved = localStorage.getItem('thaiCorrectionCorpus');
        if (saved) {
            const corpusArray = JSON.parse(saved);
            this.correctionCorpus = new Map(corpusArray);
        }
        
        // โหลดจากไฟล์ main-corpus.json
        await this.loadMainCorpus();
    }

    async loadMainCorpus() {
        try {
            // ลองโหลดจาก API ก่อน (ถ้ามี server)
            let response = await fetch('/api/corpus');
            
            // ถ้าไม่มี server ให้โหลดจากไฟล์โดยตรง
            if (!response.ok) {
                response = await fetch('main-corpus.json');
            }
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.corrections && Array.isArray(data.corrections)) {
                    let loadedCount = 0;
                    
                    for (const [incorrect, correct] of data.corrections) {
                        if (!this.correctionCorpus.has(incorrect)) {
                            this.correctionCorpus.set(incorrect, correct);
                            loadedCount++;
                        }
                    }
                    
                    if (loadedCount > 0) {
                        this.saveCorpusLocal(); // บันทึกแค่ localStorage
                        console.log(`Loaded ${loadedCount} corrections from corpus`);
                    }
                }
            } else {
                console.log('Corpus file not found, using localStorage only');
            }
        } catch (error) {
            console.log('Could not load corpus:', error.message);
        }
    }

    saveCorpusLocal() {
        // บันทึกแค่ localStorage
        const corpusArray = Array.from(this.correctionCorpus.entries());
        localStorage.setItem('thaiCorrectionCorpus', JSON.stringify(corpusArray));
    }

    async saveToMainCorpus() {
        try {
            const corpusData = {
                exportDate: new Date().toISOString(),
                version: "1.0",
                corrections: Array.from(this.correctionCorpus.entries())
            };
            
            // ลองบันทึกผ่าน API ก่อน
            const response = await fetch('/api/corpus', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(corpusData)
            });
            
            if (response.ok) {
                console.log('✅ Corpus saved to main-corpus.json via server');
                return true;
            } else {
                throw new Error('Server not available');
            }
        } catch (error) {
            // ถ้าไม่มี server ให้ดาวน์โหลดไฟล์
            console.log('Server not available, downloading file instead');
            
            const corpusData = {
                exportDate: new Date().toISOString(),
                version: "1.0",
                corrections: Array.from(this.correctionCorpus.entries())
            };
            
            const jsonContent = JSON.stringify(corpusData, null, 2);
            
            if (confirm('ไม่สามารถอัปเดตไฟล์อัตโนมัติได้\nต้องการดาวน์โหลด main-corpus.json ใหม่หรือไม่?')) {
                this.downloadFile(jsonContent, 'main-corpus.json', 'application/json');
                alert('กรุณาแทนที่ไฟล์ main-corpus.json เดิมด้วยไฟล์ที่ดาวน์โหลด');
            }
            return false;
        }
    }

    saveCorpus() {
        this.saveCorpusLocal();
        
        // อัปเดต main-corpus.json ด้วย
        this.saveToMainCorpus();
    }

    addDefaultCorrections() {
        // ไม่ต้องใช้ค่าเริ่มต้นใน code แล้ว
        // ใช้ข้อมูลจาก main-corpus.json แทน
        console.log('Using main-corpus.json as default corrections source');
    }

    autoCorrectText(text) {
        let correctedText = text;
        let hasChanges = false;
        
        // Apply corpus corrections
        for (const [incorrect, correct] of this.correctionCorpus.entries()) {
            if (correctedText.includes(incorrect)) {
                correctedText = correctedText.replace(new RegExp(incorrect, 'g'), correct);
                hasChanges = true;
            }
        }
        
        return { correctedText, hasChanges };
    }

    toggleApiKey() {
        const model = document.getElementById('aiModel').value;
        const geminiConfig = document.getElementById('geminiConfig');
        const ollamaConfig = document.getElementById('ollamaConfig');
        const openaiConfig = document.getElementById('openaiConfig');
        
        // Hide all configs first
        geminiConfig.style.display = 'none';
        ollamaConfig.style.display = 'none';
        openaiConfig.style.display = 'none';
        
        // Show relevant config
        if (model === 'gemini') {
            geminiConfig.style.display = 'block';
        } else if (model === 'ollama') {
            ollamaConfig.style.display = 'block';
        } else if (model === 'openai-compatible') {
            openaiConfig.style.display = 'block';
        }
    }

    async loadTSV() {
        const fileInput = document.getElementById('tsvFile');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('กรุณาเลือกไฟล์ TSV');
            return;
        }

        try {
            const content = await this.readFile(file);
            this.parseTSV(content);
            
            document.getElementById('configSection').style.display = 'block';
            alert(`โหลดไฟล์สำเร็จ! พบข้อความ ${this.tsvData.length} รายการ`);
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + error.message);
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file, 'UTF-8');
        });
    }

    parseTSV(content) {
        const lines = content.split('\n').filter(line => line.trim());
        const headers = lines[0].split('\t').map(h => h.trim());
        
        // Find text column
        const textColumnIndex = headers.findIndex(h => h.toLowerCase() === 'text');
        if (textColumnIndex === -1) {
            throw new Error('ไม่พบคอลัมน์ "text" ในไฟล์');
        }

        this.tsvData = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split('\t');
            if (values[textColumnIndex] && values[textColumnIndex].trim()) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] ? values[index].trim() : '';
                });
                this.tsvData.push(row);
            }
        }

        this.corrections = this.tsvData.map(item => ({
            original: item.text,
            corrected: item.text,
            status: 'pending', // pending, corrected, skipped
            audioFile: item.file_name || null // Store audio filename if available
        }));
    }

    startProcessing() {
        if (this.tsvData.length === 0) {
            alert('ไม่มีข้อมูลที่จะประมวลผล');
            return;
        }

        this.currentIndex = 0;
        document.getElementById('processingSection').style.display = 'block';
        this.showCurrentItem();
    }

    showCurrentItem() {
        if (this.currentIndex >= this.tsvData.length) {
            this.showResults();
            return;
        }

        const current = this.tsvData[this.currentIndex];
        const correction = this.corrections[this.currentIndex];

        // Update progress
        document.getElementById('progressText').textContent = 
            `${this.currentIndex + 1} / ${this.tsvData.length}`;
        document.getElementById('progressBar').style.width = 
            `${((this.currentIndex + 1) / this.tsvData.length) * 100}%`;

        // Auto-correct text using corpus
        const autoResult = this.autoCorrectText(current.text);
        if (autoResult.hasChanges) {
            correction.corrected = autoResult.correctedText;
            document.getElementById('autoCorrectInfo').style.display = 'block';
            document.getElementById('autoCorrectInfo').innerHTML = 
                `<small class="text-success">✅ Auto-corrected using corpus</small>`;
        } else {
            document.getElementById('autoCorrectInfo').style.display = 'none';
        }

        // Show current text
        document.getElementById('originalText').textContent = current.text;
        document.getElementById('correctedText').value = correction.corrected;

        // Handle audio if available
        this.setupAudio(current);

        // Enable/disable AI button
        const aiModel = document.getElementById('aiModel').value;
        document.getElementById('aiCorrectBtn').disabled = aiModel === 'manual';
    }

    setupAudio(currentItem) {
        const audioSection = document.getElementById('audioSection');
        const audioPlayer = document.getElementById('audioPlayer');
        const audioSource = document.getElementById('audioSource');
        
        // Check if there's an audio file reference
        if (currentItem.file_name && currentItem.file_name.includes('.wav')) {
            audioSection.style.display = 'block';
            
            // Try to load audio file (you might need to adjust the path)
            const audioPath = `audio/${currentItem.file_name}`;
            audioSource.src = audioPath;
            audioPlayer.load();
            
            // Show audio filename
            document.getElementById('originalText').innerHTML = `
                ${currentItem.text}<br>
                <small class="text-muted">🎵 Audio: ${currentItem.file_name}</small>
            `;
        } else {
            audioSection.style.display = 'none';
        }
    }

    handleAudioUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const audioPlayer = document.getElementById('audioPlayer');
            const audioSource = document.getElementById('audioSource');
            const audioSection = document.getElementById('audioSection');
            
            // Create URL for uploaded file
            const audioURL = URL.createObjectURL(file);
            audioSource.src = audioURL;
            audioPlayer.load();
            audioSection.style.display = 'block';
            
            console.log(`Loaded audio file: ${file.name}`);
        }
    }

    playAudio() {
        const audioPlayer = document.getElementById('audioPlayer');
        audioPlayer.play().catch(e => {
            console.log('Audio play failed:', e);
            alert('ไม่สามารถเล่นเสียงได้ กรุณาตรวจสอบไฟล์เสียง');
        });
    }

    pauseAudio() {
        const audioPlayer = document.getElementById('audioPlayer');
        audioPlayer.pause();
    }

    setPlaybackSpeed(speed) {
        const audioPlayer = document.getElementById('audioPlayer');
        audioPlayer.playbackRate = speed;
        
        // Update button states
        document.querySelectorAll('#slowBtn, #normalBtn, #fastBtn').forEach(btn => {
            btn.classList.remove('btn-info', 'btn-success', 'btn-warning');
            btn.classList.add('btn-outline-info', 'btn-outline-success', 'btn-outline-warning');
        });
        
        // Highlight active speed
        if (speed === 0.75) {
            document.getElementById('slowBtn').classList.remove('btn-outline-info');
            document.getElementById('slowBtn').classList.add('btn-info');
        } else if (speed === 1.0) {
            document.getElementById('normalBtn').classList.remove('btn-outline-success');
            document.getElementById('normalBtn').classList.add('btn-success');
        } else if (speed === 1.25) {
            document.getElementById('fastBtn').classList.remove('btn-outline-warning');
            document.getElementById('fastBtn').classList.add('btn-warning');
        }
    }

    async aiCorrect() {
        const aiModel = document.getElementById('aiModel').value;
        if (aiModel === 'manual') return;

        this.showLoading(true);

        try {
            const originalText = this.tsvData[this.currentIndex].text;
            let correctedText;

            if (aiModel === 'gemini') {
                correctedText = await this.correctWithGemini(originalText);
            } else if (aiModel === 'ollama') {
                correctedText = await this.correctWithOllama(originalText);
            } else if (aiModel === 'openai-compatible') {
                correctedText = await this.correctWithOpenAI(originalText);
            }

            if (correctedText) {
                document.getElementById('correctedText').value = correctedText;
                this.corrections[this.currentIndex].corrected = correctedText;
            }

        } catch (error) {
            alert('เกิดข้อผิดพลาดจาก AI: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async correctWithGemini(originalText) {
        const apiKey = document.getElementById('apiKey').value;
        if (!apiKey) {
            throw new Error('กรุณาใส่ Gemini API Key');
        }

        const prompt = `ทำการแก้ไขข้อความที่ผิด และไม่ถูกต้องในบริบท
คำต้นฉบับ:<WRD>${originalText}</WRD>
คำที่ถูกต้อง:<WRD>(ตอบเฉพาะข้อความที่แก้ไขแล้ว)</WRD>

กรุณาแก้ไข:
- การสะกดคำ
- ไวยากรณ์
- การใช้คำที่เหมาะสม
- ความถูกต้องของภาษา

ตอบเฉพาะข้อความที่แก้ไขแล้วเท่านั้น ไม่ต้องอธิบาย`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            throw new Error('Gemini API Error');
        }

        const data = await response.json();
        let correctedText = data.candidates[0].content.parts[0].text.trim();
        
        // Extract text from <WRD> tags if present
        const wrdMatch = correctedText.match(/<WRD>(.*?)<\/WRD>/);
        if (wrdMatch) {
            correctedText = wrdMatch[1];
        }

        return correctedText;
    }

    async correctWithOllama(originalText) {
        const ollamaUrl = document.getElementById('ollamaUrl').value;
        const modelName = document.getElementById('ollamaModel').value;
        
        if (!ollamaUrl) {
            throw new Error('กรุณาใส่ Ollama Server URL');
        }

        const prompt = `แก้ไขข้อความภาษาไทยต่อไปนี้ให้ถูกต้อง:

ข้อความต้นฉบับ: "${originalText}"

กรุณาแก้ไข:
- การสะกดคำ
- ไวยากรณ์ 
- การใช้คำที่เหมาะสม
- ความถูกต้องของภาษา

ตอบเฉพาะข้อความที่แก้ไขแล้วเท่านั้น ไม่ต้องอธิบาย:`;

        const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelName,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.3,
                    top_p: 0.9,
                    max_tokens: 200
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.response.trim();
    }

    async correctWithOpenAI(originalText) {
        const baseUrl = document.getElementById('openaiUrl').value;
        const apiKey = document.getElementById('openaiKey').value;
        const modelName = document.getElementById('openaiModel').value;
        
        if (!baseUrl) {
            throw new Error('กรุณาใส่ API Base URL');
        }

        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const prompt = `แก้ไขข้อความภาษาไทยต่อไปนี้ให้ถูกต้อง:

ข้อความต้นฉบับ: "${originalText}"

กรุณาแก้ไข:
- การสะกดคำ
- ไวยากรณ์
- การใช้คำที่เหมาะสม  
- ความถูกต้องของภาษา

ตอบเฉพาะข้อความที่แก้ไขแล้วเท่านั้น ไม่ต้องอธิบาย`;

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: modelName,
                messages: [
                    {
                        role: "system",
                        content: "คุณเป็นผู้เชี่ยวชาญด้านภาษาไทย ช่วยแก้ไขข้อความให้ถูกต้อง"
                    },
                    {
                        role: "user", 
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 200
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    acceptCorrection() {
        const originalText = this.tsvData[this.currentIndex].text;
        const correctedText = document.getElementById('correctedText').value.trim();
        
        console.log('Accept correction:', { originalText, correctedText });
        
        // Check for pipe delimiter format: "wrong|correct"
        if (correctedText.includes('|')) {
            console.log('Pipe delimiter detected, processing manual corrections...');
            this.processPipeDelimitedCorrections(correctedText);
            
            // Remove pipe delimiters for the final corrected text
            // Handle both "word|word" and "word|word nextword" patterns
            let finalText = correctedText.replace(/\s*(\S+)\|(\S+)(\s+)(\S+)/g, '$2$4'); // "มิน|มีน บุรี" -> "มีนบุรี"
            finalText = finalText.replace(/(\S+)\|(\S+)/g, '$2'); // remaining "word|word" -> "word"
            
            this.corrections[this.currentIndex].corrected = finalText;
        } else {
            // Normal correction process
            if (originalText !== correctedText) {
                console.log('Text changed, learning from correction...');
                this.learnFromCorrection(originalText, correctedText);
            } else {
                console.log('No changes detected, skipping learning');
            }
            this.corrections[this.currentIndex].corrected = correctedText;
        }
        
        this.corrections[this.currentIndex].status = 'corrected';
        this.nextItem();
    }

    processPipeDelimitedCorrections(text) {
        // Find all patterns like "wrong|correct"
        const pipePattern = /(\S+)\|(\S+)/g;
        let match;
        let addedCount = 0;
        
        console.log('Processing pipe delimited text:', text);
        
        while ((match = pipePattern.exec(text)) !== null) {
            const wrongWord = match[1];
            const correctWord = match[2];
            
            console.log('Found pipe pair:', wrongWord, '→', correctWord);
            
            if (wrongWord && correctWord && wrongWord !== correctWord) {
                this.correctionCorpus.set(wrongWord, correctWord);
                console.log(`Pipe learning: ${wrongWord} → ${correctWord}`);
                addedCount++;
            }
        }
        
        if (addedCount > 0) {
            this.saveCorpus();
            console.log(`Added ${addedCount} corrections from pipe delimiters`);
            
            // Show notification
            this.showPipeNotification(addedCount);
        }
    }

    showPipeNotification(count) {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.className = 'alert alert-success position-fixed';
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            <strong>📚 เพิ่มใน Corpus แล้ว!</strong><br>
            พบ ${count} คู่คำจาก pipe delimiter (|)
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    learnFromCorrection(originalText, correctedText) {
        if (this.tokenizerEnabled) {
            // Use tokenizer for better word segmentation
            this.tokenizedLearnFromCorrection(originalText, correctedText);
        } else {
            // Use basic word-by-word learning
            this.basicLearnFromCorrection(originalText, correctedText);
        }
    }

    async tokenizedLearnFromCorrection(originalText, correctedText) {
        try {
            // Get tokens from both texts
            const [originalResult, correctedResult] = await Promise.all([
                this.callTokenizerAPI('/api/tokenize', { text: originalText }),
                this.callTokenizerAPI('/api/tokenize', { text: correctedText })
            ]);

            if (originalResult && correctedResult) {
                const originalTokens = originalResult.tokens;
                const correctedTokens = correctedResult.tokens;

                // Find token-level differences
                const maxLen = Math.max(originalTokens.length, correctedTokens.length);
                for (let i = 0; i < maxLen; i++) {
                    const origToken = originalTokens[i] || '';
                    const corrToken = correctedTokens[i] || '';
                    
                    if (origToken !== corrToken && origToken.trim() && corrToken.trim()) {
                        // Skip whitespace and punctuation
                        if (origToken.length > 1 && corrToken.length > 1) {
                            this.correctionCorpus.set(origToken, corrToken);
                            console.log(`Tokenized learning: ${origToken} → ${corrToken}`);
                        }
                    }
                }
            } else {
                // Fallback to basic learning if tokenizer fails
                this.basicLearnFromCorrection(originalText, correctedText);
            }
        } catch (error) {
            console.log('Tokenized learning failed, using basic method:', error);
            this.basicLearnFromCorrection(originalText, correctedText);
        }
        
        this.saveCorpus();
    }

    basicLearnFromCorrection(originalText, correctedText) {
        console.log('Basic learning from:', { originalText, correctedText });
        
        // Extract word-level differences and add to corpus
        const originalWords = originalText.split(/\s+/);
        const correctedWords = correctedText.split(/\s+/);
        
        console.log('Words comparison:', { originalWords, correctedWords });
        
        // Simple word-by-word comparison
        for (let i = 0; i < Math.min(originalWords.length, correctedWords.length); i++) {
            const origWord = originalWords[i];
            const corrWord = correctedWords[i];
            
            if (origWord !== corrWord && origWord.length > 2 && corrWord.length > 2) {
                // Add to corpus if it's a significant change
                this.correctionCorpus.set(origWord, corrWord);
                console.log(`Added to corpus: ${origWord} → ${corrWord}`);
            }
        }
        
        console.log('Current corpus size:', this.correctionCorpus.size);
        this.saveCorpus();
    }

    async tokenizeCurrentText() {
        if (!this.tokenizerEnabled) {
            alert('Tokenizer server ไม่พร้อมใช้งาน');
            return;
        }

        const currentText = document.getElementById('correctedText').value;
        if (!currentText.trim()) {
            alert('ไม่มีข้อความที่จะตัดคำ');
            return;
        }

        try {
            const result = await this.callTokenizerAPI('/api/tokenize', { text: currentText });
            
            if (result) {
                this.showTokenizeResult(result);
            } else {
                alert('ไม่สามารถตัดคำได้');
            }
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการตัดคำ: ' + error.message);
        }
    }

    async callTokenizerAPI(endpoint, data) {
        try {
            const response = await fetch(`http://localhost:5001${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.log(`Tokenizer API call failed: ${endpoint}`, error);
        }
        return null;
    }

    showTokenizeResult(result) {
        const modalHTML = `
            <div class="modal fade" id="tokenizeModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">🔤 ผลการตัดคำ</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <strong>ข้อความต้นฉบับ:</strong><br>
                                <div class="bg-light p-2 rounded">${result.original}</div>
                            </div>
                            <div class="mb-3">
                                <strong>คำที่ตัดได้ (${result.token_count} คำ):</strong><br>
                                <div class="bg-light p-2 rounded">
                                    ${result.tokens.map(token => `<span class="badge bg-secondary me-1">${token}</span>`).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.showModal(modalHTML, 'tokenizeModal');
    }

    showModal(modalHTML, modalId) {
        // Remove existing modal if any
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        new bootstrap.Modal(document.getElementById(modalId)).show();
    }

    addToCorpus() {
        const incorrect = prompt('ใส่คำที่ผิด:');
        const correct = prompt('ใส่คำที่ถูกต้อง:');
        
        if (incorrect && correct && incorrect.trim() && correct.trim()) {
            this.correctionCorpus.set(incorrect.trim(), correct.trim());
            this.saveCorpus();
            alert(`เพิ่มแล้ว: ${incorrect} → ${correct}`);
        }
    }

    showCorpus() {
        const corpusEntries = Array.from(this.correctionCorpus.entries());
        if (corpusEntries.length === 0) {
            alert('ยังไม่มีคำในคลังข้อมูล');
            return;
        }

        const corpusHTML = corpusEntries.map(([incorrect, correct]) => 
            `<tr><td>${incorrect}</td><td>${correct}</td></tr>`
        ).join('');

        const modalHTML = `
            <div class="modal fade" id="corpusModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">📚 คลังข้อมูลการแก้ไข</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <table class="table table-striped">
                                <thead>
                                    <tr><th>คำที่ผิด</th><th>คำที่ถูกต้อง</th></tr>
                                </thead>
                                <tbody>${corpusHTML}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('corpusModal');
        if (existingModal) existingModal.remove();

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        new bootstrap.Modal(document.getElementById('corpusModal')).show();
    }

    clearCorpus() {
        if (confirm('ต้องการลบคลังข้อมูลทั้งหมดหรือไม่?')) {
            this.correctionCorpus.clear();
            this.saveCorpus();
            alert('ลบคลังข้อมูลแล้ว');
        }
    }

    skipItem() {
        this.corrections[this.currentIndex].status = 'skipped';
        this.nextItem();
    }

    nextItem() {
        this.currentIndex++;
        this.showCurrentItem();
    }

    showResults() {
        document.getElementById('processingSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'block';

        // Summary
        const corrected = this.corrections.filter(c => c.status === 'corrected').length;
        const skipped = this.corrections.filter(c => c.status === 'skipped').length;
        const total = this.corrections.length;

        document.getElementById('summary').innerHTML = `
            <strong>สรุปผลการแก้ไข:</strong><br>
            ทั้งหมด: ${total} รายการ<br>
            แก้ไขแล้ว: ${corrected} รายการ<br>
            ข้ามไป: ${skipped} รายการ
        `;

        // Comparison list
        const comparisonHTML = this.corrections.map((correction, index) => {
            if (correction.status === 'skipped') return '';
            
            const isChanged = correction.original !== correction.corrected;
            return `
                <div class="comparison-row">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="text-item original-text">
                                <strong>ต้นฉบับ (${index + 1}):</strong><br>
                                ${correction.original}
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="text-item corrected-text">
                                <strong>แก้ไขแล้ว:</strong><br>
                                ${correction.corrected}
                                ${isChanged ? ' <span class="badge bg-warning">แก้ไข</span>' : ' <span class="badge bg-success">เหมือนเดิม</span>'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('comparisonList').innerHTML = comparisonHTML;
    }

    saveResults() {
        const results = this.corrections.map((correction, index) => ({
            index: index + 1,
            original: correction.original,
            corrected: correction.corrected,
            status: correction.status,
            changed: correction.original !== correction.corrected
        }));

        const jsonContent = JSON.stringify(results, null, 2);
        this.downloadFile(jsonContent, 'correction_results.json', 'application/json');
    }

    downloadTSV() {
        // Create new TSV with corrected text
        const headers = Object.keys(this.tsvData[0]);
        const correctedData = this.tsvData.map((row, index) => {
            const newRow = { ...row };
            if (this.corrections[index].status === 'corrected') {
                newRow.text = this.corrections[index].corrected;
            }
            return newRow;
        });

        const tsvContent = [
            headers.join('\t'),
            ...correctedData.map(row => headers.map(header => row[header] || '').join('\t'))
        ].join('\n');

        this.downloadFile(tsvContent, 'corrected_data.tsv', 'text/tab-separated-values');
    }

    downloadFile(content, filename, type) {
        const blob = new Blob(['\uFEFF' + content], { type: type + ';charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new ThaiTextCorrector();
});