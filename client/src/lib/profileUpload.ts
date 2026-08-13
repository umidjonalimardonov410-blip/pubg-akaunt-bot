export type ProfileImageContentType = "image/jpeg" | "image/png" | "image/webp";

export const PROFILE_IMAGE_CONTENT_TYPES: readonly ProfileImageContentType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export type ProfileAvatarUploadInput = {
  fileName: string;
  contentType: ProfileImageContentType;
  dataBase64: string;
};

export type ProfileAvatarUploadResult = { url: string };

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error ?? new Error("Faylni o‘qib bo‘lmadi."));
    reader.readAsDataURL(file);
  });
}

export async function uploadProfileAvatar(
  file: File,
  upload: (input: ProfileAvatarUploadInput) => Promise<ProfileAvatarUploadResult>,
): Promise<ProfileAvatarUploadResult> {
  if (!PROFILE_IMAGE_CONTENT_TYPES.includes(file.type as ProfileImageContentType)) {
    throw new Error("Profil rasmi JPG, PNG yoki WEBP bo‘lishi kerak.");
  }

  return upload({
    fileName: `profile-${file.name}`,
    contentType: file.type as ProfileImageContentType,
    dataBase64: await readFileAsBase64(file),
  });
}
