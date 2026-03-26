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
        // Restrict to single file
        const file = files[0];
        if (file && file.name.endsWith('.xlsx')) {
            selectedFiles = [file]; // Replace existing
        } else {
            alert(`Fichier invalide : ${file ? file.name : 'inconnu'}. Seuls les fichiers .xlsx sont autorisés.`);
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
            const file = selectedFiles[0];
            
            // Clean filename to use as global App Title
            let appTitle = file.name.replace(/\.xlsx$/i, '');
            // Remove dashes, numbers, brackets, etc. and keep only words
            appTitle = appTitle.replace(/[-_0-9\[\]{}()!@#$%^&*+=;:|\\<>,.?~]/g, ' ').replace(/\s+/g, ' ').trim();
            if (!appTitle) appTitle = "Quiz de Français"; // Fallback

            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            
            // Iterate over all sheets
            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const jsonArray = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                
                // Basic validation
                const validQuestions = jsonArray.filter(row => row.Type && row.Question && row.Answer);
                
                if (validQuestions.length > 0) {
                    finalData[sheetName] = validQuestions;
                } else {
                    console.warn(`Aucune question valide trouvée dans la feuille "${sheetName}". Vérifiez les entêtes.`);
                }
            }
            
            downloadJs(finalData, appTitle, 'quizzes.js');
            
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
