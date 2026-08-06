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
  type PlantDisplay,
  type PlantLocation,
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
  toggleChecklistLine,
} from "../features/garden/noteUtils";


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
    useState<string | null>(null);

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


  const handleConfirmAdd = useCallback(
    (
      nickname: string,
      interval: number,
      location: PlantLocation
    ) => {
      if (!addToGarden) return;

      if (addToGarden.source === "gbif") {
        garden.addPlant(
          null,
          nickname,
          interval,
          pendingPhoto,
          location,
          {
            customName: addToGarden.name,
            customLatinName: addToGarden.latinName,
            customDescription: addToGarden.description,
            customEmoji: addToGarden.emoji,
            externalTaxon: toExternalTaxon(addToGarden),
          }
        );
      } else {
        garden.addPlant(
          addToGarden.id,
          nickname,
          interval,
          pendingPhoto,
          location
        );
      }

      setAddToGarden(null);
      setCatalogDetail(null);
      setPendingPhoto(null);

      setTab(
        location === "home"
          ? "home"
          : "garden"
      );
    },
    [
      addToGarden,
      pendingPhoto,
      garden,
    ]
  );


  const handleConfirmCustom = useCallback(
    (
      data: Partial<UserPlant> & {
        nickname: string;
        wateringInterval: number;
        location: PlantLocation;
      }
    ) => {
      const {
        nickname,
        wateringInterval,
        location,
        ...extra
      } = data;


      garden.addPlant(
        null,
        nickname,
        wateringInterval,
        extra.photo ?? null,
        location,
        extra
      );


      setCustomPlantOpen(false);

      setTab(
        location === "home"
          ? "home"
          : "garden"
      );
    },
    [garden]
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
              setPendingPhoto(photo);
              setCatalogDetail(cp);
            }}

            onAddCustom={(photo) => {
              setPendingPhoto(photo);
              setCustomPlantOpen(true);
            }}
          />
        )}

      </div>


      <BottomNav
        active={tab}
        onChange={setTab}
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

            onAddToGarden={() =>
              setAddToGarden(catalogDetail)
            }
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

            onSave={(changes) =>
              garden.updatePlant(
                editTarget.id,
                changes
              )
            }

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
              garden.removePlant(
                deleteTarget.id
              );

              setDeleteTarget(null);
              setEditTarget(null);
              setUserDetail(null);
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

            onImport={(
              plants,
              importedSettings,
              mode
            ) => {
              garden.replacePlants(plants);

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

      </AnimatePresence>

    </div>
  );
}