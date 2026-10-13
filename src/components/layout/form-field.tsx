import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UseFormRegisterReturn } from "react-hook-form";

type Props = {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  error?: string;
  registration: UseFormRegisterReturn;
};

export function FormField({ id, label, type = "text", autoComplete, error, registration }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-erreur` : undefined}
        {...registration}
      />
      {error && (
        <p id={`${id}-erreur`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
