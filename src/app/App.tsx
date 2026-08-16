import { useCallback, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Bot } from "lucide-react";
import { BottomNav } from "./components/BottomNav";
import { getInitialTab, type Tab } from "./navigation";
import { PwaStatus, usePwa } from "../features/pwa";
import {
  PlantsScreen,
  CustomPlantModal,
  DeletePlantConfirm,
  EditPlantModal,
  UserPlantSheet,
  useGarden,
  type CustomPlantSubmitData,
  type EditPlantSaveData,
  type PlantDisplay,
  type PlantLocation,
  type PreparedPhoto,
  type UserPlant,
} from "../features/garden";
import {
  AddScreen,
  AddToGardenModal,
  CatalogDetailSheet,
  CatalogScreen,
  CATALOG,
  toExternalTaxon,
  type CatalogPlant,
} from "../features/catalog";
import {
  ChecklistScreen,
  getSeasonLabel,
  isWinterMonth,
} from "../features/care";
import {
  AiAssistantSheet,
  type AssistantContext,
} from "../features/assistant";
import {
  DataSheet,
  DEFAULT_SETTINGS,
} from "../features/backup";
import {
  AuthSheet,
  useAuth,
} from "../features/auth";
import {
  toggleChecklistLine,
} from "../features/garden/noteUtils";
import {
  useGardenAutoSync,
} from "../features/garden/hooks/useGardenAutoSync";
function resolvePlantDisplay(up: UserPlant): PlantDisplay {
  if (up.catalogId) {
    const cp = CATALOG.find(c => c.id === up.catalogId);
    if (cp) {
      return {
        name: cp.name,
        latinName: cp.latinName,
        emoji: cp.emoji,
        needsMisting: cp.needsMisting,
        tags: cp.tags,
      };
    }
  }
  return {
    name: up.customName || "Моё растение",
    latinName: up.customLatinName || "",
    emoji: up.customEmoji || "🌿",
    needsMisting: false,
    tags: [],
  };
}
function resolvePlantPresentation(plant: UserPlant) {
  return {
    display: resolvePlantDisplay(plant),
    catalogPlant: plant.catalogId
      ? CATALOG.find(item => item.id === plant.catalogId) ?? null
      : null,
  };
}
export default function App() {
  const garden = useGarden();
  const auth = useAuth();
  const {
    syncNow,
  } = useGardenAutoSync({
    userId:
      auth.user?.id ??
      null,
    authLoading:
      auth.isLoading,
    gardenLoading:
      garden.isLoading,
    plants:
      garden.plants,
    syncWithCloud:
      garden.syncWithCloud,
  });
const {
  canInstall,
  install,
  closeInstall,
  isOnline,
  offlineReady,
  updateAvailable,
  applyUpdate
} = usePwa();
  const [tab, setTab] = useState<Tab>(() =>
    getInitialTab(window.location.search)
  );
  const [catalogDetail, setCatalogDetail] =
    useState<CatalogPlant | null>(null);
  const [addToGarden, setAddToGarden] =
    useState<CatalogPlant | null>(null);
  const [pendingPhoto, setPendingPhoto] =
    useState<PreparedPhoto | null>(null);
  const [customPlantOpen, setCustomPlantOpen] =
    useState(false);
  const [userDetail, setUserDetail] =
    useState<UserPlant | null>(null);
  const [editTarget, setEditTarget] =
    useState<UserPlant | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<UserPlant | null>(null);
  const [dataSheetOpen, setDataSheetOpen] =
    useState(false);
  const [authSheetOpen, setAuthSheetOpen] =
  useState(false);
  const [authNotice, setAuthNotice] =
    useState<string | null>(null);
  const [aiOpen, setAiOpen] =
    useState(false);
  const [aiContext, setAiContext] =
    useState<AssistantContext | undefined>();
  const homeCount = garden.plants.filter(
    plant => plant.location === "home"
  ).length;
  const gardenCount = garden.plants.filter(
    plant => plant.location === "outdoor"
  ).length;
  const liveDetail = userDetail
    ? garden.plants.find(
        plant => plant.id === userDetail.id
      ) ?? userDetail
    : null;
  const requireAuthForAdd = useCallback(() => {
    if (auth.isAuthenticated) {
      return true;
    }
    setAuthNotice(
      "Пожалуйста, войдите или зарегистрируйтесь, чтобы добавить растение.",
    );
    setAuthSheetOpen(true);
    return false;
  }, [auth.isAuthenticated]);
  const handleConfirmAdd = useCallback(
    async (
      nickname: string,
      interval: number,
      location: PlantLocation,
    ): Promise<boolean> => {
      if (!addToGarden) {
        return false;
      }
      if (!requireAuthForAdd()) {
        return false;
      }
      const result = await garden.addPlant({
        catalogId:
          addToGarden.source === "gbif"
            ? null
            : addToGarden.id,
        nickname,
        wateringInterval: interval,
        photo: pendingPhoto,
        location,
        extra:
          addToGarden.source === "gbif"
            ? {
                customName: addToGarden.name,
                customLatinName:
                  addToGarden.latinName,
                customDescription:
                  addToGarden.description,
                customEmoji: addToGarden.emoji,
                externalTaxon:
                  toExternalTaxon(addToGarden),
              }
            : {},
      });
      if (!result.ok) {
        return false;
      }
      setAddToGarden(null);
      setCatalogDetail(null);
      setPendingPhoto(null);
      setTab(
        location === "home"
          ? "home"
          : "garden",
      );
      return true;
    },
    [
      addToGarden,
      garden,
      pendingPhoto,
      requireAuthForAdd,
    ],
  );
  const handleConfirmCustom = useCallback(
    async (
      data: CustomPlantSubmitData,
    ): Promise<boolean> => {
      if (!requireAuthForAdd()) {
        return false;
      }
      const result = await garden.addPlant({
        catalogId: null,
        nickname: data.nickname,
        wateringInterval:
          data.wateringInterval,
        location: data.location,
        photo: data.photo,
        extra: {
          customName: data.customName,
          customLatinName:
            data.customLatinName,
          customDescription:
            data.customDescription,
          customEmoji: data.customEmoji,
        },
      });
      if (!result.ok) {
        return false;
      }
      setCustomPlantOpen(false);
      setPendingPhoto(null);
      setTab(
        data.location === "home"
          ? "home"
          : "garden",
      );
      return true;
    },
    [garden, requireAuthForAdd],
  );
  const sharedScreenProps = {
    seasonLabel:
      getSeasonLabel(
        new Date().getMonth() + 1
      ),
    resolvePresentation:
      resolvePlantPresentation,
    onWater:
      (plant: UserPlant) =>
        garden.waterPlant(plant.id),
    onMist:
      (id: string) =>
        garden.mistPlant(id),
    onOpen:
      setUserDetail,
    onGoCatalog:
      () => setTab("catalog"),
    onOpenData:
      () => setDataSheetOpen(true),
  };
    return (
    <div className="app-shell relative flex h-full w-full flex-col overflow-hidden bg-background">
<PwaStatus
  canInstall={canInstall}
  isOnline={isOnline}
  offlineReady={offlineReady}
  updateAvailable={updateAvailable}
  storageError={garden.storageError}
  onInstall={install}
  onUpdate={applyUpdate}
  closeInstall={closeInstall}
/>
      <div className="flex-1 overflow-hidden">
        {tab === "home" && (
          <PlantsScreen
            location="home"
            plants={garden.plants}
            {...sharedScreenProps}
          />
        )}
        {tab === "garden" && (
          <PlantsScreen
            location="outdoor"
            plants={garden.plants}
            {...sharedScreenProps}
          />
        )}
        {tab === "catalog" && (
          <CatalogScreen
            onSelect={(cp) => {
              setPendingPhoto(null);
              setCatalogDetail(cp);
            }}
          />
        )}
        {tab === "checklist" && (
          <ChecklistScreen />
        )}
        {tab === "add" && (
          <AddScreen
            onSelectCatalog={(cp, photo) => {
              if (!requireAuthForAdd()) {
                return;
              }
              setPendingPhoto(photo);
              setCatalogDetail(cp);
            }}
            onAddCustom={(photo) => {
              if (!requireAuthForAdd()) {
                return;
              }
              setPendingPhoto(photo);
              setCustomPlantOpen(true);
            }}
          />
        )}
      </div>
      <BottomNav
        active={tab}
        onChange={(nextTab) => {
          if (
            nextTab === "add" &&
            !requireAuthForAdd()
          ) {
            return;
          }
          setTab(nextTab);
        }}
        homeCount={homeCount}
        gardenCount={gardenCount}
      />
      {!aiOpen && (
        <button
          onClick={() => {
            if (liveDetail) {
              const display =
                resolvePlantDisplay(liveDetail);
              setAiContext({
                name: display.name,
                latinName: display.latinName,
                wateringInterval:
                  liveDetail.wateringInterval,
                description:
                  liveDetail.customDescription,
              });
            } else {
              setAiContext(undefined);
            }
            setAiOpen(true);
          }}
          aria-label="Открыть ИИ Садовода"
          title="ИИ Садовод"
          className="absolute bottom-20 right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl ring-4 ring-background/80 transition-transform active:scale-95"
          style={{
            bottom:
              "calc(5rem + env(safe-area-inset-bottom))",
          }}
        >
          <Bot size={21} />
        </button>
      )}
      <AnimatePresence>
        {catalogDetail && !addToGarden && (
          <CatalogDetailSheet
            key="cat-detail"
            cp={catalogDetail}
            onClose={() => {
              setCatalogDetail(null);
              setPendingPhoto(null);
            }}
            onAddToGarden={() => {
              if (!requireAuthForAdd()) {
                return;
              }
              setAddToGarden(catalogDetail);
            }}
          />
        )}
        {addToGarden && (
          <AddToGardenModal
            key="add-modal"
            cp={addToGarden}
            photo={pendingPhoto}
            defaultWateringInterval={
              isWinterMonth(
                new Date().getMonth() + 1
              )
                ? addToGarden.watering.winter
                : addToGarden.watering.summer
            }
            defaultLocation={
              tab === "garden"
                ? "outdoor"
                : "home"
            }
            onConfirm={handleConfirmAdd}
            onClose={() =>
              setAddToGarden(null)
            }
          />
        )}
        {customPlantOpen && (
          <CustomPlantModal
            key="custom-plant"
            defaultLocation={
              tab === "garden"
                ? "outdoor"
                : "home"
            }
            initialPhoto={pendingPhoto}
            onConfirm={handleConfirmCustom}
            onClose={() => {
              setCustomPlantOpen(false);
              setPendingPhoto(null);
            }}
          />
        )}
        {liveDetail && (
          <UserPlantSheet
            key="user-detail"
            up={liveDetail}
            display={
              resolvePlantDisplay(liveDetail)
            }
            catalogPlant={
              liveDetail.catalogId
                ? CATALOG.find(
                    plant =>
                      plant.id === liveDetail.catalogId
                  ) ?? null
                : null
            }
            difficulty={
              liveDetail.catalogId
                ? CATALOG.find(
                    plant =>
                      plant.id === liveDetail.catalogId
                  )?.difficulty
                : undefined
            }
            onClose={() =>
              setUserDetail(null)
            }
            onEdit={() =>
              setEditTarget(liveDetail)
            }
            onRemove={() =>
              setDeleteTarget(liveDetail)
            }
            onWater={() =>
              garden.waterPlant(
                liveDetail.id
              )
            }
            onMist={() =>
              garden.mistPlant(
                liveDetail.id
              )
            }
            onFertilize={() =>
              garden.fertilizePlant(
                liveDetail.id
              )
            }
            onMoveLocation={(location) =>
              garden.updatePlant(
                liveDetail.id,
                { location }
              )
            }
            onAddNote={(content) =>
              garden.addNote(
                liveDetail.id,
                content
              )
            }
            onDeleteNote={(noteId) =>
              garden.deleteNote(
                liveDetail.id,
                noteId
              )
            }
            onToggleNoteItem={(noteId, lineIndex) => {
              const note =
                liveDetail.notes.find(
                  item =>
                    item.id === noteId
                );
              if (note) {
                garden.updateNote(
                  liveDetail.id,
                  noteId,
                  toggleChecklistLine(
                    note.content,
                    lineIndex
                  )
                );
              }
            }}
            onAddReminder={(title, date) =>
              garden.addReminder(
                liveDetail.id,
                title,
                date
              )
            }
            onToggleReminder={(id) =>
              garden.toggleReminder(
                liveDetail.id,
                id
              )
            }
            onDeleteReminder={(id) =>
              garden.deleteReminder(
                liveDetail.id,
                id
              )
            }
          />
        )}
        {editTarget && (
          <EditPlantModal
            key="edit-plant"
            up={
              garden.plants.find(
                plant =>
                  plant.id === editTarget.id
              ) ?? editTarget
            }
            catalogPlant={
              editTarget.catalogId
                ? CATALOG.find(
                    plant =>
                      plant.id === editTarget.catalogId
                  ) ?? null
                : null
            }
            onSave={async ({
              changes,
              photo,
              removePhoto,
              gallery,
            }: EditPlantSaveData) => {
              const result =
                await garden.updatePlant(
                  editTarget.id,
                  changes,
                  {
                    photo,
                    removePhoto,
                    gallery,
                  },
                );
              return result.ok;
            }}
            onClose={() =>
              setEditTarget(null)
            }
          />
        )}
        {deleteTarget && (
          <DeletePlantConfirm
            key="delete-plant"
            name={deleteTarget.nickname}
            onClose={() =>
              setDeleteTarget(null)
            }
            onConfirm={() => {
              void (async () => {
                const result =
                  await garden.removePlant(
                    deleteTarget.id,
                  );
                if (result.ok) {
                  setDeleteTarget(null);
                  setEditTarget(null);
                  setUserDetail(null);
                }
              })();
            }}
          />
        )}
        {aiOpen && (
          <AiAssistantSheet
            key="ai-sheet"
            context={aiContext}
            onClose={() => {
              setAiOpen(false);
              setAiContext(undefined);
            }}
          />
        )}
{dataSheetOpen && (
  <DataSheet
    key="data-sheet"
    plants={garden.plants}
    settings={{
      ...DEFAULT_SETTINGS,
      lastActiveTab: tab,
    }}
    authUser={auth.user}
    authLoading={auth.isLoading}
        syncStatus={
      garden.syncStatus
    }
    syncError={
      garden.syncError
    }
    lastSyncedAt={
      garden.lastSyncedAt
    }
    onSync={() => {
      void syncNow();
    }}
    onOpenAuth={() => {
      setAuthNotice(null);
      setDataSheetOpen(false);
      setAuthSheetOpen(true);
    }}
    onLogout={async () => {
      const logoutResult =
        await auth.logout();
      if (!logoutResult.ok) {
        return logoutResult;
      }
      const clearResult =
        await garden.clearGarden();
      if (!clearResult.ok) {
        return {
          ok: false,
          error:
            "Вы вышли из аккаунта, но локальные данные не удалось очистить. Перезагрузите приложение и повторите выход.",
        };
      }
      setUserDetail(null);
      setEditTarget(null);
      setDeleteTarget(null);
      setTab("home");
      setDataSheetOpen(false);
      return { ok: true };
    }}
    onImport={(
      plants,
      importedSettings,
      mode
    ) => {
      void garden.replacePlants(plants);
      if (
        mode === "replace" &&
        importedSettings
      ) {
        setTab(
          importedSettings.lastActiveTab
        );
      }
    }}
    onClose={() =>
      setDataSheetOpen(false)
    }
  />
)}
{authSheetOpen && (
  <AuthSheet
    key="auth-sheet"
    notice={authNotice}
    onLogin={auth.login}
    onRegister={auth.register}
    onClose={() => {
      setAuthSheetOpen(false);
      if (!authNotice) {
        setDataSheetOpen(true);
      }
      setAuthNotice(null);
    }}
  />
)}
      </AnimatePresence>
    </div>
  );
}
