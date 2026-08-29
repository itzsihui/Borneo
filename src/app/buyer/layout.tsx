import { BuyerShell } from "./_components/buyer-shell";

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return <BuyerShell>{children}</BuyerShell>;
}
