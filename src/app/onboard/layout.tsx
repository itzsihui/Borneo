import { MerchantAuthProvider } from "@/app/merchant/_components/merchant-auth-provider";

export default function OnboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MerchantAuthProvider>{children}</MerchantAuthProvider>;
}
