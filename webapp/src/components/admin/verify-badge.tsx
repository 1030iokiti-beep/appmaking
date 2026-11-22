import { Badge } from "@/components/ui/form";

export function VerifyBadge({ v }: { v: string | null | undefined }) {
  if (v === "approved") return <Badge tone="success">確認済み</Badge>;
  if (v === "pending") return <Badge tone="gold">審査中</Badge>;
  if (v === "rejected") return <Badge tone="brand">否認</Badge>;
  return <Badge tone="mute">未提出</Badge>;
}
