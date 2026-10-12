-- La Palmeraie — schéma principal
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

create type role_app as enum ('gerant', 'responsable', 'salarie');
create type statut_commande as enum ('brouillon','a_valider','envoyee','confirmee','livree','cloturee','annulee','en_retard');
create type type_mouvement as enum ('entree','sortie','perte','correction');
create type issue_appel as enum ('renseigne','transfere','message_laisse','reservation');

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table poles (
  id uuid primary key default gen_random_uuid(),
  cle text not null unique check (cle in ('restaurant','minigolf','aquatique')),
  nom text not null,
  couleur text not null
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nom_complet text not null default '',
  role role_app not null default 'salarie',
  pole_id uuid references poles(id),
  actif boolean not null default true,
  saisonnier boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (role = 'gerant' or pole_id is not null)
);

create table fournisseurs (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  contact text, email text, telephone text,
  mode_commande text not null default 'mail' check (mode_commande in ('mail','telephone','portail')),
  jours_commande smallint[] not null default '{}',   -- 1 = lundi … 7 = dimanche
  jours_livraison smallint[] not null default '{}',
  delai_jours smallint not null default 2 check (delai_jours >= 0),
  minimum_commande numeric(10,2) not null default 0,
  pole_id uuid references poles(id),                 -- null = commun à tous les pôles
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table produits (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  categorie text,
  unite text not null check (unite in ('kg','L','piece')),
  lieu_stockage text,
  fournisseur_id uuid references fournisseurs(id) on delete set null,
  pole_id uuid not null references poles(id),
  prix_achat numeric(10,4) not null default 0 check (prix_achat >= 0),
  seuil_min numeric(12,3) not null default 0 check (seuil_min >= 0),
  qte_reappro numeric(12,3) not null default 0 check (qte_reappro >= 0),
  dlc_suivie boolean not null default false,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index produits_pole_idx on produits(pole_id);
create index produits_fournisseur_idx on produits(fournisseur_id);
create index produits_nom_trgm on produits using gin (nom gin_trgm_ops);

create table commandes (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  fournisseur_id uuid not null references fournisseurs(id),
  pole_id uuid not null references poles(id),
  statut statut_commande not null default 'brouillon',
  source text not null default 'manuelle' check (source in ('manuelle','automatique','assistant')),
  date_envoi timestamptz,
  date_livraison_prevue date,
  derniere_relance timestamptz,
  total_estime numeric(12,2) not null default 0,
  cree_par uuid references profiles(id),
  valide_par uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index commandes_statut_idx on commandes(pole_id, statut);
create index commandes_fournisseur_idx on commandes(fournisseur_id, created_at desc);
create index commandes_livraison_idx on commandes(date_livraison_prevue);

create table commande_lignes (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references commandes(id) on delete cascade,
  produit_id uuid not null references produits(id),
  quantite numeric(12,3) not null check (quantite > 0),
  prix_unitaire numeric(10,4) not null default 0
);
create index commande_lignes_commande_idx on commande_lignes(commande_id);

create table livraisons (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid references commandes(id) on delete set null,
  fournisseur_id uuid references fournisseurs(id),
  fournisseur_nom text,
  pole_id uuid not null references poles(id),
  statut text not null default 'a_verifier' check (statut in ('a_verifier','validee')),
  donnees_extraites jsonb,
  fichier_url text,
  recu_le timestamptz,
  recu_par uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index livraisons_statut_idx on livraisons(statut);

create table livraison_lignes (
  id uuid primary key default gen_random_uuid(),
  livraison_id uuid not null references livraisons(id) on delete cascade,
  produit_id uuid not null references produits(id),
  qte_commandee numeric(12,3) not null default 0,
  qte_recue numeric(12,3) not null default 0 check (qte_recue >= 0),
  ecart_motif text
);

create table inventaires (
  id uuid primary key default gen_random_uuid(),
  pole_id uuid not null references poles(id),
  statut text not null default 'en_cours' check (statut in ('en_cours','a_valider','valide')),
  cree_par uuid references profiles(id),
  valide_par uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table inventaire_lignes (
  inventaire_id uuid not null references inventaires(id) on delete cascade,
  produit_id uuid not null references produits(id),
  qte_theorique numeric(12,3) not null,
  qte_comptee numeric(12,3) not null check (qte_comptee >= 0),
  ecart numeric(12,3) generated always as (qte_comptee - qte_theorique) stored,
  primary key (inventaire_id, produit_id)
);

-- Le stock n'est JAMAIS stocké : il est la somme des mouvements (quantité signée).
create table mouvements_stock (
  id uuid primary key default gen_random_uuid(),
  produit_id uuid not null references produits(id),
  type type_mouvement not null,
  quantite numeric(12,3) not null check (quantite <> 0),
  motif text,
  commande_id uuid references commandes(id),
  livraison_id uuid references livraisons(id),
  inventaire_id uuid references inventaires(id),
  user_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  check (type <> 'entree' or quantite > 0),
  check (type not in ('sortie','perte') or quantite < 0)
);
create index mouvements_produit_idx on mouvements_stock(produit_id, created_at desc);
create index mouvements_date_idx on mouvements_stock(created_at desc);

create table lots (
  id uuid primary key default gen_random_uuid(),
  produit_id uuid not null references produits(id) on delete cascade,
  dlc date not null,
  quantite numeric(12,3) not null check (quantite >= 0),
  mouvement_id uuid references mouvements_stock(id) on delete set null,
  created_at timestamptz not null default now()
);
create index lots_dlc_idx on lots(dlc) where quantite > 0;

-- Futur décrément via la caisse : désactivé par défaut.
create table recettes (
  id uuid primary key default gen_random_uuid(),
  plat text not null,
  pole_id uuid not null references poles(id),
  actif boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table recette_ingredients (
  recette_id uuid not null references recettes(id) on delete cascade,
  produit_id uuid not null references produits(id),
  quantite numeric(12,3) not null check (quantite > 0),
  primary key (recette_id, produit_id)
);

create table appels_ia (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  date_appel timestamptz not null,
  numero text,                                       -- stocké tel quel, masqué à l'affichage
  duree_secondes integer not null default 0 check (duree_secondes >= 0),
  pole text check (pole in ('restaurant','minigolf','aquatique')),
  issue issue_appel not null,
  resume text,
  transcription text,
  created_at timestamptz not null default now()
);
create index appels_date_idx on appels_ia(date_appel desc);
create index appels_filtre_idx on appels_ia(pole, issue);

create table automatisations (
  cle text primary key,
  nom text not null,
  description text not null,
  actif boolean not null default false,
  parametres jsonb not null default '{}',
  derniere_execution timestamptz,
  dernier_statut text check (dernier_statut in ('succes','echec','en_cours')),
  updated_at timestamptz not null default now()
);

create table executions_automatisations (
  id uuid primary key default gen_random_uuid(),
  automatisation_cle text not null references automatisations(cle) on delete cascade,
  debut timestamptz not null default now(),
  fin timestamptz,
  statut text not null check (statut in ('succes','echec','en_cours')),
  resume text,
  erreur text,
  declenche_par text not null default 'planifie' check (declenche_par in ('planifie','manuel'))
);
create index executions_cle_idx on executions_automatisations(automatisation_cle, debut desc);

create table actions_agent (
  id uuid primary key default gen_random_uuid(),
  date timestamptz not null default now(),
  user_id uuid references profiles(id) on delete set null,
  demande text not null,
  reponse text,
  outils_utilises jsonb not null default '[]'
);

create table conversations_assistant (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  titre text not null default 'Nouvelle conversation',
  messages jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_user_idx on conversations_assistant(user_id, updated_at desc);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,  -- null = tous les gérants
  pole_id uuid references poles(id),
  type text not null check (type in ('commande_a_valider','seuil','dlc','echec_automatisation','message_standard')),
  titre text not null,
  corps text,
  lien text,
  lue boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, lue, created_at desc);

create table parametres (
  cle text primary key,
  valeur jsonb not null,
  updated_at timestamptz not null default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  action text not null,
  entite text not null,
  entite_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index audit_date_idx on audit_log(created_at desc);

create view v_stock_actuel with (security_invoker = true) as
select p.id as produit_id, p.nom, p.unite, p.fournisseur_id, p.prix_achat,
       p.seuil_min, p.qte_reappro, p.pole_id,
       coalesce(sum(m.quantite), 0)::numeric(12,3) as stock_actuel
from produits p
left join mouvements_stock m on m.produit_id = p.id
group by p.id;

do $$
declare t text;
begin
  foreach t in array array['profiles','fournisseurs','produits','commandes','livraisons','inventaires',
                           'recettes','automatisations','conversations_assistant','parametres'] loop
    execute format('create trigger %I_updated before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

alter publication supabase_realtime add table notifications;
