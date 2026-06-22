import { useRef, useState } from "react";
import { STRINGS } from "../lib/strings";

type Props = {
  productId: string;
  initialImageUrl?: string;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
};

// Image picker with gallery + camera-capture inputs, preview, remove/replace.
// Holds the selected File; the actual upload happens on form submit.
export const ImagePicker = ({
  initialImageUrl,
  onFileChange,
  disabled,
}: Props) => {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | undefined>(initialImageUrl);

  const pick = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    onFileChange(file);
  };

  const remove = () => {
    setPreview(undefined);
    onFileChange(null);
    if (galleryRef.current) galleryRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  if (preview) {
    return (
      <div className="space-y-2">
        <img
          src={preview}
          alt="Vista previa"
          className="h-44 w-full rounded-xl object-cover"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={disabled}
            className="flex-1 rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-700 active:scale-[0.99] transition disabled:opacity-50"
          >
            {STRINGS.image.change}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={disabled}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 active:scale-[0.99] transition disabled:opacity-50"
          >
            {STRINGS.image.remove}
          </button>
        </div>
        <HiddenInputs galleryRef={galleryRef} cameraRef={cameraRef} onPick={pick} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => galleryRef.current?.click()}
        disabled={disabled}
        className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-gray-300 bg-gray-50 py-5 text-sm font-semibold text-gray-700 active:scale-[0.99] transition disabled:opacity-50"
      >
        <span className="text-2xl">🖼️</span>
        {STRINGS.image.fromGallery}
      </button>
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        disabled={disabled}
        className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-gray-300 bg-gray-50 py-5 text-sm font-semibold text-gray-700 active:scale-[0.99] transition disabled:opacity-50"
      >
        <span className="text-2xl">📷</span>
        {STRINGS.image.fromCamera}
      </button>
      <HiddenInputs galleryRef={galleryRef} cameraRef={cameraRef} onPick={pick} />
    </div>
  );
};

// Two hidden inputs: gallery (no capture) + camera (capture=environment).
const HiddenInputs = ({
  galleryRef,
  cameraRef,
  onPick,
}: {
  galleryRef: React.RefObject<HTMLInputElement | null>;
  cameraRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file?: File) => void;
}) => (
  <>
    <input
      ref={galleryRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => onPick(e.target.files?.[0])}
    />
    <input
      ref={cameraRef}
      type="file"
      accept="image/*"
      capture="environment"
      className="hidden"
      onChange={(e) => onPick(e.target.files?.[0])}
    />
  </>
);
