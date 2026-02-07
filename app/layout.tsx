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
      <body>
        <Navbar />
        <div className="container" style={{ paddingTop: 18, paddingBottom: 40 }}>
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
