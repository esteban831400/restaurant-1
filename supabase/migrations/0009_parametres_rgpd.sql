-- 1. Suppression d'un utilisateur (RGPD) : l'historique métier est conservé, anonymisé (références mises à NULL)
alter table mouvements_stock drop constraint if exists mouvements_stock_user_id_fkey;
alter table mouvements_stock add constraint mouvements_stock_user_id_fkey foreign key (user_id) references profiles(id) on delete set null;
alter table commandes drop constraint if exists commandes_cree_par_fkey;
alter table commandes add constraint commandes_cree_par_fkey foreign key (cree_par) references profiles(id) on delete set null;
alter table commandes drop constraint if exists commandes_valide_par_fkey;
alter table commandes add constraint commandes_valide_par_fkey foreign key (valide_par) references profiles(id) on delete set null;
alter table livraisons drop constraint if exists livraisons_recu_par_fkey;
alter table livraisons add constraint livraisons_recu_par_fkey foreign key (recu_par) references profiles(id) on delete set null;
alter table inventaires drop constraint if exists inventaires_cree_par_fkey;
alter table inventaires add constraint inventaires_cree_par_fkey foreign key (cree_par) references profiles(id) on delete set null;
alter table inventaires drop constraint if exists inventaires_valide_par_fkey;
alter table inventaires add constraint inventaires_valide_par_fkey foreign key (valide_par) references profiles(id) on delete set null;
alter table relances drop constraint if exists relances_traite_par_fkey;
alter table relances add constraint relances_traite_par_fkey foreign key (traite_par) references profiles(id) on delete set null;

-- 2. Identité du complexe (nom, logo, couleurs) lisible par tous, y compris sur la page de connexion
create policy parametres_complexe_public on parametres for select using (cle = 'complexe');

-- 3. Logo : bucket public en lecture, écriture réservée au gérant (images uniquement, 1 Mo)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('public-assets', 'public-assets', true, 1048576, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
create policy assets_gerant_ecriture on storage.objects for all to authenticated
  using (bucket_id = 'public-assets' and est_gerant()) with check (bucket_id = 'public-assets' and est_gerant());
