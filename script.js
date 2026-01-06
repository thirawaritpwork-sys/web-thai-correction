class ThaiTextCorrector {
    constructor() {
        this.tsvData = [];
        this.corrections = [];
        this.currentIndex = 0;
        this.correctionCorpus = new Map(); // Store incorrect -> correct mappings
        this.init();
        this.loadCorpus();
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
        
        this.toggleApiKey();
    }

    loadCorpus() {
        const saved = localStorage.getItem('thaiCorrectionCorpus');
        if (saved) {
            const corpusArray = JSON.parse(saved);
            this.correctionCorpus = new Map(corpusArray);
        }
        
        // Add some common Thai corrections
        this.addDefaultCorrections();
    }

    saveCorpus() {
        const corpusArray = Array.from(this.correctionCorpus.entries());
        localStorage.setItem('thaiCorrectionCorpus', JSON.stringify(corpusArray));
    }

    addDefaultCorrections() {
        const defaultCorrections = {
            'การจนบุรี': 'กาญจนบุรี',
            'กานจนบุรี': 'กาญจนบุรี',
            'การญจนบุรี': 'กาญจนบุรี',
            'ดิฉัน': 'ดิฉัน',
            'ผมครับ': 'ผมครับ',
            'คะ': 'ค่ะ',
            'ครับผม': 'ครับ',
            'ไทย': 'ไทย',
            'ประเทศไทย': 'ประเทศไทย'
        };

        for (const [incorrect, correct] of Object.entries(defaultCorrections)) {
            if (!this.correctionCorpus.has(incorrect)) {
                this.correctionCorpus.set(incorrect, correct);
            }
        }
        this.saveCorpus();
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
        const apiSection = document.getElementById('apiKeySection');
        apiSection.style.display = model === 'gemini' ? 'block' : 'none';
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
            status: 'pending' // pending, corrected, skipped
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

        // Enable/disable AI button
        const aiModel = document.getElementById('aiModel').value;
        document.getElementById('aiCorrectBtn').disabled = aiModel === 'manual';
    }

    async aiCorrect() {
        const aiModel = document.getElementById('aiModel').value;
        if (aiModel !== 'gemini') return;

        const apiKey = document.getElementById('apiKey').value;
        if (!apiKey) {
            alert('กรุณาใส่ Gemini API Key');
            return;
        }

        this.showLoading(true);

        try {
            const originalText = this.tsvData[this.currentIndex].text;
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

            document.getElementById('correctedText').value = correctedText;
            this.corrections[this.currentIndex].corrected = correctedText;

        } catch (error) {
            alert('เกิดข้อผิดพลาดจาก AI: ' + error.message);
        } finally {
            this.showLoading(false);
        }
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