import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { actions, type Consultant } from "@/lib/store";
import { toast } from "sonner";
import { User, Phone, Mail, MapPin, CheckCircle2, XCircle } from "lucide-react";

interface ConsultantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultant?: Consultant | null;
}

export function ConsultantModal({ open, onOpenChange, consultant }: ConsultantModalProps) {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (consultant) {
      setFullName(consultant.fullName || "");
      setPhone(consultant.phone || "");
      setEmail(consultant.email || "");
      setAddress(consultant.address || "");
      setStatus(consultant.status || "active");
    } else {
      setFullName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setStatus("active");
    }
  }, [consultant, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error(isAr ? "يرجى إدخال اسم الاستشاري" : "Please enter the consultant's full name");
      return;
    }

    setSubmitting(true);
    try {
      if (consultant) {
        actions.updateConsultant(consultant.id, {
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          status,
        });
        toast.success(t("consultantUpdatedSuccess"));
      } else {
        actions.addConsultant({
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          status,
        });
        toast.success(t("consultantAddedSuccess"));
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save consultant");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl p-6 sm:p-7">
        <DialogHeader className="mb-4 text-start">
          <DialogTitle className="text-xl font-black text-foreground">
            {consultant ? t("editConsultant") : t("addConsultant")}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {consultant
              ? isAr
                ? "تعديل تفاصيل وبيانات الاتصال بالاستشاري"
                : "Update consultant profile and contact information"
              : isAr
                ? "إضافة استشاري أو مكتب استشاري جديد إلى النظام"
                : "Add a new consultant or engineering office to the system"}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-foreground">
              <User className="h-3.5 w-3.5 text-primary" />
              {t("consultantFullName")} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={isAr ? "مثال: م. أحمد عبد العزيز / دار الهندسة" : "e.g. Eng. Ahmed Abdelaziz / Dar Al-Handasah"}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Phone & Email (2 columns) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Phone className="h-3.5 w-3.5 text-primary" />
                {t("consultantPhone")}
              </label>
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+20 100 000 0000"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Mail className="h-3.5 w-3.5 text-primary" />
                {t("consultantEmail")}
              </label>
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="consultant@example.com"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {t("consultantAddress")}
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={isAr ? "مثال: التجمع الخامس، القاهرة الجديدة" : "e.g. 5th Settlement, New Cairo"}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Status (Active / Inactive) */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground">
              {t("status")}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus("active")}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all ${
                  status === "active"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xs dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "border-border bg-background text-muted-foreground hover:bg-secondary"
                }`}
              >
                <CheckCircle2 className={`h-4 w-4 ${status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
                {t("activeStatus")}
              </button>

              <button
                type="button"
                onClick={() => setStatus("inactive")}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all ${
                  status === "inactive"
                    ? "border-rose-500 bg-rose-50 text-rose-700 shadow-xs dark:bg-rose-950/40 dark:text-rose-400"
                    : "border-border bg-background text-muted-foreground hover:bg-secondary"
                }`}
              >
                <XCircle className={`h-4 w-4 ${status === "inactive" ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`} />
                {t("inactiveStatus")}
              </button>
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-bold"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              {consultant ? t("editConsultant") : t("addConsultant")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
