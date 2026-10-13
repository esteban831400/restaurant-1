-- Vue de travail du catalogue : stock calculé, niveau d'alerte et DLC, filtrables et paginables côté base.
-- Niveaux : rouge = sous le seuil ; orange = moins de 25 % au-dessus du seuil.
create view v_produits_stock with (security_invoker = true) as
select p.*,
       f.nom as fournisseur_nom,
       s.stock_actuel,
       case when p.seuil_min > 0 and s.stock_actuel < p.seuil_min then 'rouge'
            when p.seuil_min > 0 and s.stock_actuel < p.seuil_min * 1.25 then 'orange'
            else 'ok' end as niveau,
       d.prochaine_dlc,
       coalesce(d.prochaine_dlc <= current_date + coalesce((select (valeur #>> '{}')::int from parametres where cle = 'seuil_dlc_jours'), 3), false) as dlc_proche
from produits p
left join fournisseurs f on f.id = p.fournisseur_id
cross join lateral (select coalesce(sum(m.quantite), 0)::numeric(12,3) as stock_actuel from mouvements_stock m where m.produit_id = p.id) s
left join lateral (select min(l.dlc) as prochaine_dlc from lots l where l.produit_id = p.id and l.quantite > 0) d on true;

-- Les collègues d'un même pôle peuvent lire leurs noms (historique des mouvements).
create policy profiles_read_pole on profiles for select using (pole_id is not null and pole_id = auth_pole());
