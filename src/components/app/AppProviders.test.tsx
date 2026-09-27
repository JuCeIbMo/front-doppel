import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
const signOut = vi.fn();
vi.mock("@/lib/supabase", () => ({ signOut: () => signOut(), getAccessToken: vi.fn() }));

import { ApiError } from "@/lib/api-client";
import { AppProviders } from "./AppProviders";

function FailingQuery({ status }: { status: number }) {
  useQuery({
    queryKey: ["failing", status],
    queryFn: () => Promise.reject(new ApiError({ status, message: "no" })),
    retry: false,
  });
  return null;
}

function FailingMutation() {
  const { mutate } = useMutation({
    mutationFn: () => Promise.reject(new ApiError({ status: 401, message: "no" })),
  });
  useEffect(() => mutate(), [mutate]);
  return null;
}

describe("AppProviders", () => {
  beforeEach(() => {
    replace.mockClear();
    signOut.mockClear();
  });

  it("ends the session and sends the Owner to sign in when a query answers 401", async () => {
    render(
      <AppProviders>
        <FailingQuery status={401} />
      </AppProviders>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/connect"));
    expect(signOut).toHaveBeenCalled();
  });

  it("does the same when a mutation answers 401", async () => {
    render(
      <AppProviders>
        <FailingMutation />
      </AppProviders>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/connect"));
    expect(signOut).toHaveBeenCalled();
  });

  it("leaves any other error to the screen", async () => {
    render(
      <AppProviders>
        <FailingQuery status={500} />
      </AppProviders>,
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(replace).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });
});
