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
- [x] Étape 3 : fournisseurs (fiche, stats), commandes (statuts, « Valider et envoyer » → n8n, réception, duplication, « Commander » depuis les stocks), webhook `orders`
- [ ] 4 Appels · 5 Automatisations · 6 Assistant · 7 Dashboard · 8 Paramètres · 9 Raccourcis

## Stocks (étape 2)
- Vue `v_produits_stock` (migration 0004) : produits + stock calculé + `niveau` (rouge < seuil ; orange < 125 % du seuil) + `dlc_proche`. Règle dupliquée dans `src/lib/stock/alertes.ts` (testée).
- Une sortie ou perte qui rendrait le stock négatif est refusée (`enregistrerMouvement`).
- Inventaire : `qte_theorique` est figée au moment du comptage ; la validation appelle la fonction SQL `valider_inventaire` (mouvements de correction).
- Import CSV tout-ou-rien, séparateur « ; », colonnes dans `importerProduits`. Export : `/api/stocks/export` (limité par la RLS).
- TanStack Table est épinglé en v8 (la v9 a une API différente).

## Fournisseurs et commandes (étape 3)
- Seul le gérant passe une commande à « envoyée » : garde-fou SQL (`controle_commande`, migration 0005) ET action `validerEtEnvoyer` (statut posé seulement si n8n répond 2xx ; sinon la commande reste « à valider »).
- Les prix des lignes sont toujours relus en base (jamais pris du navigateur) ; `total_estime` est recalculé par trigger.
- `/api/webhooks/n8n/orders` (signé HMAC) : `create_draft` (jamais autre chose qu'un brouillon, complète un brouillon automatique ouvert), `update_status` (envoyee seulement si `valide_par` renseigné ; confirmee ; en_retard), `mark_reminder`. Codes : 401 signature, 400 données, 404 introuvable, 409 transition interdite.
- `callN8n()` (`src/lib/webhooks/n8n-client.ts`) signe les appels app → n8n avec `N8N_OUTBOUND_SECRET`.
- « Commander » : un brouillon par fournisseur et par pôle ; « Commander tous les produits en alerte » = produits **sous le seuil** (rouge). Quantité = réappro conseillé, sinon 2×seuil − stock.
- Statistiques fournisseur : délai réel = réception − envoi ; conforme = toutes lignes reçues = commandées.
- Liens stylés en bouton : `ButtonLink` (ne jamais imbriquer un `<Link>` dans un `<Button>`).
