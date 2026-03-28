# French Quiz App pour MS Teams / Web

Une application web interactive, 100% côté client (sans backend), conçue pour héberger et jouer à des quiz de français. Créée à l'origine pour s'intégrer dans Microsoft Teams via OneNote, elle fonctionne idéalement et gratuitement sur **GitHub Pages**.

## 🔗 Accès à l'application
L'application est disponible à l'adresse suivante :
**[https://alakin66.github.io/french-quiz-app/](https://alakin66.github.io/french-quiz-app/)**

## ✨ Fonctionnalités Principales
- **100% Client-Side :** Aucune base de données ou serveur complexe requis. L'application lit simplement un fichier statique de données `quizzes.js`.
- **Organisation par Fichiers :** Chaque fichier Excel présent dans le dossier `quizzes/` devient automatiquement un **Module indépendant** (ex: "Pronoms Relatifs").
- **Organisation par Feuilles :** Chaque onglet (feuille) d'un fichier Excel devient un **Quiz spécifique** au sein de ce module.
- **Introduction Dynamique :** Si un fichier Excel contient un onglet nommé `Introduction`, son contenu (textes et tableaux) sera affiché avant de commencer les quiz de ce module.
- **Mode Révision (Admin) :** Un mode spécial accessible en local permet de parcourir l'intégralité des questions avec les réponses et feedbacks affichés (bouton dans le header).
- **Questionnaire Aléatoire :** En mode normal, chaque session sélectionne aléatoirement **10 questions** parmi la réserve disponible.
- **Suivi des Progrès local :** Les résultats sont enregistrés dans le navigateur pour afficher des badges de réussite (✅, 🟡, 🔴) dans le menu.

## 👨‍🏫 Comment générer les quiz (Côté Professeur)

### 1. Préparer vos fichiers Excel
Placez vos fichiers `.xlsx` dans le dossier **`quizzes/`** à la racine du projet. 
- **Le nom du fichier** sera le nom du module dans l'application.
- **Chaque onglet** (sauf 'Introduction') créera un quiz distinct.
- La ligne 1 doit obligatoirement utiliser ces 6 entêtes : `Type`, `Question`, `Options`, `Answer`, `FeedbackCorrect`, `FeedbackIncorrect`.
- Un onglet nommé `Introduction` (optionnel) permet d'afficher des consignes ou un tableau de rappel avant le quiz.

### 2. Mettre à jour et Publier (Option macOS - Recommandé)
Si vous êtes sur macOS, vous pouvez automatiser la génération et la mise en ligne :
1. **Prérequis :** Avoir installé [Node.js](https://nodejs.org/) (Version LTS recommandée).
2. Double-cliquez sur le fichier **`Publish Quizzes.command`** à la racine du projet.
3. Une fenêtre Terminal s'ouvrira, installera les dépendances nécessaires lors du premier lancement, traitera vos fichiers Excel, mettra à jour `quizzes.js` et **poussera automatiquement les changements sur GitHub**.

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
- Node.js (pour l'outil d'administration macOS)
- Microsoft Fluent UI Icons
- SheetJS (`xlsx`) (pour l'outil d'administration web et local)
