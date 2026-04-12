# French Quiz App

Une application web interactive, 100% côté client (sans backend), conçue pour héberger et jouer à des quiz de français. Hébergée sur **GitHub Pages** et accompagnée d'un outil d'administration desktop (**Admin Tool**) pour créer et publier les quiz sans toucher au code.

## Accès à l'application

**[https://alakin66.github.io/french-quiz-app/](https://alakin66.github.io/french-quiz-app/)**

---

## Architecture

```
quizzes/*.xlsx  →  Admin Tool  →  data/quizzes.js  →  index.html (runtime étudiant)
```

- **`index.html`** — Application étudiante (quiz interactif)
- **`admin-tool/`** — Outil desktop Tauri pour créer, éditer et publier les quiz
- **`data/quizzes.js`** — Fichier généré automatiquement par l'outil admin ; ne pas modifier à la main

---

## Outil Admin (Admin Tool)

Application de bureau macOS/Windows construite avec [Tauri 2](https://tauri.app/). Elle permet de gérer l'intégralité du contenu sans ligne de commande.

### Lancer l'outil

```bash
cd admin-tool
npm install
npm run tauri dev
```

### Pages de l'outil

#### 📚 Modules (`index.html`)

Page d'accueil listant tous les modules dans un tableau (nom, description, nombre de quiz).

**Barre d'outils :**
| Bouton | Action |
|--------|--------|
| 🔍 Tester l'app | Ouvre l'application étudiante dans le navigateur |
| ⬆ Importer Excel | Importe un ou plusieurs fichiers `.xlsx` (drag-drop ou sélecteur) |
| + Nouveau module | Crée un module vide |
| 💾 Exporter Quizzes | Sauvegarde toutes les données en JSON |
| 📂 Importer Quizzes | Remplace toutes les données depuis un JSON |
| 🚀 Publier | Commit + push `quizzes.js` vers GitHub |
| ⚙️ Paramètres | Configure les identifiants GitHub |

**Import Excel :** déposer un fichier `.xlsx` détecte automatiquement le nom du module (nom du fichier), la description (propriétés du classeur), l'introduction (onglet `Introduction`) et les quiz (tous les autres onglets).

---

#### 📄 Module (`module.html`)

Édition d'un module : nom, description, introduction, et liste des quiz.

**Introduction :**
- Affiche un aperçu du contenu de l'introduction
- Permet d'importer l'introduction depuis un fichier Excel
- Permet d'éditer le HTML directement
- Bouton pour effacer l'introduction

**Quiz :**
| Bouton | Action |
|--------|--------|
| (nom du quiz) | Ouvre la page Questions |
| Tester | Ouvre l'app étudiante en présélectionnant ce quiz |
| Renommer | Modifie le nom du quiz |
| Supprimer | Supprime le quiz avec confirmation |
| + Ajouter Quiz | Crée un nouveau quiz vide |
| ⬆ Importer Quiz Excel | Importe les questions depuis un onglet Excel |

Les champs nom et description se sauvegardent automatiquement à la perte du focus (blur).

---

#### ✏️ Questions (`questions.html`)

Éditeur de questions en tableau avec cellules éditables inline.

**Colonnes :** Type · Question · Options · Answer · FeedbackCorrect · FeedbackIncorrect

**Fonctionnalités :**
- Sauvegarde automatique (debounce 600 ms après chaque frappe)
- Glisser-déposer les lignes pour les réordonner
- Boutons ↑ ↓ pour monter/descendre une ligne
- Dupliquer ou supprimer une ligne
- Les nouvelles lignes affichent un menu déroulant pour le type ; les lignes existantes affichent le type en texte

**Types de questions disponibles :** `MultipleChoice` · `OddOneOut` · `TrueFalse` · `FillInBlank`

---

#### ⚙️ Paramètres (`settings.html`)

Configuration pour la publication GitHub automatique.

| Champ | Description |
|-------|-------------|
| Nom d'utilisateur GitHub | ex. `alakin66` |
| Dépôt GitHub | ex. `alakin66/french-quiz-app` |
| Token PAT | Personal Access Token avec permission `Contents: Read and write` |

**Créer un PAT :** GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → permission **Contents: Read and write** sur ce dépôt uniquement.

---

### Flux de données

1. **Import Excel** → SheetJS parse le fichier → données stockées en JSON local via Tauri
2. **Édition** → modifications sauvegardées en temps réel dans le JSON local
3. **Génération `quizzes.js`** → `buildStudentJs()` transforme le JSON admin en format étudiant et l'écrit via Tauri
4. **Publication** → `git_publish` commit + push `quizzes.js` sur GitHub avec le message saisi

**Structure des clés quiz :**
- Admin : `"NomDuQuiz"`
- Étudiant : `"NomDuModule - NomDuQuiz"` (préfixe ajouté automatiquement)

---

## Application Étudiante

### Fonctionnalités

- **100% Client-Side** — lecture statique de `data/quizzes.js`, aucun serveur requis
- **Navigation par modules** — chaque fichier Excel = un module avec ses quiz
- **Introduction dynamique** — affiché avant les quiz si l'onglet `Introduction` existe
- **Nombre de questions configurable** — Défaut (10) / Toutes les questions / Personnalisé
- **Sélection aléatoire** — mélange ou ordre original au choix
- **Suivi des progrès** — résultats enregistrés en `localStorage` avec badges ✅ 🟡 🔴
- **Mode Révision** — visible uniquement en local (`localhost` / `file://`), permet de parcourir les questions sans chronomètre

### Types de questions

| Type | Comportement |
|:-----|:-------------|
| `MultipleChoice` | Boutons cliquables ; supporte plusieurs bonnes réponses (bouton Soumettre) |
| `FillInBlank` | Champ texte libre ; insensible à la casse et aux espaces |
| `TrueFalse` | Deux boutons Vrai / Faux |
| `OddOneOut` | Trouver l'intrus parmi plusieurs options |
| `Vocabulary` | Champ texte ; plusieurs réponses acceptables séparées par des virgules |

### Format Excel

- **Nom du fichier** → nom du module
- **Onglet `Introduction`** (optionnel) → introduction affichée avant les quiz
- **Autres onglets** → un quiz par onglet
- **Ligne 1** (entêtes obligatoires) : `Type` · `Question` · `Options` · `Answer` · `FeedbackCorrect` · `FeedbackIncorrect`
- `Options` et `Answer` : valeurs multiples séparées par des virgules

---

## Publication

### Via l'outil Admin (recommandé)

1. Configurer les paramètres GitHub (⚙️ Paramètres)
2. Cliquer **🚀 Publier** → saisir un message de commit → confirmer

### Via CLI Node.js

```bash
npm install
node publish_quizzes.js
```

Lit `quizzes/*.xlsx`, génère `data/quizzes.js`, effectue `git add/commit/push`.

### Manuellement (navigateur)

1. Ouvrir `admin.html` dans le navigateur
2. Glisser-déposer les fichiers Excel
3. Télécharger `quizzes.js` → le placer dans `data/`
4. `git add / commit / push` manuellement

---

## Protection de la branche `main`

Pour protéger `main` tout en autorisant l'outil admin à publier directement :

1. GitHub → Settings → Rules → Rulesets → **New branch ruleset**
2. Cible : `main` · Activer **Require a pull request before merging**
3. Dans **Bypass list** : ajouter le compte ou token utilisé par l'outil admin

---

## Déploiement

Optimisé pour **GitHub Pages** — aucune configuration requise, simple push sur `main`.

URL étudiants : `https://<user>.github.io/<repo>/`

---

## Technologies

| Composant | Technologies |
|-----------|-------------|
| Application étudiante | HTML5 / CSS3 / Vanilla JavaScript |
| Outil admin (desktop) | [Tauri 2](https://tauri.app/) · Rust · HTML/JS |
| Lecture/écriture Excel | [SheetJS](https://sheetjs.com/) (`xlsx`) |
| Publication | Git (via Tauri backend) |
| Hébergement | GitHub Pages |
