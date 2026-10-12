-- Jeu de données de démo (mot de passe de tous les comptes : Palmeraie2025!)
do $$
declare
  p_resto uuid; p_golf uuid; p_aqua uuid;
  u record; f_prim uuid; f_boul uuid; f_boi uuid; f_pisc uuid; f_golf uuid; f_bouch uuid;
  prod record; cmd uuid; i int; d int;
begin
  select id into p_resto from poles where cle = 'restaurant';
  select id into p_golf from poles where cle = 'minigolf';
  select id into p_aqua from poles where cle = 'aquatique';

  -- Comptes démo
  for u in select * from (values
    ('00000000-0000-0000-0000-000000000001'::uuid,'gerant@palmeraie.test','Camille Durand','gerant'::role_app,null::uuid),
    ('00000000-0000-0000-0000-000000000002','resto.resp@palmeraie.test','Marc Lefèvre','responsable',p_resto),
    ('00000000-0000-0000-0000-000000000003','resto.sal@palmeraie.test','Léa Martin','salarie',p_resto),
    ('00000000-0000-0000-0000-000000000004','golf.resp@palmeraie.test','Sophie Bernard','responsable',p_golf),
    ('00000000-0000-0000-0000-000000000005','aqua.sal@palmeraie.test','Hugo Petit','salarie',p_aqua)
  ) as t(id,email,nom,role,pole) loop
    insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                           raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email,
            crypt('Palmeraie2025!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
    insert into profiles(id, nom_complet, role, pole_id, saisonnier)
    values (u.id, u.nom, u.role, u.pole, u.email like '%.sal@%');
  end loop;

  -- Fournisseurs
  insert into fournisseurs(nom, contact, email, telephone, mode_commande, jours_commande, jours_livraison, delai_jours, minimum_commande, pole_id)
  values ('Primeurs du Sud','Jean Roux','commandes@primeurs-sud.test','04 90 00 00 01','mail','{1,4}','{2,5}',1,80,p_resto) returning id into f_prim;
  insert into fournisseurs(nom, contact, email, telephone, mode_commande, jours_commande, jours_livraison, delai_jours, minimum_commande, pole_id)
  values ('Boulangerie Moulin','Anne Moulin','contact@boulangerie-moulin.test','04 90 00 00 02','telephone','{1,2,3,4,5}','{2,3,4,5,6}',1,30,p_resto) returning id into f_boul;
  insert into fournisseurs(nom, contact, email, telephone, mode_commande, jours_commande, jours_livraison, delai_jours, minimum_commande, pole_id)
  values ('Boissons Méditerranée','Paul Garcia','pro@boissons-med.test','04 90 00 00 03','portail','{3}','{5}',2,150,p_resto) returning id into f_boi;
  insert into fournisseurs(nom, contact, email, telephone, mode_commande, jours_commande, jours_livraison, delai_jours, minimum_commande, pole_id)
  values ('Piscines Services','Nadia Haddad','commande@piscines-services.test','04 90 00 00 04','mail','{1}','{3}',2,100,p_aqua) returning id into f_pisc;
  insert into fournisseurs(nom, contact, email, telephone, mode_commande, jours_commande, jours_livraison, delai_jours, minimum_commande, pole_id)
  values ('GolfPro Équipement','Eric Vidal','ventes@golfpro.test','04 90 00 00 05','mail','{2}','{4}',3,60,p_golf) returning id into f_golf;
  insert into fournisseurs(nom, contact, email, telephone, mode_commande, jours_commande, jours_livraison, delai_jours, minimum_commande, pole_id)
  values ('Boucherie Fabre','Luc Fabre','commandes@boucherie-fabre.test','04 90 00 00 06','telephone','{2,5}','{3,6}',1,100,p_resto) returning id into f_bouch;

  -- Produits (nom, catégorie, unité, lieu, fournisseur, pôle, prix, seuil, réappro, dlc)
  insert into produits(nom, categorie, unite, lieu_stockage, fournisseur_id, pole_id, prix_achat, seuil_min, qte_reappro, dlc_suivie) values
   ('Tomates','Légumes','kg','Chambre froide',f_prim,p_resto,2.80,10,30,true),
   ('Salade romaine','Légumes','piece','Chambre froide',f_prim,p_resto,1.10,12,40,true),
   ('Pommes de terre','Légumes','kg','Réserve sèche',f_prim,p_resto,0.95,25,100,false),
   ('Citrons','Fruits','kg','Chambre froide',f_prim,p_resto,2.40,5,15,true),
   ('Pain burger','Boulangerie','piece','Réserve sèche',f_boul,p_resto,0.45,40,150,true),
   ('Baguettes','Boulangerie','piece','Réserve sèche',f_boul,p_resto,0.70,20,60,true),
   ('Steak haché','Viandes','kg','Congélateur',f_bouch,p_resto,11.50,8,25,true),
   ('Poulet fermier','Viandes','kg','Chambre froide',f_bouch,p_resto,7.20,6,20,true),
   ('Saucisses','Viandes','kg','Chambre froide',f_bouch,p_resto,8.90,5,15,true),
   ('Mozzarella','Produits laitiers','kg','Chambre froide',f_prim,p_resto,6.40,4,12,true),
   ('Huile d''olive','Épicerie','L','Réserve sèche',f_prim,p_resto,7.50,5,20,false),
   ('Farine T55','Épicerie','kg','Réserve sèche',f_boul,p_resto,0.80,25,100,false),
   ('Coca-Cola 33cl','Boissons','piece','Réserve boissons',f_boi,p_resto,0.62,120,480,false),
   ('Eau minérale 50cl','Boissons','piece','Réserve boissons',f_boi,p_resto,0.28,150,600,false),
   ('Bière blonde fût 30L','Boissons','piece','Cave',f_boi,p_resto,78.00,2,6,false),
   ('Rosé de Provence','Boissons','piece','Cave',f_boi,p_resto,4.90,24,96,false),
   ('Glaces vanille 5L','Desserts','piece','Congélateur',f_prim,p_resto,14.00,4,12,true),
   ('Chlore choc 5kg','Traitement eau','piece','Local technique',f_pisc,p_aqua,38.00,3,8,false),
   ('Galets de chlore 5kg','Traitement eau','piece','Local technique',f_pisc,p_aqua,42.00,4,10,false),
   ('pH moins 10L','Traitement eau','L','Local technique',f_pisc,p_aqua,24.00,2,6,false),
   ('Bouées enfants','Matériel','piece','Réserve matériel',f_pisc,p_aqua,6.50,10,30,false),
   ('Balles de mini-golf','Matériel','piece','Cabane accueil',f_golf,p_golf,0.90,60,200,false),
   ('Clubs enfants','Matériel','piece','Cabane accueil',f_golf,p_golf,12.00,10,20,false),
   ('Cartes de score','Consommables','piece','Cabane accueil',f_golf,p_golf,0.05,300,1000,false);

  -- Mouvements sur 60 jours : entrée initiale + consommation quotidienne pseudo-aléatoire
  for prod in select * from produits loop
    insert into mouvements_stock(produit_id, type, quantite, motif, user_id, created_at)
    values (prod.id, 'entree', prod.seuil_min * 6, 'Stock initial', '00000000-0000-0000-0000-000000000001', now() - interval '60 days');
    for d in 1..59 loop
      if (abs(hashtext(prod.id::text || d::text)) % 3) = 0 then
        insert into mouvements_stock(produit_id, type, quantite, motif, user_id, created_at)
        values (prod.id, 'sortie', -round((prod.seuil_min * (0.05 + (abs(hashtext(prod.nom || d::text)) % 10) / 100.0))::numeric, 3) - 0.001,
                'Consommation', '00000000-0000-0000-0000-000000000003', now() - ((60 - d) || ' days')::interval);
      end if;
    end loop;
  end loop;
  -- Quelques pertes et deux produits volontairement sous le seuil
  insert into mouvements_stock(produit_id, type, quantite, motif, user_id)
  select id, 'perte', -1, 'Casse', '00000000-0000-0000-0000-000000000003' from produits where nom in ('Tomates','Rosé de Provence');
  insert into mouvements_stock(produit_id, type, quantite, motif, user_id)
  select p.id, 'sortie', -(v.stock_actuel - p.seuil_min * 0.5), 'Gros service', '00000000-0000-0000-0000-000000000003'
  from produits p join v_stock_actuel v on v.produit_id = p.id where p.nom in ('Steak haché','Chlore choc 5kg');

  -- Lots à DLC proche
  insert into lots(produit_id, dlc, quantite)
  select id, current_date + 2, 5 from produits where nom in ('Mozzarella','Salade romaine');

  -- Commandes à chaque statut
  insert into commandes(fournisseur_id, pole_id, statut, source, date_envoi, date_livraison_prevue, total_estime, cree_par)
  values (f_prim, p_resto, 'brouillon', 'automatique', null, current_date + 2, 148.00, null) returning id into cmd;
  insert into commande_lignes(commande_id, produit_id, quantite, prix_unitaire)
  select cmd, id, qte_reappro, prix_achat from produits where fournisseur_id = f_prim limit 3;
  insert into commandes(fournisseur_id, pole_id, statut, source, date_livraison_prevue, total_estime, cree_par)
  values (f_bouch, p_resto, 'a_valider', 'automatique', current_date + 1, 210.00, '00000000-0000-0000-0000-000000000002') returning id into cmd;
  insert into commande_lignes(commande_id, produit_id, quantite, prix_unitaire)
  select cmd, id, qte_reappro, prix_achat from produits where fournisseur_id = f_bouch limit 2;
  insert into commandes(fournisseur_id, pole_id, statut, source, date_envoi, date_livraison_prevue, total_estime, cree_par, valide_par)
  values (f_boi, p_resto, 'envoyee', 'manuelle', now() - interval '1 day', current_date, 320.00, '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001') returning id into cmd;
  insert into commande_lignes(commande_id, produit_id, quantite, prix_unitaire)
  select cmd, id, qte_reappro, prix_achat from produits where fournisseur_id = f_boi limit 3;
  insert into commandes(fournisseur_id, pole_id, statut, source, date_envoi, date_livraison_prevue, derniere_relance, total_estime, cree_par)
  values (f_pisc, p_aqua, 'en_retard', 'manuelle', now() - interval '6 days', current_date - 3, now() - interval '1 day', 190.00, '00000000-0000-0000-0000-000000000001');
  insert into commandes(fournisseur_id, pole_id, statut, source, date_envoi, date_livraison_prevue, total_estime, cree_par)
  values (f_golf, p_golf, 'confirmee', 'manuelle', now() - interval '2 days', current_date + 2, 95.00, '00000000-0000-0000-0000-000000000004'),
         (f_boul, p_resto, 'livree', 'manuelle', now() - interval '4 days', current_date - 2, 64.00, '00000000-0000-0000-0000-000000000002'),
         (f_prim, p_resto, 'cloturee', 'manuelle', now() - interval '12 days', current_date - 10, 175.00, '00000000-0000-0000-0000-000000000002'),
         (f_boi, p_resto, 'annulee', 'manuelle', now() - interval '9 days', current_date - 7, 80.00, '00000000-0000-0000-0000-000000000002');

  -- Livraison extraite par IA à vérifier
  insert into livraisons(fournisseur_id, fournisseur_nom, pole_id, statut, donnees_extraites)
  values (f_prim, 'Primeurs du Sud', p_resto, 'a_verifier',
          '{"numero_bl":"BL-2025-0412","lignes":[{"produit":"Tomates","quantite":30},{"produit":"Citrons","quantite":15}]}');

  -- Appels IA
  for i in 1..25 loop
    insert into appels_ia(external_id, date_appel, numero, duree_secondes, pole, issue, resume, transcription)
    values ('demo-' || i, now() - ((i * 7) || ' hours')::interval,
            '06 12 ' || lpad((i * 37 % 100)::text, 2, '0') || ' ' || lpad((i * 53 % 100)::text, 2, '0') || ' ' || lpad((i * 71 % 100)::text, 2, '0'),
            30 + (i * 17) % 240,
            (array['restaurant','minigolf','aquatique'])[1 + i % 3],
            (array['renseigne','renseigne','transfere','message_laisse','reservation'])[1 + i % 5]::issue_appel,
            'Appel de démonstration n°' || i,
            'IA : La Palmeraie, bonjour. Client : Bonjour, quels sont vos horaires ? IA : Nous sommes ouverts de 10h à 19h.');
  end loop;

  -- Exécutions et notifications de démo
  update automatisations set actif = true, derniere_execution = now() - interval '2 hours', dernier_statut = 'succes'
   where cle in ('alerte_seuil','alertes_dlc');
  insert into executions_automatisations(automatisation_cle, debut, fin, statut, resume)
  values ('alerte_seuil', now() - interval '2 hours', now() - interval '2 hours' + interval '4 seconds', 'succes', '2 commandes brouillon créées');
  insert into executions_automatisations(automatisation_cle, debut, fin, statut, erreur)
  values ('relances', now() - interval '1 day', now() - interval '1 day' + interval '2 seconds', 'echec', 'Fournisseur sans adresse e-mail');
  insert into notifications(type, titre, corps, lien) values
   ('commande_a_valider','Commande à valider','Boucherie Fabre — 210 €','/a-valider'),
   ('echec_automatisation','Échec : Relances fournisseurs','Fournisseur sans adresse e-mail','/automatisations/relances/historique'),
   ('message_standard','Message laissé au standard','Un client souhaite réserver pour 6 personnes','/appels');
end $$;

-- Lignes et livraisons validées pour les commandes livrées / clôturées (alimente les statistiques fournisseurs)
do $$
declare c record; p record; liv uuid; ligne_prix numeric;
begin
  for c in select * from commandes where statut in ('livree','cloturee') loop
    select * into p from produits where fournisseur_id = c.fournisseur_id and actif order by nom limit 1;
    continue when p.id is null;
    ligne_prix := p.prix_achat * case when c.statut = 'cloturee' then 0.92 else 1 end; -- le prix a augmenté depuis
    insert into commande_lignes(commande_id, produit_id, quantite, prix_unitaire) values (c.id, p.id, 20, ligne_prix);
    insert into livraisons(commande_id, fournisseur_id, pole_id, statut, recu_le, recu_par)
    values (c.id, c.fournisseur_id, c.pole_id, 'validee', c.date_envoi + interval '2 days', '00000000-0000-0000-0000-000000000002')
    returning id into liv;
    insert into livraison_lignes(livraison_id, produit_id, qte_commandee, qte_recue, ecart_motif)
    values (liv, p.id, 20, case when c.statut = 'livree' then 18 else 20 end, case when c.statut = 'livree' then 'Caisse abîmée' end);
  end loop;
  update commandes set valide_par = '00000000-0000-0000-0000-000000000001' where statut in ('envoyee','confirmee','livree','cloturee','en_retard');
end $$;

-- Centre « À valider » : lignes rapprochées pour la livraison lue par l'IA, et une relance proposée
do $$
declare liv uuid; prod uuid; cmd uuid;
begin
  select id into liv from livraisons where statut = 'a_verifier' limit 1;
  for prod in select id from produits where nom in ('Tomates','Citrons') loop
    insert into livraison_lignes(livraison_id, produit_id, qte_commandee, qte_recue)
    values (liv, prod, 20, 20);
  end loop;
  select id into cmd from commandes where statut = 'en_retard' limit 1;
  insert into relances(commande_id, message)
  values (cmd, 'Bonjour, notre commande est en retard de 3 jours. Pouvez-vous nous confirmer la date de livraison ? Merci, La Palmeraie.');
  insert into notifications(type, titre, corps, lien)
  values ('commande_a_valider', 'Relance fournisseur à confirmer', 'Commande en retard — Piscines Services', '/a-valider');
end $$;
