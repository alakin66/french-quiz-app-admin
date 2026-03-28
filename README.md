# French Quiz App pour MS Teams / Web

Une application web interactive, 100% côté client (sans backend), conçue pour héberger et jouer à des quiz de français. Créée à l'origine pour s'intégrer dans Microsoft Teams via OneNote, elle fonctionne idéalement et gratuitement sur **GitHub Pages**.

## 🔗 Accès à l'application
L'application est disponible à l'adresse suivante :
**[https://alakin66.github.io/french-quiz-app/](https://alakin66.github.io/french-quiz-app/)**

## ✨ Fonctionnalités Principales
- **100% Client-Side :** Aucune base de données ou serveur complexe requis. L'application lit simplement un fichier statique de données `quizzes.js`.
- **Génération Automatique :** Chaque onglet (feuille) de vos fichiers Excel devient automatiquement un **Module indépendant** dans le menu principal.
- **Introduction Personnalisable :** Si un fichier Excel contient un onglet nommé `Introduction`, son contenu sera affiché avant de commencer n'importe quel quiz issu de ce fichier.
- **Questionnaire Aléatoire :** Chaque session de jeu sélectionne et mélange aléatoirement **10 questions** parmi la réserve disponible dans un chapitre.
- **Refaire les erreurs :** À la fin du quiz, un bouton permet de recommencer immédiatement une session uniquement avec les questions auxquelles l'étudiant a mal répondu.
- **Suivi des Progrès local :** Les résultats des quiz sont enregistrés dans le navigateur (localStorage) pour afficher des badges de réussite (✅, 🟡, 🔴) dans le menu de sélection.
- **Feedbacks Pédagogiques :** Affiche un message d'explication différent selon que l'élève a répondu juste ou faux à la question.

## 👨‍🏫 Comment générer les quiz (Côté Professeur)

### 1. Préparer vos fichiers Excel
Placez vos fichiers `.xlsx` directement à la racine du projet. 
- **Chaque onglet** du fichier (sauf 'Introduction') créera un module de quiz distinct.
- La ligne 1 doit obligatoirement utiliser ces 6 entêtes : `Type`, `Question`, `Options`, `Answer`, `FeedbackCorrect`, `FeedbackIncorrect`.
- Un onglet nommé `Introduction` (optionnel) permet d'afficher des consignes ou un tableau de rappel avant le quiz.

### 2. Mettre à jour et Publier (Option macOS - Recommandé)
Si vous êtes sur macOS, vous pouvez automatiser la génération et la mise en ligne :
1. **Prérequis :** Avoir installé [Python](https://www.python.org/) et [uv](https://github.com/astral-sh/uv).
2. Double-cliquez sur le fichier **`Publish Quizzes.command`** à la racine du projet.
3. Une fenêtre Terminal s'ouvrira, traitera vos fichiers Excel, mettra à jour `quizzes.js` et **poussera automatiquement les changements sur GitHub**.

### 3. Mettre à jour manuellement (Option Web)
Si vous n'utilisez pas l'outil automatique :
1. Ouvrez `admin.html` dans votre navigateur.
2. Glissez-déposez vos fichiers Excel dans la zone prévue.
3. Cliquez sur "Générer et Télécharger", puis placez le fichier `quizzes.js` obtenu dans le dossier `data/`.
4. Faites manuellement votre `git add`, `commit` et `push`.

## 📝 Types de Questions Supportés

| Type dans Excel | Comportement pour l'étudiant |
| :--- | :--- |
| **`MultipleChoice`** | Boutons cliquables standard. Supporte de cliquer sur de multiples boutons si plusieurs réponses sont attendues (exige de cliquer sur "Soumettre"). |
| **`FillInBlank`** | Champ de texte libre. La validation pardonne automatiquement les majuscules oubliées ou les espaces en trop. |
| **`TrueFalse`** | Rend graphiquement deux gros boutons "Vrai" et "Faux" avec validation au clic. |
| **`OddOneOut`** | Demande à l'élève de "trouver l'intrus" parmi de multiples mots. Validation au clic. |

## 🚀 Déploiement pour la classe
Ce projet est optimisé pour **GitHub Pages**.
- Les étudiants accèdent à l'URL racine `https://alakin66.github.io/french-quiz-app/` pour démarrer.
- Vous insérez ces liens directement dans les consignes du cours Microsoft OneNote ou Teams.

## 🛠 Technologies Utilisées
- HTML5 / CSS3 / Vanilla JavaScript
- Python & `uv` (pour l'outil d'administration macOS)
- Microsoft Fluent UI Icons
- SheetJS (`xlsx`) (pour l'outil d'administration web)
