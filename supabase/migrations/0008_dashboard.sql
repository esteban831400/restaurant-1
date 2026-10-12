-- Évolution de la valeur du stock (quantité × prix d'achat) sur N jours, reconstituée depuis les mouvements.
-- security invoker : la RLS s'applique, le résultat est limité aux pôles visibles de l'appelant.
create or replace function valeur_stock_historique(p_jours int default 30, p_pole uuid default null)
returns table(jour date, valeur numeric) language sql stable set search_path = public as $$
  with bornes as (
    select ((now() at time zone 'Europe/Paris')::date - (greatest(p_jours, 1) - 1)) as debut, (now() at time zone 'Europe/Paris')::date as fin
  ), mv as (
    select (m.created_at at time zone 'Europe/Paris')::date as j, m.quantite * p.prix_achat as v
    from mouvements_stock m join produits p on p.id = m.produit_id
    where p_pole is null or p.pole_id = p_pole
  ), base as (
    select coalesce(sum(v), 0) as v from mv, bornes where mv.j < bornes.debut
  )
  select d::date, ((select v from base) + coalesce((select sum(mv.v) from mv, bornes b where mv.j >= b.debut and mv.j <= d::date), 0))::numeric(14,2)
  from bornes b, generate_series(b.debut, b.fin, interval '1 day') as d
  order by 1
$$;

-- Produits les plus consommés (sorties uniquement : les pertes et corrections ne sont pas de la consommation), classés par valeur.
create or replace function top_consommation(p_jours int default 30, p_pole uuid default null, p_limite int default 10)
returns table(produit_id uuid, nom text, unite text, quantite numeric, valeur numeric) language sql stable set search_path = public as $$
  select p.id, p.nom, p.unite, sum(-m.quantite)::numeric(12,3), sum(-m.quantite * p.prix_achat)::numeric(14,2)
  from mouvements_stock m join produits p on p.id = m.produit_id
  where m.type = 'sortie' and m.created_at >= now() - make_interval(days => greatest(p_jours, 1)) and (p_pole is null or p.pole_id = p_pole)
  group by p.id
  order by 5 desc, 2
  limit greatest(p_limite, 1)
$$;
