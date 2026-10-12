-- Fonctions d'aide (security definer : évitent la récursion RLS sur profiles)
create or replace function auth_role() returns role_app language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() and actif $$;
create or replace function auth_pole() returns uuid language sql stable security definer set search_path = public as
$$ select pole_id from profiles where id = auth.uid() and actif $$;
create or replace function est_gerant() returns boolean language sql stable as $$ select auth_role() = 'gerant' $$;
create or replace function est_responsable() returns boolean language sql stable as $$ select auth_role() in ('gerant','responsable') $$;
create or replace function peut_voir_pole(p uuid) returns boolean language sql stable as
$$ select est_gerant() or (auth_role() is not null and p = auth_pole()) $$;

do $$
declare t text;
begin
  foreach t in array array['poles','profiles','fournisseurs','produits','commandes','commande_lignes','livraisons',
    'livraison_lignes','inventaires','inventaire_lignes','mouvements_stock','lots','recettes','recette_ingredients',
    'appels_ia','automatisations','executions_automatisations','actions_agent','conversations_assistant',
    'notifications','parametres','audit_log'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- poles / parametres : lecture pour tout utilisateur connecté, écriture gérant
create policy poles_read on poles for select using (auth_role() is not null);
create policy poles_write on poles for all using (est_gerant()) with check (est_gerant());
create policy parametres_read on parametres for select using (auth_role() is not null);
create policy parametres_write on parametres for all using (est_gerant()) with check (est_gerant());

-- profiles : chacun voit le sien, le gérant voit et gère tout
create policy profiles_read on profiles for select using (id = auth.uid() or est_gerant());
create policy profiles_write on profiles for all using (est_gerant()) with check (est_gerant());

-- fournisseurs
create policy fournisseurs_read on fournisseurs for select using (pole_id is null and auth_role() is not null or peut_voir_pole(pole_id));
create policy fournisseurs_write on fournisseurs for all
  using (est_gerant() or (auth_role() = 'responsable' and pole_id = auth_pole()))
  with check (est_gerant() or (auth_role() = 'responsable' and pole_id = auth_pole()));

-- produits
create policy produits_read on produits for select using (peut_voir_pole(pole_id));
create policy produits_write on produits for all
  using (est_gerant() or (auth_role() = 'responsable' and pole_id = auth_pole()))
  with check (est_gerant() or (auth_role() = 'responsable' and pole_id = auth_pole()));

-- commandes et lignes
create policy commandes_read on commandes for select using (peut_voir_pole(pole_id));
create policy commandes_write on commandes for all
  using (est_gerant() or (auth_role() = 'responsable' and pole_id = auth_pole()))
  with check (est_gerant() or (auth_role() = 'responsable' and pole_id = auth_pole()));
create policy commande_lignes_read on commande_lignes for select
  using (exists (select 1 from commandes c where c.id = commande_id and peut_voir_pole(c.pole_id)));
create policy commande_lignes_write on commande_lignes for all
  using (exists (select 1 from commandes c where c.id = commande_id and (est_gerant() or (auth_role() = 'responsable' and c.pole_id = auth_pole()))))
  with check (exists (select 1 from commandes c where c.id = commande_id and (est_gerant() or (auth_role() = 'responsable' and c.pole_id = auth_pole()))));

-- livraisons et lignes
create policy livraisons_read on livraisons for select using (peut_voir_pole(pole_id));
create policy livraisons_write on livraisons for all
  using (est_gerant() or (auth_role() = 'responsable' and pole_id = auth_pole()))
  with check (est_gerant() or (auth_role() = 'responsable' and pole_id = auth_pole()));
create policy livraison_lignes_read on livraison_lignes for select
  using (exists (select 1 from livraisons l where l.id = livraison_id and peut_voir_pole(l.pole_id)));
create policy livraison_lignes_write on livraison_lignes for all
  using (exists (select 1 from livraisons l where l.id = livraison_id and (est_gerant() or (auth_role() = 'responsable' and l.pole_id = auth_pole()))))
  with check (exists (select 1 from livraisons l where l.id = livraison_id and (est_gerant() or (auth_role() = 'responsable' and l.pole_id = auth_pole()))));

-- mouvements : tout rôle de son pôle peut saisir ; jamais de modification ni suppression
create policy mouvements_read on mouvements_stock for select
  using (exists (select 1 from produits p where p.id = produit_id and peut_voir_pole(p.pole_id)));
create policy mouvements_insert on mouvements_stock for insert
  with check (user_id = auth.uid() and exists (select 1 from produits p where p.id = produit_id and peut_voir_pole(p.pole_id)));

create policy lots_read on lots for select
  using (exists (select 1 from produits p where p.id = produit_id and peut_voir_pole(p.pole_id)));
create policy lots_insert on lots for insert
  with check (exists (select 1 from produits p where p.id = produit_id and peut_voir_pole(p.pole_id)));
create policy lots_update on lots for update using (est_responsable() and exists (select 1 from produits p where p.id = produit_id and peut_voir_pole(p.pole_id)));

-- inventaires : saisie par tous (leur pôle), validation par responsable
create policy inventaires_read on inventaires for select using (peut_voir_pole(pole_id));
create policy inventaires_insert on inventaires for insert with check (peut_voir_pole(pole_id) and cree_par = auth.uid());
create policy inventaires_update on inventaires for update using (peut_voir_pole(pole_id) and (est_responsable() or statut = 'en_cours'))
  with check (peut_voir_pole(pole_id));
create policy inv_lignes_read on inventaire_lignes for select
  using (exists (select 1 from inventaires i where i.id = inventaire_id and peut_voir_pole(i.pole_id)));
create policy inv_lignes_write on inventaire_lignes for all
  using (exists (select 1 from inventaires i where i.id = inventaire_id and peut_voir_pole(i.pole_id) and i.statut = 'en_cours'))
  with check (exists (select 1 from inventaires i where i.id = inventaire_id and peut_voir_pole(i.pole_id) and i.statut = 'en_cours'));

-- recettes : gérant et responsables
create policy recettes_read on recettes for select using (peut_voir_pole(pole_id));
create policy recettes_write on recettes for all using (est_gerant()) with check (est_gerant());
create policy recette_ing_read on recette_ingredients for select
  using (exists (select 1 from recettes r where r.id = recette_id and peut_voir_pole(r.pole_id)));
create policy recette_ing_write on recette_ingredients for all using (est_gerant()) with check (est_gerant());

-- gérant uniquement
create policy appels_gerant on appels_ia for select using (est_gerant());
create policy automatisations_read on automatisations for select using (est_gerant());
create policy automatisations_write on automatisations for update using (est_gerant()) with check (est_gerant());
create policy executions_gerant on executions_automatisations for select using (est_gerant());
create policy actions_agent_gerant on actions_agent for select using (est_gerant());
create policy audit_gerant on audit_log for select using (est_gerant());

-- assistant : conversations privées, réservé gérant et responsables
create policy conversations_own on conversations_assistant for all
  using (user_id = auth.uid() and est_responsable()) with check (user_id = auth.uid() and est_responsable());

-- notifications : les siennes ; les gérants voient aussi celles adressées à tous
create policy notifications_read on notifications for select
  using (user_id = auth.uid() or (user_id is null and est_gerant()));
create policy notifications_update on notifications for update
  using (user_id = auth.uid() or (user_id is null and est_gerant()));

-- Un utilisateur ne peut jamais changer son propre rôle/pôle (défense en profondeur)
create or replace function empeche_escalade() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not est_gerant()
     and (new.role is distinct from old.role or new.pole_id is distinct from old.pole_id) then
    raise exception 'Modification du rôle ou du pôle interdite';
  end if;
  return new;
end $$;
create trigger profiles_no_escalation before update on profiles for each row execute function empeche_escalade();
