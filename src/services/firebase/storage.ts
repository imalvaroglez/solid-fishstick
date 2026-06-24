import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  connectStorageEmulator,
  type FirebaseStorage,
} from "firebase/storage";
import { getFirebase, useEmulator, EMULATOR_HOST } from "./app";
import { rethrowFirebaseError } from "./diagnostics";
import { id } from "../../lib/ids";

let cached: FirebaseStorage | null = null;

const storage = (): FirebaseStorage => {
  if (cached) return cached;
  cached = getStorage(getFirebase());
  if (useEmulator) {
    connectStorageEmulator(cached, EMULATOR_HOST, 29196);
  }
  return cached;
};

const MAX_DIM = 1600;
const QUALITY = 0.8;

// Downscale to max 1600px on the longest edge, re-encode as JPEG q0.8.
// Keeps uploads small without a heavy image dependency.
export const resizeImage = (file: File): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas no disponible"));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen")),
        "image/jpeg",
        QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });

export type UploadedImage = { imageUrl: string; imagePath: string };

// Uploads to stores/{storeId}/product-images/{productId}/{id}.jpg (Store OS) or
// the legacy product-images/{productId}/{id}.jpg when no storeId is given.
export const uploadProductImage = async (
  file: File,
  productId: string,
  storeId?: string
): Promise<UploadedImage> => {
  const blob = await resizeImage(file);
  const dir = storeId
    ? `stores/${storeId}/product-images/${productId}`
    : `product-images/${productId}`;
  const imagePath = `${dir}/${id()}.jpg`;
  const storageRef = ref(storage(), imagePath);
  try {
    await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
    const imageUrl = await getDownloadURL(storageRef);
    return { imageUrl, imagePath };
  } catch (error) {
    return rethrowFirebaseError("upload", dir, imagePath, error);
  }
};
