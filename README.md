# La Palmeraie — gestion interne

Application web de gestion du complexe de loisirs La Palmeraie (Restaurant, Mini-golf, Aires de jeux aquatiques) : stocks, fournisseurs et commandes, journal des appels du standard IA, automatisations, assistant IA, tableau de bord. Interface en français. Les automatisations tournent en arrière-plan et sont entièrement pilotées depuis l'application.

**Stack** : Next.js 14 (App Router) · TypeScript strict · Tailwind + lucide-react · Supabase (Postgres, Auth, RLS, Realtime, Storage) · Recharts · TanStack Table · React Hook Form + Zod · Vitest.

## Installation (développement)

Prérequis : Node 20+, Docker (pour Supabase en local).

1. `npm install`
2. `cp .env.example .env.local`, puis `npx supabase start` : reporter l'URL, la clé `anon` et la clé `service_role` affichées dans `.env.local`. Les deux secrets de signature et `CRON_SECRET` sont des chaînes aléatoires d'au moins 16 caractères (`openssl rand -hex 32`).
3. `npx supabase db reset` : applique les migrations (`supabase/migrations/0001…0009`) et charge les données de démonstration.
4. `npm run dev` puis ouvrir http://localhost:3000. Les e-mails (réinitialisation de mot de passe, invitations) arrivent dans Inbucket : http://127.0.0.1:54324.

### Comptes de démonstration (mot de passe `Palmeraie2025!`)
| Rôle | E-mail |
|---|---|
| Gérant | gerant@palmeraie.test |
| Responsable restaurant | resto.resp@palmeraie.test |
| Salarié restaurant | resto.sal@palmeraie.test |
| Responsable mini-golf | golf.resp@palmeraie.test |
| Salarié aquatique | aqua.sal@palmeraie.test |

Le jeu de démonstration crée les comptes directement dans la base locale ; sur un projet Supabase hébergé, créez les comptes depuis le tableau de bord Supabase (ou via « Paramètres → Utilisateurs » une fois le premier gérant créé).

## Commandes
`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test`

Avant toute livraison : `npm run lint && npm run typecheck && npm test && npm run build`.

## Variables d'environnement
Voir `.env.example`. Aucun secret n'est en dur ni stocké en base. **Les variables `NEXT_PUBLIC_*` sont intégrées au code du navigateur au moment du build : elles doivent être définies avant `npm run build`** (sinon l'application affiche une erreur dès le chargement).

## Déploiement (Vercel)
1. Créer le projet Vercel et renseigner **toutes** les variables de `.env.example` (environnement Production).
2. Créer le projet Supabase, y appliquer les migrations (`supabase db push`), puis créer le premier compte gérant et sa ligne `profiles` (rôle `gerant`).
3. `vercel.json` planifie `/api/cron/purge` chaque nuit (purge RGPD des appels, commandes en retard) ; Vercel envoie automatiquement `Authorization: Bearer $CRON_SECRET`.
4. Communiquer à votre prestataire d'automatisation : `docs/n8n-contract.md`, l'URL de l'application et les deux secrets de signature. Les adresses de ses webhooks se saisissent ensuite dans **Paramètres → Adresses**.

## Diagnostic
En cas de page « erreur serveur » (le détail est masqué en production), ouvrir `/api/health` : il liste les variables d'environnement absentes ou invalides (sans jamais montrer leurs valeurs) et teste la connexion à la base. Après avoir corrigé une variable sur Vercel, **redéployer**.

## Raccourcis (ordinateur)
`Ctrl/⌘ + K` palette de commandes · `N` nouvel élément de la page · `/` recherche · `G` puis `S`/`C`/`A` stocks/commandes/automatisations · `Échap` fermer · `?` aide. Un bouton « + Ajouter » (flottant sur téléphone) ouvre les créations dans un panneau latéral.

## Documentation
- `CLAUDE.md` : conventions, structure, décisions techniques.
- `docs/n8n-contract.md` : contrat complet des webhooks (URL, en-têtes, signature, formats JSON, codes d'erreur).
