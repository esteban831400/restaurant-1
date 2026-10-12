# Contrat d'interface application ↔ n8n

Ce document décrit **tous** les échanges entre l'application La Palmeraie et les workflows n8n. Le client ne voit jamais n8n : tout est piloté depuis l'application. Les textes de l'interface n'emploient pas le mot « n8n ».

- **URL de base de l'application** : `https://<domaine-de-l-app>` (notée `APP_URL` ci-dessous).
- Format : JSON UTF-8, `Content-Type: application/json`. Dates au format ISO 8601 avec fuseau (`2025-07-10T08:30:00+02:00`). Identifiants : UUID.
- Les noms de champs sont en français et en minuscules avec `_`.

## 1. Sécurité : signature des requêtes

Deux secrets distincts, **uniquement en variables d'environnement** (jamais en base, jamais côté navigateur) :

| Sens | Variable côté application | Utilisation |
|---|---|---|
| n8n → application | `N8N_WEBHOOK_SECRET` (≥ 16 caractères) | n8n signe, l'application vérifie |
| application → n8n | `N8N_OUTBOUND_SECRET` (≥ 16 caractères) | l'application signe, n8n vérifie |

En-têtes obligatoires, dans les deux sens :

| En-tête | Valeur |
|---|---|
| `X-Palmeraie-Timestamp` | secondes Unix (ex. `1752139800`) |
| `X-Palmeraie-Signature` | hexadécimal minuscule de `HMAC_SHA256(secret, timestamp + "." + corps_brut)` |

- `corps_brut` est exactement la chaîne envoyée (octet pour octet). Pour une requête **GET**, le corps est la chaîne vide : on signe `timestamp + "."`.
- Tolérance d'horloge : **± 5 minutes** (anti-rejeu). Au-delà : `401 signature_expired`.
- La comparaison côté application est à temps constant.

Exemple (nœud *Code* n8n) :

```js
const crypto = require('crypto');
const corps = JSON.stringify($json.payload);             // la chaîne exacte qui sera envoyée
const ts = String(Math.floor(Date.now() / 1000));
const signature = crypto.createHmac('sha256', $env.PALMERAIE_WEBHOOK_SECRET).update(`${ts}.${corps}`).digest('hex');
return [{ json: { corps, headers: { 'Content-Type': 'application/json', 'X-Palmeraie-Timestamp': ts, 'X-Palmeraie-Signature': signature } } }];
```

Exemple `curl` :

```bash
BODY='{"automatisation_cle":"alerte_seuil","statut":"succes","resume":"2 brouillons créés"}'
TS=$(date +%s)
SIG=$(printf '%s' "$TS.$BODY" | openssl dgst -sha256 -hmac "$N8N_WEBHOOK_SECRET" | awk '{print $2}')
curl -X POST "$APP_URL/api/webhooks/n8n/executions" -H "Content-Type: application/json" \
  -H "X-Palmeraie-Timestamp: $TS" -H "X-Palmeraie-Signature: $SIG" -d "$BODY"
```

## 2. Codes d'erreur communs (routes n8n → application)

Réponse d'erreur : `{ "error": "<code>", "message": "<texte en français>", "details": [...] }` (`details` seulement pour `donnees_invalides`).

| HTTP | `error` | Cause |
|---|---|---|
| 401 | `signature_missing` | en-têtes absents |
| 401 | `signature_expired` | horodatage hors de ± 5 min |
| 401 | `signature_invalid` | signature incorrecte |
| 400 | `json_invalide` | corps non JSON |
| 400 | `donnees_invalides` | champs manquants ou hors format (`details[].chemin` / `message`) |
| 404 | `commande_introuvable`, `produit_introuvable`, `execution_introuvable`, `automatisation_inconnue` | référence inconnue |
| 409 | `transition_interdite`, `non_validee` | règle métier (voir `orders`) |
| 500 | `erreur_interne` | erreur côté application : réessayer plus tard |

