import { Badge } from "@/components/ui/badge";
import { ISSUE_LABELS, type IssueAppel } from "@/lib/appels/appels";

const STYLES: Record<IssueAppel, string> = {
  renseigne: "border-green-600 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
  transfere: "border-sky-600 bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  message_laisse: "border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  reservation: "border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
};

export function IssueBadge({ issue }: { issue: IssueAppel }) {
  return <Badge className={STYLES[issue]}>{ISSUE_LABELS[issue]}</Badge>;
}
