# AAP MedTech Veille — INNOVÉA · Siemens Healthineers France

Dashboard de veille des appels à projets MedTech (France & Europe), avec digest email mensuel automatique.

## Stack

| Composant | Techno | Coût |
|---|---|---|
| Frontend + API | Next.js 14 (App Router) | Gratuit |
| Hébergement | Vercel | Gratuit (Hobby) |
| Source de vérité | GitHub (`data/aap-data.json`) | Gratuit |
| Email | Resend | Gratuit (3 000/mois) |
| Cron | GitHub Actions | Gratuit |

---

## Déploiement en 6 étapes

### 1. Créer le repo GitHub

```bash
cd medtech-aap
git init
git add .
git commit -m "init: AAP MedTech veille"
```

Sur GitHub : créer un nouveau repo (ex. `innovea-aap-veille`), puis :

```bash
git remote add origin https://github.com/samuelhailucross-lab/innovea-aap-veille.git
git branch -M main
git push -u origin main
```

---

### 2. Configurer Resend (email)

1. Créer un compte sur [resend.com](https://resend.com) (gratuit)
2. Ajouter votre domaine ou utiliser `onboarding@resend.dev` pour les tests
3. Copier votre **API Key** (commence par `re_`)
4. Dans `src/lib/email.ts`, remplacer l'adresse `from` :
   ```
   from: 'INNOVÉA AAP Veille <noreply@votre-domaine.com>'
   ```

---

### 3. Déployer sur Vercel

1. Aller sur [vercel.com](https://vercel.com) → **Add New Project**
2. Importer le repo GitHub `innovea-aap-veille`
3. Dans **Environment Variables**, ajouter :

| Variable | Valeur |
|---|---|
| `ADMIN_SECRET` | Un mot de passe fort (ex. généré via `openssl rand -hex 16`) |
| `RESEND_API_KEY` | Votre clé Resend (`re_...`) |
| `NOTIFY_EMAILS` | `sam@shs.com,colleague@shs.com` |
| `CRON_SECRET` | Une autre chaîne aléatoire (`openssl rand -hex 32`) |

4. Cliquer **Deploy** — Vercel détecte Next.js automatiquement.
5. Votre app est disponible sur `https://innovea-aap-veille.vercel.app`

---

### 4. Configurer les secrets GitHub Actions

Dans votre repo GitHub → **Settings → Secrets and variables → Actions** :

| Secret | Valeur |
|---|---|
| `APP_URL` | URL Vercel de votre app (ex. `https://innovea-aap-veille.vercel.app`) |
| `CRON_SECRET` | La même valeur que dans Vercel |

Le cron se déclenchera automatiquement le premier lundi de chaque mois à 8h (Paris).

Pour tester manuellement : **Actions → Monthly AAP Digest → Run workflow**.

---

### 5. Accès admin

URL : `https://votre-app.vercel.app/admin`

Mot de passe : la valeur de `ADMIN_SECRET` configurée sur Vercel.

L'interface admin permet de :
- Modifier les deadlines de chaque guichet (date, statut, notes)
- Ajouter de nouvelles vagues à un guichet existant
- Mettre à jour manuellement (bouton Sauvegarder)

> Pour ajouter un guichet entier, éditer directement `data/aap-data.json` et commiter sur GitHub.

---

### 6. Mise à jour des données

**Workflow recommandé :**

1. Modifier `data/aap-data.json` dans GitHub (éditeur web ou localement)
2. Commiter → Vercel redéploie automatiquement en ~30 secondes
3. Ou utiliser l'interface admin pour les mises à jour de deadlines

**Pour une mise à jour simple via l'admin :**
1. Aller sur `/admin`, se connecter
2. Dérouler le guichet concerné
3. Modifier la date ou le statut
4. Cliquer **Sauvegarder**

---

## Structure du projet

```
medtech-aap/
├── data/
│   └── aap-data.json          ← Source de vérité des guichets
├── src/
│   ├── app/
│   │   ├── page.tsx            ← Dashboard principal
│   │   ├── layout.tsx
│   │   ├── admin/
│   │   │   ├── page.tsx        ← Interface admin (protégée)
│   │   │   └── login/page.tsx  ← Login
│   │   └── api/
│   │       ├── auth/login/     ← Authentification
│   │       ├── notify/         ← Endpoint email (appelé par GitHub Actions)
│   │       └── save/           ← Sauvegarde JSON
│   ├── components/
│   │   ├── DashboardClient.tsx ← Tableau interactif + filtres
│   │   └── AdminClient.tsx     ← Interface d'édition
│   └── lib/
│       ├── types.ts            ← Types TypeScript
│       ├── data.ts             ← Chargement + tri des données
│       ├── auth.ts             ← Vérification session cookie
│       └── email.ts            ← Template + envoi Resend
└── .github/
    └── workflows/
        └── monthly-digest.yml  ← Cron GitHub Actions
```

---

## Format de aap-data.json

```json
{
  "meta": {
    "lastUpdated": "2026-04-15",
    "updatedBy": "Samuel"
  },
  "guichets": [
    {
      "id": "identifiant-unique",
      "nom": "Nom complet du guichet",
      "organisme": "BPI / ANS / EIC...",
      "niveau": "FR",           // "FR" ou "EU"
      "type": "subvention",
      "trl": "7-9",
      "scope": "Description du périmètre",
      "cibles": ["PME", "ETI"],
      "budget_projet": "≥ 1 M€",
      "url": "https://...",
      "deadlines": [
        {
          "label": "Vague printemps 2026",
          "date": "2026-06-15",          // null si pas de date fixe
          "statut": "ouvert",            // ouvert | ferme | ouvert_continu | a_surveiller
          "notes": "Note optionnelle"    // optionnel
        }
      ],
      "tags": ["DM", "robotique"]
    }
  ]
}
```

### Valeurs de `statut`

| Valeur | Signification |
|---|---|
| `ouvert` | Deadline confirmée, dépôt possible |
| `ferme` | Deadline passée |
| `ouvert_continu` | Guichet permanent, pas de deadline fixe |
| `a_surveiller` | Date non encore publiée, à surveiller |

---

## Développement local

```bash
npm install
cp .env.example .env.local
# Renseigner les variables dans .env.local
npm run dev
# → http://localhost:3000
```

---

*INNOVÉA · Siemens Healthineers France · Restricted © Siemens Healthineers*
