"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Chess, type Square } from "chess.js";
import { useAuth } from "@/context/AuthContext";
import { useTorneos } from "@/context/TorneosContext";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { supabase } from "@/lib/supabase";
import { conectarPegasus, casillaDesdeIndice } from "@/lib/pegasus";
import { TableroMini } from "@/components/TableroMini";
import { EditorPosicion } from "@/components/EditorPosicion";
import type { ResultadoPartida } from "@/lib/tournaments";

export default function TransmitirPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-400">Cargando...</p>}>
      <TransmitirContenido />
    </Suspense>
  );
}

function TransmitirContenido() {
  const { session } = useAuth();
  const puedeUsar = Boolean(session);
  const parametros = useSearchParams();
  const { torneos, registrarResultado } = useTorneos();
  const jugadoresEnVivo = useJugadoresEnVivo();

  const chessRef = useRef(new Chess());
  const desconectarRef = useRef<(() => void) | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [conectado, setConectado] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [fen, setFen] = useState(chessRef.current.fen());
  const [jugadas, setJugadas] = useState<string[]>([]);
  const [bateria, setBateria] = useState<number | null>(null);

  const [transmisionId, setTransmisionId] = useState<string | null>(null);
  const [transmitiendo, setTransmitiendo] = useState(false);
  const transmitiendoRef = useRef(false);
  const [blancas, setBlancas] = useState("");
  const [negras, setNegras] = useState("");
  const blancasRef = useRef("");
  const negrasRef = useRef("");

  const pickupsRef = useRef(0);
  const desincronizadoRef = useRef(false);
  const [ultimaPromocion, setUltimaPromocion] = useState<{ origen: string; destino: string } | null>(
    null
  );
  const [editandoPosicion, setEditandoPosicion] = useState(false);

  const [torneoId, setTorneoId] = useState<string | null>(null);
  const [rondaNumero, setRondaNumero] = useState<number | null>(null);
  const [empNumero, setEmpNumero] = useState<number | null>(null);
  const torneoIdRef = useRef<string | null>(null);
  const rondaNumeroRef = useRef<number | null>(null);
  const empNumeroRef = useRef<number | null>(null);

  const [jugadorBlancas, setJugadorBlancas] = useState<{ fotoUrl: string | null; eloAtlantida: number } | null>(
    null
  );
  const [jugadorNegras, setJugadorNegras] = useState<{ fotoUrl: string | null; eloAtlantida: number } | null>(
    null
  );
  const blancasFotoRef = useRef<string | null>(null);
  const negrasFotoRef = useRef<string | null>(null);
  const blancasEloRef = useRef<number | null>(null);
  const negrasEloRef = useRef<number | null>(null);
  const [resultado, setResultadoState] = useState<ResultadoPartida | null>(null);
  const [pgn, setPgn] = useState<string | null>(null);

  useEffect(() => {
    // Si salimos de la página (navegando, recargando o cerrando la pestaña)
    // con el tablero todavía conectado, lo desconectamos prolijamente para
    // que no quede "pensando" que sigue enganchado la próxima vez.
    function desconectarAntesDeSalir() {
      desconectarRef.current?.();
    }
    window.addEventListener("beforeunload", desconectarAntesDeSalir);
    return () => {
      window.removeEventListener("beforeunload", desconectarAntesDeSalir);
      desconectarRef.current?.();
    };
  }, []);

  useEffect(() => {
    // Si llegamos con un enlace de "Transmitir" de un torneo, esos datos de la
    // URL mandan sobre lo que haya quedado guardado de una transmisión
    // anterior. Si no, solo retomamos blancas/negras cuando la transmisión
    // anterior sigue activa (por ejemplo, si se recargó la página a mitad de
    // una partida) — si ya terminó, arrancamos en blanco.
    const vieneDeTorneo = Boolean(parametros.get("torneo"));

    async function cargar() {
      const { data } = await supabase.from("transmision").select("*").limit(1).single();
      if (data) {
        setTransmisionId(data.id);
        setTransmitiendo(data.activa);
        transmitiendoRef.current = data.activa;
        if (!vieneDeTorneo && data.activa) {
          setBlancas(data.blancas ?? "");
          setNegras(data.negras ?? "");
          blancasRef.current = data.blancas ?? "";
          negrasRef.current = data.negras ?? "";
        }
      }
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const torneo = parametros.get("torneo");
    const ronda = parametros.get("ronda");
    const emp = parametros.get("emp");
    const nombreBlancas = parametros.get("blancas");
    const nombreNegras = parametros.get("negras");
    if (!torneo || !ronda || !emp) return;

    torneoIdRef.current = torneo;
    rondaNumeroRef.current = Number(ronda);
    empNumeroRef.current = Number(emp);
    setTorneoId(torneo);
    setRondaNumero(Number(ronda));
    setEmpNumero(Number(emp));

    if (nombreBlancas) {
      blancasRef.current = nombreBlancas;
      setBlancas(nombreBlancas);
    }
    if (nombreNegras) {
      negrasRef.current = nombreNegras;
      setNegras(nombreNegras);
    }
    agregarLog(`🔗 Conectado a la ronda ${ronda} del torneo (partida ${emp}).`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (jugadoresEnVivo.length === 0) return;
    const idBlancas = parametros.get("blancasId");
    const idNegras = parametros.get("negrasId");

    if (idBlancas) {
      const j = jugadoresEnVivo.find((x) => x.id === idBlancas);
      if (j) {
        setJugadorBlancas({ fotoUrl: j.fotoUrl, eloAtlantida: j.eloAtlantida });
        blancasFotoRef.current = j.fotoUrl;
        blancasEloRef.current = j.eloAtlantida;
      }
    }
    if (idNegras) {
      const j = jugadoresEnVivo.find((x) => x.id === idNegras);
      if (j) {
        setJugadorNegras({ fotoUrl: j.fotoUrl, eloAtlantida: j.eloAtlantida });
        negrasFotoRef.current = j.fotoUrl;
        negrasEloRef.current = j.eloAtlantida;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jugadoresEnVivo]);

  function cambiarBlancas(valor: string) {
    setBlancas(valor);
    blancasRef.current = valor;
    setJugadorBlancas(null);
    blancasFotoRef.current = null;
    blancasEloRef.current = null;
  }

  function cambiarNegras(valor: string) {
    setNegras(valor);
    negrasRef.current = valor;
    setJugadorNegras(null);
    negrasFotoRef.current = null;
    negrasEloRef.current = null;
  }

  function agregarLog(linea: string) {
    setLog((actual) => [...actual.slice(-49), linea]);
  }

  function actualizarDesdeChess() {
    setFen(chessRef.current.fen());
    setJugadas(chessRef.current.history());
  }

  async function publicarEstado(activa: boolean, resultadoFinal?: ResultadoPartida, pgnFinal?: string) {
    if (!transmisionId) return;
    await supabase
      .from("transmision")
      .update({
        activa,
        fen: chessRef.current.fen(),
        jugadas: chessRef.current.history(),
        blancas: blancasRef.current.trim() || null,
        negras: negrasRef.current.trim() || null,
        blancas_foto: blancasFotoRef.current,
        negras_foto: negrasFotoRef.current,
        blancas_elo: blancasEloRef.current,
        negras_elo: negrasEloRef.current,
        torneo_id: torneoIdRef.current,
        ronda_numero: rondaNumeroRef.current,
        emparejamiento_numero: empNumeroRef.current,
        resultado: resultadoFinal ?? null,
        pgn: pgnFinal ?? null,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", transmisionId);
  }

  function manejarLevantada(casilla: string) {
    agregarLog(`↑ se levantó una pieza de ${casilla}`);
    // Solo contamos como "en mano" la pieza de quien mueve: esa sí se vuelve
    // a apoyar en algún lado. Una pieza comida se levanta y se saca del
    // tablero para siempre, nunca genera un "se apoyó" — si la contáramos
    // igual, el contador quedaría trabado después de cada comida y no
    // reconocería más jugadas.
    const pieza = chessRef.current.get(casilla as Square);
    if (pieza && pieza.color === chessRef.current.turn()) {
      pickupsRef.current++;
    }
  }

  function manejarApoyada(casilla: string) {
    agregarLog(`↓ se apoyó una pieza en ${casilla}`);
    pickupsRef.current = Math.max(0, pickupsRef.current - 1);
  }

  function ocupacionCoincide(tablero: ({ type: string; color: string } | null)[][], ocupado: boolean[]) {
    return casillasQueNoCoinciden(tablero, ocupado).length === 0;
  }

  function casillasQueNoCoinciden(
    tablero: ({ type: string; color: string } | null)[][],
    ocupado: boolean[]
  ): string[] {
    const distintas: string[] = [];
    for (let i = 0; i < 64; i++) {
      const fila = Math.floor(i / 8);
      const columna = i - fila * 8;
      if (ocupado[i] !== Boolean(tablero[fila][columna])) {
        distintas.push(casillaDesdeIndice(i));
      }
    }
    return distintas;
  }

  const PROFUNDIDAD_MAXIMA_BUSQUEDA = 3;

  /**
   * Busca, desde la posición dada, una secuencia de exactamente `restante`
   * jugadas legales cuyo resultado final coincida con `ocupado`. Prioriza
   * coronar a Dama cuando hay varias piezas de coronación posibles (todas
   * pisan las mismas casillas, así que la ocupación no las distingue).
   */
  function buscarSecuenciaExacta(
    chess: Chess,
    ocupado: boolean[],
    restante: number
  ): { san: string; promotion?: string }[] | null {
    if (restante === 0) {
      return ocupacionCoincide(chess.board(), ocupado) ? [] : null;
    }
    const candidatos = chess.moves({ verbose: true }).slice().sort((a, b) => {
      if (a.promotion === b.promotion) return 0;
      if (a.promotion === "q") return -1;
      if (b.promotion === "q") return 1;
      return 0;
    });
    for (const c of candidatos) {
      const prueba = new Chess(chess.fen());
      prueba.move(c.san);
      const resto = buscarSecuenciaExacta(prueba, ocupado, restante - 1);
      if (resto !== null) return [c, ...resto];
    }
    return null;
  }

  function manejarVolcado(ocupado: boolean[]) {
    // Si hay una pieza en el aire (levantada, todavía sin apoyar en ningún
    // lado), una captura en curso se ve idéntica a una captura ya terminada
    // — comer no cambia si la casilla destino está ocupada, así que solo
    // desaparece la casilla de origen. No adivinamos nada hasta que no
    // quede nada en la mano de quien mueve.
    if (pickupsRef.current !== 0) return;

    const tablero = chessRef.current.board();
    if (ocupacionCoincide(tablero, ocupado)) {
      desincronizadoRef.current = false;
      return;
    }

    // Probamos primero con una sola jugada (el caso normal). Si el tablero
    // físico ya venía de varias jugadas seguidas muy rápidas y esta foto
    // llegó tarde, subimos de a poco la cantidad de jugadas encadenadas que
    // probamos, sin esperar a que el tablero se quede quieto — así cada
    // jugada se reconoce apenas se completa, en vez de acumularse.
    for (let profundidad = 1; profundidad <= PROFUNDIDAD_MAXIMA_BUSQUEDA; profundidad++) {
      const secuencia = buscarSecuenciaExacta(new Chess(chessRef.current.fen()), ocupado, profundidad);
      if (!secuencia) continue;

      const jugadas = secuencia.map((c) => chessRef.current.move(c.san));
      const ultima = jugadas[jugadas.length - 1];
      agregarLog(
        jugadas.length === 1
          ? `♟ Jugada detectada: ${ultima.san}`
          : `♟ ${jugadas.length} jugadas rápidas detectadas: ${jugadas.map((m) => m.san).join(", ")}`
      );
      actualizarDesdeChess();
      if (transmitiendoRef.current) publicarEstado(true);
      if (ultima.promotion) {
        setUltimaPromocion({ origen: ultima.from, destino: ultima.to });
        agregarLog("👑 Coronó a Dama por defecto — corregí abajo si en realidad fue otra pieza.");
      } else {
        setUltimaPromocion(null);
      }
      desincronizadoRef.current = false;
      return;
    }

    if (!desincronizadoRef.current) {
      desincronizadoRef.current = true;
      const distintas = casillasQueNoCoinciden(tablero, ocupado);
      agregarLog(
        `⚠ El tablero físico no coincide con ninguna jugada (hasta ${PROFUNDIDAD_MAXIMA_BUSQUEDA} seguidas) desde la posición registrada. Casilleros distintos: ${distintas.join(", ")}. Corregí a mano o reiniciá la partida.`
      );
    }
  }

  const NOMBRE_PIEZA: Record<string, string> = { q: "Dama", r: "Torre", b: "Alfil", n: "Caballo" };

  function corregirPromocion(piezaCorrecta: "r" | "b" | "n") {
    if (!ultimaPromocion) return;
    chessRef.current.undo();
    const mov = chessRef.current.move({
      from: ultimaPromocion.origen,
      to: ultimaPromocion.destino,
      promotion: piezaCorrecta,
    });
    agregarLog(`✏️ Corregido: coronó a ${NOMBRE_PIEZA[piezaCorrecta]} (${mov.san}).`);
    actualizarDesdeChess();
    if (transmitiendoRef.current) publicarEstado(true);
    setUltimaPromocion(null);
  }

  function handleDeshacer() {
    const deshecha = chessRef.current.undo();
    if (!deshecha) {
      agregarLog("No hay ninguna jugada para deshacer.");
      return;
    }
    pickupsRef.current = 0;
    desincronizadoRef.current = false;
    setUltimaPromocion(null);
    // Si la partida ya se había dado por terminada, deshacer una jugada la
    // vuelve a dejar en curso — el resultado y el PGN viejos ya no valen.
    setResultadoState(null);
    setPgn(null);
    actualizarDesdeChess();
    if (transmitiendoRef.current) publicarEstado(true);
    agregarLog(
      `⏪ Se deshizo la jugada "${deshecha.san}". Le toca mover a ${
        chessRef.current.turn() === "w" ? "blancas" : "negras"
      }. Acomodá las piezas en el tablero real para que coincida con esta posición antes de seguir.`
    );
  }

  function aplicarPosicionCorregida(fen: string) {
    chessRef.current.load(fen);
    pickupsRef.current = 0;
    desincronizadoRef.current = false;
    setUltimaPromocion(null);
    setEditandoPosicion(false);
    agregarLog("🛠 Se aplicó una posición corregida a mano. La lista de jugadas arranca de nuevo desde acá.");
    actualizarDesdeChess();
    if (transmitiendoRef.current) publicarEstado(true);
  }

  async function handleConectar() {
    setConectando(true);
    try {
      const { desconectar } = await conectarPegasus({
        onLog: agregarLog,
        onPiezaLevantada: manejarLevantada,
        onPiezaApoyada: manejarApoyada,
        onVolcadoTablero: manejarVolcado,
        onBateria: setBateria,
      });
      desconectarRef.current = desconectar;
      setConectado(true);
    } catch (err) {
      agregarLog(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setConectando(false);
  }

  function handleDesconectar() {
    desconectarRef.current?.();
    desconectarRef.current = null;
    setConectado(false);
    setBateria(null);
    agregarLog("Tablero desconectado prolijamente.");
  }

  function handleReiniciar() {
    setUltimaPromocion(null);
    setResultadoState(null);
    setPgn(null);
    pickupsRef.current = 0;
    desincronizadoRef.current = false;
    chessRef.current = new Chess();
    actualizarDesdeChess();
    agregarLog("Se reinició la partida (el tablero físico sigue conectado).");
    if (transmitiendoRef.current) publicarEstado(true);
  }

  async function handleIniciarTransmision() {
    transmitiendoRef.current = true;
    setTransmitiendo(true);
    await publicarEstado(true);
    agregarLog("🔴 Transmisión iniciada — ya se puede ver en /transmision.");
  }

  async function handleTerminarTransmision() {
    transmitiendoRef.current = false;
    setTransmitiendo(false);
    await publicarEstado(false);
    agregarLog("Transmisión terminada.");
  }

  async function handleTerminarPartida(res: ResultadoPartida) {
    const torneoVinculado = torneoIdRef.current
      ? torneos.find((t) => t.id === torneoIdRef.current)
      : undefined;

    chessRef.current.header(
      "White",
      blancasRef.current.trim() || "Blancas",
      "Black",
      negrasRef.current.trim() || "Negras",
      "Result",
      res,
      "Date",
      new Date().toISOString().slice(0, 10).replace(/-/g, "."),
      "Event",
      torneoVinculado?.nombre || "Atlántida Ajedrez",
      ...(rondaNumeroRef.current ? ["Round", String(rondaNumeroRef.current)] : [])
    );
    const pgnGenerado = chessRef.current.pgn();
    setResultadoState(res);
    setPgn(pgnGenerado);
    agregarLog(`🏁 Partida terminada: ${res}. PGN generado.`);

    if (torneoIdRef.current && rondaNumeroRef.current && empNumeroRef.current) {
      await registrarResultado(torneoIdRef.current, rondaNumeroRef.current, empNumeroRef.current, res);
      agregarLog("✅ Resultado cargado también en el torneo.");
    }

    if (transmitiendoRef.current) publicarEstado(true, res, pgnGenerado);
  }

  function descargarPgn() {
    if (!pgn) return;
    const blob = new Blob([pgn], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(blancasRef.current || "blancas").trim()}_vs_${(negrasRef.current || "negras").trim()}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!puedeUsar) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Transmitir</h1>
        <p className="text-zinc-600">Iniciá sesión para transmitir una partida.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transmitir</h1>
        <p className="mt-1 text-zinc-600">
          Conectá el tablero DGT Pegasus por Bluetooth (Chrome o Edge de computadora, tablero
          prendido y cerca) y transmitilo en vivo en /transmision.
        </p>
        {torneoId && (
          <p className="mt-1 text-sm text-blue-700">
            🔗 Vinculada al torneo &quot;{torneos.find((t) => t.id === torneoId)?.nombre ?? "?"}&quot;
            — ronda {rondaNumero}, partida {empNumero}. El resultado se va a cargar ahí también.
          </p>
        )}
      </div>

      {(jugadorBlancas || jugadorNegras) && (
        <div className="flex flex-wrap items-center justify-center gap-6 rounded-lg border border-zinc-200 bg-white p-4">
          {[
            { jugador: jugadorBlancas, nombre: blancas, color: "Blancas" },
            { jugador: jugadorNegras, nombre: negras, color: "Negras" },
          ].map(({ jugador, nombre, color }) =>
            jugador ? (
              <div key={color} className="flex items-center gap-3">
                {jugador.fotoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={jugador.fotoUrl}
                    alt={nombre}
                    className="h-12 w-12 rounded-full border border-zinc-200 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-lg font-semibold text-zinc-400">
                    {nombre.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{nombre}</p>
                  <p className="text-xs text-zinc-500">
                    {color} · Elo {jugador.eloAtlantida}
                  </p>
                </div>
              </div>
            ) : null
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">Blancas</label>
          <input
            type="text"
            value={blancas}
            onChange={(e) => cambiarBlancas(e.target.value)}
            placeholder="Nombre jugador blancas"
            className="w-48 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">Negras</label>
          <input
            type="text"
            value={negras}
            onChange={(e) => cambiarNegras(e.target.value)}
            placeholder="Nombre jugador negras"
            className="w-48 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        {!transmitiendo ? (
          <button
            onClick={handleIniciarTransmision}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            🔴 Iniciar transmisión
          </button>
        ) : (
          <button
            onClick={handleTerminarTransmision}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Terminar transmisión
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <span className="text-xs font-medium text-zinc-600">Terminar partida con resultado:</span>
        <button
          onClick={() => handleTerminarPartida("1-0")}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
        >
          1 – 0
        </button>
        <button
          onClick={() => handleTerminarPartida("1/2-1/2")}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
        >
          ½ – ½
        </button>
        <button
          onClick={() => handleTerminarPartida("0-1")}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
        >
          0 – 1
        </button>
        {resultado && <span className="text-sm font-medium text-green-700">Resultado: {resultado}</span>}
      </div>

      {pgn && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">PGN de la partida</h2>
            <button
              onClick={descargarPgn}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
            >
              Descargar .pgn
            </button>
          </div>
          <textarea
            readOnly
            value={pgn}
            className="h-32 w-full rounded border border-zinc-200 bg-zinc-50 p-2 font-mono text-xs"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleConectar}
          disabled={conectando || conectado}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {conectado ? "Conectado" : conectando ? "Conectando..." : "Conectar tablero"}
        </button>
        {conectado && (
          <button
            onClick={handleDesconectar}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Desconectar tablero
          </button>
        )}
        {bateria !== null && (
          <span
            className={`text-sm font-medium ${bateria <= 20 ? "text-red-600" : "text-zinc-500"}`}
          >
            🔋 {bateria}%
          </span>
        )}
        <button
          onClick={handleDeshacer}
          disabled={jugadas.length === 0}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ⏪ Deshacer última jugada
        </button>
        <button
          onClick={handleReiniciar}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Reiniciar partida
        </button>
        {!editandoPosicion && (
          <button
            onClick={() => setEditandoPosicion(true)}
            className="rounded-md border border-amber-400 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
          >
            🛠 Corregir posición a mano
          </button>
        )}
      </div>

      {editandoPosicion && (
        <EditorPosicion
          chess={chessRef.current}
          onAplicar={aplicarPosicionCorregida}
          onCancelar={() => setEditandoPosicion(false)}
        />
      )}

      {ultimaPromocion && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            👑 Se registró como coronación a <strong>Dama</strong>. Si en la mesa fue otra pieza,
            corregilo acá:
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => corregirPromocion("r")}
              className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium hover:bg-amber-100"
            >
              Torre
            </button>
            <button
              onClick={() => corregirPromocion("b")}
              className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium hover:bg-amber-100"
            >
              Alfil
            </button>
            <button
              onClick={() => corregirPromocion("n")}
              className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium hover:bg-amber-100"
            >
              Caballo
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Tablero (según lo que se movió)</h2>
          <TableroMini fen={fen} />
          <p className="mt-3 text-xs text-zinc-500">
            Jugadas: {jugadas.length > 0 ? jugadas.join(", ") : "ninguna todavía"}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Registro</h2>
          <div className="h-80 overflow-y-auto rounded bg-zinc-900 p-3 font-mono text-xs text-zinc-100">
            {log.length === 0 && <p className="text-zinc-500">Todavía no hay actividad.</p>}
            {log.map((linea, i) => (
              <div key={i}>{linea}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
