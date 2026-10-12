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
- `supabase/migrations` schéma, RLS, fonctions · `supabase/seed.sql` données de démo · `docs/n8n-contract.md` contrat n8n (**à tenir à jour à chaque nouvelle route ou changement de format**)

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
- [x] Étape 4 : journal des appels IA (gérant), stats, webhook `calls`, purge RGPD
- [x] Étape 5 : automatisations (cartes, réglages, lancement, historique), centre « À valider », cloche Realtime, `docs/n8n-contract.md`
- [x] Étape 6 : assistant IA (chat, historique, `/api/assistant`)
- [x] Étape 7 : tableau de bord gérant
- [x] Étape 8 : paramètres (identité/thème, utilisateurs, horaires, adresses, journal, RGPD)
- [x] Étape 9 : ajout rapide (bouton + panneau latéral), palette Ctrl/⌘ K, raccourcis clavier, brouillons automatiques, cartes mobiles

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

## Journal des appels (étape 4)
- Page réservée au gérant (layout + RLS). Numéros stockés bruts, **toujours masqués à l'affichage** (`masquerNumero`, 4 premiers + 2 derniers chiffres).
- `/api/webhooks/n8n/calls` : idempotent si `external_id` fourni (rejeu = mise à jour, 200 ; création = 201). Un appel « message laissé » crée une notification pour le gérant.
- `/api/cron/purge` (GET ou POST, `Authorization: Bearer CRON_SECRET`, configuré dans `vercel.json`, 03:00 UTC) : supprime les appels plus vieux que `parametres.retention_appels_jours` (90 par défaut, réglable 7–3650 sur la page Appels), journalise dans `audit_log`, et en profite pour passer les commandes en retard (`marquer_commandes_en_retard`).
- Filtres par dates interprétés à l'heure de Paris (`bornePariseEnUtc`) ; statistiques calculées sur 7, 30 ou 90 jours (10 000 appels max).
- `log_audit()` gère aussi `parametres` (migration 0006) : tout changement de réglage est journalisé.
- Graphiques : une seule couleur (primaire) pour les séries uniques, couleurs de pôle pour le graphique par pôle (nom toujours sur l'axe), infobulle au survol, vue tableau sous chaque graphique.

## Automatisations, validation, notifications (étape 5)
- Le mot « n8n » n'apparaît **jamais** dans l'interface. Les adresses des webhooks sont lues côté serveur (`urlWebhook()` : variables d'environnement pour `envoi_commandes` et `assistant_ia`, sinon `parametres.webhooks_n8n` — saisie dans Paramètres, étape 8).
- Réglages par automatisation : `src/lib/automatisations/definitions.ts` (champs, schéma Zod strict, valeurs par défaut, testés). Le seuil DLC de l'automatisation `alertes_dlc` met aussi à jour `parametres.seuil_dlc_jours` (source unique, utilisée par la vue des stocks).
- « Lancer maintenant » : `POST /api/automations/[cle]/run` (gérant ; refusé si désactivée ou non branchée ; une exécution `en_cours` est créée puis clôturée par n8n via `executions` avec le même `execution_id`).
- n8n lit `actif` + réglages avec `GET /api/webhooks/n8n/automations/[cle]` (requête GET signée : corps vide) au début de chaque exécution.
- Centre « À valider » : commandes brouillon/à valider (un clic = `validerEtEnvoyer`), livraisons lues par l'IA (`valider_livraison` : entrées de stock + commande livrée), relances proposées (table `relances`, envoyées seulement après confirmation).
- Cloche : `notification-bell.tsx`, Supabase Realtime ; la RLS décide de ce que chacun reçoit (gérant : tout ce qui est « pour tous » ; responsable : celles de son pôle). Les notifications n'ont pas de policy d'insertion : elles sont créées par triggers SQL ou par le service_role (webhooks).
- Migration 0007 : `relances`, `valider_livraison`, policies de notifications, audit des automatisations.

## Assistant IA (étape 6)
- `POST /api/assistant` : identité et rôle lus depuis la session serveur (jamais du corps de requête) ; gérant et responsables seulement ; refusé (409) si l'automatisation `assistant_ia` est désactivée ; 20 questions / 10 min / utilisateur (429).
- Appel synchrone du webhook (`N8N_WEBHOOK_ASSISTANT`, 30 s) ; `maxDuration = 60`. La conversation (`conversations_assistant.messages`, 100 messages max) n'est enregistrée qu'en cas de réponse réussie ; chaque échange est aussi journalisé dans `actions_agent` (insertion via service_role).
- `lireReponseService()` tolère plusieurs formats de réponse (voir contrat §11, testé).
- L'assistant est désactivé par défaut : le gérant l'active dans Automatisations.

## Tableau de bord (étape 7)
- Données : `src/server/queries/dashboard.ts` (comptages `head` + 2 fonctions SQL de la migration 0008 : `valeur_stock_historique`, `top_consommation`, en `security invoker` donc filtrées par la RLS). Filtre pôle = paramètre `?pole=<id>` appliqué à tout (sauf les automatisations en échec, globales).
- Cartes : lien étiré sur toute la carte + action distincte au-dessus (pas de contrôle imbriqué). Validation en un clic : liste « Commandes à valider » avec `validerEtEnvoyer`.
- « À faire aujourd'hui » : `construireTaches()` (`src/lib/dashboard.ts`, testé). Les jours suivent l'heure de Paris (`aujourdhuiParis()`).
- Top consommation = sorties uniquement (pas les pertes/corrections), classé par valeur (€) pour comparer des unités différentes.
- `/commandes?attendues=1` : livraisons attendues aujourd'hui.

## Paramètres (étape 8)
- Réservé au gérant. Onglets : Général (nom/logo/couleurs, seuil DLC, conservation des appels), Utilisateurs, Horaires (+ saisons, fermetures), Adresses, Journal et données.
- **Thème dynamique** : `parametres.complexe` → `cssTheme()` (`src/lib/theme.ts`) injecté dans le `<head>` du layout racine (`force-dynamic`). Une couleur de marque doit avoir un contraste ≥ 4,5:1 avec le blanc (sinon refusée, et `cssTheme` ne produit rien : aucune injection CSS possible). Mode sombre : couleur éclaircie automatiquement. Le logo est envoyé dans le bucket Storage `public-assets` (gérant seul en écriture, PNG/JPEG/WebP ≤ 1 Mo) ; l'action n'accepte que des URL de ce bucket. La ligne `complexe` est lisible sans connexion (policy), le reste des paramètres exige d'être connecté.
- **Utilisateurs** : invitation par e-mail (`inviteUserByEmail`, lien vers `/reinitialiser`) + création du profil ; garde-fous testés (`verifierModification`/`verifierSuppression`) : on ne se retire pas ses droits, on ne supprime pas le dernier gérant. Désactiver un compte coupe l'accès immédiatement (garde serveur + fonctions RLS).
- **RGPD** : `GET /api/rgpd/export?user=` (gérant : tout le monde ; sinon soi-même ; journalisé) ; suppression = `auth.admin.deleteUser` (cascade profil/conversations/notifications), historique métier conservé anonymisé (FK `on delete set null`, migration 0009), `audit_log` anonymisé + entrée `RGPD_SUPPRESSION`.
- **Adresses des automatisations** : `urlWebhookAutorisee()` refuse http en production, localhost, IP privées, `*.internal/*.local` et les identifiants dans l'URL (anti-SSRF ; le contrôle est refait à chaque appel). Limite connue : pas de protection contre le DNS rebinding. Les secrets ne passent jamais par l'interface (seul leur état « configuré / manquant » est affiché).
- Horaires : `horairesDuJour()` (testé) calcule saison + fermetures ; exposé à n8n par `GET /api/webhooks/n8n/horaires`.

## Raccourcis et ajouts rapides (étape 9)
- `OutilsProvider` (`src/components/ajout-rapide/contexte.tsx`) dans le layout `(app)` : utilisateur, panneau d'ajout (`Drawer` basé sur `<dialog>`), palette (`Palette`), aide (`?`) et `Raccourcis` (touches). Les formulaires existants (produit, fournisseur, commande, réception, mouvement) sont **réutilisés** tels quels dans le panneau via la prop `onTermine`.
- Logique pure et testée : `src/lib/raccourcis.ts` (entrées de palette par rôle, recherche sans accents, touches N / G+S|C|A), `src/lib/brouillon.ts` (brouillons et dernier fournisseur).
- Les données des formulaires du panneau sont chargées à l'ouverture (`src/server/actions/ajout-rapide.ts`) ; `rechercheGlobale` (produits, fournisseurs, commandes) respecte la RLS et le rôle.
- **Brouillons de formulaire** : localStorage, propres à chaque utilisateur, expirés à 7 jours, **effacés à la déconnexion** (appareils partagés). `[data-search]` marque le champ ciblé par la touche `/`.
- Sur téléphone, le catalogue des stocks s'affiche en cartes (boutons Entrée / Sortie / Commander pleine largeur) ; le bouton flottant est masqué pendant le comptage d'inventaire.

## Pièges rencontrés (à ne pas reproduire)
- **Jamais de fonction fléchée en prop d'un composant client depuis une page serveur** : seule une référence d'action serveur peut passer. `ActionButton` reçoit donc `action={validerEtEnvoyer} argument={id}`.
- Les variables `NEXT_PUBLIC_*` sont inlinées au build : build sans elles = écran d'erreur dans le navigateur.
- `<dialog>` doit avoir un nom accessible (`aria-labelledby` dans `Modal`, `aria-label` dans `Drawer`).
- Ne pas lancer `next dev` entre un `next build` et un `next start` (le dev écrase `.next`).

## Vérification réalisée
Tests unitaires (130) + parcours navigateur (Chromium/Playwright) contre un **faux Supabase** : 21 pages sans plantage, palette, raccourcis, panneaux, brouillons, cloche, mobile. Le SQL (migrations 0001–0009, seed) n'a, lui, **jamais été exécuté sur un vrai Postgres** : premier `supabase db reset` = premier test réel.
