# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "openpyxl",
# ]
# ///
import os
import json
import glob
import subprocess
import openpyxl

def parse_excel_files():
    final_data = {}
    excel_files = [f for f in glob.glob("*.xlsx") if not f.startswith("~$")]

    for file in excel_files:
        print(f"Processing {file}...")
        
        # Clean filename to use as Module title
        file_title = file.replace(".xlsx", "")
        file_title = "".join([c if c.isalnum() else " " for c in file_title])
        file_title = " ".join(file_title.split()).strip()
        if not file_title: file_title = "Quiz"

        if file_title not in final_data:
            final_data[file_title] = {}

        wb = openpyxl.load_workbook(file, data_only=True)

        if 'Introduction' in wb.sheetnames:
            ws_intro = wb['Introduction']
            intro_data = []
            for row in ws_intro.iter_rows(values_only=True):
                clean_row = ["" if cell is None else str(cell) for cell in row]
                if any(cell.strip() != "" for cell in clean_row):
                    intro_data.append(clean_row)
            if intro_data:
                final_data[file_title]["_intro"] = intro_data

        for sheet_name in wb.sheetnames:
            if sheet_name.lower() == 'introduction':
                continue

            ws = wb[sheet_name]
            headers = [str(cell.value).strip() if cell and cell.value else "" for cell in ws[1]]

            if "Type" not in headers or "Question" not in headers or "Answer" not in headers:
                continue

            type_idx, q_idx, ans_idx = headers.index("Type"), headers.index("Question"), headers.index("Answer")
            questions = []

            for row in ws.iter_rows(min_row=2, values_only=True):
                if len(row) <= max(type_idx, q_idx, ans_idx) or not row[type_idx] or not row[q_idx] or not row[ans_idx]:
                    continue

                q_obj = {headers[i]: ("" if row[i] is None else str(int(row[i]) if isinstance(row[i], float) and row[i].is_integer() else row[i])) 
                         for i in range(len(headers)) if i < len(row) and headers[i]}
                questions.append(q_obj)

            if questions:
                full_quiz_name = f"{file_title} - {sheet_name}"
                final_data[file_title][full_quiz_name] = questions
                print(f"  Added {len(questions)} questions for quiz '{full_quiz_name}'.")

    return final_data

def main():
    print("========================================")
    print("   French Quiz App - Mac Admin App      ")
    print("========================================\n")
    
    data = parse_excel_files()

    if not data:
        print("\n❌ No valid quiz data found. Exiting.")
        return

    out_path = os.path.join("data", "quizzes.json")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"\n✅ Successfully created {out_path}")

    print("\nUploading to GitHub...")
    try:
        # Add the file to git
        subprocess.run(["git", "add", out_path], check=True)
        
        # Check if there are actual changes
        status = subprocess.run(["git", "status", "--porcelain", out_path], capture_output=True, text=True)
        if status.stdout.strip():
            subprocess.run(["git", "commit", "-m", "chore: update quizzes.json via Mac Admin app"], check=True)
            subprocess.run(["git", "push"], check=True)
            print("\n🎉 Successfully pushed to GitHub!")
        else:
            print("\n✅ quizzes.json is already up to date. Nothing to push.")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error during Git operations: {e}")

if __name__ == "__main__":
    main()
