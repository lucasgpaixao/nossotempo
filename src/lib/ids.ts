import { customAlphabet } from "nanoid";

const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** public_id curto para /p/{id} */
export const createPublicId = customAlphabet(alphabet, 12);

/** edit_token para link mágico de edição */
export const createEditToken = customAlphabet(alphabet, 24);
