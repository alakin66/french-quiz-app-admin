const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { execSync } = require('child_process');

async function parseExcelFiles() {
    const finalData = {};
    
    // Déterminer le dossier source
    let sourceDir = '.';
    if (fs.existsSync('quizzes') && fs.readdirSync('quizzes').filter(f => f.endsWith('.xlsx') && !f.startsWith('~$')).length > 0) {
        sourceDir = 'quizzes';
        console.log(`Using directory: ${sourceDir}`);
    } else {
        console.log(`Using directory: . (quizzes folder empty or missing)`);
    }

    const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));

    for (const file of files) {
        const filePath = path.join(sourceDir, file);
        console.log(`Processing ${filePath}...`);
        
        // 1. Module Name = File Name
        let moduleName = file.replace(/\.xlsx$/i, '');
        moduleName = moduleName.replace(/[-_0-9\[\]{}()!@#$%^&*+=;:|\\<>,.?~]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!moduleName) moduleName = "Quiz";

        if (!finalData[moduleName]) {
            finalData[moduleName] = {};
        }

        const workbook = XLSX.readFile(filePath);
        
        // 2. Introduction Page
        const introSheet = workbook.SheetNames.find(n => n.toLowerCase() === 'introduction');
        if (introSheet) {
            console.log(`  • Introduction found in ${file}`);
            const worksheet = workbook.Sheets[introSheet];
            const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            finalData[moduleName]._intro = rawRows.filter(row => row.some(cell => String(cell).trim() !== ''));
        }

        // 3. One Quiz per Sheet
        for (const sheetName of workbook.SheetNames) {
            if (sheetName.toLowerCase() === 'introduction') continue;

            const worksheet = workbook.Sheets[sheetName];
            const jsonArray = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            const validQuestions = jsonArray.filter(row => row.Type && row.Question && row.Answer);
            
            if (validQuestions.length > 0) {
                // Quiz Name = Module Name - Sheet Name
                const fullQuizName = `${moduleName} - ${sheetName}`;
                console.log(`  • Adding quiz: ${fullQuizName} (${validQuestions.length} questions)`);
                finalData[moduleName][fullQuizName] = validQuestions;
            } else {
                console.warn(`  • Skipping sheet "${sheetName}": No valid questions found.`);
            }
        }
    }
    return finalData;
}

async function main() {
    console.log("========================================");
    console.log("   French Quiz App - Node Admin Tool    ");
    console.log("========================================\n");

    try {
        const data = await parseExcelFiles();
        
        if (Object.keys(data).length === 0) {
            console.error("\n❌ No valid quiz data found. Exiting.");
            return;
        }

        const outPath = path.join('data', 'quizzes.json');
        if (!fs.existsSync('data')) fs.mkdirSync('data');
        
        fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`\n✅ Successfully created ${outPath}`);

        // Git Operations
        console.log("\nChecking for changes to upload...");
        try {
            execSync(`git add "${outPath}"`);
            const status = execSync(`git status --porcelain "${outPath}"`).toString().trim();
            
            if (status) {
                console.log("Pushing updates to GitHub...");
                execSync('git commit -m "chore: update quizzes.json via Node Admin tool"');
                execSync('git push');
                console.log("\n🎉 Successfully pushed to GitHub!");
            } else {
                console.log("\n✅ quizzes.json is already up to date. Nothing to push.");
            }
        } catch (gitErr) {
            console.error("\n⚠️ Git operation failed. Check your permissions or branch rules.");
            console.error(gitErr.message);
        }

    } catch (err) {
        console.error("\n❌ Critical Error:", err.message);
    }
}

main();
