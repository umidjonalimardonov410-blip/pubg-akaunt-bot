import { describe, expect, it, vi } from "vitest";
import { uploadProfileAvatar } from "./profileUpload";

describe("profile avatar upload", () => {
  it("encodes an accepted image and sends it to the S3 media mutation", async () => {
    const upload = vi.fn().mockResolvedValue({ url: "https://storage.example/profile-avatar.webp" });
    const file = new File(["avatar-bytes"], "avatar.webp", { type: "image/webp" });

    const result = await uploadProfileAvatar(file, upload);

    expect(upload).toHaveBeenCalledWith({
      fileName: "profile-avatar.webp",
      contentType: "image/webp",
      dataBase64: expect.any(String),
    });
    expect((upload.mock.calls[0]?.[0] as { dataBase64: string }).dataBase64.length).toBeGreaterThan(0);
    expect(result.url).toBe("https://storage.example/profile-avatar.webp");
  });

  it("rejects unsupported profile image formats before any storage call", async () => {
    const upload = vi.fn();
    const file = new File(["not-an-image"], "avatar.gif", { type: "image/gif" });

    await expect(uploadProfileAvatar(file, upload)).rejects.toThrow("JPG, PNG yoki WEBP");
    expect(upload).not.toHaveBeenCalled();
  });
});
