import type { MockSupabase } from "../test-utils/mockSupabase";

jest.mock("../../lib/supabase", () => ({
  supabase: require("../test-utils/mockSupabase").createMockSupabase(),
}));

import { supabase } from "../../lib/supabase";
import {
  createTeam,
  getRoster,
  mapSupabaseError,
  normalizeInviteCode,
  previewInviteCode,
  redeemInviteCode,
  regenerateInviteCode,
  setJoiningEnabled,
} from "../../lib/teams";

const mockSupabase = supabase as unknown as MockSupabase;

afterEach(() => {
  jest.clearAllMocks();
});

describe("mapSupabaseError", () => {
  it("passes through the known redeem_invite_code messages verbatim", () => {
    expect(mapSupabaseError(new Error("Invite code has expired"))).toBe(
      "Invite code has expired",
    );
    expect(mapSupabaseError({ message: "Invalid invite code" })).toBe(
      "Invalid invite code",
    );
  });

  it("passes through the last-coach protection message", () => {
    expect(
      mapSupabaseError(new Error("Cannot remove the last coach from a team")),
    ).toBe("Cannot remove the last coach from a team");
  });

  it("replaces an unrecognized error with the generic fallback, never leaking raw Postgres text", () => {
    expect(
      mapSupabaseError(
        new Error("duplicate key value violates unique constraint"),
      ),
    ).toBe("Something went wrong. Please try again.");
  });

  it("uses a caller-supplied fallback message when given one", () => {
    expect(
      mapSupabaseError(new Error("weird internal error"), "Could not save."),
    ).toBe("Could not save.");
  });
});

describe("normalizeInviteCode", () => {
  it("strips whitespace and upcases", () => {
    expect(normalizeInviteCode(" hjkm 2345 ")).toBe("HJKM2345");
  });
});

describe("createTeam", () => {
  it("inserts with created_by and returns the created row", async () => {
    const team = { id: "team-1", name: "Riverside Rays" };
    const single = jest.fn().mockResolvedValue({ data: team, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    mockSupabase.from.mockReturnValueOnce({ insert } as never);

    const result = await createTeam({
      name: "  Riverside Rays  ",
      createdBy: "user-1",
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Riverside Rays", created_by: "user-1" }),
    );
    expect(result).toEqual(team);
  });

  it("throws the raw error so mapSupabaseError can classify it upstream", async () => {
    const error = new Error("insert failed");
    const single = jest.fn().mockResolvedValue({ data: null, error });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    mockSupabase.from.mockReturnValueOnce({ insert } as never);

    await expect(createTeam({ name: "x", createdBy: "user-1" })).rejects.toBe(
      error,
    );
  });
});

describe("getRoster", () => {
  it("sorts coaches before players, then alphabetically by last name", async () => {
    const rows = [
      {
        user_id: "u-player-b",
        role: "player",
        status: "active",
        joined_at: "2026-01-01",
        profiles: {
          first_name: "Zed",
          last_name: "Beta",
          display_name: "Zed Beta",
        },
      },
      {
        user_id: "u-coach",
        role: "coach",
        status: "active",
        joined_at: "2026-01-01",
        profiles: {
          first_name: "Dana",
          last_name: "Whitfield",
          display_name: "Dana Whitfield",
        },
      },
      {
        user_id: "u-player-a",
        role: "player",
        status: "active",
        joined_at: "2026-01-01",
        profiles: {
          first_name: "Marcus",
          last_name: "Alpha",
          display_name: "Marcus Alpha",
        },
      },
    ];
    const eq = jest.fn().mockResolvedValue({ data: rows, error: null });
    const select = jest.fn().mockReturnValue({ eq });
    mockSupabase.from.mockReturnValueOnce({ select } as never);

    const roster = await getRoster("team-1");

    expect(roster.map((m) => m.userId)).toEqual([
      "u-coach",
      "u-player-a",
      "u-player-b",
    ]);
  });
});

describe("previewInviteCode / redeemInviteCode", () => {
  it("returns null when the RPC finds no matching (or no longer redeemable) code", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    const result = await previewInviteCode("bad-code");

    expect(result).toBeNull();
  });

  it("normalizes the code before calling the RPC and maps the returned row", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: [
        { team_id: "team-1", team_name: "Riverside Rays", role: "player" },
      ],
      error: null,
    });

    const result = await previewInviteCode(" hjkm 2345 ");

    expect(mockSupabase.rpc).toHaveBeenCalledWith("preview_invite_code", {
      p_code: "HJKM2345",
    });
    expect(result).toEqual({
      teamId: "team-1",
      teamName: "Riverside Rays",
      role: "player",
    });
  });

  it("redeemInviteCode returns the joined team id", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: "team-1", error: null });

    await expect(redeemInviteCode("HJKM2345")).resolves.toBe("team-1");
  });

  it("redeemInviteCode surfaces the database error for mapSupabaseError to classify", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Invite code has been revoked" },
    });

    await expect(redeemInviteCode("HJKM2345")).rejects.toEqual({
      message: "Invite code has been revoked",
    });
  });
});

describe("setJoiningEnabled", () => {
  it("clears revoked_at/revoked_by to re-enable the same code", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    mockSupabase.from.mockReturnValueOnce({ update } as never);

    await setJoiningEnabled("code-1", true, "user-1");

    expect(update).toHaveBeenCalledWith({ revoked_at: null, revoked_by: null });
  });

  it("sets revoked_at/revoked_by to pause the code", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    mockSupabase.from.mockReturnValueOnce({ update } as never);

    await setJoiningEnabled("code-1", false, "user-1");

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ revoked_by: "user-1" }),
    );
  });
});

describe("regenerateInviteCode", () => {
  it("creates the new code before revoking the previous one, so the team is never codeless", async () => {
    const calls: string[] = [];

    const insertSingle = jest
      .fn()
      .mockResolvedValue({ data: { id: "code-2", code: "NEW1" }, error: null });
    const insertSelect = jest.fn().mockReturnValue({ single: insertSingle });
    const insert = jest.fn().mockImplementation(() => {
      calls.push("insert");
      return { select: insertSelect };
    });

    const revokeEq = jest.fn().mockImplementation(() => {
      calls.push("revoke");
      return Promise.resolve({ error: null });
    });
    const update = jest.fn().mockReturnValue({ eq: revokeEq });

    mockSupabase.from
      .mockReturnValueOnce({ insert } as never)
      .mockReturnValueOnce({ update } as never);

    const created = await regenerateInviteCode("team-1", "code-1", "user-1");

    expect(calls).toEqual(["insert", "revoke"]);
    expect(created).toEqual({ id: "code-2", code: "NEW1" });
  });

  it("skips revoking when there was no previous code", async () => {
    const insertSingle = jest
      .fn()
      .mockResolvedValue({ data: { id: "code-1", code: "NEW1" }, error: null });
    const insertSelect = jest.fn().mockReturnValue({ single: insertSingle });
    const insert = jest.fn().mockReturnValue({ select: insertSelect });
    mockSupabase.from.mockReturnValueOnce({ insert } as never);

    await regenerateInviteCode("team-1", null, "user-1");

    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });
});
