import "@/styles/globals.css";
import { AuthProvider } from "@/context/auth";
import { LangProvider } from "@/context/lang";

export default function App({ Component, pageProps }) {
  return (
    <LangProvider>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </LangProvider>
  );
}