Politique de réessai conseillée : réessayer uniquement les 5xx et les erreurs réseau (3 essais, délai exponentiel). Ne jamais réessayer un 4xx sans corriger la requête. Les routes `calls` (avec `external_id`) et `orders/update_status` sont idempotentes.

## 3. Règle fondamentale : activation et réglages

> **Une automatisation désactivée ne fait rien.**

Au début de **chaque** exécution (planifiée ou manuelle), le workflow lit l'état de l'automatisation et s'arrête si `actif` vaut `false`.

### `GET {APP_URL}/api/webhooks/n8n/automations/{cle}`

Clés : `alerte_seuil`, `envoi_commandes`, `relances`, `lecture_factures`, `standard_ia`, `alertes_dlc`, `rapport_hebdo`, `assistant_ia`. Requête signée (corps vide).

Réponse `200` :

```json
{ "cle": "relances", "actif": true,
  "parametres": { "heure": "09:00", "seuil_relance_jours": 2, "canal": "app", "destinataires": ["gerant@exemple.fr"] } }
```

Champs de `parametres` selon l'automatisation (les valeurs absentes sont complétées par les valeurs par défaut) :

| Clé | Champs |
|---|---|
| `alerte_seuil` | `heure` (`HH:MM`), `canal`, `destinataires` |
| `envoi_commandes` | `canal`, `destinataires` |
| `relances` | `heure`, `seuil_relance_jours` (1–30), `canal`, `destinataires` |
| `lecture_factures` | `canal`, `destinataires` |
| `standard_ia` | `canal`, `destinataires` |
| `alertes_dlc` | `heure`, `seuil_dlc_jours` (1–30), `canal`, `destinataires` (+ `seuil_dlc_jours_global` dans la réponse) |
| `rapport_hebdo` | `jour_semaine` (1 = lundi … 7 = dimanche), `heure`, `canal`, `destinataires` |
| `assistant_ia` | aucun |

