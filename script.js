class ThaiTextCorrector {
    constructor() {
        this.tsvData = [];
        this.corrections = [];
        this.currentIndex = 0;
        this.correctionCorpus = new Map(); // Store incorrect -> correct mappings
        this.init();
        this.loadCorpus(); // เปลี่ยนเป็น async call
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
        document.getElementById('exportCorpusBtn').addEventListener('click', () => this.exportCorpus());
        document.getElementById('importCorpusBtn').addEventListener('click', () => this.importCorpus());
        document.getElementById('resetDefaultsBtn').addEventListener('click', () => this.resetDefaults());
        
        // Audio controls
        document.getElementById('audioUpload').addEventListener('change', (e) => this.handleAudioUpload(e));
        document.getElementById('playBtn').addEventListener('click', () => this.playAudio());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseAudio());
        document.getElementById('slowBtn').addEventListener('click', () => this.setPlaybackSpeed(0.75));
        document.getElementById('normalBtn').addEventListener('click', () => this.setPlaybackSpeed(1.0));
        document.getElementById('fastBtn').addEventListener('click', () => this.setPlaybackSpeed(1.25));
        
        this.toggleApiKey();
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
        
        // If text was changed, add to corpus for future auto-corrections
        if (originalText !== correctedText) {
            this.learnFromCorrection(originalText, correctedText);
        }
        
        this.corrections[this.currentIndex].corrected = correctedText;
        this.corrections[this.currentIndex].status = 'corrected';
        this.nextItem();
    }

    learnFromCorrection(originalText, correctedText) {
        // Extract word-level differences and add to corpus
        const originalWords = originalText.split(/\s+/);
        const correctedWords = correctedText.split(/\s+/);
        
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
        
        this.saveCorpus();
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

    exportCorpus() {
        const corpusData = {
            exportDate: new Date().toISOString(),
            version: "1.0",
            corrections: Array.from(this.correctionCorpus.entries())
        };
        
        const jsonContent = JSON.stringify(corpusData, null, 2);
        this.downloadFile(jsonContent, 'thai_correction_corpus.json', 'application/json');
        alert('ส่งออกคลังข้อมูลแล้ว!');
    }

    importCorpus() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        
                        if (data.corrections && Array.isArray(data.corrections)) {
                            let importedCount = 0;
                            
                            for (const [incorrect, correct] of data.corrections) {
                                this.correctionCorpus.set(incorrect, correct);
                                importedCount++;
                            }
                            
                            this.saveCorpus();
                            alert(`นำเข้าคลังข้อมูลสำเร็จ! เพิ่ม ${importedCount} รายการ`);
                        } else {
                            alert('รูปแบบไฟล์ไม่ถูกต้อง');
                        }
                    } catch (error) {
                        alert('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }

    resetDefaults() {
        if (confirm('ต้องการรีเซ็ตคลังข้อมูลจาก main-corpus.json หรือไม่? (จะลบข้อมูลปัจจุบันทั้งหมด)')) {
            this.correctionCorpus.clear();
            localStorage.removeItem('thaiCorrectionCorpus');
            this.loadMainCorpus();
            alert('รีเซ็ตคลังข้อมูลจาก main-corpus.json แล้ว!');
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