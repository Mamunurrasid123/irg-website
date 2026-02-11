import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata = {
  title: "IRG | Asian University for Women",
  description: "Interdisciplinary Research Group (IRG) at Asian University for Women",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          
          <Navbar />

          {/* Space above and below main */}
          <main style={{ flex: 1, padding: "24px 0" }}>
            {children}
          </main>

          <Footer />

        </div>
      </body>
    </html>
  );
}
