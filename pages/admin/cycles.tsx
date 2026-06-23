import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { Loader2, Trophy, Medal, Calendar, CheckCircle, AlertTriangle, Users } from "lucide-react";

type CycleStatus = "open" | "closed";

interface Cycle {
  id: string;
  year: number;
  month: number;
  status: CycleStatus;
  windowStart?: { seconds: number } | null;
  windowEnd?: { seconds: number } | null;
  closedAt?: { seconds: number } | null;
  closedBy?: string;
}

interface EligiblePlayer {
  userId: string;
  name: string;
  position: number;
  score: number;
  victories: number;
  defeats: number;
  totalGames: number;
  projectedMedal: string;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function CyclesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openingCycle, setOpeningCycle] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Close modal
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingCycleId, setClosingCycleId] = useState<string | null>(null);
  const [closingCycle, setClosingCycleData] = useState<Cycle | null>(null);
  const [closePreview, setClosePreview] = useState<any>(null);
  const [closeLoading, setCloseLoading] = useState(false);
  const [tiebreakNeeded, setTiebreakNeeded] = useState<{ position: number; tied: string[] } | null>(null);
  const [tiebreakWinner, setTiebreakWinner] = useState("");

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/");
      return;
    }
    if (user?.role === "admin") fetchCycles();
  }, [user, loading, router]);

  async function fetchCycles() {
    try {
      const res = await fetch("/api/admin/championship?action=cycles");
      if (res.ok) {
        const data = await res.json();
        setCycles(data.cycles || []);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOpenCycle() {
    setError("");
    setSuccess("");
    setOpeningCycle(true);
    try {
      const res = await fetch("/api/admin/championship?action=cycles", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("Ciclo aberto com sucesso!");
      fetchCycles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOpeningCycle(false);
    }
  }

  async function openCloseModal(cycle: Cycle) {
    setClosingCycleId(cycle.id);
    setClosingCycleData(cycle);
    setTiebreakNeeded(null);
    setTiebreakWinner("");
    setClosePreview(null);
    setShowCloseModal(true);

    // Carregar preview do ranking
    try {
      const res = await fetch("/api/championship-ranking?type=monthly");
      if (res.ok) {
        const data = await res.json();
        setClosePreview(data);
      }
    } catch {}
  }

  async function handleResolveTiebreak() {
    if (!closingCycleId || !tiebreakNeeded || !tiebreakWinner) return;
    try {
      const res = await fetch(
        `/api/admin/championship?action=tiebreak&id=${closingCycleId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: tiebreakNeeded.position, winnerId: tiebreakWinner }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTiebreakNeeded(null);
      setTiebreakWinner("");
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleCloseCycle() {
    if (!closingCycleId) return;
    setCloseLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/championship?action=close&id=${closingCycleId}`,
        { method: "POST" }
      );
      const data = await res.json();

      if (res.status === 409 && data.status === "tiebreak_required") {
        setTiebreakNeeded({ position: data.position, tied: data.tied });
        setCloseLoading(false);
        return;
      }

      if (!res.ok) throw new Error(data.error);
      setShowCloseModal(false);
      setSuccess(`Ciclo fechado! ${data.medalsDistributed} medalhas distribuídas.`);
      fetchCycles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCloseLoading(false);
    }
  }

  const activeCycle = cycles.find((c) => c.status === "open");

  if (loading || !user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Ciclos do Campeonato</h1>
        <p className="text-gray-600 mt-1">Gerenciamento dos ciclos mensais</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {/* Ação: Abrir ciclo */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-medium text-gray-900">
                {activeCycle
                  ? `Ciclo ativo: ${MONTH_NAMES[activeCycle.month - 1]} ${activeCycle.year}`
                  : "Nenhum ciclo ativo"}
              </p>
              <p className="text-sm text-gray-500">
                {activeCycle
                  ? "Feche o ciclo atual para distribuir medalhas e iniciar um novo."
                  : "Abra um novo ciclo para iniciar o campeonato do mês corrente."}
              </p>
            </div>
            <Button
              onClick={handleOpenCycle}
              disabled={!!activeCycle || openingCycle}
            >
              {openingCycle ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Abrindo...</>
              ) : (
                "Abrir Novo Ciclo"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de ciclos */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : cycles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Nenhum ciclo encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle) => (
            <Card key={cycle.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {MONTH_NAMES[cycle.month - 1]} {cycle.year}
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          cycle.status === "open"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {cycle.status === "open" ? "Aberto" : "Fechado"}
                      </span>
                    </div>
                  </div>

                  {cycle.status === "open" && (
                    <Button variant="danger" onClick={() => openCloseModal(cycle)}>
                      Fechar Ciclo
                    </Button>
                  )}
                  {cycle.status === "closed" && (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Encerrado
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de fechamento */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title={`Fechar ciclo — ${closingCycle ? `${MONTH_NAMES[closingCycle.month - 1]} ${closingCycle.year}` : ""}`}
      >
        <div className="space-y-4">
          <Alert type="error">
            <AlertTriangle className="h-4 w-4 mr-2 inline" />
            Esta ação é irreversível. As medalhas serão distribuídas e o ciclo será encerrado.
          </Alert>

          {/* Preview do ranking */}
          {closePreview && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Jogadores elegíveis ({closePreview.eligible?.length || 0}):
              </p>
              {(closePreview.eligible || []).slice(0, 5).map((p: EligiblePlayer) => (
                <div key={p.userId} className="flex items-center justify-between text-sm py-1 border-b border-gray-100">
                  <span className="flex items-center gap-2">
                    {p.position === 1 && <Trophy className="h-4 w-4 text-yellow-500" />}
                    {p.position === 2 && <Medal className="h-4 w-4 text-gray-400" />}
                    {p.position === 3 && <Medal className="h-4 w-4 text-amber-600" />}
                    {p.position > 3 && <span className="text-gray-500 w-4 text-center">{p.position}</span>}
                    <span className="font-medium">{p.name}</span>
                  </span>
                  <span className="text-gray-600">
                    Score: {p.score > 0 ? "+" : ""}{p.score} | {p.totalGames} jogos
                  </span>
                </div>
              ))}
              {(closePreview.eligible?.length || 0) > 5 && (
                <p className="text-xs text-gray-500 mt-1">
                  +{closePreview.eligible.length - 5} jogadores elegíveis
                </p>
              )}
            </div>
          )}

          {/* Tiebreak */}
          {tiebreakNeeded && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Empate na posição {tiebreakNeeded.position} — defina o vencedor
              </p>
              <div className="space-y-2">
                {tiebreakNeeded.tied.map((uid) => (
                  <label key={uid} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tiebreakWinner"
                      value={uid}
                      checked={tiebreakWinner === uid}
                      onChange={() => setTiebreakWinner(uid)}
                    />
                    <span className="text-sm">{uid}</span>
                  </label>
                ))}
              </div>
              <Button
                onClick={handleResolveTiebreak}
                disabled={!tiebreakWinner}
              >
                Confirmar desempate
              </Button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowCloseModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleCloseCycle}
              disabled={closeLoading || !!tiebreakNeeded}
            >
              {closeLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Fechando...</>
              ) : (
                "Confirmar Fechamento"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
