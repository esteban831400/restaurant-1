-- Audit générique des actions sensibles
create or replace function log_audit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log(user_id, action, entite, entite_id, details)
  values (auth.uid(), tg_op, tg_table_name,
          coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, ''),
          case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end);
  return null;
end $$;
create trigger audit_profiles after insert or update or delete on profiles for each row execute function log_audit();
create trigger audit_commandes after update of statut on commandes for each row execute function log_audit();
create trigger audit_fournisseurs after delete on fournisseurs for each row execute function log_audit();
create trigger audit_produits after delete on produits for each row execute function log_audit();

-- Notification quand un produit passe sous le seuil
create or replace function notify_seuil() returns trigger language plpgsql security definer set search_path = public as $$
declare v v_stock_actuel%rowtype; avant numeric;
begin
  select * into v from v_stock_actuel where produit_id = new.produit_id;
  avant := v.stock_actuel - new.quantite;
  if v.seuil_min > 0 and v.stock_actuel < v.seuil_min and avant >= v.seuil_min then
    insert into notifications(pole_id, type, titre, corps, lien)
    values (v.pole_id, 'seuil', 'Produit sous le seuil', v.nom || ' : ' || v.stock_actuel || ' ' || v.unite, '/stocks/produits/' || v.produit_id);
  end if;
  return null;
end $$;
create trigger mouvements_notify after insert on mouvements_stock for each row execute function notify_seuil();

-- Réception de livraison : pointage ligne par ligne, mouvements d'entrée et statut, en une transaction
-- p_lignes : [{ "produit_id": "...", "qte_commandee": 10, "qte_recue": 8, "ecart_motif": "casse" }]
create or replace function recevoir_livraison(p_commande uuid, p_lignes jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare c commandes%rowtype; liv uuid; l jsonb; ecart boolean := false;
begin
  select * into c from commandes where id = p_commande for update;
  if not found then raise exception 'Commande introuvable'; end if;
  if not (est_gerant() or (auth_role() = 'responsable' and c.pole_id = auth_pole())) then
    raise exception 'Accès refusé';
  end if;
  if c.statut not in ('envoyee','confirmee','en_retard') then
    raise exception 'La commande n''est pas en attente de livraison';
  end if;
  insert into livraisons(commande_id, fournisseur_id, pole_id, statut, recu_le, recu_par)
  values (c.id, c.fournisseur_id, c.pole_id, 'validee', now(), auth.uid()) returning id into liv;
  for l in select * from jsonb_array_elements(p_lignes) loop
    insert into livraison_lignes(livraison_id, produit_id, qte_commandee, qte_recue, ecart_motif)
    values (liv, (l->>'produit_id')::uuid, (l->>'qte_commandee')::numeric, (l->>'qte_recue')::numeric, l->>'ecart_motif');
    if (l->>'qte_recue')::numeric > 0 then
      insert into mouvements_stock(produit_id, type, quantite, motif, commande_id, livraison_id, user_id)
      values ((l->>'produit_id')::uuid, 'entree', (l->>'qte_recue')::numeric, 'Livraison commande n°' || c.numero, c.id, liv, auth.uid());
    end if;
    if (l->>'qte_recue')::numeric <> (l->>'qte_commandee')::numeric then ecart := true; end if;
  end loop;
  update commandes set statut = 'livree' where id = c.id;
  if ecart then
    insert into notifications(pole_id, type, titre, corps, lien)
    values (c.pole_id, 'commande_a_valider', 'Écart de livraison', 'Commande n°' || c.numero || ' : quantités reçues différentes', '/commandes/' || c.id);
  end if;
  return liv;
end $$;

-- Validation d'inventaire : génère un mouvement de correction par écart
create or replace function valider_inventaire(p_inventaire uuid) returns void
language plpgsql security definer set search_path = public as $$
declare i inventaires%rowtype; r record;
begin
  select * into i from inventaires where id = p_inventaire for update;
  if not found or i.statut = 'valide' then raise exception 'Inventaire introuvable ou déjà validé'; end if;
  if not (est_gerant() or (auth_role() = 'responsable' and i.pole_id = auth_pole())) then raise exception 'Accès refusé'; end if;
  for r in select * from inventaire_lignes where inventaire_id = i.id and ecart <> 0 loop
    insert into mouvements_stock(produit_id, type, quantite, motif, inventaire_id, user_id)
    values (r.produit_id, 'correction', r.ecart, 'Inventaire du ' || to_char(i.created_at, 'DD/MM/YYYY'), i.id, auth.uid());
  end loop;
  update inventaires set statut = 'valide', valide_par = auth.uid() where id = i.id;
end $$;

-- Passe en retard les commandes dont la livraison prévue est dépassée (appelée par cron)
create or replace function marquer_commandes_en_retard() returns integer language sql security definer set search_path = public as $$
  with m as (update commandes set statut = 'en_retard'
             where statut in ('envoyee','confirmee') and date_livraison_prevue < current_date returning 1)
  select count(*)::int from m
$$;

-- Les 8 automatisations sont créées avec l'application (désactivées par défaut)
insert into poles(cle, nom, couleur) values
  ('restaurant','Restaurant','#EA580C'), ('minigolf','Mini-golf','#16A34A'), ('aquatique','Aires de jeux aquatiques','#0284C7');
insert into automatisations(cle, nom, description, parametres) values
  ('alerte_seuil','Alerte de seuil et commandes brouillon','Repère les produits sous le seuil et prépare des commandes brouillon à valider.','{"heure":"07:00","canal":"app"}'),
  ('envoi_commandes','Envoi des commandes aux fournisseurs','Envoie au fournisseur les commandes que vous avez validées.','{"canal":"app"}'),
  ('relances','Relances fournisseurs','Prépare une relance quand une livraison est en retard.','{"heure":"09:00","seuil_relance_jours":2,"canal":"app"}'),
  ('lecture_factures','Lecture des factures et bons de livraison','Lit les documents reçus et prépare les livraisons à vérifier.','{"canal":"app"}'),
  ('standard_ia','Standard téléphonique IA','Répond aux appels et enregistre le résumé dans le journal.','{}'),
  ('alertes_dlc','Alertes DLC','Prévient quand une date limite de consommation approche.','{"heure":"08:00","seuil_dlc_jours":3,"canal":"app"}'),
  ('rapport_hebdo','Rapport hebdomadaire','Envoie chaque semaine un résumé des stocks, commandes et appels.','{"heure":"08:00","canal":"mail"}'),
  ('assistant_ia','Assistant IA','Répond aux questions du gérant et des responsables depuis l''application.','{}');
insert into parametres(cle, valeur) values
  ('seuil_dlc_jours','3'), ('retention_appels_jours','90'),
  ('complexe','{"nom":"La Palmeraie","logo":null,"couleur_principale":"#15803D","couleur_secondaire":"#0891B2"}'),
  ('webhooks_n8n','{}'), ('horaires','{}'), ('fermetures','[]');
