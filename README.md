# French Quiz App pour MS Teams / Web

Une application web interactive, 100% côté client (sans backend), conçue pour héberger et jouer à des quiz de français. Créée à l'origine pour s'intégrer dans Microsoft Teams via OneNote, elle fonctionne idéalement et gratuitement sur **GitHub Pages**.

## 🔗 Accès à l'application
L'application est disponible à l'adresse suivante :
**[https://alakin66.github.io/french-quiz-app/](https://alakin66.github.io/french-quiz-app/)**

## ✨ Fonctionnalités Principales
- **100% Client-Side :** Aucune base de données ou serveur complexe requis. L'application lit simplement un fichier statique de données `quizzes.js`.
- **Générateur Intégré (Admin Tool) :** Les professeurs peuvent glisser-déposer de multiples fichiers Excel pour générer le contenu du site automatiquement.
- **Menu à 2 niveaux (Navigation Intelligente) :** Supporte l'importation de multiples fichiers Excel comportant plusieurs onglets. L'arborescence se crée toute seule : Menu Principal (Nom du fichier Excel) ➔ Sous-Menu du Quiz (Nom de l'onglet Excel).
- **Questionnaire Aléatoire :** Chaque session de jeu sélectionne et mélange aléatoirement **10 questions** parmi la réserve disponible dans un chapitre.
- **Refaire les erreurs :** À la fin du quiz, un bouton permet de recommencer immédiatement une session uniquement avec les questions auxquelles l'étudiant a mal répondu.
- **Suivi des Progrès local :** Les résultats des quiz sont enregistrés dans le navigateur (localStorage) pour afficher des badges de réussite (✅, 🟡, 🔴) dans le menu de sélection.
- **Feedbacks Pédagogiques :** Affiche un message d'explication différent selon que l'élève a répondu juste ou faux à la question.
- **Support des Liens Directs :** Permet de partager un chapitre spécifique à vos élèves pour un devoir direct, via le paramètre d'URL (ex: `?quiz=verbes-transitifs`).

## 👨‍🏫 Comment générer les quiz (Côté Professeur)

### 1. Créer le fichier Excel
Chaque fichier Excel correspondra à un **Module/Chapitre** dans le menu principal. Chaque onglet du fichier correspondra à une difficulté ou un **Sous-Quiz**.
La ligne 1 de votre document Excel doit obligatoirement, et exactement, utiliser ces 6 entêtes :
- `Type` : Le format de la question (`MultipleChoice`, `FillInBlank`, `TrueFalse` ou `OddOneOut`).
- `Question` : La question posée à l'étudiant.
- `Options` : Les choix possibles séparés par des virgules (ex: `manger, boire, dormir`).
- `Answer` : La ou les réponses correctes.
- `FeedbackCorrect` : L'explication si l'étudiant trouve la bonne réponse.
- `FeedbackIncorrect` : L'indice ou la correction si l'étudiant se trompe.

### 2. Utiliser l'outil "Admin"
- Ouvrez le fichier `admin.html` en double-cliquant dessus (il s'ouvre dans votre navigateur hors-ligne) ou via le serveur de développement.
- Glissez **tous vos fichiers Excel en même temps** dans la zone de dépôt.
- L'outil va télécharger automatiquement un méga-fichier consolidé nommé `quizzes.js`.

### 3. Mettre à jour l'application en ligne
- Sur votre ordinateur, déplacez ce nouveau fichier `quizzes.js` dans le dossier `data/` de votre projet (remplacez l'ancien).
- Faites un "commit" Git et "pushez" vos modifications sur votre compte GitHub.

## 📝 Types de Questions Supportés

| Type dans Excel | Comportement pour l'étudiant |
| :--- | :--- |
| **`MultipleChoice`** | Boutons cliquables standard. Supporte de cliquer sur de multiples boutons si plusieurs réponses sont attendues (exige de cliquer sur "Soumettre"). |
| **`FillInBlank`** | Champ de texte libre. La validation pardonne automatiquement les majuscules oubliées ou les espaces en trop. |
| **`TrueFalse`** | Rend graphiquement deux gros boutons "Vrai" et "Faux" avec validation au clic. |
| **`OddOneOut`** | Demande à l'élève de "trouver l'intrus" parmi de multiples mots. Validation au clic. |

## 🚀 Déploiement pour la classe
Ce projet est optimisé pour **GitHub Pages**.
- Les étudiants accèdent à l'URL racine `https://alakin66.github.io/french-quiz-app/` pour démarrer et choisir n'importe quelle leçon dans le catalogue.
- Vous insérez ces liens directement dans les consignes du cours Microsoft OneNote ou Teams.

## 🛠 Technologies Utilisées
- HTML5 / CSS3 / Vanilla JavaScript
- Microsoft Fluent UI Icons (Pour se fondre parfaitement dans l'interface MS Teams)
- SheetJS (`xlsx`) (Pour la conversion locale d'Excel en JS)
