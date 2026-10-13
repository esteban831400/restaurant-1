"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { inviterUtilisateur, modifierUtilisateur, supprimerUtilisateur } from "@/server/actions/parametres";
import type { Utilisateur } from "@/server/queries/parametres";
import type { Pole } from "@/types/stock";

type Props = { utilisateurs: Utilisateur[]; poles: Pole[]; moi: string };
type Edition = { id: string | null; email: string; nom_complet: string; role: Role; pole_id: string | null; saisonnier: boolean; actif: boolean };

const vide = (poleDefaut: string | null): Edition => ({ id: null, email: "", nom_complet: "", role: "salarie", pole_id: poleDefaut, saisonnier: false, actif: true });

export function UtilisateursPanel({ utilisateurs, poles, moi }: Props) {
  const router = useRouter();
  const [edition, setEdition] = useState<Edition | null>(null);
  const [suppression, setSuppression] = useState<Utilisateur | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const nomPole = (id: string | null) => poles.find((p) => p.id === id)?.nom ?? "—";

  function enregistrer() {
    if (!edition) return;
    setErreur(null);
    start(async () => {
      const { id, email, ...champs } = edition;
      const r = id ? await modifierUtilisateur(id, champs) : await inviterUtilisateur({ email, nom_complet: champs.nom_complet, role: champs.role, pole_id: champs.role === "gerant" ? null : champs.pole_id, saisonnier: champs.saisonnier });
      if (!r.ok) return setErreur(r.error);
      toast.success(id ? "Utilisateur modifié" : "Invitation envoyée par e-mail");
      setEdition(null);
      router.refresh();
    });
  }

  function supprimer() {
    if (!suppression) return;
    start(async () => {
      const r = await supprimerUtilisateur(suppression.id);
      if (!r.ok) { setErreur(r.error); return; }
      toast.success("Compte et données personnelles supprimés");
      setSuppression(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => { setErreur(null); setEdition(vide(poles[0]?.id ?? null)); }}><UserPlus className="h-5 w-5" />Inviter un utilisateur</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted"><tr>{["Nom", "E-mail", "Rôle", "Pôle", "Statut", "Actions"].map((h) => <th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {utilisateurs.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-3 font-medium">{u.nom_complet}{u.id === moi && <span className="ml-2 text-xs text-muted-foreground">(vous)</span>}{u.saisonnier && <Badge className="ml-2">Saisonnier</Badge>}</td>
                <td className="px-3 py-3">{u.email}</td>
                <td className="px-3 py-3">{ROLE_LABELS[u.role]}</td>
                <td className="px-3 py-3">{nomPole(u.pole_id)}</td>
                <td className="px-3 py-3">{u.actif ? "Actif" : <Badge className="border-slate-400">Désactivé</Badge>}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setErreur(null); setEdition({ id: u.id, email: u.email, nom_complet: u.nom_complet, role: u.role, pole_id: u.pole_id, saisonnier: u.saisonnier, actif: u.actif }); }}>Modifier</Button>
                    <a href={`/api/rgpd/export?user=${u.id}`} className="inline-flex h-10 items-center gap-1 rounded-md border border-input px-3 text-sm font-medium hover:bg-muted"><Download className="h-4 w-4" />Exporter</a>
                    {u.id !== moi && <Button size="sm" variant="ghost" aria-label={`Supprimer ${u.nom_complet}`} onClick={() => { setErreur(null); setSuppression(u); }}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!edition} onClose={() => setEdition(null)} titre={edition?.id ? "Modifier l'utilisateur" : "Inviter un utilisateur"}>
        {edition && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); enregistrer(); }}>
            <div className="space-y-2"><Label htmlFor="u-nom">Nom complet</Label><Input id="u-nom" value={edition.nom_complet} onChange={(e) => setEdition({ ...edition, nom_complet: e.target.value })} autoFocus /></div>
            <div className="space-y-2"><Label htmlFor="u-email">Adresse e-mail</Label><Input id="u-email" type="email" value={edition.email} disabled={!!edition.id} onChange={(e) => setEdition({ ...edition, email: e.target.value })} /></div>
            <div className="space-y-2">
              <Label htmlFor="u-role">Rôle</Label>
              <Select id="u-role" value={edition.role} onChange={(e) => setEdition({ ...edition, role: e.target.value as Role })}>
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </Select>
            </div>
            {edition.role !== "gerant" && (
              <div className="space-y-2">
                <Label htmlFor="u-pole">Pôle</Label>
                <Select id="u-pole" value={edition.pole_id ?? ""} onChange={(e) => setEdition({ ...edition, pole_id: e.target.value || null })}>
                  {poles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </Select>
              </div>
            )}
            <label className="flex items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={edition.saisonnier} onChange={(e) => setEdition({ ...edition, saisonnier: e.target.checked })} />Salarié saisonnier</label>
            {edition.id && <label className="flex items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={edition.actif} onChange={(e) => setEdition({ ...edition, actif: e.target.checked })} />Compte actif</label>}
            {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
            <Button type="submit" className="w-full" disabled={pending}>{pending ? "Enregistrement…" : edition.id ? "Enregistrer" : "Envoyer l'invitation"}</Button>
          </form>
        )}
      </Modal>

      <Modal open={!!suppression} onClose={() => setSuppression(null)} titre="Supprimer ce compte ?">
        {suppression && (
          <div className="space-y-4">
            <p><strong>{suppression.nom_complet}</strong> perdra son accès. Ses conversations avec l&apos;assistant et ses notifications seront supprimées ; son nom disparaîtra de l&apos;historique des mouvements, commandes et inventaires (qui sont conservés). Action définitive : pensez à exporter ses données avant.</p>
            {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
            <div className="flex gap-3">
              <Button variant="destructive" disabled={pending} onClick={supprimer}>{pending ? "Suppression…" : "Supprimer définitivement"}</Button>
              <Button variant="ghost" onClick={() => setSuppression(null)}>Annuler</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
