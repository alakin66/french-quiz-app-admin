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
    generateBtn.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;
        
        generateBtn.disabled = true;
        generateBtn.textContent = "Traitement en cours...";
        
        try {
            const finalData = {};
            
            for (const file of selectedFiles) {
                let fileTitle = file.name.replace(/\.xlsx$/i, '');
                fileTitle = fileTitle.replace(/[-_0-9\[\]{}()!@#$%^&*+=;:|\\<>,.?~]/g, ' ').replace(/\s+/g, ' ').trim();
                if (!fileTitle) fileTitle = "Quiz";

                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                
                for (const sheetName of workbook.SheetNames) {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonArray = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                    
                    const validQuestions = jsonArray.filter(row => row.Type && row.Question && row.Answer);
                    
                    if (validQuestions.length > 0) {
                        const quizKey = workbook.SheetNames.length > 1 ? `${fileTitle} - ${sheetName}` : fileTitle;
                        finalData[quizKey] = validQuestions;
                    } else {
                        console.warn(`Aucune question valide trouvée dans la feuille "${sheetName}" de ${file.name}.`);
                    }
                }
            }
            
            let safeFileName = 'quizzes.js';
            let appMainTitle = "Quiz de Français"; // Default Global Title
            
            // If only one file is uploaded, dedicate the app title and JS filename to it
            if (selectedFiles.length === 1) {
                let singleTitle = selectedFiles[0].name.replace(/\.xlsx$/i, '');
                singleTitle = singleTitle.replace(/[-_0-9\[\]{}()!@#$%^&*+=;:|\\<>,.?~]/g, ' ').replace(/\s+/g, ' ').trim();
                safeFileName = singleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.js';
                appMainTitle = singleTitle;
            }

            downloadJs(finalData, appMainTitle, safeFileName);
            
        } catch (error) {
            console.error("Error processing files:", error);
            alert("Une erreur s'est produite lors du traitement. Vérifiez la console pour plus de détails.");
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = "Générer et Télécharger quizzes.js";
        }
    });

    function downloadJs(data, metaTitle, filename) {
        const jsonString = JSON.stringify(data, null, 2);
        const jsFileContent = `window.quizConfig = { title: ${JSON.stringify(metaTitle)} };\nwindow.quizzesData = ${jsonString};`;
        const blob = new Blob([jsFileContent], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});
