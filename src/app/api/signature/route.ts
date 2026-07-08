import { handleMutation } from "@/lib/auth/api";

export async function POST(req: Request) {
  const { op, clientId, sectionKey, signerIndex, signerName, image } = await req.json();
  return handleMutation((c, uid) => {
    if (op === "delete") {
      return c.query(
        `delete from signatures where client_id = $1 and section_key = $2 and signer_index = $3`,
        [clientId, sectionKey, signerIndex]
      );
    }
    return c.query(
      `insert into signatures (client_id, section_key, signer_index, signer_name, image, signed_by, signed_at)
       values ($1, $2, $3, $4, $5, $6, now())
       on conflict (client_id, section_key, signer_index)
       do update set image = excluded.image, signer_name = excluded.signer_name,
                     signed_by = excluded.signed_by, signed_at = now()`,
      [clientId, sectionKey, signerIndex, signerName, image, uid]
    );
  });
}
