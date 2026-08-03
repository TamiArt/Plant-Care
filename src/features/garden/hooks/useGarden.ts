import { useCallback, useState } from "react";
import { loadGarden, saveGarden, type GardenSaveResult } from "../repository/storage";
import type { PlantLocation, PlantNote, PlantReminder, UserPlant } from "../types";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useGarden() {
  const [initial] = useState(loadGarden);
  const [plants, setPlants] = useState<UserPlant[]>(initial.plants);
  const [storageError, setStorageError] = useState<string | null>(initial.error ?? null);

  const persist = useCallback((next: UserPlant[]): GardenSaveResult => {
    setPlants(next);
    const result = saveGarden(next);
    setStorageError(result.error ?? null);
    return result;
  }, []);

  const addPlant = useCallback((catalogId: string | null, nickname: string, wateringInterval: number, photo: string | null = null, location: PlantLocation = "home", extra: Partial<UserPlant> = {}) => {
    const plant: UserPlant = {
      id: uid(), catalogId, nickname, photo, wateringInterval,
      wateringHistory: [], mistingHistory: [], fertilizingInterval: 30,
      fertilizingHistory: [], notes: [], reminders: [], addedAt: todayStr(), location,
      ...extra,
    };
    persist([...plants, plant]);
  }, [plants, persist]);

  const removePlant = useCallback((id: string) => persist(plants.filter(plant => plant.id !== id)), [plants, persist]);
  const updatePlant = useCallback((id: string, changes: Partial<UserPlant>) => persist(plants.map(plant => plant.id === id ? { ...plant, ...changes } : plant)), [plants, persist]);
  const addHistoryEntry = useCallback((id: string, field: "wateringHistory" | "mistingHistory" | "fertilizingHistory") => persist(plants.map(plant => plant.id === id ? { ...plant, [field]: [...plant[field], todayStr()] } : plant)), [plants, persist]);
  const waterPlant = useCallback((id: string) => addHistoryEntry(id, "wateringHistory"), [addHistoryEntry]);
  const mistPlant = useCallback((id: string) => addHistoryEntry(id, "mistingHistory"), [addHistoryEntry]);
  const fertilizePlant = useCallback((id: string) => addHistoryEntry(id, "fertilizingHistory"), [addHistoryEntry]);

  const addNote = useCallback((id: string, content: string) => {
    const note: PlantNote = { id: uid(), createdAt: todayStr(), content };
    persist(plants.map(plant => plant.id === id ? { ...plant, notes: [...plant.notes, note] } : plant));
  }, [plants, persist]);
  const updateNote = useCallback((plantId: string, noteId: string, content: string) => persist(plants.map(plant => plant.id === plantId ? { ...plant, notes: plant.notes.map(note => note.id === noteId ? { ...note, content } : note) } : plant)), [plants, persist]);
  const deleteNote = useCallback((plantId: string, noteId: string) => persist(plants.map(plant => plant.id === plantId ? { ...plant, notes: plant.notes.filter(note => note.id !== noteId) } : plant)), [plants, persist]);

  const addReminder = useCallback((plantId: string, title: string, date: string) => {
    const reminder: PlantReminder = { id: uid(), title, date, done: false };
    persist(plants.map(plant => plant.id === plantId ? { ...plant, reminders: [...plant.reminders, reminder] } : plant));
  }, [plants, persist]);
  const toggleReminder = useCallback((plantId: string, reminderId: string) => persist(plants.map(plant => plant.id === plantId ? { ...plant, reminders: plant.reminders.map(reminder => reminder.id === reminderId ? { ...reminder, done: !reminder.done } : reminder) } : plant)), [plants, persist]);
  const deleteReminder = useCallback((plantId: string, reminderId: string) => persist(plants.map(plant => plant.id === plantId ? { ...plant, reminders: plant.reminders.filter(reminder => reminder.id !== reminderId) } : plant)), [plants, persist]);
  const replacePlants = useCallback((next: UserPlant[]) => persist(next), [persist]);

  return {
    plants, storageError, addPlant, removePlant, waterPlant, mistPlant, fertilizePlant,
    updatePlant, replacePlants, addNote, updateNote, deleteNote,
    addReminder, toggleReminder, deleteReminder,
  };
}
