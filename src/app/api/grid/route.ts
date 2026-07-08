import { handleMutation } from "@/lib/auth/api";

export async function POST(req: Request) {
  const { op, clientId, sectionKey, cellKey, value } = await req.json();
  return handleMutation((c, uid) => {
    if (op === "delete") {
      return c.query(
        `delete from grid_cells where client_id = $1 and section_key = $2 and cell_key = $3`,
        [clientId, sectionKey, cellKey]
      );
    }
    return c.query(
      `insert into grid_cells (client_id, section_key, cell_key, value, updated_by, updated_at)
       values ($1, $2, $3, $4, $5, now())
       on conflict (client_id, section_key, cell_key)
       do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
      [clientId, sectionKey, cellKey, value, uid]
    );
  });
}
