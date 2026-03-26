---
name: teams-french-quiz-architect
description: Guides the creation of a strictly client-side MS Teams application that pre-loads French quizzes from a JS object, along with an admin tool to generate that JS file from a multi-sheet Excel file.
---

# Project Overview
Build a strict client-side only web application designed to be embedded as a Microsoft Teams Tab. The project requires two separate interfaces:
1. **Admin Tool (`admin.html`):** Allows teachers to upload a single Excel file containing multiple sheets. It compiles them into a single downloadable `quizzes.js` file.
2. **Student App (`index.html`):** The main MS Teams app distributed to students. It natively includes the `quizzes.js` script to populate a dropdown of available quizzes (one per sheet), sets the app title from the Excel filename, and runs the interactive quiz.

# Technical Constraints
* **Architecture:** Client-side HTML, CSS, and TypeScript/JavaScript only. NO backend (No Node.js, Python, or databases).
* **Libraries:** Use `SheetJS` (xlsx) ONLY in the `admin.html` file for parsing Excel. 
* **Data Storage:** The student app includes a local `./data/quizzes.js` file via a `<script>` tag which assigns `window.quizzesData` and `window.quizConfig` rather than using `fetch()` to avoid local CORS issues.
* **Design System:** Use Microsoft Fluent UI web components (or custom CSS that mimics Fluent UI) so the app looks native to MS Teams.

# The Admin Tool (`admin.html`)
* Provide a single-file upload input for a `.xlsx` file.
* Parse the uploaded Excel file using SheetJS. Extract the global app title from the filename (removing `.xlsx` and special characters like dashes and numbers).
* Iterate through all sheets in the Excel file. Each sheet name represents a quiz category.
* Combine all parsed quizzes into a global `window.quizzesData` object and a `window.quizConfig` object.
* Provide a "Télécharger quizzes.js" button that triggers a browser download.

# The Excel File Structure (For the Admin Tool)
The SheetJS logic must expect Excel sheets with these exact columns:
| Type | Question | Options | Answer | FeedbackCorrect | FeedbackIncorrect |

# Supported Question Types & Logic (For the Student App)
The application dynamically renders a different UI depending on the `Type` field:
1.  **MultipleChoice:** Display the `Question` and render the `Options` (comma-separated string) as clickable buttons. Support selecting multiple answers if necessary. Provide a "Soumettre" button that disappears upon click.
2.  **FillInBlank:** Display the `Question` with an input text box where the student types the `Answer`. Ignore capitalization and leading/trailing spaces during validation. Provide a "Soumettre" button.
3.  **TrueFalse:** Display a French scenario. Render two buttons: "Vrai" (True) and "Faux" (False). Single click validates immediately.
4.  **OddOneOut:** Display a list of French words from `Options`. The student clicks the word that does not belong. Single click validates immediately.

# Application Flow (Student App - `index.html`)
1.  **Initialization:** Read `window.quizConfig.title` to set the page title and major `<h1>` and `<h2>` headers dynamically.
2.  **Start Screen:** Display a dropdown field populated with the titles of the loaded quizzes (derived from the Excel sheet names).
3.  **Randomization**: Upon clicking "Commencer le Quiz", randomly select exactly 10 questions from the chosen quiz sheet to present to the user.
4.  **Quiz View:** Display one question at a time. Include a "Quitter" (Exit) button (an X icon) in the progress header to return to the Start Screen. Include a "Suivant" button that only appears after the student submits an answer. Show either `FeedbackCorrect` or `FeedbackIncorrect` on the same horizontal plane as the "Suivant" button.
5.  **Results Screen:** When the 10 questions are answered, display an animated circular progress chart with the final score (e.g., "8/10") and a "Retour au Menu Principal" button.
