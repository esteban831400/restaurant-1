# La Palmeraie — application de gestion interne

Application web pour un complexe de loisirs (Restaurant, Mini-golf, Aires de jeux aquatiques). Interface **en français uniquement**. Les automatisations tournent dans n8n, que le client ne voit jamais : tout se pilote depuis l'app.

## Stack
Next.js 14 (App Router) · TypeScript strict · Tailwind + shadcn/ui + lucide-react · Supabase (Postgres, Auth, RLS, Realtime) · Recharts · TanStack Table · React Hook Form + Zod · Vitest · Vercel.

## Commandes
- `npm run dev` / `npm run build` / `npm run lint` / `npm run typecheck` / `npm test`
- `npx supabase start` puis `npx supabase db reset` : applique `supabase/migrations/*` et `supabase/seed.sql`.

## Structure
- `src/app/(auth)` connexion · `src/app/(app)` pages protégées · `src/app/api` routes (webhooks n8n sous `api/webhooks/n8n/*`)
- `src/lib/supabase/{client,server,admin}.ts` : navigateur / session serveur / service_role (webhooks et crons uniquement)
- `src/lib/auth/{roles,session}.ts` : rôles, navigation par rôle, `requireSession()` (garde serveur) · `middleware.ts` : session + redirection vers /connexion
- `src/lib/webhooks/hmac.ts` : signature HMAC des webhooks · `src/lib/env.ts` : validation Zod des variables
- `supabase/migrations` schéma, RLS, fonctions · `supabase/seed.sql` données de démo · `docs/n8n-contract.md` contrat n8n

## Conventions
- Aucun secret en dur ni côté client ; `serverEnv()` n'est appelé que côté serveur.
- Validation Zod de toute entrée côté serveur. Textes d'interface en français.
- Le stock actuel est TOUJOURS la somme de `mouvements_stock` (vue `v_stock_actuel`), jamais modifié directement. Quantités signées : entrée > 0, sortie/perte < 0, correction ±.
- Les droits sont appliqués par la RLS (rôles `gerant`, `responsable`, `salarie`) ; l'UI ne fait que masquer.
- Aucune commande n'est envoyée à un fournisseur sans validation du gérant.
- Pagination serveur sur toutes les listes.

## Décisions prises
- Déploiement Vercel ; purge RGPD des appels via Vercel Cron (`/api/cron/purge`, `CRON_SECRET`).
- Couleurs : primaire #15803D, secondaire #0891B2 ; pôles restaurant #EA580C, mini-golf #16A34A, aquatique #0284C7.
- Webhooks : en-têtes `X-Palmeraie-Timestamp` + `X-Palmeraie-Signature` = HMAC-SHA256(secret, `timestamp.corps`), tolérance 5 min. Secrets distincts entrant/sortant.
- `produits.pole_id` permet le stock sur les 3 pôles (à confirmer avec le client).
- Dépendances installées avec `--legacy-peer-deps` (conflit peer vitest/@types/node).

## Avancement
- [x] Étape 0 : setup, thème, schéma SQL, RLS, fonctions, seed, HMAC testé
- [x] Étape 1 : connexion, mot de passe oublié/réinitialisation, middleware, `requireSession(roles)`, layout (sidebar desktop, menu horizontal mobile), thème clair/sombre
- [x] Étape 2 : Stocks (catalogue paginé côté serveur via la vue `v_produits_stock`, mouvements, alertes rouge/orange/DLC, fiche + historique, inventaire mobile avec validation, import/export CSV, archivage annulable)
- [ ] 3 Fournisseurs/commandes · 4 Appels · 5 Automatisations · 6 Assistant · 7 Dashboard · 8 Paramètres · 9 Raccourcis

## Stocks (étape 2)
- Vue `v_produits_stock` (migration 0004) : produits + stock calculé + `niveau` (rouge < seuil ; orange < 125 % du seuil) + `dlc_proche`. Règle dupliquée dans `src/lib/stock/alertes.ts` (testée).
- Une sortie ou perte qui rendrait le stock négatif est refusée (`enregistrerMouvement`).
- Inventaire : `qte_theorique` est figée au moment du comptage ; la validation appelle la fonction SQL `valider_inventaire` (mouvements de correction).
- Import CSV tout-ou-rien, séparateur « ; », colonnes dans `importerProduits`. Export : `/api/stocks/export` (limité par la RLS).
- TanStack Table est épinglé en v8 (la v9 a une API différente).