`canal` ∈ `app` (cloche de l'application), `mail`, `telegram`. `destinataires` : adresses e-mail (canal `mail`) ou identifiants Telegram. L'envoi des e-mails et messages Telegram est fait **par n8n** ; l'application ne fait que stocker ces préférences.

Les planifications (heure/jour) sont lues par n8n ; l'application ne déclenche que les lancements manuels.

## 4. Enregistrer les exécutions

### `POST {APP_URL}/api/webhooks/n8n/executions`

À appeler au début (statut `en_cours`) puis à la fin (`succes` / `echec`) de chaque exécution, **y compris les erreurs**. Alimente l'historique, la carte « dernière exécution » et la cloche (une notification est créée sur `echec`).

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `automatisation_cle` | string | oui | une des 8 clés |
| `statut` | `en_cours` \| `succes` \| `echec` | oui | |
| `execution_id` | uuid | non | pour **mettre à jour** une exécution existante (obligatoire en pratique pour les lancements manuels : l'identifiant est fourni par l'application, voir §6) |
| `debut` / `fin` | date-heure | non | par défaut : maintenant |
| `resume` | string ≤ 2000 | non | ex. « 2 commandes brouillon créées » |
| `erreur` | string ≤ 5000 | non | message lisible, sans secret |
| `declenche_par` | `planifie` \| `manuel` | non | défaut `planifie` (ignoré en mise à jour) |

Réponses : `201 { "execution_id": "<uuid>" }` (création) ou `200 { "execution_id": "<uuid>" }` (mise à jour). Erreur propre : `404 execution_introuvable` si `execution_id` n'existe pas pour cette automatisation.

Séquence recommandée pour une exécution planifiée : `GET automations/{cle}` → si inactif, **stop** (rien n'est enregistré) → `POST executions` (`en_cours`, mémoriser l'`execution_id` reçu) → travail → `POST executions` (`succes` ou `echec`, avec `execution_id`).

## 5. Commandes

### `POST {APP_URL}/api/webhooks/n8n/orders`

Le champ `action` choisit l'opération.

**`create_draft`** — crée un brouillon (jamais autre chose). Si un brouillon du même `source` existe déjà pour ce fournisseur et ce pôle, les produits manquants y sont ajoutés. Les prix viennent de la base.

```json
{ "action": "create_draft", "fournisseur_id": "<uuid>", "pole_id": "<uuid>", "source": "automatique",
  "date_livraison_prevue": "2025-07-12",
  "lignes": [ { "produit_id": "<uuid>", "quantite": 20 } ] }
```
`source` : `automatique` (défaut) ou `assistant`. `lignes` : 1 à 200, produits du pôle indiqué. Réponse `201 { "commande_id", "cree": true, "lignes_ajoutees": 3 }` (ou `200` avec `cree: false` si complété). Une notification « Commande brouillon à valider » est créée. **Aucun envoi n'a lieu** : le gérant doit valider (page « À valider »).

**`update_status`** — `{ "action": "update_status", "commande_id": "<uuid>", "statut": "envoyee|confirmee|en_retard", "date_livraison_prevue": "2025-07-12" }`

| Vers | Autorisé depuis | Condition |
|---|---|---|
| `envoyee` | `brouillon`, `a_valider` | la commande doit avoir été **validée par le gérant** (sinon `409 non_validee`) |
| `confirmee` | `envoyee`, `en_retard` | |
| `en_retard` | `envoyee`, `confirmee` | |

Toute autre transition → `409 transition_interdite`. Même statut → `200 { "inchange": true }`. n8n ne peut jamais poser `livree` ni `cloturee` (la réception se fait dans l'application ou via `deliveries`).

**`mark_reminder`** — `{ "action": "mark_reminder", "commande_id": "<uuid>" }` : enregistre une relance envoyée (`derniere_relance` = maintenant).

**`propose_reminder`** — `{ "action": "propose_reminder", "commande_id": "<uuid>", "message": "Bonjour, …" }` : dépose une relance **à confirmer** par le gérant (page « À valider »). `201 { "relance_id", "cree": true }` ; `200 { "cree": false }` s'il en existe déjà une en attente pour cette commande. Rien n'est envoyé au fournisseur avant confirmation : l'application appelle alors le webhook de l'automatisation `relances` (voir §7).

## 6. Appels du standard IA

### `POST {APP_URL}/api/webhooks/n8n/calls`

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `external_id` | string ≤ 100 | recommandé | identifiant de l'appel côté standard : rend la route **idempotente** |
| `date_appel` | date-heure | oui | |
| `numero` | string ≤ 30 | non | stocké tel quel, **toujours masqué à l'affichage** |
| `duree_secondes` | entier 0–36000 | oui | |
| `pole` | `restaurant` \| `minigolf` \| `aquatique` \| null | non | pôle demandé |
| `issue` | `renseigne` \| `transfere` \| `message_laisse` \| `reservation` | oui | |
| `resume` | string ≤ 2000 | non | |
| `transcription` | string ≤ 100000 | non | un échange par ligne (« IA : … » / « Client : … ») |

Réponses : `201 { "id", "cree": true }` ; `200 { "id", "cree": false }` si `external_id` déjà connu (mise à jour). Un appel `message_laisse` crée une notification pour le gérant. Les appels sont supprimés automatiquement après la durée de conservation réglée dans l'application (90 jours par défaut).

## 7. Livraisons lues par l'IA

### `POST {APP_URL}/api/webhooks/n8n/deliveries`

Dépose une facture ou un bon de livraison lu par l'IA. La livraison reste **« à vérifier »** : le gérant la valide dans « À valider » (cela crée les entrées de stock).

```json
{ "pole_id": "<uuid>", "fournisseur_id": "<uuid>", "fournisseur_nom": "Primeurs du Sud",
  "commande_id": "<uuid>", "fichier_url": "https://…/bl-0412.pdf",
  "donnees_extraites": { "numero_bl": "BL-2025-0412", "lignes": [ { "produit": "Tomates", "quantite": 30 } ] },
  "lignes": [ { "produit_id": "<uuid>", "qte_commandee": 30, "qte_recue": 30 } ] }
```
`pole_id`, `fournisseur_nom`, `donnees_extraites` (objet libre) obligatoires ; le reste optionnel. `lignes` = lignes **rapprochées** d'un produit du pôle (sans lignes, la livraison ne peut pas être validée automatiquement). Réponse `201 { "livraison_id" }`. Produit inconnu ou d'un autre pôle → `404 produit_introuvable` avec `details.produit_ids`.

## 8. Notifications dans l'application

### `POST {APP_URL}/api/webhooks/n8n/notifications`

```json
{ "type": "dlc", "titre": "DLC proche : Mozzarella", "corps": "2 lots expirent dans 2 jours", "lien": "/stocks/produits/<uuid>", "pole_id": "<uuid>" }
```
`type` ∈ `commande_a_valider`, `seuil`, `dlc`, `echec_automatisation`, `message_standard`. `lien` : chemin interne commençant par `/` (sinon `400`). Sans `pole_id`, seul le gérant la voit ; avec `pole_id`, le gérant et le responsable de ce pôle. Réponse `201 { "notification_id" }`. Les notifications apparaissent en temps réel dans la cloche.

## 9. Appels de l'application vers n8n

L'application appelle des webhooks n8n **signés** (en-têtes du §1, secret `N8N_OUTBOUND_SECRET`). Réponse attendue : **n'importe quel `2xx`** (le travail peut se poursuivre en arrière-plan). Délai maximum d'attente : 15 s (sauf assistant). Tout autre résultat est traité comme un échec.

| Déclencheur | Adresse | Corps |
|---|---|---|
| Bouton **Valider et envoyer** (gérant) | variable `N8N_WEBHOOK_ORDER_SEND` | `{ "commande_id": "<uuid>" }` |
| Bouton **Lancer maintenant** | adresse de l'automatisation (Paramètres → adresses des automatisations ; `N8N_WEBHOOK_ORDER_SEND` pour `envoi_commandes`, `N8N_WEBHOOK_ASSISTANT` pour `assistant_ia`) | `{ "automation": "<cle>", "execution_id": "<uuid>", "declenche_par": "manuel", "demande_par": "<uuid>" }` |
| **Confirmer et envoyer** une relance | adresse de l'automatisation `relances` | `{ "type": "send_reminder", "relance_id": "<uuid>", "commande_id": "<uuid>", "message": "…" }` |
| Question à l'assistant | `N8N_WEBHOOK_ASSISTANT` | défini avec l'étape « Assistant IA » (section ajoutée dans ce document) |

Précisions :

- **Valider et envoyer** : la commande passe à `envoyee` dès que n8n répond `2xx`. Le workflow envoie ensuite le mail/appel au fournisseur (selon `mode_commande`), puis peut appeler `orders/update_status` (`confirmee`).
- **Lancer maintenant** : l'application a déjà créé l'exécution (`en_cours`). Le workflow la clôture avec `POST executions` en renvoyant le même `execution_id`. Si le webhook répond autre chose que `2xx` (ou ne répond pas), l'application marque l'exécution en `echec` et prévient le gérant. Une exécution `en_cours` de plus de 2 minutes n'empêche plus un nouveau lancement.
- Un lancement manuel d'une automatisation **désactivée** est refusé par l'application avant tout appel.

## 10. Tâche planifiée de l'application (hors n8n)

`GET|POST {APP_URL}/api/cron/purge` avec `Authorization: Bearer <CRON_SECRET>` (Vercel Cron, quotidien) : supprime les appels au-delà de la durée de conservation et passe en `en_retard` les commandes dont la livraison prévue est dépassée. Non destiné à n8n.
