"use client";
import { useState } from "react";
import { getCashierToken, clearCashierToken } from "@/lib/cashier-session";
import { PinLoginScreen } from "./PinLoginScreen";
import { PosScreen } from "./PosScreen";

export function CashierShell() {
  const [loggedIn, setLoggedIn] = useState(() => getCashierToken() !== null);

  function handleLoginSuccess() {
    setLoggedIn(true);
  }

  function handleSessionExpired() {
    clearCashierToken();
    setLoggedIn(false);
  }

  if (!loggedIn) {
    return <PinLoginScreen onLoginSuccess={handleLoginSuccess} />;
  }
  return <PosScreen onSessionExpired={handleSessionExpired} />;
}
