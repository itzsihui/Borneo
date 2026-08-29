import { MerchantAuthProvider } from "@/app/merchant/_components/merchant-auth-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MerchantAuthProvider>{children}</MerchantAuthProvider>;
}
