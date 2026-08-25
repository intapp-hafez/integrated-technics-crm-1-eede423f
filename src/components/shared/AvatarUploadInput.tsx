import React, { useRef, useState } from "react";
import { Upload, Loader2, X, Image as ImageIcon, Check } from "lucide-react";
import { sbUploadAvatar, validateAvatarFile } from "@/lib/supabaseWrites";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface AvatarUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AvatarUploadInput({
  value,
  onChange,
  label,
  placeholder,
  className = "",
  disabled = false,
}: AvatarUploadInputProps) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const displayLabel = label ?? (isAr ? "صورة الموظف / الرابط" : "Employee Image URL");
  const displayPlaceholder =
    placeholder ?? (isAr ? "أدخل رابط الصورة أو اختر ملفاً للرفع..." : "Paste image URL or click upload...");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate format & max 1MB
    const validationErr = validateAvatarFile(file);
    if (validationErr) {
      toast.error(
        isAr
          ? file.size > 1024 * 1024
            ? "حجم الصورة يتجاوز 1 ميجابايت. يرجى اختيار ملف أصغر."
            : "صيغة الملف غير مدعومة. الصيغ المسموحة: PNG, JPG, JPEG, WEBP."
          : validationErr,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      setIsUploading(true);
      const uploadToastId = toast.loading(isAr ? "جاري رفع الصورة..." : "Uploading image...");
      const publicUrl = await sbUploadAvatar(file);
      onChange(publicUrl);
      toast.success(isAr ? "تم رفع الصورة بنجاح" : "Image uploaded successfully", {
        id: uploadToastId,
      });
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "فشل رفع الصورة" : "Failed to upload image"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {displayLabel}
        </label>
        <span className="text-[10px] text-muted-foreground/70">
          PNG, JPG, JPEG, WEBP · Max 1MB
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Thumbnail Preview / Indicator */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary/40">
          {value ? (
            <img
              src={value}
              alt="Avatar preview"
              className="h-full w-full object-cover"
              onError={(e) => {
                // If broken URL, hide image and show fallback
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <ImageIcon className="h-4 w-4 text-muted-foreground/60" />
          )}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-xs">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* URL Input */}
        <div className="relative min-w-0 flex-1">
          <input
            type="url"
            value={value}
            disabled={disabled || isUploading}
            onChange={(e) => onChange(e.target.value)}
            placeholder={displayPlaceholder}
            className="h-10 w-full rounded-lg border border-border bg-background pe-8 ps-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          />
          {value && !disabled && !isUploading && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              title={isAr ? "مسح الرابط" : "Clear URL"}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
        />

        {/* Upload Button */}
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-secondary/80 px-3 text-xs font-semibold text-foreground transition hover:bg-secondary hover:border-primary/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          title={isAr ? "رفع صورة من الجهاز (بحد أقصى 1 ميجابايت)" : "Upload image from device (max 1MB)"}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>{isAr ? "جاري الرفع..." : "Uploading..."}</span>
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5 text-primary" />
              <span>{isAr ? "رفع صورة" : "Upload"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
