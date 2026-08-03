import { useRef, useState, type ChangeEvent } from "react";
import { motion } from "motion/react";
import { Camera, Home, ImagePlus, Trees, X } from "lucide-react";
import type { PlantLocation, UserPlant } from "../types";

export function CustomPlantModal({
  defaultLocation = "home",
  initialPhoto = null,
  onConfirm,
  onClose,
}: {
  defaultLocation?: PlantLocation;
  initialPhoto?: string | null;
  onConfirm: (data: Partial<UserPlant> & { nickname: string; wateringInterval: number; location: PlantLocation }) => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [latinName, setLatinName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🌿");
  const [photo, setPhoto] = useState<string | null>(initialPhoto);
  const [interval, setWaterInterval] = useState(7);
  const [location, setLocation] = useState<PlantLocation>(defaultLocation);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onConfirm({
      nickname: name.trim(),
      wateringInterval: interval,
      location,
      customName: name.trim(),
      customLatinName: latinName.trim(),
      customDescription: description.trim(),
      customEmoji: emoji,
      photo,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="relative bg-background rounded-t-3xl w-full max-w-md"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="px-5 pt-2 pb-8 space-y-4 overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Своё растение</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <X size={16} />
            </button>
          </div>

          {/* Photo */}
          <div
            onClick={() => fileRef.current?.click()}
            className="relative bg-secondary border-2 border-dashed border-primary/25 rounded-2xl overflow-hidden cursor-pointer h-36 flex items-center justify-center"
          >
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
            {photo ? (
              <>
                <img src={photo} alt="" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur rounded-full px-2.5 py-1 text-xs flex items-center gap-1">
                  <Camera size={10} /> Изменить
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ImagePlus size={28} className="text-primary" />
                <p className="text-xs text-muted-foreground">Добавить фото (необязательно)</p>
              </div>
            )}
          </div>

          {/* Emoji + Name */}
          <div className="flex gap-2">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Эмодзи</label>
              <input
                value={emoji} onChange={e => setEmoji(e.target.value)}
                className="w-14 bg-muted rounded-xl px-2 py-3 text-center text-xl outline-none"
                maxLength={2}
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Название *</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Например: Моя петуния"
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Латинское название</label>
            <input
              value={latinName} onChange={e => setLatinName(e.target.value)}
              placeholder="Petunia × hybrida (необязательно)"
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Описание</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Заметки об особенностях растения..."
              rows={3}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Где растёт?</label>
            <div className="flex bg-muted rounded-2xl p-1 gap-1">
              <button onClick={() => setLocation("home")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${location === "home" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                <Home size={15} /> Дома
              </button>
              <button onClick={() => setLocation("outdoor")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${location === "outdoor" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                <Trees size={15} /> На участке
              </button>
            </div>
          </div>

          {/* Interval */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">
              Полив каждые <strong className="text-foreground">{interval}</strong> дн.
            </label>
            <input type="range" min={1} max={60} value={interval} onChange={e => setWaterInterval(Number(e.target.value))} className="w-full accent-primary" />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-border text-sm font-medium">Отмена</button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
            >
              Добавить
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
