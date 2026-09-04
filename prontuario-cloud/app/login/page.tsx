"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      setErro("E-mail ou senha inválidos.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={entrar} className="card w-full max-w-sm space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold text-white">Prontuário Cloud</h1>
          <p className="text-sm text-slate-400">Dr. Reginaldo Chiarini — CRM-SP 122194</p>
        </div>

        <div>
          <label className="label-field" htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            required
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div>
          <label className="label-field" htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            required
            className="input-field"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {erro && <p className="text-sm text-red-400">{erro}</p>}

        <button type="submit" disabled={carregando} className="btn-primary w-full">
          {carregando ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-xs text-slate-500 text-center">
          O acesso é criado manualmente no Supabase (Authentication → Users).
        </p>
      </form>
    </div>
  );
}
