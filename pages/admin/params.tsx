import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Loader2, Settings2, Check } from "lucide-react";

interface SystemParams {
  minGamesForMonthlyRanking: number;
  maxPartnerRepetitionsPerMonth: number;
}

export default function ParamsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [params, setParams] = useState<SystemParams>({
    minGamesForMonthlyRanking: 8,
    maxPartnerRepetitionsPerMonth: 2,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/");
      return;
    }
    if (user?.role === "admin") fetchParams();
  }, [user, loading, router]);

  async function fetchParams() {
    try {
      const res = await fetch("/api/admin/params");
      if (res.ok) {
        const data = await res.json();
        setParams(data.params);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/params", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar");
      setSuccess("Parâmetros salvos com sucesso!");
      setParams(data.params);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Parâmetros do Sistema</h1>
        <p className="text-gray-600 mt-1">Configurações do modo campeonato</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Campeonato
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {error && <Alert type="error">{error}</Alert>}
              {success && (
                <Alert type="success">
                  <Check className="h-4 w-4 mr-2 inline" />
                  {success}
                </Alert>
              )}

              <Input
                label="Mínimo de jogos para ranking mensal"
                type="number"
                min={1}
                max={100}
                value={String(params.minGamesForMonthlyRanking)}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    minGamesForMonthlyRanking: parseInt(e.target.value) || 1,
                  }))
                }
              />
              <p className="text-xs text-gray-500 -mt-4">
                Número mínimo de partidas no mês para o jogador entrar no ranking mensal e receber medalhas.
              </p>

              <Input
                label="Máximo de jogos com mesmo parceiro por mês"
                type="number"
                min={1}
                max={20}
                value={String(params.maxPartnerRepetitionsPerMonth)}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    maxPartnerRepetitionsPerMonth: parseInt(e.target.value) || 1,
                  }))
                }
              />
              <p className="text-xs text-gray-500 -mt-4">
                Quantidade máxima de vezes que dois jogadores podem ser parceiros no mesmo ciclo mensal.
              </p>

              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Parâmetros"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
