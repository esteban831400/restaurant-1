-- log_audit gère aussi les tables sans colonne « id » (parametres : clé)
create or replace function log_audit() returns trigger language plpgsql security definer set search_path = public as $$
declare ligne jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into audit_log(user_id, action, entite, entite_id, details)
  values (auth.uid(), tg_op, tg_table_name, coalesce(ligne->>'id', ligne->>'cle', ''), ligne);
  return null;
end $$;
create trigger audit_parametres after insert or update or delete on parametres for each row execute function log_audit();
