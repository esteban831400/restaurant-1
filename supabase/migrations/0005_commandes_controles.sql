-- Garde-fou en base : seul le gérant peut faire passer une commande à « envoyée ».
-- (le service_role de n8n, où auth.uid() est nul, n'est pas concerné : l'API vérifie la validation du gérant)
create or replace function controle_commande() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not est_gerant() then
    if tg_op = 'INSERT' and new.statut not in ('brouillon','a_valider') then
      raise exception 'Une commande doit être créée en brouillon ou à valider';
    end if;
    if tg_op = 'UPDATE' and new.statut is distinct from old.statut and new.statut = 'envoyee' then
      raise exception 'Seul le gérant peut valider l''envoi d''une commande';
    end if;
  end if;
  return new;
end $$;
create trigger commandes_controle before insert or update on commandes for each row execute function controle_commande();

-- Total estimé toujours recalculé depuis les lignes
create or replace function recalculer_total_commande() returns trigger language plpgsql security definer set search_path = public as $$
declare cid uuid := coalesce(new.commande_id, old.commande_id);
begin
  update commandes set total_estime = (select coalesce(sum(quantite * prix_unitaire), 0) from commande_lignes where commande_id = cid) where id = cid;
  return null;
end $$;
create trigger commande_lignes_total after insert or update or delete on commande_lignes for each row execute function recalculer_total_commande();

-- Notification « commande à valider » quand un responsable soumet un brouillon
create or replace function notifier_commande_a_valider(p_commande uuid) returns void language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select cmd.id, cmd.numero, cmd.pole_id, f.nom as fournisseur into c
  from commandes cmd join fournisseurs f on f.id = cmd.fournisseur_id
  where cmd.id = p_commande and cmd.statut = 'a_valider' and peut_voir_pole(cmd.pole_id);
  if found then
    insert into notifications(pole_id, type, titre, corps, lien)
    values (c.pole_id, 'commande_a_valider', 'Commande à valider', 'Commande n°' || c.numero || ' — ' || c.fournisseur, '/commandes/' || c.id);
  end if;
end $$;
