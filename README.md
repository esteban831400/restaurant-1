# La Palmeraie — gestion interne

## Installation
1. `npm install --legacy-peer-deps`
2. Copier `.env.example` en `.env.local` et renseigner les valeurs.
3. Base de données locale : `npx supabase start`, puis `npx supabase db reset` (migrations + données de démo).
   Reporter l'URL et les clés affichées dans `.env.local`.
4. `npm run dev` puis ouvrir http://localhost:3000

## Comptes de démo (mot de passe `Palmeraie2025!`)
| Rôle | E-mail |
|---|---|
| Gérant | gerant@palmeraie.test |
| Responsable restaurant | resto.resp@palmeraie.test |
| Salarié restaurant | resto.sal@palmeraie.test |
| Responsable mini-golf | golf.resp@palmeraie.test |
| Salarié aquatique | aqua.sal@palmeraie.test |

## Qualité
`npm run lint && npm run typecheck && npm test && npm run build`

## Déploiement (Vercel)
Renseigner les variables de `.env.example` dans le projet Vercel. `vercel.json` planifie la purge quotidienne des appels.

Contrat avec n8n : voir `docs/n8n-contract.md` (rédigé à l'étape 5).
