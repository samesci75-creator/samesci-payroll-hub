# Configuration de l'envoi d'email — Notifications SAMES CI

## Prérequis : Créer un compte Resend (GRATUIT)

L'Edge Function `notify-admin` utilise [Resend](https://resend.com) pour envoyer les emails.
Resend offre **3 000 emails/mois GRATUITS** — largement suffisant pour SAMES CI.

---

## Étape 1 — Créer un compte Resend

1. Aller sur [https://resend.com](https://resend.com) → "Sign Up" (gratuit)
2. Vérifier votre email
3. Dans le dashboard Resend → **"API Keys"** → **"Create API Key"**
4. Nommer la clé : `sames-ci-notifications`
5. **Copier la clé** (commence par `re_...`)

---

## Étape 2 — Ajouter la clé dans Supabase

1. Aller sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionner votre projet **SAMES CI** (`nzsxzfsngfovtkauqspl`)
3. Dans le menu gauche → **"Edge Functions"** → **"Secrets"** (ou Settings → Secrets)
4. Cliquer **"New Secret"** et ajouter :

| Nom | Valeur |
|-----|--------|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxxxxxxx` (votre clé Resend) |

5. Cliquer **"Save"**

---

## Étape 3 — Déployer l'Edge Function

Dans votre terminal, exécuter :

```bash
# Se connecter à Supabase CLI (si pas déjà fait)
npx supabase login

# Déployer la fonction notify-admin
npx supabase functions deploy notify-admin --project-ref nzsxzfsngfovtkauqspl
```

---

## Étape 4 — (Optionnel) Configurer un domaine email

Par défaut, les emails sont envoyés depuis `notifications@resend.dev`.
Pour utiliser votre propre domaine (ex: `notifications@sames-ci.app`) :

1. Dans Resend → **"Domains"** → **"Add Domain"**
2. Ajouter les enregistrements DNS fournis
3. Mettre à jour la ligne `from:` dans `supabase/functions/notify-admin/index.ts`

---

## Comment ça fonctionne

```
Chef de Chantier / Directeur / Caisse
           ↓ effectue une action
    (Pointage / Validation / Paiement)
           ↓
  Hook useNotification.ts déclenché
           ↓
  Appel Supabase Edge Function "notify-admin"
           ↓
  Récupère l'email du compte Admin (role: "admin")
           ↓
  Envoie un email HTML formaté via Resend API
           ↓
       📧 Email reçu par le RH Admin
```

## Actions qui déclenchent une notification

| Action | Qui déclenche | Quand |
|--------|--------------|-------|
| 📋 Pointage | Chef de Chantier | Après `Enregistrer le pointage` |
| ✅ Validation | Directeur des Travaux | Après validation sélection ou tous |
| 💰 Paiement | Caisse | Après confirmation du paiement |

> **Note :** Le compte Admin (RH administratif) ne reçoit PAS de notification pour ses propres actions.
