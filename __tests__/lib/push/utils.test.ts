import { urlBase64ToUint8Array } from "../../../lib/push/utils";

describe("urlBase64ToUint8Array", () => {
  it("decodes a URL-safe base64 string into bytes", () => {
    // "hello" base64-encoded, standard alphabet: aGVsbG8=
    const result = urlBase64ToUint8Array("aGVsbG8=");
    expect(Array.from(result)).toEqual([104, 101, 108, 108, 111]);
  });

  it("handles URL-safe characters (- and _) in place of + and /", () => {
    // Bytes [251, 255, 191] base64-encode to "-/-/" using the URL-safe alphabet
    // (standard alphabet would use + and /).
    const standard = urlBase64ToUint8Array("+/+/");
    const urlSafe = urlBase64ToUint8Array("-_-_");
    expect(Array.from(urlSafe)).toEqual(Array.from(standard));
  });

  it("pads unpadded base64 strings to a multiple of 4", () => {
    // "fo" -> "Zm8" (unpadded, length 3, needs one '=' pad)
    const result = urlBase64ToUint8Array("Zm8");
    expect(Array.from(result)).toEqual([102, 111]);
  });

  it("returns an empty array for an empty string", () => {
    const result = urlBase64ToUint8Array("");
    expect(result.length).toBe(0);
  });
});
