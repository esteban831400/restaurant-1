import { HorairesForm } from "@/components/parametres/horaires-form";
import { getReglages } from "@/server/queries/parametres";

export default async function PageHoraires() {
  const { horaires, saisons, fermetures } = await getReglages();
  return <HorairesForm horaires={horaires} saisons={saisons} fermetures={fermetures} />;
}
