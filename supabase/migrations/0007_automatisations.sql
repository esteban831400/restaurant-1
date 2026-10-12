-- Relances fournisseurs proposées par les automatisations, à confirmer par le gérant
create table relances (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references commandes(id) on delete cascade,
  message text not null,
  statut text not null default 'a_confirmer' check (statut in ('a_confirmer','envoyee','rejetee')),
  created_at timestamptz not null default now(),
  traite_par uuid references profiles(id),
  traite_le timestamptz
);
create index relances_statut_idx on relances(statut, created_at desc);
alter table relances enable row level security;
create policy relances_gerant on relances for all using (est_gerant()) with check (est_gerant());

-- Validation d'une livraison extraite par l'IA : entrées de stock + commande livrée, en une transaction
create or replace function valider_livraison(p_livraison uuid) returns void
language plpgsql security definer set search_path = public as $$
declare l livraisons%rowtype; r record;
begin
  if not est_gerant() then raise exception 'Accès refusé'; end if;
  select * into l from livraisons where id = p_livraison for update;
  if not found or l.statut <> 'a_verifier' then raise exception 'Livraison introuvable ou déjà validée'; end if;
  if not exists (select 1 from livraison_lignes where livraison_id = l.id) then
    raise exception 'Aucune ligne rapprochée : complétez la livraison avant de la valider';
  end if;
  for r in select * from livraison_lignes where livraison_id = l.id and qte_recue > 0 loop
    insert into mouvements_stock(produit_id, type, quantite, motif, commande_id, livraison_id, user_id)
    values (r.produit_id, 'entree', r.qte_recue, 'Livraison ' || coalesce(l.fournisseur_nom, 'fournisseur'), l.commande_id, l.id, auth.uid());
  end loop;
  update livraisons set statut = 'validee', recu_le = now(), recu_par = auth.uid() where id = l.id;
  if l.commande_id is not null then
    update commandes set statut = 'livree' where id = l.commande_id and statut in ('envoyee','confirmee','en_retard');
  end if;
end $$;

-- Notifications : le gérant voit celles « pour tous » ; un responsable voit celles de son pôle
drop policy notifications_read on notifications;
drop policy notifications_update on notifications;
create policy notifications_read on notifications for select using (
  user_id = auth.uid()
  or (user_id is null and (est_gerant() or (auth_role() = 'responsable' and pole_id = auth_pole())))
);
create policy notifications_update on notifications for update using (
  user_id = auth.uid()
  or (user_id is null and (est_gerant() or (auth_role() = 'responsable' and pole_id = auth_pole())))
);

-- Activer / désactiver / régler une automatisation est journalisé (pas les mises à jour de statut d'exécution)
create trigger audit_automatisations after update of actif, parametres on automatisations for each row execute function log_audit();
