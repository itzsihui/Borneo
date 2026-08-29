import { MerchantAuthProvider } from "./_components/merchant-auth-provider";

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MerchantAuthProvider>{children}</MerchantAuthProvider>;
}
