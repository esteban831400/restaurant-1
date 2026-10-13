-- Durcissement issu des conseils de sécurité Supabase (get_advisors).

-- 1. Fonctions SECURITY DEFINER : plus d'exécution publique via l'API (/rest/v1/rpc/...).
--    - marquer_commandes_en_retard : réservée au cron (service_role). Sans cela, n'importe qui, sans connexion, pouvait la lancer.
--    - fonctions de trigger : jamais appelées directement (le droit d'exécution n'est vérifié qu'à la création du trigger).
--    - réception/validation : réservées aux utilisateurs connectés (elles contrôlent aussi le rôle en interne).
revoke execute on function public.marquer_commandes_en_retard() from public, anon, authenticated;
grant execute on function public.marquer_commandes_en_retard() to service_role;

revoke execute on function public.controle_commande() from public, anon, authenticated;
revoke execute on function public.empeche_escalade() from public, anon, authenticated;
revoke execute on function public.log_audit() from public, anon, authenticated;
revoke execute on function public.notify_seuil() from public, anon, authenticated;
revoke execute on function public.recalculer_total_commande() from public, anon, authenticated;

revoke execute on function public.recevoir_livraison(uuid, jsonb) from public, anon;
revoke execute on function public.valider_inventaire(uuid) from public, anon;
revoke execute on function public.valider_livraison(uuid) from public, anon;
revoke execute on function public.notifier_commande_a_valider(uuid) from public, anon;
grant execute on function public.recevoir_livraison(uuid, jsonb) to authenticated, service_role;
grant execute on function public.valider_inventaire(uuid) to authenticated, service_role;
grant execute on function public.valider_livraison(uuid) to authenticated, service_role;
grant execute on function public.notifier_commande_a_valider(uuid) to authenticated, service_role;

-- 2. search_path figé sur les fonctions d'aide.
alter function public.set_updated_at() set search_path = public;
alter function public.peut_voir_pole(uuid) set search_path = public;
alter function public.est_gerant() set search_path = public;
alter function public.est_responsable() set search_path = public;

-- 3. Extension hors du schéma public.
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;
