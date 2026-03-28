document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const fileListContainer = document.getElementById('file-list');
    const generateBtn = document.getElementById('generate-btn');

    let selectedFiles = [];

    // --- Drag and Drop Logic ---
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });

    function handleFiles(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.name.endsWith('.xlsx')) {
                // Prevent duplicates
                if (!selectedFiles.find(f => f.name === file.name)) {
                    selectedFiles.push(file);
                }
            } else {
                alert(`Fichier invalide ignoré : ${file.name}. Seuls les fichiers .xlsx sont autorisés.`);
            }
        }
        renderFileList();
    }

    function removeFile(fileName) {
        selectedFiles = selectedFiles.filter(f => f.name !== fileName);
        renderFileList();
    }

    function renderFileList() {
        fileListContainer.innerHTML = '';
        selectedFiles.forEach(file => {
            const item = document.createElement('div');
            item.className = 'file-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.innerHTML = `<i class="ms-Icon ms-Icon--ExcelDocument" aria-hidden="true"></i> ${file.name}`;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove';
            removeBtn.innerHTML = '<i class="ms-Icon ms-Icon--Cancel" aria-hidden="true"></i>';
            removeBtn.onclick = () => removeFile(file.name);
            
            item.appendChild(nameSpan);
            item.appendChild(removeBtn);
            fileListContainer.appendChild(item);
        });

        generateBtn.disabled = selectedFiles.length === 0;
    }

    // --- Excel Parsing Logic ---
    const progressSection = document.getElementById('progress-section');
    const progressBar = document.getElementById('admin-progress-fill');
    const logWindow = document.getElementById('log-window');

    function log(message, type = 'info') {
        const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-msg">${message}</span>`;
        logWindow.appendChild(entry);
        logWindow.scrollTop = logWindow.scrollHeight;
    }

    generateBtn.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;
        
        generateBtn.disabled = true;
        generateBtn.textContent = "Traitement en cours...";
        
        progressSection.classList.remove('hidden');
        logWindow.innerHTML = '';
        progressBar.style.width = '0%';
        
        log(`Démarrage du traitement de ${selectedFiles.length} fichier(s)...`);
        
        try {
            const finalData = {};
            let processedFiles = 0;
            
            for (const file of selectedFiles) {
                log(`Lecture du fichier : ${file.name}`);
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                
                let fileIntro = null;
                const sheetsToProcess = [];

                // First pass: find introduction and valid quiz sheets
                for (const sheetName of workbook.SheetNames) {
                    if (sheetName.toLowerCase() === 'introduction') {
                        log(`  • Feuille d'introduction trouvée dans ${file.name}`);
                        const worksheet = workbook.Sheets[sheetName];
                        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                        fileIntro = rawRows.filter(row => row.some(cell => String(cell).trim() !== ''));
                    } else {
                        const worksheet = workbook.Sheets[sheetName];
                        const jsonArray = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                        const validQuestions = jsonArray.filter(row => row.Type && row.Question && row.Answer);
                        
                        if (validQuestions.length > 0) {
                            sheetsToProcess.push({
                                name: sheetName,
                                questions: validQuestions
                            });
                        } else {
                            log(`  • ATTENTION : Aucune question valide dans "${sheetName}"`, 'warn');
                        }
                    }
                }

                // Second pass: Create a module for each sheet
                for (const sheet of sheetsToProcess) {
                    log(`  • Création du module : ${sheet.name} (${sheet.questions.length} questions)`);
                    if (!finalData[sheet.name]) {
                        finalData[sheet.name] = {};
                    }
                    finalData[sheet.name][sheet.name] = sheet.questions;
                    
                    if (fileIntro) {
                        finalData[sheet.name]._intro = fileIntro;
                    }
                }

                processedFiles++;
                progressBar.style.width = `${(processedFiles / selectedFiles.length) * 100}%`;
            }
            
            log("Compilation terminée avec succès !", "success");
            
            let safeFileName = 'quizzes.js';
            let appMainTitle = "Quiz de Français";
            
            // If only one file is uploaded, dedicate the JS filename to it
            if (selectedFiles.length === 1) {
                let singleTitle = selectedFiles[0].name.replace(/\.xlsx$/i, '');
                singleTitle = singleTitle.replace(/[-_0-9\[\]{}()!@#$%^&*+=;:|\\<>,.?~]/g, ' ').replace(/\s+/g, ' ').trim();
                safeFileName = singleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.js';
                appMainTitle = singleTitle;
            }

            downloadJs(finalData, safeFileName);
            
        } catch (error) {
            log(`ERREUR CRITIQUE : ${error.message}`, "error");
            console.error("Error processing files:", error);
            alert("Une erreur s'est produite lors du traitement. Vérifiez la console pour plus de détails.");
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = "Générer et Télécharger quizzes.js";
        }
    });

    function downloadJs(data, filename) {
        log(`Préparation du téléchargement de ${filename}...`);
        const jsonString = JSON.stringify(data, null, 2);
        const jsFileContent = `window.quizzesData = ${jsonString};`;
        const blob = new Blob([jsFileContent], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        log(`Téléchargement de ${filename} prêt !`, "success");
    }
});
