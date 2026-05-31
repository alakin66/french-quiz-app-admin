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
| Tester | Écrit `quizzes.js` puis ouvre l'app étudiante directement sur ce quiz |
| 🔗 Copier le lien | Copie dans le presse-papiers l'URL GitHub Pages de ce quiz (format `?quiz=...&preselect=...`) |
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

**Types de questions disponibles :** `MultipleChoice` · `OddOneOut` · `TrueFalse` · `FillInBlank` · `Vocabulary`

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
- **Lien direct vers un quiz** — l'URL accepte des paramètres pour ouvrir un module et présélectionner un quiz automatiquement

### Paramètres URL

| Paramètre | Exemple | Effet |
|-----------|---------|-------|
| `?quiz=NomModule` | `?quiz=Les%20Pronoms` | Ouvre directement ce module (passe l'écran de sélection) |
| `&preselect=CléQuiz` | `&preselect=Les%20Pronoms%20-%20COD%20A2` | Présélectionne ce quiz et lance immédiatement la session |

Le bouton **🔗 Copier le lien** de l'outil admin génère automatiquement ces URLs au format GitHub Pages.

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

## Créer du contenu avec un LLM

Le fichier `quiz-template.json` est un gabarit annoté que vous pouvez fournir directement à un LLM (Claude, ChatGPT, etc.) pour générer un nouveau module de quiz.

**Usage :**
1. Copier le contenu de `quiz-template.json`
2. L'envoyer au LLM avec le prompt : *« Remplis ce gabarit pour créer un module sur [sujet]. Supprime toutes les clés `_comment*` et `_TEMPLATE_GUIDE` de la sortie. »*
3. Coller le JSON généré dans l'outil admin via **📂 Importer Quizzes** (ou fusionner manuellement)

Le gabarit documente : la structure du module, le format HTML de l'introduction, les 5 types de questions avec leurs contraintes, et les règles de rédaction des feedbacks.

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

## Développement & Build (Admin Tool)

### Prérequis
- [Rust](https://www.rust-lang.org/tools/install) (toolchain stable)
- [Node.js](https://nodejs.org/) 20+ et npm

### Développement
```bash
cd admin-tool
npm install
npm run tauri dev      # lance l'app desktop en mode dev (hot-reload du frontend)
```

Après toute modification Rust dans `admin-tool/src-tauri/` :
```bash
cd admin-tool/src-tauri
cargo check
```

### Build local (macOS Apple Silicon)
```bash
cd admin-tool
npm run tauri build -- --target aarch64-apple-darwin
# Artefact : admin-tool/src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/*.dmg
```

### Publier une release
Le workflow `.github/workflows/release.yml` construit et publie automatiquement le `.dmg`
lors du push d'un tag de version :
```bash
git tag v0.1.0
git push origin v0.1.0   # déclenche le build macOS + crée la GitHub Release avec le .dmg
```

---

## Technologies

| Composant | Technologies |
|-----------|-------------|
| Application étudiante | HTML5 / CSS3 / Vanilla JavaScript |
| Outil admin (desktop) | [Tauri 2](https://tauri.app/) · Rust · HTML/JS |
| Lecture/écriture Excel | [SheetJS](https://sheetjs.com/) (`xlsx`) |
| Publication | Git (via Tauri backend) |
| Hébergement | GitHub Pages |

---

## Contributeurs

| Contributeur | Rôle |
|---|---|
| [@alakin66](https://github.com/alakin66) | Auteur |
| [Claude](https://claude.ai) (Anthropic) | Pair programmer IA |

Les commits générés avec l'aide de Claude incluent automatiquement une ligne `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` dans le message de commit.
