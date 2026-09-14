import "./globals.css";

export const metadata = {
  title: "Aracaju Motoboy — Painel de Serviços",
  description: "Painel de serviços da Aracaju Motoboy",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
