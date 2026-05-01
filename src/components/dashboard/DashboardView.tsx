"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { authenticatedFetch } from "@/lib/api";
import { clearToken } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

interface Tenant {
  id: string;
  business_name: string;
  email: string | null;
  plan: string;
  status: string;
}

interface WhatsAppAccount {
  id: string;
  waba_id: string;
  phone_number_id: string;
  display_phone: string | null;
  status: string;
}

interface BotConfig {
  id: string;
  system_prompt: string;
  welcome_message: string;
  language: string;
  ai_model: string;
  bot_enabled: boolean;
}

interface Message {
  id: string;
  user_phone: string;
  direction: string;
  content: string | null;
  message_type: string;
  created_at: string;
}

interface MessagePage {
  messages: Message[];
  total: number;
  limit: number;
  offset: number;
}

interface AdminPhonesPayload {
  phones: string[];
}

type SaveStatus = "idle" | "saving" | "ok" | "error";

export function DashboardView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [whatsapp, setWhatsapp] = useState<WhatsAppAccount | null>(null);
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesTotal, setMessagesTotal] = useState(0);
  const [form, setForm] = useState({
    system_prompt: "",
    welcome_message: "",
    language: "es",
    ai_model: "claude-sonnet-4-20250514",
    bot_enabled: true,
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [disconnecting, setDisconnecting] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const loadDashboard = useCallback(async () => {
    const responses = await Promise.all([
      authenticatedFetch("/me/tenant"),
      authenticatedFetch("/me/whatsapp"),
      authenticatedFetch("/me/bot-config"),
      authenticatedFetch("/me/messages?limit=20&offset=0"),
      authenticatedFetch("/me/admin-phones"),
    ]);
    const [tenantRes, whatsappRes, botRes, messagesRes, adminPhonesRes] = responses;

    if (tenantRes.status === 401) {
      clearToken();
      router.replace("/connect");
      return;
    }

    if (tenantRes.status === 404) {
      router.replace("/connect");
      return;
    }

    const tenantData: Tenant = await tenantRes.json();
    const whatsappData: WhatsAppAccount[] = await whatsappRes.json();
    setTenant(tenantData);
    setWhatsapp(whatsappData[0] ?? null);

    if (adminPhonesRes.ok && whatsappData[0]?.status === "connected") {
      const adminPhones: AdminPhonesPayload = await adminPhonesRes.json();
      if ((adminPhones.phones || []).length === 0) {
        const params = new URLSearchParams();
        if (whatsappData[0]?.display_phone) params.set("phone", whatsappData[0].display_phone);
        if (tenantData.business_name) params.set("business", tenantData.business_name);
        router.replace(`/connect/manager?${params.toString()}`);
        return;
      }
    }

    if (botRes.ok) {
      const botData: BotConfig = await botRes.json();
      setBotConfig(botData);
      setForm({
        system_prompt: botData.system_prompt,
        welcome_message: botData.welcome_message,
        language: botData.language,
        ai_model: botData.ai_model,
        bot_enabled: botData.bot_enabled,
      });
    } else {
      setBotConfig(null);
    }

    if (messagesRes.ok) {
      const page: MessagePage = await messagesRes.json();
      setMessages(page.messages);
      setMessagesTotal(page.total);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard().finally(() => setLoading(false));
  }, [loadDashboard]);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const res = await authenticatedFetch("/me/bot-config", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const updated: BotConfig = await res.json();
      setBotConfig(updated);
      setForm({
        system_prompt: updated.system_prompt,
        welcome_message: updated.welcome_message,
        language: updated.language,
        ai_model: updated.ai_model,
        bot_enabled: updated.bot_enabled,
      });
      setSaveStatus("ok");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [form]);

  const handleDisconnect = useCallback(async () => {
    if (!confirm("Seguro que quieres desconectar tu WhatsApp en Doppel?")) return;
    setDisconnecting(true);
    try {
      await authenticatedFetch("/me/whatsapp", { method: "DELETE" });
      await loadDashboard();
    } finally {
      setDisconnecting(false);
    }
  }, [loadDashboard]);

  const handleDeleteAccount = useCallback(async () => {
    if (!confirm("Esta accion elimina tu cuenta, mensajes y configuracion en Doppel. Continuar?")) {
      return;
    }

    setDeletingAccount(true);
    try {
      const res = await authenticatedFetch("/me/account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      clearToken();
      router.replace("/");
    } finally {
      setDeletingAccount(false);
    }
  }, [router]);

  const handleLogout = useCallback(async () => {
    await authenticatedFetch("/auth/logout", { method: "POST" }).catch(() => {});
    clearToken();
    router.replace("/");
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const phoneDisplay = whatsapp?.display_phone ?? whatsapp?.phone_number_id ?? "-";
  const isConnected = whatsapp?.status === "connected";
  const canReply = Boolean(form.bot_enabled && isConnected);

  return (
    <div className="min-h-screen bg-bg-primary px-6 py-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-text-primary font-bold text-xl">Doppel</span>
            <p className="text-text-secondary text-sm mt-1">
              Panel operativo para tu WhatsApp Business automatizado.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-text-secondary text-sm hover:text-text-primary transition-colors cursor-pointer"
          >
            Cerrar sesion
          </button>
        </div>

        <DashboardNav />

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="flex flex-col gap-6">
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-text-secondary text-sm mb-1">Negocio</p>
                  <p className="text-text-primary font-semibold text-lg">
                    {tenant?.business_name ?? "-"}
                  </p>
                  <p className="text-text-secondary text-sm mt-3 mb-1">WhatsApp</p>
                  <p className="text-text-primary font-medium">{phoneDisplay}</p>
                  <p className="text-text-secondary text-sm mt-3">
                    Plan: {tenant?.plan ?? "free"} - Estado: {tenant?.status ?? "active"}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${
                    isConnected ? "bg-accent/15 text-accent" : "bg-white/8 text-text-secondary"
                  }`}
                >
                  {isConnected ? "Conectado" : "Desconectado"}
                </span>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-text-primary font-semibold text-base">Estado del bot</h2>
                  <p className="text-text-secondary text-sm mt-1">
                    {canReply
                      ? "El bot puede responder mensajes de texto entrantes."
                      : "El bot esta pausado o no hay un WhatsApp conectado."}
                  </p>
                </div>
                <label className="inline-flex items-center gap-3 text-sm text-text-primary">
                  <span>{form.bot_enabled ? "Activado" : "Pausado"}</span>
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, bot_enabled: !current.bot_enabled }))}
                    className={`w-12 h-7 rounded-full transition-colors ${
                      form.bot_enabled ? "bg-accent" : "bg-white/10"
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full bg-black transition-transform ${
                        form.bot_enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </label>
              </div>

              {botConfig === null ? (
                <p className="text-text-secondary text-sm">
                  Sin configuracion disponible. Reconecta tu cuenta para inicializarla.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-text-secondary text-sm mb-2">Idioma</label>
                      <input
                        type="text"
                        value={form.language}
                        onChange={(e) => setForm((current) => ({ ...current, language: e.target.value }))}
                        maxLength={10}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-text-secondary text-sm mb-2">Modelo</label>
                      <input
                        type="text"
                        value={form.ai_model}
                        onChange={(e) => setForm((current) => ({ ...current, ai_model: e.target.value }))}
                        maxLength={50}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-text-secondary text-sm mb-2">Mensaje de bienvenida</label>
                    <input
                      type="text"
                      value={form.welcome_message}
                      onChange={(e) => setForm((current) => ({ ...current, welcome_message: e.target.value }))}
                      maxLength={500}
                      placeholder="Hola, en que puedo ayudarte?"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-text-secondary text-sm mb-2">
                      Instrucciones del bot
                    </label>
                    <textarea
                      value={form.system_prompt}
                      onChange={(e) => setForm((current) => ({ ...current, system_prompt: e.target.value }))}
                      maxLength={4000}
                      rows={6}
                      placeholder="Eres un asistente de atencion al cliente para..."
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all text-sm resize-none"
                    />
                    <p className="text-text-secondary text-xs mt-1 text-right">
                      {form.system_prompt.length}/4000
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button variant="primary" onClick={handleSave} disabled={saveStatus === "saving"}>
                      {saveStatus === "saving" ? "Guardando..." : "Guardar cambios"}
                    </Button>
                    {saveStatus === "ok" && <span className="text-accent text-sm">Guardado</span>}
                    {saveStatus === "error" && <span className="text-red-400 text-sm">Error al guardar</span>}
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-text-primary font-semibold text-base">Mensajes recientes</h2>
                  <p className="text-text-secondary text-sm mt-1">
                    Historial operativo del ultimo tramo de conversaciones.
                  </p>
                </div>
                <span className="text-xs text-text-secondary">{messagesTotal} mensajes</span>
              </div>

              {messages.length === 0 ? (
                <p className="text-text-secondary text-sm">
                  Aun no hay mensajes registrados para este tenant.
                </p>
              ) : (
                <div className="flex flex-col gap-3 max-h-[28rem] overflow-auto pr-1">
                  {messages.map((message) => (
                    <div key={message.id} className="rounded-2xl border border-white/8 bg-white/3 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`text-xs font-semibold uppercase tracking-wide ${
                            message.direction === "inbound" ? "text-text-secondary" : "text-accent"
                          }`}
                        >
                          {message.direction === "inbound" ? "Inbound" : "Outbound"}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {new Date(message.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-2">Cliente: {message.user_phone}</p>
                      <p className="text-sm text-text-primary mt-2">
                        {message.content ?? `Mensaje tipo ${message.message_type}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h2 className="text-text-primary font-semibold text-base mb-3">Acciones de cuenta</h2>
              <p className="text-text-secondary text-sm mb-5">
                La desconexion pausa el bot y desactiva la cuenta dentro de Doppel. La eliminacion
                borra los datos almacenados en esta plataforma.
              </p>

              <div className="flex flex-col gap-3">
                <Button variant="ghost" onClick={handleDisconnect} disabled={disconnecting}>
                  {disconnecting ? "Desconectando..." : "Desconectar WhatsApp"}
                </Button>
                <Button variant="ghost" onClick={handleDeleteAccount} disabled={deletingAccount} className="text-red-400 hover:text-red-300">
                  {deletingAccount ? "Eliminando cuenta..." : "Eliminar cuenta y datos"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
